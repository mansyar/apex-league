/**
 * The v25 -> v26 step (FR-3, FR-9, AC-3): the stored HP absorbs the old 210%
 * scale, the trained-HP bonus is re-based against the widened cap, and a
 * persisted legacy tactic gains the doctrine it maps onto. Nothing else moves,
 * and the version gate makes the step idempotent.
 */

import { describe, expect, test } from "bun:test"
import {
  engagementFor,
  resolveContinuous,
} from "../../battle/continuous/resolve"
import type { BattleSide } from "../../battle/resolver"
import { migrate } from "../migrate"
import { migrateFromV25 } from "./v25"

function creature(
  stats: Record<string, number>,
  trained: Record<string, number>,
) {
  return {
    id: "ember",
    speciesId: "fire_drake",
    name: "Ember",
    element: "fire",
    stats,
    trained,
    trainingProgram: null,
    loadout: ["spark", "flame_charge"],
    level: 1,
    experience: 0,
    form: null,
    affinity: null,
    care: null,
    careDays: 0,
    bond: 0,
  }
}

function v25Save(): Record<string, unknown> {
  return {
    version: 25,
    savedAt: 1700000000000,
    state: {
      day: 3,
      phase: "day",
      actionPoints: 2,
      creature: creature(
        { hp: 90, atk: 12, def: 9, spd: 11 },
        { hp: 6, atk: 2, def: 0, spd: 1 },
      ),
      settings: {},
      cupsWon: 0,
      lastCupDay: 0,
      ladder: {},
      lineage: { hallOfFame: [] },
      bossDefeats: [],
      legendTitles: [],
      evolutionKnowledge: {},
      claimedTiers: [],
      pendingRewards: [],
      stable: [],
    },
    session: {
      bracket: {
        slots: [{ stats: { hp: 88, atk: 10, def: 9, spd: 11 } }],
        finalRival: { stats: { hp: 93, atk: 10, def: 12, spd: 6 } },
      },
      rivalVerdicts: [
        {
          sides: [
            {
              name: "Rival",
              id: "rival",
              element: "water",
              stats: { hp: 90, atk: 10, def: 10, spd: 10 },
              kit: ["bubble"],
              tactic: "specials",
              temperament: "rush",
            },
          ],
        },
      ],
    },
  }
}

describe("save v25 -> v26 (FR-3, FR-9, AC-3)", () => {
  test("the stored HP absorbs the 210% scale and the trained bonus the cap", () => {
    const migrated = migrateFromV25(v25Save())
    const saved = migrated.state as {
      creature: {
        stats: Record<string, number>
        trained: Record<string, number>
      }
    }
    expect(migrated.version).toBe(26)
    // 90 * 2.1 = 189; the trained point is worth 2 against a cap of 13.
    expect(saved.creature.stats.hp).toBe(189)
    expect(saved.creature.trained.hp).toBe(13)
    expect(saved.creature.stats).toEqual({ hp: 189, atk: 12, def: 9, spd: 11 })
    expect(saved.creature.trained).toEqual({ hp: 13, atk: 2, def: 0, spd: 1 })
  })

  test("a creature with no training keeps the pool it had, to rounding", () => {
    const raw = v25Save()
    const state = raw.state as { creature: ReturnType<typeof creature> }
    state.creature = creature(
      { hp: 90, atk: 12, def: 9, spd: 11 },
      { hp: 0, atk: 0, def: 0, spd: 0 },
    )
    const migrated = migrateFromV25(raw)
    const saved = migrated.state as { creature: { stats: { hp: number } } }
    expect(saved.creature.stats.hp).toBe(Math.floor((90 * 210) / 100))
  })

  test("the version gate makes the step idempotent", () => {
    const once = migrate(v25Save())
    expect(once.version).toBe(26)
    const twice = migrate(once)
    const saved = twice.state.creature as { stats: { hp: number } }
    expect(twice.version).toBe(26)
    expect(saved.stats.hp).toBe(189)
  })

  test("the cup session folds its slots and keeps the final rival", () => {
    const migrated = migrateFromV25(v25Save())
    const session = migrated.session as {
      bracket: {
        slots: { stats: { hp: number } }[]
        finalRival: { stats: { hp: number } }
      }
    }
    expect(session.bracket.slots[0]?.stats.hp).toBe(185)
    expect(session.bracket.finalRival.stats.hp).toBe(195)
  })

  test("a persisted legacy tactic gains the doctrine it maps onto", () => {
    const migrated = migrateFromV25(v25Save())
    const session = migrated.session as {
      rivalVerdicts: { sides: BattleSide[] }[]
    }
    const side = session.rivalVerdicts[0]?.sides[0]
    if (!side) throw new Error("the fixture lost its verdict side")
    expect(side.stats.hp).toBe(189)
    expect(side.tactic).toBe("specials")
    expect(side.doctrine).toBe("kite")
  })

  test("the migrated side fights under the mapped doctrine (AC-3)", () => {
    const migrated = migrateFromV25(v25Save())
    const session = migrated.session as {
      rivalVerdicts: { sides: BattleSide[] }[]
    }
    const side = session.rivalVerdicts[0]?.sides[0]
    if (!side) throw new Error("the fixture lost its verdict side")
    // The doctrine the save now carries is the profile the resolver uses.
    expect(engagementFor(side.temperament, side.tactic, side.doctrine)).toEqual(
      engagementFor(side.temperament, side.tactic),
    )
    const result = resolveContinuous(
      side,
      {
        name: "Ember",
        id: "ember",
        element: "fire",
        stats: { hp: 189, atk: 10, def: 10, spd: 10 },
        kit: ["spark", "flame_charge"],
        tactic: "balanced",
        temperament: "rush",
      },
      20261109,
    )
    expect(result.events.length).toBeGreaterThan(0)
  })
})
