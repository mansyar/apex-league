/**
 * Species definitions and the starter catalog.
 * Pure data only — no DOM, no rendering, no I/O.
 */

import type { Element, StatBounds } from "./creature"

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
  /** Whether the species can currently be acquired. */
  available: boolean
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

/** Look up a species by id, or undefined when unknown. */
export function getSpecies(id: string): SpeciesDef | undefined {
  return STARTER_SPECIES.find((s) => s.id === id)
}
