/**
 * Creature entities: elements, life stages, conditions, and seeded creation.
 * Pure data and pure functions only — no DOM, no rendering, no I/O.
 */

import { makeRng, type Rng } from "./rng"
import { getSpecies, type SpeciesDef } from "./species"
import type { GameState } from "./state"
import type { TrainingProgram } from "./training"

/** The six league elements. Each has one fixed hue (type-color contract). */
export type Element = "fire" | "water" | "plant" | "electric" | "earth" | "wind"

/** A heritable lineage trait; egg-floor + display only, no battle effect. */
export type LineageTrait = "sturdy" | "fierce" | "guarded" | "quick"

/** Life stages. Champions arrive in a later track; babies mature here. */
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
  /**
   * Secondary type affinity (save v20): the differing parent's element won
   * by a seeded drift roll at breeding time. Null for every founder and
   * migrated creature. Never equal to `element`.
   */
  affinity: Element | null
  /**
   * Inherited lineage traits (save v15). Display + egg-floor only; never
   * consulted by the battle resolver.
   */
  traits: LineageTrait[]
  /**
   * Hall of Fame generations of this creature's parents. Empty for a founder;
   * one entry for a founder-pick successor; two for a bred successor.
   */
  parents: number[]
  stage: LifeStage
  /**
   * The evolution branch earned at the juvenile gate (save v19), or null
   * before the gate. `"legacy"` is migration-only: new creatures never earn
   * it, and a bred egg always starts null.
   */
  branch: string | null
  /**
   * True when this creature hatched from the league's Silver tier-reward
   * gift egg (save v21, electric species line FR-8). Lineage provenance
   * only — the client derives gift copy from it, and the hatch seam derives
   * the one-gift rule from it; never battle data.
   */
  giftEgg: boolean
  /**
   * Clean nights since the last sickness night, capped at
   * SICK_COOLDOWN_NIGHTS. Zero for a healthy run; the evolution care gate
   * (and later systems) read it as "recently sick" bookkeeping.
   */
  sickCooldown: number
  /** Rolled base stats. Never changed after creation. */
  stats: CreatureStats
  /**
   * Trained bonus per stat, on top of the rolled base. Each field stays
   * within [0, TRAINING_CAP]; the display/combat value is stats + trained.
   */
  trained: CreatureStats
  /** Tonight's assigned training program, or null when nothing is assigned. */
  trainingProgram: TrainingProgram | null
  /**
   * Outcome of the last program night, until the next assignment or a
   * programless night. Null when the last night had no program.
   */
  trainingResult: TrainingResult | null
  /** Lifetime count of days on which a program was assigned (AP spent). */
  trainingDays: number
  /** Chosen loadout of kit ids, or null to use the default slicing. */
  loadout: readonly string[] | null
  conditions: CreatureConditions
  /** True when a bonding action happened today; reset by the nightly settlement. */
  bondedToday: boolean
  /**
   * True when the creature was fed today; consumed by the ranch as the
   * visible "fed" state of the food pile and reset by the nightly settlement.
   */
  fedToday: boolean
}

/** The four trainable stat keys. */
export type StatKey = keyof CreatureStats

/**
 * Outcome of a program night: gained, or the reason it paid nothing.
 * `exhausted` means the program was assigned but the creature had no
 * energy to work with at lights-out.
 */
export type TrainingResult = "gained" | "sick" | "hungry" | "exhausted"

/** Trained bonus cap per stat, above the rolled base. */
export const TRAINING_CAP = 6

/** Trained bonus of a newly hatched creature: nothing trained yet. */
export const TRAINED_START: CreatureStats = Object.freeze({
  hp: 0,
  atk: 0,
  def: 0,
  spd: 0,
})

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

/**
 * The combat/display value of a creature's stats: the rolled base plus the
 * trained bonus, per stat (the Training contract for what later systems read).
 *
 * Since element_chart_20261016 doubled the HP scale, a trained HP point pays
 * double (+2 per point) so a training day keeps the same relative worth it
 * had before the scale-up; atk/def/spd points are unchanged.
 */
export function effectiveStats(
  creature: Pick<Creature, "stats" | "trained">,
): CreatureStats {
  return {
    hp: creature.stats.hp + 2 * creature.trained.hp,
    atk: creature.stats.atk + creature.trained.atk,
    def: creature.stats.def + creature.trained.def,
    spd: creature.stats.spd + creature.trained.spd,
  }
}

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
 * Create a creature from an already-resolved species definition, bypassing
 * the availability gate. Same seed -> same stats, so creature creation is
 * replayable. This is the unchecked creation seam: `createCreature` guards
 * it behind the species' `available` flag, and exactly one legitimate path
 * bypasses the gate — the Silver tier-reward gift egg (breeding.ts), which
 * must reach the locked electric_hound without loosening the public starter
 * gate.
 */
export function createCreatureFrom(
  species: SpeciesDef,
  seed: number | Rng,
): Creature {
  const rng = typeof seed === "number" ? makeRng(seed) : seed
  return {
    archetypeId: species.archetypeId,
    speciesId: species.id,
    name: species.displayName,
    element: species.element,
    affinity: null,
    traits: [],
    parents: [],
    stage: "baby",
    branch: null,
    giftEgg: false,
    sickCooldown: 0,
    stats: rollStats(rng, species),
    trained: { ...TRAINED_START },
    trainingProgram: null,
    trainingResult: null,
    trainingDays: 0,
    loadout: null,
    conditions: { ...CONDITION_START },
    bondedToday: false,
    fedToday: false,
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
  return createCreatureFrom(species, seed)
}

/** How long a player-chosen name may be after trimming. */
export const NAME_MAX_LENGTH = 16

export type RenameResult =
  | { ok: true; state: GameState }
  | { ok: false; reason: "no-creature" | "cup-phase" }

/**
 * Rename the partner (save v7 QoL). Free — no AP, no day cost. The name is
 * trimmed and clamped to NAME_MAX_LENGTH; an empty result resets to the
 * species' default display name. Blocked mid-cup so a rename can never
 * fight the bracket's identity bookkeeping.
 */
export function renameCreature(state: GameState, name: string): RenameResult {
  if (!state.creature) return { ok: false, reason: "no-creature" }
  if (state.phase === "cup") return { ok: false, reason: "cup-phase" }
  const trimmed = name.trim().slice(0, NAME_MAX_LENGTH)
  const nextName =
    trimmed.length > 0
      ? trimmed
      : (getSpecies(state.creature.speciesId)?.displayName ??
        state.creature.name)
  return {
    ok: true,
    state: {
      ...state,
      creature: { ...state.creature, name: nextName },
    },
  }
}
