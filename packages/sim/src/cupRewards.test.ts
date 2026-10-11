import { describe, expect, test } from "bun:test"
import { applyCupRewards, CUP_REWARDS } from "./cupRewards"
import {
  advanceDay,
  CONDITION_MAX,
  type Creature,
  createCreature,
  createInitialState,
  type GameState,
} from "./index"

function stateWith(
  creatureOverrides: Partial<Creature> = {},
  stateOverrides: Partial<GameState> = {},
): GameState {
  const base = createInitialState()
  const creature: Creature = {
    ...createCreature("fire_drake", 11),
    ...creatureOverrides,
  }
  return { ...base, creature, ...stateOverrides }
}

const CUP_DAY = 7

describe("CUP_REWARDS contract", () => {
  test("declares the approved bundle", () => {
    expect(CUP_REWARDS.bond).toBe(10)
    expect(CUP_REWARDS.mood).toBe(15)
    expect(CUP_REWARDS.consolations.mood).toBe(2)
  })
})

describe("applyCupRewards — win path", () => {
  test("adds bond +10, mood +15, bumps cupsWon, stamps the cup day", () => {
    const s = stateWith({
      conditions: { hunger: 80, energy: 80, health: 100, mood: 60, bond: 10 },
    })
    const r = applyCupRewards(s, "won", CUP_DAY)
    const c = r.creature
    expect(c?.conditions.bond).toBe(20)
    expect(c?.conditions.mood).toBe(75)
    expect(r.cupsWon).toBe(1)
    expect(r.lastCupDay).toBe(CUP_DAY)
  })

  test("clamps mood and bond at CONDITION_MAX", () => {
    const s = stateWith({
      conditions: { hunger: 80, energy: 80, health: 100, mood: 95, bond: 95 },
    })
    const r = applyCupRewards(s, "won", CUP_DAY)
    const c = r.creature
    expect(c?.conditions.mood).toBe(CONDITION_MAX)
    expect(c?.conditions.bond).toBe(CONDITION_MAX)
  })

  test("accumulates cupsWon across wins", () => {
    const s = stateWith()
    const once = applyCupRewards(s, "won", CUP_DAY)
    expect(once.cupsWon).toBe(1)
    const twice = applyCupRewards(once, "won", 14)
    expect(twice.cupsWon).toBe(2)
    expect(twice.lastCupDay).toBe(14)
  })

  test("does not mutate the input state", () => {
    const s = stateWith()
    const before = JSON.stringify(s)
    applyCupRewards(s, "won", CUP_DAY)
    expect(JSON.stringify(s)).toBe(before)
  })
})

describe("applyCupRewards — loss path", () => {
  test("consolation mood +2, no bond/cupsWon change, cup day not stamped", () => {
    const s = stateWith({
      conditions: { hunger: 80, energy: 80, health: 100, mood: 60, bond: 10 },
    })
    const r = applyCupRewards(s, "lost", CUP_DAY)
    const c = r.creature
    expect(c?.conditions.mood).toBe(62)
    expect(c?.conditions.bond).toBe(10)
    expect(r.cupsWon).toBe(0)
    expect(r.lastCupDay).toBeNull()
  })

  test("loss consolation clamps at the max too", () => {
    const s = stateWith({
      conditions: { hunger: 80, energy: 80, health: 100, mood: 99, bond: 10 },
    })
    const r = applyCupRewards(s, "lost", CUP_DAY)
    expect(r.creature?.conditions.mood).toBe(CONDITION_MAX)
  })
})

describe("outcome contract", () => {
  test("rejects numeric placements — the machine maps placement → outcome", () => {
    // Boundary hardening (track hardening_20261011 FR-A5): the reward layer
    // accepts only a resolved "won"/"lost". Numeric placements from the cup
    // result are collapsed by the machine (machine.ts), never passed through.
    const s = stateWith()
    expect(() =>
      applyCupRewards(
        s,
        1 as unknown as Parameters<typeof applyCupRewards>[1],
        CUP_DAY,
      ),
    ).toThrow()
    expect(() =>
      applyCupRewards(
        s,
        2 as unknown as Parameters<typeof applyCupRewards>[1],
        CUP_DAY,
      ),
    ).toThrow()
  })

  test("accepts only the resolved 'won' / 'lost' outcomes", () => {
    const s = stateWith()
    expect(applyCupRewards(s, "won", CUP_DAY).cupsWon).toBe(1)
    expect(applyCupRewards(s, "lost", CUP_DAY).cupsWon).toBe(0)
  })

  test("the ticker grants the bonus AP the day after a stamped win", () => {
    // Real usage invariant: the machine applies rewards ON the cup day —
    // the state's day equals the cup day when the stamp goes on.
    const onCupDay = { ...stateWith(), day: CUP_DAY }
    const won = applyCupRewards(onCupDay, "won", CUP_DAY)
    // The next day (8) should start with 4 AP, not 3.
    const advanced = advanceDay(won)
    expect(advanced.actionPoints).toBe(4)
    expect(advanced.day).toBe(8)
    // The day after a LOSS starts with the standard budget.
    const lost = applyCupRewards(onCupDay, "lost", CUP_DAY)
    expect(advanceDay(lost).actionPoints).toBe(3)
  })

  test("rejects a state without a creature", () => {
    const s = createInitialState()
    expect(() => applyCupRewards(s, "won", CUP_DAY)).toThrow()
  })
})
