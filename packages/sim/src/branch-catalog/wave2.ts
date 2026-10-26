/**
 * The branch catalog's roster-expansion table (20261025): two champion
 * forms per Wave-2 line, one offense and one defense, on the same
 * effective-stat budget as every earlier line (11 juvenile, 22 champion).
 *
 * Pure data only — no DOM, no rendering, no I/O.
 */

import { type BranchDef, branchDef } from "./types"

/** The six Wave-2 forms: fernstag, reefclaw, cindermoor. */
export const WAVE2_BRANCHES: readonly BranchDef[] = Object.freeze([
  branchDef({
    id: "frond_lasher",
    speciesId: "fernstag",
    label: "Frond Lasher",
    line: "Whip low and whip fast — the frond never stops moving.",
    favors: ["atk", "spd"],
    juvenileBoost: { hp: 2, atk: 4, def: 1, spd: 2 },
    championBoost: { hp: 4, atk: 6, def: 3, spd: 5 },
    signatureMove: "root_quake",
    accentHue: 140,
  }),
  branchDef({
    id: "spore_warden",
    speciesId: "fernstag",
    label: "Spore Warden",
    line: "Breathe out the cloud and let the rash finish the argument.",
    favors: ["hp", "def"],
    juvenileBoost: { hp: 3, atk: 2, def: 3, spd: 0 },
    championBoost: { hp: 7, atk: 3, def: 5, spd: 0 },
    signatureMove: "spore_burst",
    accentHue: 105,
  }),
  branchDef({
    id: "whirlpool_claw",
    speciesId: "reefclaw",
    label: "Whirlpool Claw",
    line: "Pin the current and spin — the whirlpool does the rest.",
    favors: ["atk", "spd"],
    juvenileBoost: { hp: 2, atk: 4, def: 1, spd: 2 },
    championBoost: { hp: 5, atk: 6, def: 3, spd: 3 },
    signatureMove: "maelstrom",
    accentHue: 200,
  }),
  branchDef({
    id: "tide_sentinel",
    speciesId: "reefclaw",
    label: "Tide Sentinel",
    line: "Stand in the shallows and answer every charge with the tide.",
    favors: ["hp", "def"],
    juvenileBoost: { hp: 3, atk: 2, def: 3, spd: 0 },
    championBoost: { hp: 7, atk: 2, def: 6, spd: 0 },
    signatureMove: "tide_shot",
    accentHue: 230,
  }),
  branchDef({
    id: "pyre_colossus",
    speciesId: "cindermoor",
    label: "Pyre Colossus",
    line: "Gather the heat until one long spear ends the fight.",
    favors: ["atk", "spd"],
    juvenileBoost: { hp: 2, atk: 4, def: 1, spd: 2 },
    championBoost: { hp: 5, atk: 7, def: 3, spd: 2 },
    signatureMove: "pyre_lance",
    accentHue: 12,
  }),
  branchDef({
    id: "ember_bank",
    speciesId: "cindermoor",
    label: "Ember Bank",
    line: "Bank the coals low and outlast whatever charges in.",
    favors: ["hp", "def"],
    juvenileBoost: { hp: 3, atk: 2, def: 3, spd: 0 },
    championBoost: { hp: 6, atk: 3, def: 7, spd: 0 },
    signatureMove: "flame_charge",
    accentHue: 2,
  }),
])
