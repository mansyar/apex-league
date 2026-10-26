/**
 * The ladder-reward lines: locked species each tier pays, oldest tier first.
 * A reward line is never starter-pickable; it enters play only through the
 * league grant seam (`breeding/gift`), which queues one egg per line.
 *
 * Pure data only — no DOM, no rendering, no I/O.
 */

import type { SpeciesDef } from "./types"

/** The pre-expansion reward line the Copper keepsake still names. */
export const STORM_GIFT_SPECIES_ID = "electric_hound"

/** The six ladder-reward species, in tier/oldest-first order. */
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
  {
    id: "fernstag",
    archetypeId: "frond",
    displayName: "Whistlefern",
    element: "plant",
    flavor:
      "A quick-growing frond that snaps its leaves like castanets when it spars.",
    available: false,
    rewardFromTier: "silver",
    kit: [
      "seed_shot",
      "thorn_volley",
      "vine_lash",
      "thorn_charge",
      "bramble_dart",
      "bramble_guard",
    ],
    temperament: "obedient",
    statBounds: { hp: [70, 84], atk: [8, 12], def: [8, 11], spd: [10, 14] },
  },
  {
    id: "wind_falcon",
    archetypeId: "falcon",
    displayName: "Zephyr Falcon",
    element: "wind",
    flavor: "A restless sprinter that naps mid-gust and never drops a feather.",
    available: false,
    rewardFromTier: "gold",
    kit: [
      "gust",
      "feather_dart",
      "gale_cutter",
      "sky_bolt",
      "talon_slash",
      "hurricane_spiral",
    ],
    temperament: "rush",
    statBounds: { hp: [56, 68], atk: [10, 14], def: [4, 7], spd: [17, 19] },
  },
  {
    id: "reefclaw",
    archetypeId: "crab",
    displayName: "Coral Claw",
    element: "water",
    flavor:
      "A patient pincer crab that polishes its claws on the reef between fights.",
    available: false,
    rewardFromTier: "gold",
    kit: [
      "bubble",
      "mist_spray",
      "foam_volley",
      "riptide_rush",
      "splash_bolt",
      "tide_aegis",
    ],
    temperament: "slow",
    statBounds: { hp: [86, 100], atk: [10, 13], def: [12, 14], spd: [4, 7] },
  },
  {
    id: "earth_tortoise",
    archetypeId: "tortoise",
    displayName: "Basalt Tortoise",
    element: "earth",
    flavor:
      "A patient wanderer whose mossy shell carries its own little meadow. It never hurries, and it never has to.",
    available: false,
    rewardFromTier: "legend",
    kit: [
      "pebble_shot",
      "dust_devil",
      "clay_burst",
      "boulder_toss",
      "sand_blast",
      "tectonic_slam",
    ],
    temperament: "slow",
    statBounds: { hp: [105, 120], atk: [7, 10], def: [15, 18], spd: [2, 4] },
  },
  {
    id: "cindermoor",
    archetypeId: "smolder",
    displayName: "Moor Cinder",
    element: "fire",
    flavor:
      "A heavy, smoldering grazer whose back vents a slow line of smoke. It does not hurry; the fire does the waiting for it.",
    available: false,
    rewardFromTier: "legend",
    kit: [
      "spark",
      "flare_dart",
      "cinder_shot",
      "cinder_dive",
      "blaze_bolt",
      "pyre_wall",
    ],
    temperament: "rush",
    statBounds: { hp: [84, 98], atk: [11, 14], def: [9, 12], spd: [6, 8] },
  },
])
