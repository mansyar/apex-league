/**
 * Species definitions and the species catalog.
 * Pure data only — no DOM, no rendering, no I/O.
 */

import type { Element, StatBounds } from "./creature"
import { type LadderTier, tierAtLeast } from "./ladder"

/** A species' in-battle behaviour, stored on the definition, never on a save. */
export type Temperament = "rush" | "slow" | "obedient"

/** A species definition: identity plus the legal range of its stat rolls. */
export interface SpeciesDef {
  /** Stable species id used in saves and the encyclopedia. */
  id: string
  /** Voxel archetype id that renders this species ("draconic", ...). */
  archetypeId: string
  /** Proper-noun display name (creature default name). */
  displayName: string
  element: Element
  /** One-line flavor text for the starter choice card. */
  flavor: string
  /**
   * Whether the player may pick this species at the start — the starter
   * gate. Reward species are `false` here: the league grants them, the
   * player never chooses them at the start line. `createCreature` (the
   * starter seam) refuses those ids; the reward and breeding seams do
   * not, because by then the league has handed the species over.
   */
  available: boolean
  /**
   * The ladder tier that unlocks this species as a league reward, and
   * with it the generated rival field (electric species line FR-5/FR-7).
   * Absent for starters and for species the league has not released.
   */
  rewardFromTier?: LadderTier
  /** Fixed six-move pool, one row per element tier (the first four form the
   * classic unlocked kit; the last two open with the wider pool). */
  kit: readonly string[]
  /** Fixed in-battle behaviour. Not a damage modifier. */
  temperament: Temperament
  statBounds: {
    hp: StatBounds
    atk: StatBounds
    def: StatBounds
    spd: StatBounds
  }
}

/**
 * The starter roster. All three elements (fire, plant, water) are playable;
 * each species reserves its slot with `available` so future starters can be
 * teased while locked.
 */
export const STARTER_SPECIES: readonly SpeciesDef[] = Object.freeze([
  {
    id: "fire_drake",
    archetypeId: "draconic",
    displayName: "Ember Drake",
    element: "fire",
    flavor: "A bold little drake whose tail sparks when it gets excited.",
    available: true,
    kit: [
      "spark",
      "flame_charge",
      "cinder_shot",
      "blaze_bolt",
      "flare_dart",
      "pyre_lance",
    ],
    temperament: "rush",
    statBounds: { hp: [76, 92], atk: [9, 13], def: [7, 10], spd: [9, 12] },
  },
  {
    id: "plant_ox",
    archetypeId: "bovine",
    displayName: "Bramble Ox",
    element: "plant",
    flavor: "A stocky, patient grazer that grows steadier by the day.",
    available: true,
    kit: [
      "seed_shot",
      "thorn_volley",
      "spore_burst",
      "bramble_dart",
      "vine_lash",
      "root_quake",
    ],
    temperament: "slow",
    statBounds: { hp: [88, 104], atk: [8, 11], def: [10, 14], spd: [5, 8] },
  },
  {
    id: "water_axolotl",
    archetypeId: "axolotl",
    displayName: "Tide Axolotl",
    element: "water",
    flavor: "An easygoing swimmer that hums bubbles when it is happy.",
    available: true,
    kit: [
      "bubble",
      "tide_shot",
      "foam_volley",
      "splash_bolt",
      "mist_spray",
      "maelstrom",
    ],
    temperament: "obedient",
    statBounds: { hp: [80, 96], atk: [8, 12], def: [8, 11], spd: [8, 11] },
  },
])

/**
 * The Silver tier-reward species: the league's one-time "Storm Gift"
 * (electric species line FR-5). The grant seam and the hatch seam both
 * name it from here, so they can never disagree.
 */
export const STORM_GIFT_SPECIES_ID = "electric_hound"

/**
 * The species the league grants as a ladder reward rather than as a
 * starter. Each carries the tier that unlocks it, so the rival field and
 * the reward itself read the same contract instead of guessing from an
 * array's membership (FR-7).
 */
export const REWARD_SPECIES: readonly SpeciesDef[] = Object.freeze([
  {
    id: "electric_hound",
    archetypeId: "storm_hound",
    displayName: "Storm Hound",
    element: "electric",
    flavor: "A crackling sprinter that sheds sparks with every stride.",
    available: false,
    rewardFromTier: "silver",
    kit: [
      "static_jolt",
      "volt_dash",
      "arc_shot",
      "storm_bolt",
      "ion_dart",
      "gigavolt",
    ],
    temperament: "rush",
    statBounds: { hp: [70, 84], atk: [10, 14], def: [5, 8], spd: [12, 16] },
  },
])

/** Every defined species: starters first, reward species after. */
export const ALL_SPECIES: readonly SpeciesDef[] = Object.freeze([
  ...STARTER_SPECIES,
  ...REWARD_SPECIES,
])

/**
 * The species a player can hold once the league has reached `tier`: the
 * starters plus every reward species unlocked at or below it. Bronze gets
 * the three starters alone, so a pre-Silver bracket is exactly the bracket
 * it always was (FR-7).
 */
export function obtainableSpecies(tier: LadderTier): readonly SpeciesDef[] {
  return Object.freeze([
    ...STARTER_SPECIES,
    ...REWARD_SPECIES.filter(
      (species) =>
        species.rewardFromTier !== undefined &&
        tierAtLeast(tier, species.rewardFromTier),
    ),
  ])
}

/** Look up a species by id, or undefined when unknown. */
export function getSpecies(id: string): SpeciesDef | undefined {
  return ALL_SPECIES.find((s) => s.id === id)
}
