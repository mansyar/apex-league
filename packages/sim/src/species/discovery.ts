/**
 * The breeding-discovery lines (`roster_wave_3` FR-1, `roster_wave_4` FR-1):
 * six locked species that enter play only through the breed-time recipe
 * lookup (`breeding/discovery`). They carry no `rewardFromTier`, so the
 * league grant seam never queues them and `obtainableSpecies` never lists
 * them — the nursery egg is their only way in.
 *
 * Each kit recomposes its element's existing vocabulary into a distinct
 * six-move set (the sorted set differs from every sibling line's); each
 * stat spread sits inside the bands the falcon/tortoise bounds pins enforce
 * over `ALL_SPECIES`. Each wave's kit embeds the sibling lines' branch
 * signatures as kit rows, leaving the element's remaining free specials for
 * the new line's own branches. The `archetypeId` values name the voxel
 * recipes: the fox, heron, mole, cub, boar, otter, jerboa, ray and moth, plus
 * — for this wave — the sprite, the golem, and the wing.
 *
 * Pure data only — no DOM, no rendering, no I/O.
 */

import type { SpeciesDef } from "./types"

/** The twelve breeding-discovery species, in recipe-table order. */
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
    statBounds: { hp: [144, 174], atk: [9, 12], def: [6, 9], spd: [10, 14] },
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
    statBounds: { hp: [140, 169], atk: [8, 11], def: [7, 10], spd: [9, 13] },
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
    statBounds: { hp: [151, 181], atk: [8, 11], def: [10, 13], spd: [5, 8] },
  },
  {
    id: "embercub",
    archetypeId: "cub",
    displayName: "Embercub",
    element: "fire",
    flavor: "A bright-eyed cub whose mane smolders when it plays.",
    available: false,
    kit: [
      "flame_charge",
      "blaze_bolt",
      "flare_dart",
      "pyre_lance",
      "cinder_dive",
      "pyre_wall",
    ],
    temperament: "obedient",
    statBounds: { hp: [152, 181], atk: [9, 13], def: [8, 11], spd: [8, 11] },
  },
  {
    id: "mossboar",
    archetypeId: "boar",
    displayName: "Mossboar",
    element: "plant",
    flavor: "A moss-backed boar that treats every hill like a dare.",
    available: false,
    kit: [
      "thorn_volley",
      "spore_burst",
      "vine_lash",
      "root_quake",
      "thorn_charge",
      "bramble_guard",
    ],
    temperament: "rush",
    statBounds: { hp: [157, 186], atk: [8, 11], def: [13, 16], spd: [5, 8] },
  },
  {
    id: "mistkit",
    archetypeId: "otter",
    displayName: "Mistkit",
    element: "water",
    flavor:
      "A mist-diving otter-kit that vanishes into the spray and pops up laughing.",
    available: false,
    kit: [
      "tide_shot",
      "foam_volley",
      "mist_spray",
      "maelstrom",
      "riptide_rush",
      "tide_aegis",
    ],
    temperament: "rush",
    statBounds: { hp: [147, 176], atk: [12, 15], def: [8, 11], spd: [10, 14] },
  },
  {
    id: "dune_jerboa",
    archetypeId: "jerboa",
    displayName: "Dune Jerboa",
    element: "earth",
    flavor:
      "A long-legged hopper that bounds between dunes without leaving a print.",
    available: false,
    kit: [
      "tectonic_slam",
      "boulder_toss",
      "quake_stomp",
      "basalt_guard",
      "pebble_shot",
      "dust_devil",
    ],
    temperament: "rush",
    statBounds: { hp: [156, 158], atk: [18, 18], def: [8, 11], spd: [17, 17] },
  },
  {
    id: "spark_ray",
    archetypeId: "ray",
    displayName: "Spark Ray",
    element: "electric",
    flavor:
      "A wide-winged glider that gathers static in its fins and lets it go in a silent flash.",
    available: false,
    kit: [
      "storm_surge",
      "ion_wall",
      "gigavolt",
      "storm_bolt",
      "static_jolt",
      "volt_dash",
    ],
    temperament: "slow",
    statBounds: { hp: [150, 164], atk: [17, 20], def: [8, 11], spd: [15, 16] },
  },
  {
    id: "gale_moth",
    archetypeId: "moth",
    displayName: "Gale Moth",
    element: "wind",
    flavor:
      "A powder-winged moth that rides the breeze and leaves a glittering trail behind.",
    available: false,
    kit: [
      "gust",
      "talon_slash",
      "sky_bolt",
      "hurricane_spiral",
      "cyclone_dive",
      "zephyr_veil",
    ],
    temperament: "obedient",
    statBounds: { hp: [140, 152], atk: [13, 14], def: [7, 10], spd: [13, 16] },
  },
  {
    id: "thornvolt",
    archetypeId: "sprite",
    displayName: "Thornvolt",
    element: "wind",
    flavor:
      "A quick-thinking bramble sprite that rides the gusts between the thorns.",
    available: false,
    kit: [
      "feather_dart",
      "gale_cutter",
      "sky_bolt",
      "hurricane_spiral",
      "cyclone_dive",
      "zephyr_veil",
    ],
    temperament: "rush",
    statBounds: { hp: [145, 155], atk: [14, 16], def: [8, 10], spd: [14, 16] },
  },
  {
    id: "siltback",
    archetypeId: "golem",
    displayName: "Siltback",
    element: "water",
    flavor:
      "A silt-caked golem that settles into the riverbed and lets the current break.",
    available: false,
    kit: [
      "bubble",
      "tide_shot",
      "splash_bolt",
      "maelstrom",
      "riptide_rush",
      "tide_aegis",
    ],
    temperament: "slow",
    statBounds: { hp: [160, 190], atk: [12, 15], def: [12, 15], spd: [6, 9] },
  },
  {
    id: "emberwing",
    archetypeId: "wing",
    displayName: "Emberwing",
    element: "fire",
    flavor:
      "A cinder-plumed skirmisher that strikes from above and is gone before the ash falls.",
    available: false,
    kit: [
      "spark",
      "flame_charge",
      "cinder_shot",
      "pyre_lance",
      "cinder_dive",
      "pyre_wall",
    ],
    temperament: "rush",
    statBounds: { hp: [135, 165], atk: [15, 18], def: [6, 9], spd: [13, 16] },
  },
])
