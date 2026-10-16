/**
 * Stat decomposition (`coach_knowledge_20261016`): the pure sim-side helper
 * behind the creature-detail modal. A creature's displayed stats are the sum
 * of four contributions — the pre-evolution rolled base, the weighted trained
 * bonus, the pinned evolution boost, and (for a successor) the parent-derived
 * inherited floor — and the modal shows exactly where a creature's power came
 * from ("preparation is legible", product-guidelines.md).
 *
 * The evolution boosts are folded *into* the rolled base at evolution time
 * (evolution.ts), so the pre-evolution roll is recovered by subtracting the
 * pinned stage constants. The inherited floor is recomputed from the parent's
 * Hall of Fame record (the exact inputs `graduate()` used when the egg was
 * laid), so no save-schema change is needed. Pure data and pure functions
 * only — no DOM, no rendering, no I/O.
 */

import { type Creature, type CreatureStats, effectiveStats } from "./creature"
import { CHAMPION_STAT_BOOST, EVOLUTION_STAT_BOOST } from "./evolution"
import { inheritedFloor, type LineageState } from "./legacy"
import { getSpecies } from "./species"

/** One stat's decomposition for the creature-detail modal. */
export interface StatBreakdownRow {
  /** The displayed (combat) value: base + trained + boost. */
  total: number
  /** The pre-evolution roll: the base stat before any evolution boost. */
  baseRolled: number
  /** The trained contribution to `total` (HP points pay double). */
  trainedBonus: number
  /** The pinned evolution boost accumulated by the current stage. */
  stageBoost: number
  /**
   * The parent-derived floor this creature's roll could not fall below,
   * or null for a founder (no Hall of Fame record).
   */
  inheritedFloor: number | null
}

/** The full four-stat decomposition, keyed by stat. */
export type StatBreakdown = Record<keyof CreatureStats, StatBreakdownRow>

/** Total pinned evolution boost a creature of the given stage has received. */
function stageBoostFor(stage: Creature["stage"]): CreatureStats {
  switch (stage) {
    case "baby":
      return { hp: 0, atk: 0, def: 0, spd: 0 }
    case "juvenile":
      return { ...EVOLUTION_STAT_BOOST }
    case "champion":
      return {
        hp: EVOLUTION_STAT_BOOST.hp + CHAMPION_STAT_BOOST.hp,
        atk: EVOLUTION_STAT_BOOST.atk + CHAMPION_STAT_BOOST.atk,
        def: EVOLUTION_STAT_BOOST.def + CHAMPION_STAT_BOOST.def,
        spd: EVOLUTION_STAT_BOOST.spd + CHAMPION_STAT_BOOST.spd,
      }
  }
}

/**
 * Decompose a creature's displayed stats into their four contributions.
 *
 * The floor is recomputed from the **most recent Hall of Fame record** (the
 * parent of the active creature) using the prestige as of the egg — the
 * parent's generation + 1 plus the lifetime cups at lay time — never from the
 * save's current totals, which may have grown since. A founder (empty Hall of
 * Fame) shows a null floor.
 *
 * Pure: reads its inputs, returns fresh rows; the caller renders them.
 */
export function statBreakdown(
  creature: Creature,
  lineage: LineageState,
): StatBreakdown {
  const eff = effectiveStats(creature)
  const boost = stageBoostFor(creature.stage)
  const parent = lineage.hallOfFame[lineage.hallOfFame.length - 1]
  const species = getSpecies(creature.speciesId)
  const floor =
    parent && species
      ? inheritedFloor(
          parent.stats,
          species,
          parent.generation + 1 + parent.cupsWon,
        )
      : null
  const row = (key: keyof CreatureStats): StatBreakdownRow => ({
    total: eff[key],
    baseRolled: creature.stats[key] - boost[key],
    trainedBonus: eff[key] - creature.stats[key],
    stageBoost: boost[key],
    inheritedFloor: floor ? floor[key] : null,
  })
  return {
    hp: row("hp"),
    atk: row("atk"),
    def: row("def"),
    spd: row("spd"),
  }
}
