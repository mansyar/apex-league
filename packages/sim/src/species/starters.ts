/**
 * The three starter lines (`species_roster_expansion` still calls them the
 * playable trio): always available, never tier-locked, and the only species
 * the ranch choice offers on day one.
 *
 * Pure data only — no DOM, no rendering, no I/O.
 */

import type { SpeciesDef } from "./types"

/** The three starter species, in ranch-offer order. */
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
