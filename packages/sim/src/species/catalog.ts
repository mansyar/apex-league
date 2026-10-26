/**
 * The joined roster: starters, ladder rewards, and breeding-discovery lines.
 * `obtainableSpecies` is the acquisition gate — the discovery lines have no
 * `rewardFromTier` and are not starter-pickable, so they stay out of every
 * tier and enter play only through the breeding recipe lookup.
 *
 * Pure data and pure functions only — no DOM, no rendering, no I/O.
 */

import { tierAtLeast, type LadderTier } from "../ladder"
import { DISCOVERY_SPECIES } from "./discovery"
import { REWARD_SPECIES } from "./rewards"
import { STARTER_SPECIES } from "./starters"
import type { SpeciesDef } from "./types"

/** Every shipped species: the three starters, then rewards, then discovery. */
export const ALL_SPECIES: readonly SpeciesDef[] = Object.freeze([
  ...STARTER_SPECIES,
  ...REWARD_SPECIES,
  ...DISCOVERY_SPECIES,
])

/** Find a species by id, or undefined when unknown. */
export function getSpecies(id: string): SpeciesDef | undefined {
  return ALL_SPECIES.find((s) => s.id === id)
}

/**
 * The species a save at `tier` may hold: always the starters, plus every
 * reward line at or below the tier. Discovery lines are breeding-only and
 * never listed, at any tier.
 */
export function obtainableSpecies(tier: LadderTier): SpeciesDef[] {
  return [
    ...STARTER_SPECIES,
    ...REWARD_SPECIES.filter(
      (s) => s.rewardFromTier && tierAtLeast(tier, s.rewardFromTier),
    ),
  ]
}
