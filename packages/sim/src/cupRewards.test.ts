import { describe, expect, test } from "bun:test"
import { applyCupRewards, CUP_BONUS_AP, CUP_REWARDS } from "./cupRewards"
import {
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

describe("CUP_REWARDS contract", () => {
  test("declares the approved bundle", () => {
    expect(CUP_REWARDS.bond).toBe(10)
    expect(CUP_REWARDS.mood).toBe(15)
    expect(CUP_REWARDS.consolations.mood).toBe(2)
    expect(CUP_BONUS_AP).toBe(1)
  })
})

describe("applyCupRewards — win path", () => {
  test("adds bond +10, mood +15, sets the cup AP bonus flag", () => {
    const s = stateWith({
      conditions: { hunger: 80, energy: 80, health: 100, mood: 60, bond: 10 },
    })
    const r = applyCupRewards(s, "won")
    const c = r.state.creature
    expect(c?.conditions.bond).toBe(20)
    expect(c?.conditions.mood).toBe(75)
    expect(r.nextDayApBudget).toBe(4)
    expect(r.cupsWon).toBe(1)
  })

  test("clamps mood and bond at CONDITION_MAX", () => {
    const s = stateWith({
      conditions: { hunger: 80, energy: 80, health: 100, mood: 95, bond: 95 },
    })
    const r = applyCupRewards(s, "won")
    const c = r.state.creature
    expect(c?.conditions.mood).toBe(CONDITION_MAX)
    expect(c?.conditions.bond).toBe(CONDITION_MAX)
  })

  test("accumulates cupsWon across wins", () => {
    const s = stateWith()
    const once = applyCupRewards(s, "won")
    expect(once.cupsWon).toBe(1)
    const twice = applyCupRewards(
      { ...once.state, cupPrevWins: 1 } as GameState,
      "won",
    )
    expect(twice.cupsWon).toBe(2)
  })

  test("does not mutate the input state", () => {
    const s = stateWith()
    const before = JSON.stringify(s)
    applyCupRewards(s, "won")
    expect(JSON.stringify(s)).toBe(before)
  })
})

describe("applyCupRewards — loss path", () => {
  test("consolation mood +2, no bond/Ap/cupsWon change", () => {
    const s = stateWith({
      conditions: { hunger: 80, energy: 80, health: 100, mood: 60, bond: 10 },
    })
    const r = applyCupRewards(s, "lost")
    const c = r.state.creature
    expect(c?.conditions.mood).toBe(62)
    expect(c?.conditions.bond).toBe(10)
    expect(r.nextDayApBudget).toBe(3)
    expect(r.cupsWon).toBe(0)
  })

  test("loss consolation clamps at the max too", () => {
    const s = stateWith({
      conditions: { hunger: 80, energy: 80, health: 100, mood: 99, bond: 10 },
    })
    const r = applyCupRewards(s, "lost")
    expect(r.state.creature?.conditions.mood).toBe(CONDITION_MAX)
  })
})

describe("placement mapping", () => {
  test("placement 1 → won; anything else → lost", () => {
    const s = stateWith()
    expect(applyCupRewards(s, 1).cupsWon).toBe(1)
    expect(applyCupRewards(s, 2).cupsWon).toBe(0)
    expect(applyCupRewards(s, 3).cupsWon).toBe(0)
    expect(applyCupRewards(s, 4).cupsWon).toBe(0)
  })

  test("rejects a state without a creature", () => {
    const s = createInitialState()
    expect(() => applyCupRewards(s, "won")).toThrow()
  })
})
