/**
 * Branch catalog and the training-derived lean (`branching_evolution_20261020`):
 * every starter grows into one of two champion forms, and the form is earned
 * from how the creature was trained — never picked from a menu.
 *
 * The catalog's frozen table lives in `./branch-catalog` (the sim module
 * size cap splits data from behavior); this module owns the lookups and the
 * training-derived lean on top of it and re-exports the catalog's surface.
 * `legacy` is synthetic: it carries the
 * pre-branch juvenile and champion boosts for migrated and boss creatures and
 * is never returned by a species lookup.
 *
 * Pure data and pure functions only — no DOM, no rendering, no I/O.
 */

import { BRANCHES, type BranchDef } from "./branch-catalog"
import {
  type Creature,
  type CreatureStats,
  effectiveStats,
  type StatKey,
} from "./creature"
import type { SpeciesDef } from "./species"

export { BRANCHES, type BranchDef } from "./branch-catalog"

/** Offense favors power and sprint. */
const OFFENSE: readonly StatKey[] = Object.freeze(["atk", "spd"])

/** Defense favors endurance and ring work. */
const DEFENSE: readonly StatKey[] = Object.freeze(["hp", "def"])

/** The four trainable stats, in display order. */
const STAT_KEYS: readonly StatKey[] = ["hp", "atk", "def", "spd"]

/**
 * The pre-branch juvenile boost. Defined here so the legacy numbers have one
 * home; `evolution.ts` re-exports them under the historical names.
 */
export const LEGACY_JUVENILE_BOOST: CreatureStats = Object.freeze({
  hp: 3,
  atk: 2,
  def: 2,
  spd: 1,
})

/**
 * The pre-branch cumulative champion boost ({hp:6, atk:4, def:4, spd:2} =
 * two juvenile steps), pinned so a migrated champion's stats can never drift.
 */
export const LEGACY_CHAMPION_BOOST: CreatureStats = Object.freeze({
  hp: 6,
  atk: 4,
  def: 4,
  spd: 2,
})

/**
 * The synthetic pre-v19 form: legacy boosts, no signature, no species. New
 * creatures can never earn it; only migration and pinned boss definitions
 * carry it.
 */
export const LEGACY_BRANCH: BranchDef = Object.freeze({
  id: "legacy",
  speciesId: null,
  label: "Legacy",
  line: "The old straight line — no fork, no signature, the same climb as before.",
  favors: Object.freeze([]),
  juvenileBoost: LEGACY_JUVENILE_BOOST,
  championBoost: LEGACY_CHAMPION_BOOST,
  signatureMove: null,
  accentHue: 0,
})

const BRANCH_INDEX = new Map(
  [...BRANCHES, LEGACY_BRANCH].map((branch) => [branch.id, branch]),
)

/** Look up a branch by id (including `legacy`), or undefined when unknown. */
export function getBranch(id: string): BranchDef | undefined {
  return BRANCH_INDEX.get(id)
}

/**
 * The real branches for a species, in catalog order. Empty for an unknown
 * species or for `legacy` — the legacy branch is never species-owned.
 */
export function branchesForSpecies(speciesId: string): BranchDef[] {
  return BRANCHES.filter((branch) => branch.speciesId === speciesId)
}

/** Where the lean came from: the training record or the rolled base stats. */
export type LeanSource = "trained" | "nature"

/** The branch a creature would earn now, plus why. */
export interface BranchLean {
  branch: BranchDef
  source: LeanSource
}

function sideTotal(stats: CreatureStats, pair: readonly StatKey[]): number {
  return pair.reduce((total, key) => total + stats[key], 0)
}

function favoredBranch(
  branches: readonly BranchDef[],
  pair: readonly StatKey[],
): BranchDef | null {
  return (
    branches.find(
      (branch) =>
        branch.favors.length === pair.length &&
        pair.every((key) => branch.favors.includes(key)),
    ) ?? null
  )
}

/**
 * Steps 1-2 of the lean rule over one stat block: the higher favored pair
 * wins, then the highest single stat when that maximum belongs to one side
 * only. Null means the block is still tied and the caller must continue.
 */
function decideLean(
  stats: CreatureStats,
  branches: readonly BranchDef[],
): BranchDef | null {
  const offense = sideTotal(stats, OFFENSE)
  const defense = sideTotal(stats, DEFENSE)
  if (offense !== defense) {
    return favoredBranch(branches, offense > defense ? OFFENSE : DEFENSE)
  }
  const highest = Math.max(...STAT_KEYS.map((key) => stats[key]))
  const topKeys = STAT_KEYS.filter((key) => stats[key] === highest)
  const sides = new Set(
    topKeys.map((key) => (OFFENSE.includes(key) ? "o" : "d")),
  )
  if (sides.size !== 1) return null
  return favoredBranch(branches, sides.has("o") ? OFFENSE : DEFENSE)
}

/**
 * The branch this creature would earn right now (FR-2). Pure, integer-only,
 * and deterministic:
 *
 * 1. the higher trained pair (atk+spd vs hp+def) wins;
 * 2. if tied, the highest single trained stat decides when its maximum sits
 *    on one side only;
 * 3. steps 1-2 repeat over `effectiveStats` (rolled base + trained);
 * 4. if still tied, the species' catalog order wins.
 *
 * The source is `trained` when steps 1-2 decided and `nature` when the base
 * stats did. `evolveCreature` and the growth panel both call this — there is
 * no second copy of the rule.
 */
export function branchLean(
  creature: Pick<Creature, "trained" | "stats" | "speciesId">,
  species: SpeciesDef,
): BranchLean {
  const branches = branchesForSpecies(species.id)
  const trained = decideLean(creature.trained, branches)
  if (trained) return { branch: trained, source: "trained" }
  const natural = decideLean(effectiveStats(creature), branches)
  if (natural) return { branch: natural, source: "nature" }
  const first = branches[0]
  return { branch: first ?? LEGACY_BRANCH, source: "nature" }
}
