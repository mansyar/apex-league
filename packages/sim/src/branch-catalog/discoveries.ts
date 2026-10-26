/**
 * The branch catalog's breeding-discovery table (roster_wave_3): two
 * champion forms per discovery line, one offense and one defense, on the
 * same effective-stat budget as every earlier line (11 juvenile, 22
 * champion). Each signature is a catalog special of the line's own element
 * that the line's own kit does not carry — the discovery kits embed the
 * reward-line branch signatures as kit rows, so the new forms claim the
 * element's remaining free specials instead.
 *
 * Pure data only — no DOM, no rendering, no I/O.
 */

import { type BranchDef, branchDef } from "./types"

/** The six discovery forms: voltfox, galeheron, shalemole. */
export const DISCOVERY_BRANCHES: readonly BranchDef[] = Object.freeze([
  branchDef({
    id: "arc_courser",
    speciesId: "voltfox",
    label: "Arc Courser",
    line: "Outrun the spark and land first — speed is the whole defense.",
    favors: ["atk", "spd"],
    juvenileBoost: { hp: 2, atk: 4, def: 1, spd: 2 },
    championBoost: { hp: 4, atk: 7, def: 4, spd: 3 },
    signatureMove: "gigavolt",
    accentHue: 55,
  }),
  branchDef({
    id: "galvanic_warden",
    speciesId: "voltfox",
    label: "Galvanic Warden",
    line: "Hold the charge in your fur until the field itself backs away.",
    favors: ["hp", "def"],
    juvenileBoost: { hp: 3, atk: 2, def: 3, spd: 0 },
    championBoost: { hp: 6, atk: 3, def: 7, spd: 0 },
    signatureMove: "storm_bolt",
    accentHue: 45,
  }),
  branchDef({
    id: "reed_diver",
    speciesId: "galeheron",
    label: "Reed Diver",
    line: "Fold out of the reeds and be gone before the splash lands.",
    favors: ["atk", "spd"],
    juvenileBoost: { hp: 2, atk: 4, def: 1, spd: 2 },
    championBoost: { hp: 4, atk: 7, def: 3, spd: 4 },
    signatureMove: "hurricane_spiral",
    accentHue: 170,
  }),
  branchDef({
    id: "marsh_warden",
    speciesId: "galeheron",
    label: "Marsh Warden",
    line: "Stand the shallows and let every gust break against you.",
    favors: ["hp", "def"],
    juvenileBoost: { hp: 3, atk: 2, def: 3, spd: 0 },
    championBoost: { hp: 7, atk: 3, def: 5, spd: 0 },
    signatureMove: "sky_bolt",
    accentHue: 160,
  }),
  branchDef({
    id: "slate_ram",
    speciesId: "shalemole",
    label: "Slate Ram",
    line: "Drop your head and let the whole hillside charge with you.",
    favors: ["atk", "spd"],
    juvenileBoost: { hp: 2, atk: 4, def: 1, spd: 2 },
    championBoost: { hp: 6, atk: 6, def: 3, spd: 1 },
    signatureMove: "tectonic_slam",
    accentHue: 33,
  }),
  branchDef({
    id: "shale_keeper",
    speciesId: "shalemole",
    label: "Shale Keeper",
    line: "Button down under your slates — nothing digs you out.",
    favors: ["hp", "def"],
    juvenileBoost: { hp: 3, atk: 2, def: 3, spd: 0 },
    championBoost: { hp: 7, atk: 2, def: 6, spd: 0 },
    signatureMove: "boulder_toss",
    accentHue: 23,
  }),
])
