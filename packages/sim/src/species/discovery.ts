/**
 * The breeding-discovery lines (`roster_wave_3` FR-1): three locked species,
 * one per singleton element, that enter play only through the breed-time
 * recipe lookup (`breeding/discovery`). They carry no `rewardFromTier`, so
 * the league grant seam never queues them and `obtainableSpecies` never
 * lists them — the nursery egg is their only way in.
 *
 * Each kit recomposes its element's existing vocabulary into a distinct
 * six-move set (the sorted set differs from the sibling line's); each stat
 * spread sits inside the bands the falcon/tortoise bounds pins enforce over
 * `ALL_SPECIES`. The `archetypeId` values reserve the voxel recipes Phase 2
 * authors — the fox, the heron, and the mole.
 *
 * Pure data only — no DOM, no rendering, no I/O.
 */

import type { SpeciesDef } from "./types"

/** The three breeding-discovery species, in recipe-table order. */
export const DISCOVERY_SPECIES: readonly SpeciesDef[] = Object.freeze([
  {
    id: "voltfox",
    archetypeId: "fox",
    displayName: "Voltfox",
    element: "electric",
    flavor: "A bright-eyed kit whose tail-tip sparks when a storm is near.",
    available: false,
    kit: [
      "static_jolt",
      "volt_dash",
      "ion_dart",
      "arc_shot",
      "storm_surge",
      "ion_wall",
    ],
    temperament: "obedient",
    statBounds: { hp: [74, 88], atk: [9, 12], def: [7, 10], spd: [11, 15] },
  },
  {
    id: "galeheron",
    archetypeId: "heron",
    displayName: "Galeheron",
    element: "wind",
    flavor: "A patient wader that reads the wind in the shallows.",
    available: false,
    kit: [
      "gust",
      "feather_dart",
      "talon_slash",
      "gale_cutter",
      "cyclone_dive",
      "zephyr_veil",
    ],
    temperament: "slow",
    statBounds: { hp: [78, 92], atk: [8, 11], def: [8, 11], spd: [9, 13] },
  },
  {
    id: "shalemole",
    archetypeId: "mole",
    displayName: "Shalemole",
    element: "earth",
    flavor: "A slate-scaled digger that naps through its own tremors.",
    available: false,
    kit: [
      "pebble_shot",
      "dust_devil",
      "sand_blast",
      "clay_burst",
      "quake_stomp",
      "basalt_guard",
    ],
    temperament: "rush",
    statBounds: { hp: [84, 98], atk: [9, 12], def: [11, 14], spd: [6, 9] },
  },
])
