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
 * pinned stage constants. The inherited floor is recomputed from the parent
 * records (the exact inputs `graduate()` / `createBredCreature()` used when
 * the egg was laid), so no save-schema change is needed. Pure data and pure
 * functions only — no DOM, no rendering, no I/O.
 */

import { type BranchDef, getBranch, LEGACY_BRANCH } from "./branches"
import { inheritedFloorFromPair } from "./breeding"
import { type Creature, type CreatureStats, effectiveStats } from "./creature"
import { inheritedFloor, type LineageState } from "./legacy"
import { getSpecies } from "./species"
import { dedupeTraits, effectiveTraits } from "./traits"

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

/** The form whose boosts this creature's evolution actually applied. */
function branchOf(creature: Creature): BranchDef {
  return getBranch(creature.branch ?? LEGACY_BRANCH.id) ?? LEGACY_BRANCH
}

/**
 * Total pinned evolution boost a creature of the given stage has received.
 * The gate applies the earned branch's own boost (evolution.ts), so the
 * decomposition must read the same branch: a juvenile shows its
 * `juvenileBoost`, a champion that plus `championBoost`, and a legacy or
 * unbranched creature keeps the old pinned tables (LEGACY_BRANCH carries
 * exactly those numbers).
 */
function stageBoostFor(creature: Creature): CreatureStats {
  switch (creature.stage) {
    case "baby":
      return { hp: 0, atk: 0, def: 0, spd: 0 }
    case "juvenile":
      return { ...branchOf(creature).juvenileBoost }
    case "champion": {
      const branch = branchOf(creature)
      return {
        hp: branch.juvenileBoost.hp + branch.championBoost.hp,
        atk: branch.juvenileBoost.atk + branch.championBoost.atk,
        def: branch.juvenileBoost.def + branch.championBoost.def,
        spd: branch.juvenileBoost.spd + branch.championBoost.spd,
      }
    }
  }
}

/**
 * Decompose a creature's displayed stats into their four contributions.
 *
 * The floor is recomputed from the creature's recorded parents using the
 * prestige as of the egg — the retiring parent's generation + 1 plus the
 * lifetime cups at lay time — never from the save's current totals, which may
 * have grown since. A founder (no parents, empty Hall of Fame) shows a null
 * floor. A two-parent egg uses the dual-parent formula; a founder-pick
 * successor uses the single-parent formula.
 *
 * Pure: reads its inputs, returns fresh rows; the caller renders them.
 */
export function statBreakdown(
  creature: Creature,
  lineage: LineageState,
): StatBreakdown {
  const eff = effectiveStats(creature)
  const boost = stageBoostFor(creature)
  const hall = lineage.hallOfFame
  const last = hall[hall.length - 1]
  const species = getSpecies(creature.speciesId)
  const generations = creature.parents ?? []
  const parents =
    generations.length > 0
      ? generations
          .map((generation) =>
            hall.find((record) => record.generation === generation),
          )
          .filter((record): record is NonNullable<typeof record> =>
            Boolean(record),
          )
      : last
        ? [last]
        : []
  // The last archived record is the retiring parent, so its generation + 1 is
  // the successor's generation at lay time, regardless of which pair was used.
  const prestige = last ? last.generation + 1 + last.cupsWon : 0
  const [sire, dam] = parents
  const floor =
    species && sire && dam
      ? inheritedFloorFromPair(
          sire.stats,
          dam.stats,
          species,
          prestige,
          dedupeTraits(parents.flatMap((record) => effectiveTraits(record))),
        )
      : species && sire
        ? inheritedFloor(sire.stats, species, prestige, effectiveTraits(sire))
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
