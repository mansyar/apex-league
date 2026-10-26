/**
 * The branch catalog's starter table: two champion forms per starter line,
 * one offense and one defense. Their boosts preserve the legacy
 * effective-stat budget (11 juvenile, 22 champion, HP counted double), so
 * neither branch is a stat upgrade over the other.
 *
 * Pure data only — no DOM, no rendering, no I/O.
 */

import { type BranchDef, branchDef } from "./types"

/** The six starter forms: the layout `branches.ts` was built around. */
export const STARTER_BRANCHES: readonly BranchDef[] = Object.freeze([
  branchDef({
    id: "cinder_courser",
    speciesId: "fire_drake",
    label: "Cinder Courser",
    line: "Strike first and keep the pace — a courser wins by never letting the fight settle.",
    favors: ["atk", "spd"],
    juvenileBoost: { hp: 2, atk: 4, def: 1, spd: 2 },
    championBoost: { hp: 5, atk: 7, def: 3, spd: 2 },
    signatureMove: "cinder_dive",
    accentHue: 30,
  }),
  branchDef({
    id: "pyre_warden",
    speciesId: "fire_drake",
    label: "Pyre Warden",
    line: "Plant your feet and let them tire themselves against your hide.",
    favors: ["hp", "def"],
    juvenileBoost: { hp: 3, atk: 2, def: 3, spd: 0 },
    championBoost: { hp: 7, atk: 2, def: 6, spd: 0 },
    signatureMove: "pyre_wall",
    accentHue: 6,
  }),
  branchDef({
    id: "thorn_ram",
    speciesId: "plant_ox",
    label: "Thorn Ram",
    line: "Lower your head and drive — momentum is the whole plan.",
    favors: ["atk", "spd"],
    juvenileBoost: { hp: 2, atk: 4, def: 1, spd: 2 },
    championBoost: { hp: 5, atk: 5, def: 3, spd: 4 },
    signatureMove: "thorn_charge",
    accentHue: 122,
  }),
  branchDef({
    id: "bramble_bulwark",
    speciesId: "plant_ox",
    label: "Bramble Bulwark",
    line: "Stand like the thicket: nothing gets through, nothing gets past.",
    favors: ["hp", "def"],
    juvenileBoost: { hp: 3, atk: 2, def: 3, spd: 0 },
    championBoost: { hp: 7, atk: 3, def: 5, spd: 0 },
    signatureMove: "bramble_guard",
    accentHue: 98,
  }),
  branchDef({
    id: "riptide_runner",
    speciesId: "water_axolotl",
    label: "Riptide Runner",
    line: "Move with the current and be gone before the answer lands.",
    favors: ["atk", "spd"],
    juvenileBoost: { hp: 2, atk: 4, def: 1, spd: 2 },
    championBoost: { hp: 5, atk: 5, def: 4, spd: 3 },
    signatureMove: "riptide_rush",
    accentHue: 217,
  }),
  branchDef({
    id: "reef_keeper",
    speciesId: "water_axolotl",
    label: "Reef Keeper",
    line: "Hold the shallows and outlast whatever the tide brings.",
    favors: ["hp", "def"],
    juvenileBoost: { hp: 3, atk: 2, def: 3, spd: 0 },
    championBoost: { hp: 7, atk: 3, def: 5, spd: 0 },
    signatureMove: "tide_aegis",
    accentHue: 193,
  }),
])
