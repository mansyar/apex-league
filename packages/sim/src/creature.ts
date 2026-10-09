/**
 * Creature entities: elements, life stages, conditions, and seeded creation.
 * Pure data and pure functions only — no DOM, no rendering, no I/O.
 */

import { makeRng, type Rng } from "./rng"
import { getSpecies, type SpeciesDef } from "./species"

/** The six league elements. Each has one fixed hue (type-color contract). */
export type Element = "fire" | "water" | "plant" | "electric" | "earth" | "wind"

/** Life stages. Stage progression (evolution) lands in a later track. */
export type LifeStage = "baby" | "juvenile" | "champion"

/** Inclusive [min, max] bounds for a rolled stat. */
export type StatBounds = readonly [number, number]

/** The four classic battle stats. */
export interface CreatureStats {
  hp: number
  atk: number
  def: number
  spd: number
}

/**
 * Care conditions on a uniform 0-100 scale where 100 is always best
 * (hunger 100 = well-fed, energy 100 = rested, health 100 = healthy).
 */
export interface CreatureConditions {
  hunger: number
  energy: number
  health: number
  mood: number
  bond: number
}

/** A creature owned by the player. */
export interface Creature {
  /** Voxel archetype id used for rendering ("draconic", "bovine", ...). */
  archetypeId: string
  /** Species id from the starter catalog / encyclopedia. */
  speciesId: string
  /** Proper-noun display name (defaults to the species name). */
  name: string
  element: Element
  stage: LifeStage
  stats: CreatureStats
  conditions: CreatureConditions
  /** True when a bonding action happened today; reset by the nightly settlement. */
  bondedToday: boolean
}

/** Upper bound of every condition scale. */
export const CONDITION_MAX = 100

/**
 * Conditions of a newly hatched creature: well-fed, rested, healthy, curious,
 * and barely bonded.
 */
export const CONDITION_START: CreatureConditions = Object.freeze({
  hunger: 80,
  energy: 80,
  health: 100,
  mood: 60,
  bond: 10,
})

function rollStat(rng: Rng, bounds: StatBounds): number {
  const [min, max] = bounds
  return min + rng.int(max - min + 1)
}

function rollStats(rng: Rng, species: SpeciesDef): CreatureStats {
  return {
    hp: rollStat(rng, species.statBounds.hp),
    atk: rollStat(rng, species.statBounds.atk),
    def: rollStat(rng, species.statBounds.def),
    spd: rollStat(rng, species.statBounds.spd),
  }
}

/**
 * Create a creature of the given species from a seed (or an injected Rng).
 * Same seed -> same stats, so creature creation is replayable.
 * Throws on unknown or unavailable (locked) species.
 */
export function createCreature(
  speciesId: string,
  seed: number | Rng,
): Creature {
  const species = getSpecies(speciesId)
  if (!species) throw new Error(`Unknown species: ${speciesId}`)
  if (!species.available) {
    throw new Error(`Species not yet available: ${speciesId}`)
  }
  const rng = typeof seed === "number" ? makeRng(seed) : seed
  return {
    archetypeId: species.archetypeId,
    speciesId: species.id,
    name: species.displayName,
    element: species.element,
    stage: "baby",
    stats: rollStats(rng, species),
    conditions: { ...CONDITION_START },
    bondedToday: false,
  }
}
