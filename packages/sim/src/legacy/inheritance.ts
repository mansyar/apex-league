/**
 * Inheritance: the stat floor a successor inherits, and the seeded egg that
 * inherits it.
 *
 * Split out of the former monolithic `legacy.ts` (sim-voxel-size-guard,
 * phase 2).
 */

import {
  type Creature,
  type CreatureStats,
  createCreature,
  type LineageTrait,
} from "../creature"
import { getSpecies, type SpeciesDef } from "../species"
import { dedupeTraits, traitBonus } from "../traits"
import { lineagePerks } from "./lineage"

/**
 * Fraction of a parent's effective stats inherited as the next egg's stat
 * floor. Half: lineage is tangible without trivializing the roll — a strong
 * career lifts the floor, but the individual still rolls its own luck.
 */
export const INHERITANCE_FRACTION = 0.5

/**
 * The stronger-parent share of the dual-parent floor under Refined Blood
 * (prestige 7, affinity_drift prestige perks FR-4): eggs bred at or above
 * the milestone inherit 55% of the stronger parent instead of 50%. The
 * single-parent successor floor keeps the plain fraction — FR-4 scopes the
 * rise to bred (dual-parent) eggs only.
 */
export const REFINED_INHERITANCE_FRACTION = 0.55

/** The bond a successor starts with under the warm-bloodline perk. */
export const WARM_BOND_START = 20

/**
 * The per-stat floor a successor's rolled stats may never fall below: a
 * fraction of the parent's effective stats, plus one under the
 * established-line perk, then clamped into the species' legal bounds. Pure.
 */
export function inheritedFloor(
  parentEffective: CreatureStats,
  species: SpeciesDef,
  prestige: number,
  traits: readonly LineageTrait[] = [],
): CreatureStats {
  const bonus = lineagePerks(prestige).establishedLine ? 1 : 0
  const inherited = traitBonus(traits)
  const floorFor = (key: keyof CreatureStats): number => {
    const [lo, hi] = species.statBounds[key]
    // Clamp the weighted roll first, then add the milestone + trait bonuses.
    // The HP minimum would otherwise swallow a +2 Sturdy on every realistic
    // champion (half of ~100 HP is below the 76+ species floor).
    const rolled = Math.max(
      lo,
      Math.min(hi, Math.round(INHERITANCE_FRACTION * parentEffective[key])),
    )
    return Math.max(lo, Math.min(hi, rolled + bonus + inherited[key]))
  }
  return {
    hp: floorFor("hp"),
    atk: floorFor("atk"),
    def: floorFor("def"),
    spd: floorFor("spd"),
  }
}

/**
 * Create the next egg: a normal seeded roll of the chosen species, with each
 * stat floored by the parent's inheritance (R3). Same seed → same individual,
 * so succession stays replayable. The bond starts raised under the
 * warm-bloodline perk; every other condition uses the standard start.
 *
 * The successor hatches at one day of life (save v23): its age counts from
 * the day it hatches, not from the world day it was laid on.
 *
 * Throws on an unknown species (the caller must pick an available one).
 */
export interface InheritanceSource {
  /** The parent record's effective traits (hereditary). */
  traits: readonly LineageTrait[]
  /** The parent generations this successor descends from. */
  parents: readonly number[]
}

export function createInheritedCreature(
  speciesId: string,
  seed: number,
  parentEffective: CreatureStats,
  prestige: number,
  source?: InheritanceSource,
): Creature {
  const species = getSpecies(speciesId)
  if (!species) throw new Error(`Unknown species: ${speciesId}`)
  const floor = inheritedFloor(
    parentEffective,
    species,
    prestige,
    source?.traits,
  )
  const base = createCreature(speciesId, seed)
  const stats: CreatureStats = {
    hp: Math.max(base.stats.hp, floor.hp),
    atk: Math.max(base.stats.atk, floor.atk),
    def: Math.max(base.stats.def, floor.def),
    spd: Math.max(base.stats.spd, floor.spd),
  }
  const conditions = lineagePerks(prestige).warmBloodline
    ? {
        ...base.conditions,
        bond: Math.max(base.conditions.bond, WARM_BOND_START),
      }
    : base.conditions
  return {
    ...base,
    stats,
    conditions,
    traits: source ? dedupeTraits(source.traits) : [],
    parents: source ? [...source.parents] : [],
  }
}
