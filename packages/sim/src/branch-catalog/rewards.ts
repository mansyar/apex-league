/**
 * The branch catalog's ladder-reward table: two champion forms per
 * Silver/Gold/Legend line, one offense and one defense, on the same
 * effective-stat budget as the starters (11 juvenile, 22 champion).
 *
 * Pure data only — no DOM, no rendering, no I/O.
 */

import { type BranchDef, branchDef } from "./types"

/** The six reward-line forms: storm hound, landslide tortoise, squall falcon. */
export const REWARD_BRANCHES: readonly BranchDef[] = Object.freeze([
  branchDef({
    id: "storm_courser",
    speciesId: "electric_hound",
    label: "Storm Courser",
    line: "Run the lightning down before it can touch the ground.",
    favors: ["atk", "spd"],
    juvenileBoost: { hp: 2, atk: 4, def: 1, spd: 2 },
    championBoost: { hp: 4, atk: 7, def: 4, spd: 3 },
    signatureMove: "storm_surge",
    accentHue: 62,
  }),
  branchDef({
    id: "tempest_warden",
    speciesId: "electric_hound",
    label: "Tempest Warden",
    line: "Charge the air until nothing dares cross it.",
    favors: ["hp", "def"],
    juvenileBoost: { hp: 3, atk: 2, def: 3, spd: 0 },
    championBoost: { hp: 6, atk: 3, def: 7, spd: 0 },
    signatureMove: "ion_wall",
    accentHue: 38,
  }),
  branchDef({
    id: "landslide_ram",
    speciesId: "earth_tortoise",
    label: "Landslide Ram",
    line: "Tip the whole hillside and let gravity finish the fight.",
    favors: ["atk", "spd"],
    juvenileBoost: { hp: 2, atk: 4, def: 1, spd: 2 },
    championBoost: { hp: 6, atk: 6, def: 3, spd: 1 },
    signatureMove: "quake_stomp",
    accentHue: 40,
  }),
  branchDef({
    id: "rampart_keeper",
    speciesId: "earth_tortoise",
    label: "Rampart Keeper",
    line: "Dig in deep — the shell outlasts whatever charges it.",
    favors: ["hp", "def"],
    juvenileBoost: { hp: 3, atk: 2, def: 3, spd: 0 },
    championBoost: { hp: 7, atk: 2, def: 6, spd: 0 },
    signatureMove: "basalt_guard",
    accentHue: 16,
  }),
  branchDef({
    id: "squall_diver",
    speciesId: "wind_falcon",
    label: "Squall Diver",
    line: "Fall out of the sun and be gone before they look up.",
    favors: ["atk", "spd"],
    juvenileBoost: { hp: 2, atk: 4, def: 1, spd: 2 },
    championBoost: { hp: 4, atk: 7, def: 3, spd: 4 },
    signatureMove: "cyclone_dive",
    accentHue: 177,
  }),
  branchDef({
    id: "aerie_warden",
    speciesId: "wind_falcon",
    label: "Aerie Warden",
    line: "Circle high and make every challenger climb to lose.",
    favors: ["hp", "def"],
    juvenileBoost: { hp: 3, atk: 2, def: 3, spd: 0 },
    championBoost: { hp: 7, atk: 3, def: 5, spd: 0 },
    signatureMove: "zephyr_veil",
    accentHue: 153,
  }),
])
