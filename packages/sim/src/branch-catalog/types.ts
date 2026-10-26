/**
 * The branch catalog's shared shape (`branching_evolution_20261020`): one
 * champion form's identity, favored pair, boosts, and signature move. Split
 * from `../branch-catalog.ts` (roster_wave_3) so the catalog's five group
 * tables stay under the sim module cap; the barrel keeps every consumer
 * import (`./branch-catalog`) untouched.
 *
 * Pure data only — no DOM, no rendering, no I/O.
 */

import type { CreatureStats, StatKey } from "../creature"

/** One champion form: identity, favored pair, boosts, and signature move. */
export interface BranchDef {
  /** Stable branch id used in saves and copy. `legacy` is the only fake id. */
  id: string
  /** Owning species id; null on the synthetic legacy branch. */
  speciesId: string | null
  /** Proper-noun form name ("Cinder Courser"). */
  label: string
  /** One-line coach copy explaining the form's approach to a fight. */
  line: string
  /** The two stats this form is trained on (offense: atk+spd; defense: hp+def). */
  favors: readonly StatKey[]
  /** Boost applied to the rolled base when leaving `baby`. */
  juvenileBoost: CreatureStats
  /** Cumulative boost applied when leaving `juvenile` (includes the first). */
  championBoost: CreatureStats
  /** The special this form learns at the juvenile gate; null for legacy. */
  signatureMove: string | null
  /** Runtime accent hue for the form's presentation. */
  accentHue: number
}

/** The seed a group table passes to `branchDef`. */
export interface BranchSeed {
  id: string
  speciesId: string | null
  label: string
  line: string
  favors: readonly StatKey[]
  juvenileBoost: CreatureStats
  championBoost: CreatureStats
  signatureMove: string | null
  accentHue: number
}

/** Freeze a branch all the way down so no caller can retune it at runtime. */
export function branchDef(seed: BranchSeed): BranchDef {
  return Object.freeze({
    ...seed,
    favors: Object.freeze([...seed.favors]),
    juvenileBoost: Object.freeze({ ...seed.juvenileBoost }),
    championBoost: Object.freeze({ ...seed.championBoost }),
  })
}
