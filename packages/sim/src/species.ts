/**
 * Species registry. The catalog tables live in the `./species` submodules —
 *
 * - `./species/types` — the shared `SpeciesDef` shape
 * - `./species/starters` — the three starter lines
 * - `./species/rewards` — the ladder-reward lines
 * - `./species/discovery` — the breeding-discovery lines (roster_wave_3)
 * - `./species/catalog` — the joined roster, acquisition gate, and lookup
 *
 * This module re-exports the same public surface the monolith exported, so
 * every consumer import (`./species`, `../species`) stays untouched.
 *
 * Pure data and pure functions only — no DOM, no rendering, no I/O.
 */

export {
  ALL_SPECIES,
  getSpecies,
  obtainableSpecies,
} from "./species/catalog"
export { DISCOVERY_SPECIES } from "./species/discovery"
export { REWARD_SPECIES, STORM_GIFT_SPECIES_ID } from "./species/rewards"
export { STARTER_SPECIES } from "./species/starters"
export type { SpeciesDef, Temperament } from "./species/types"
