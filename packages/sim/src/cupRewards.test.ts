import { describe, expect, test } from "bun:test"
import type { BattleResult } from "./battle/resolver"
import { getBoss } from "./bosses"
import { startCupSession } from "./cup"
import { applyCupRewards, CUP_REWARDS } from "./cupRewards"
import {
  advanceDay,
  CONDITION_MAX,
  type Creature,
  chooseStarter,
  createCreature,
  createInitialState,
  type GameState,
} from "./index"
import { finalizeCup } from "./machine"

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

describe("tier-gated champion bonuses (gold_legend_ladder_20261017)", () => {
  /** A state standing at the given ladder position. */
  function ladderAt(tier: string, subTier: string, points: number) {
    return { ladder: { points, tier, subTier } as GameState["ladder"] }
  }

  /** Reward a win ON the cup day, then tick — the AP budget pattern from
   * the ticker contract test. */
  function nextDayAp(
    overrides: Partial<GameState>,
    outcome: "won" | "lost" = "won",
  ): number {
    const onCupDay = { ...stateWith({}, overrides), day: CUP_DAY }
    return advanceDay(applyCupRewards(onCupDay, outcome, CUP_DAY)).actionPoints
  }

  test("a gold-tier champion's next day starts with a +2 AP budget", () => {
    expect(nextDayAp(ladderAt("gold", "III", 30))).toBe(5)
  })

  test("a legend-tier champion's next day starts with a +3 AP budget", () => {
    expect(nextDayAp(ladderAt("legend", "I", 40))).toBe(6)
  })

  test("bronze and silver champions keep the classic +1 bonus", () => {
    expect(nextDayAp(ladderAt("bronze", "I", 12))).toBe(4)
    expect(nextDayAp(ladderAt("silver", "I", 24))).toBe(4)
  })

  test("losses pay no tier bonus at any tier", () => {
    expect(nextDayAp(ladderAt("gold", "I", 36), "lost")).toBe(3)
    expect(nextDayAp(ladderAt("legend", "I", 40), "lost")).toBe(3)
  })

  test("legend cup wins tally legendTitles; other tiers do not", () => {
    const legend = stateWith({}, ladderAt("legend", "I", 40))
    expect(applyCupRewards(legend, "won", CUP_DAY).legendTitles).toBe(1)
    expect(applyCupRewards(legend, "lost", CUP_DAY).legendTitles).toBe(0)
    const gold = stateWith({}, ladderAt("gold", "I", 36))
    expect(applyCupRewards(gold, "won", CUP_DAY).legendTitles).toBe(0)
  })

  test("the promotion cup pays the NEW tier's bundle — the gate crowns first", () => {
    // Machine ordering pin: placement runs before rewards, so the champion
    // of the gold→legend gate cup is rewarded as a Legend (FR4).
    const started = chooseStarter(createInitialState(), "fire_drake", 42)
    const gateState = {
      ...started,
      day: CUP_DAY,
      ladder: { points: 37, tier: "gold" as const, subTier: "I" as const },
    }
    const boss = getBoss("thessa")
    if (!boss) throw new Error("missing boss thessa")
    const creature = gateState.creature
    if (!creature) throw new Error("expected a creature after the starter")
    const session = startCupSession(creature, CUP_DAY, 101, "promotion", boss)
    const playerName = session.bracket.slots[0]?.name ?? "player"
    const championSession = {
      ...session,
      status: "champion" as const,
      championName: playerName,
      playerVerdicts: [
        ...session.playerVerdicts,
        {
          round: 3,
          slotA: playerName,
          slotB: boss.name,
          winner: playerName,
          line: "",
          // A won verdict, not a forfeit — a forfeited gate banks nothing
          // and flips nothing (that contract is pinned in ladder.tier.test).
          battle: {} as BattleResult,
        },
      ],
    }
    const finalized = finalizeCup(gateState, championSession)
    expect(finalized.legendTitles).toBe(1)
    expect(finalized.ladder.tier).toBe("legend")
    expect(advanceDay(finalized).actionPoints).toBe(6)
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
