/**
 * Affinity drift (affinity_drift_20261021): the chance a bred egg drifts
 * toward a differing parent's element. A seeded roll made once, at breeding
 * time, so the nursery preview and the hatch agree.
 *
 * Split out of the former monolithic breeding.ts (sim-voxel-size-guard,
 * phase 2) — pure relocation, no behavior change.
 */

import type { Element } from "../creature"
import type { RetiredRecord } from "../legacy/lineage"
import { makeRng, type Rng } from "../rng"
import type { SpeciesDef } from "../species"

/**
 * The chance a bred egg drifts toward a differing parent's element
 * (affinity_drift_20261021 FR-1): a seeded roll made once, at breeding
 * time, so the nursery preview and the hatch agree.
 */
export const AFFINITY_DRIFT_CHANCE = 0.15

/** A fixed salt keeps the drift roll decorrelated from the egg's stat stream. */
const AFFINITY_DRIFT_SALT = 0x85ebca6b

/**
 * The drift source: the parent whose element differs from the egg's species
 * element, or null when both parents share it. Only primary elements are
 * drift sources — a parent's own affinity never chains.
 */
export function driftSource(
  speciesElement: Element,
  parents: readonly RetiredRecord[],
): Element | null {
  const [sire, dam] = parents
  if (sire && sire.element !== speciesElement) return sire.element
  if (dam && dam.element !== speciesElement) return dam.element
  return null
}

/**
 * The seeded affinity drift roll. Like the rival kit, it draws from its own
 * stream derived from the seed under a distinct constant, so the egg's base
 * roll and mutation stay byte-identical whether or not a drift is possible.
 * Returns the differing parent's element on a hit, null otherwise (and
 * always null — with no draw consumed — when both parents share the
 * species element).
 */
export function rollAffinityDrift(
  species: SpeciesDef,
  parents: readonly RetiredRecord[],
  seed: number | Rng,
): Element | null {
  const source = driftSource(species.element, parents)
  if (!source) return null
  const rng =
    typeof seed === "number"
      ? makeRng((seed ^ AFFINITY_DRIFT_SALT) >>> 0)
      : seed
  // A draw at or above the threshold (1 - chance) drifts; below it the egg
  // stays pure. Boundary pinned by test.
  return rng.next() >= 1 - AFFINITY_DRIFT_CHANCE ? source : null
}
