/**
 * Dynasty breeding (`dynasty_breeding_20261018`): the pool of retired Hall of
 * Fame records, pair validation, and the dual-parent egg. A pair contributes
 * 50% of the stronger parent + 10% of the weaker per stat, then trait bonuses
 * and the established-line perk, clamped to the species bounds. One seeded
 * mutation (+1..+2 to one stat) is baked into the hatched stats. A bred egg
 * may also drift toward a differing parent's element: one seeded 15% roll
 * (affinity_drift_20261021) decides the egg's `affinity`.
 *
 * Barrel module (sim-voxel-size-guard, phase 2): the implementation lives in
 * the ./breeding submodules —
 *
 * - `./breeding/pairing` — the pool, pair validation, the dual-parent egg
 * - `./breeding/drift` — the seeded affinity-drift roll
 * - `./breeding/gift` — the Storm Gift grant, hatch, and preview
 *
 * This module re-exports the same public surface the monolith exported, so
 * every consumer import (`./breeding`, `../breeding`) stays untouched.
 *
 * Pure data and pure functions only — no DOM, no I/O.
 */

export {
  AFFINITY_DRIFT_CHANCE,
  driftSource,
  rollAffinityDrift,
} from "./breeding/drift"
export {
  createGiftEgg,
  type HatchGiftReason,
  type HatchGiftResult,
  hatchGiftEgg,
  STORM_GIFT_SPECIES_ID,
  type StormGiftPreview,
  stormGiftPending,
  stormGiftPreview,
} from "./breeding/gift"
export {
  breedingPool,
  canBreed,
  createBredCreature,
  type GraduatePairReason,
  type GraduatePairResult,
  graduateWithPair,
  inheritedFloorFromPair,
  PAIR_SECONDARY_FRACTION,
  type PairReason,
  type PairVerdict,
  pairFor,
  speciesOptions,
  validatePair,
} from "./breeding/pairing"
export { retireeRecord } from "./legacy"
export {
  deriveTrait,
  effectiveTraits,
  isLineageTrait,
  TRAIT_ORDER,
  TRAITS,
  type TraitDef,
  traitBonus,
} from "./traits"
