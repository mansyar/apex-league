/**
 * statBreakdown tests — Coach's Knowledge Pass (`coach_knowledge_20261016`),
 * Phase 1. The helper decomposes a creature's displayed stats into the four
 * components the creature-detail modal shows: the pre-evolution rolled base,
 * the weighted trained bonus, the pinned evolution boost, and the
 * parent-derived inherited floor. Table-driven per the workflow; the sum
 * invariant (base + trained + boost = total) is checked in every case.
 */

import { describe, expect, it } from "bun:test"
import {
  type Creature,
  type CreatureStats,
  createCreature,
  effectiveStats,
} from "./creature"
import { CHAMPION_STAT_BOOST, EVOLUTION_STAT_BOOST } from "./evolution"
import { graduate, inheritedFloor, type RetiredRecord } from "./legacy"
import { getSpecies } from "./species"
import { chooseStarter, createInitialState } from "./state"
import { statBreakdown } from "./stats"
import { effectiveTraits } from "./traits"

const STAT_KEYS = ["hp", "atk", "def", "spd"] as const

/** A founder creature from the real starter path (seeded, replayable). */
function starter(): Creature {
  const owned = chooseStarter(createInitialState(), "fire_drake", 42)
  const creature = owned.creature
  if (!creature) throw new Error("expected a starter creature")
  return creature
}

/** The founder's lineage: generation 0, empty Hall of Fame. */
const FOUNDER_LINEAGE = { generation: 0, hallOfFame: [] as RetiredRecord[] }

/** Every row must decompose exactly into its three contributions. */
function assertSumInvariant(
  creature: Creature,
  lineage = FOUNDER_LINEAGE,
): void {
  const rows = statBreakdown(creature, lineage)
  for (const key of STAT_KEYS) {
    const row = rows[key]
    expect(row.baseRolled + row.trainedBonus + row.stageBoost).toBe(row.total)
  }
}

describe("statBreakdown — a fresh founder baby", () => {
  it("shows the rolled base alone: no training, no boost, no floor", () => {
    const creature = starter()
    const rows = statBreakdown(creature, FOUNDER_LINEAGE)
    for (const key of STAT_KEYS) {
      expect(rows[key]).toEqual({
        total: creature.stats[key],
        baseRolled: creature.stats[key],
        trainedBonus: 0,
        stageBoost: 0,
        inheritedFloor: null,
      })
    }
  })

  it("totals match effectiveStats", () => {
    const creature = starter()
    const rows = statBreakdown(creature, FOUNDER_LINEAGE)
    const eff = effectiveStats(creature)
    for (const key of STAT_KEYS) {
      expect(rows[key].total).toBe(eff[key])
    }
  })

  it("keeps the sum invariant", () => {
    assertSumInvariant(starter())
  })
})

describe("statBreakdown — the trained bonus", () => {
  it("pays HP points double and every other stat once", () => {
    const creature = {
      ...starter(),
      trained: { hp: 3, atk: 2, def: 1, spd: 0 },
    }
    const rows = statBreakdown(creature, FOUNDER_LINEAGE)
    expect(rows.hp.trainedBonus).toBe(6)
    expect(rows.atk.trainedBonus).toBe(2)
    expect(rows.def.trainedBonus).toBe(1)
    expect(rows.spd.trainedBonus).toBe(0)
    assertSumInvariant(creature)
  })
})

describe("statBreakdown — the evolution boost", () => {
  it("recovers the pre-evolution roll of a juvenile by subtracting the boost", () => {
    const roll = starter().stats
    const creature = {
      ...starter(),
      stage: "juvenile" as const,
      stats: {
        hp: roll.hp + EVOLUTION_STAT_BOOST.hp,
        atk: roll.atk + EVOLUTION_STAT_BOOST.atk,
        def: roll.def + EVOLUTION_STAT_BOOST.def,
        spd: roll.spd + EVOLUTION_STAT_BOOST.spd,
      },
    }
    const rows = statBreakdown(creature, FOUNDER_LINEAGE)
    for (const key of STAT_KEYS) {
      expect(rows[key].baseRolled).toBe(roll[key])
      expect(rows[key].stageBoost).toBe(EVOLUTION_STAT_BOOST[key])
    }
    assertSumInvariant(creature)
  })

  it("a champion carries both pinned boosts", () => {
    const roll = starter().stats
    const boost = (key: keyof CreatureStats): number =>
      EVOLUTION_STAT_BOOST[key] + CHAMPION_STAT_BOOST[key]
    const creature = {
      ...starter(),
      stage: "champion" as const,
      stats: {
        hp: roll.hp + boost("hp"),
        atk: roll.atk + boost("atk"),
        def: roll.def + boost("def"),
        spd: roll.spd + boost("spd"),
      },
    }
    const rows = statBreakdown(creature, FOUNDER_LINEAGE)
    for (const key of STAT_KEYS) {
      expect(rows[key].baseRolled).toBe(roll[key])
      expect(rows[key].stageBoost).toBe(boost(key))
    }
    assertSumInvariant(creature)
  })
})

describe("statBreakdown — the inherited floor", () => {
  /** Run a real graduation so the successor and lineage come from production code. */
  function graduated(): { successor: Creature; lineage: RetiredRecord[] } {
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    const champion = owned.creature
    if (!champion) throw new Error("expected a starter creature")
    const champ = { ...champion, stage: "champion" as const }
    const result = graduate(
      { ...owned, day: 60, creature: champ },
      "plant_ox",
      7,
    )
    if (!result.ok) throw new Error(`graduation rejected: ${result.reason}`)
    const successor = result.state.creature
    if (!successor) throw new Error("expected a successor creature")
    return { successor, lineage: result.state.lineage.hallOfFame }
  }

  it("a successor shows the exact floor its egg was rolled under", () => {
    const { successor, lineage } = graduated()
    const parent = lineage[0]
    if (!parent) throw new Error("expected a Hall of Fame record")
    const ox = getSpecies("plant_ox")
    if (!ox) throw new Error("expected the plant_ox species")
    // Prestige as of the egg: the new generation plus the cups at lay time.
    const expected = inheritedFloor(
      parent.stats,
      ox,
      parent.generation + 1 + parent.cupsWon,
      effectiveTraits(parent),
    )
    const rows = statBreakdown(successor, {
      generation: 1,
      hallOfFame: lineage,
    })
    for (const key of STAT_KEYS) {
      expect(rows[key].inheritedFloor).toBe(expected[key])
      // The floor never exceeds the roll it clamped.
      expect(rows[key].baseRolled).toBeGreaterThanOrEqual(expected[key])
    }
  })

  it("a floored successor still keeps the sum invariant", () => {
    const { successor, lineage } = graduated()
    assertSumInvariant(successor, { generation: 1, hallOfFame: lineage })
  })

  it("the established-line perk adds +1 to every shown floor", () => {
    // Two crafted parent records: one prestige just under the milestone, one at it.
    // Chosen so 50% of each stat — plus the milestone +1 — lands strictly
    // inside the fire_drake bounds (hp [76,92], atk [9,13], def [7,10], spd [9,12]).
    const parentStats: CreatureStats = { hp: 160, atk: 22, def: 16, spd: 20 }
    const record = (generation: number, cupsWon: number): RetiredRecord => ({
      name: "Rolo",
      speciesId: "fire_drake",
      archetypeId: "draconic",
      element: "fire",
      stats: parentStats,
      trained: { hp: 0, atk: 0, def: 0, spd: 0 },
      cupsWon,
      generation,
      retiredOnDay: 60,
      traits: [],
      parents: [],
    })
    // Prestige at lay = generation + 1 + cupsWon: 4 is under the milestone, 5 at it.
    const under = { generation: 5, hallOfFame: [record(3, 0)] }
    const at = { generation: 5, hallOfFame: [record(4, 0)] }
    const egg = createCreature("fire_drake", 42)
    const underRows = statBreakdown(egg, under)
    const atRows = statBreakdown(egg, at)
    for (const key of STAT_KEYS) {
      expect(atRows[key].inheritedFloor ?? 0).toBe(
        (underRows[key].inheritedFloor ?? 0) + 1,
      )
    }
  })
})
