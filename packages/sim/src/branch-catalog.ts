/**
 * The branch catalog's data (`branching_evolution_20261020`): every starter
 * grows into one of two champion forms, and the form is earned from how the
 * creature was trained — never picked from a menu. This module holds the
 * frozen table itself; `branches.ts` owns the lookups and the training-
 * derived lean on top of it.
 *
 * The catalog is the single source of truth for branch ids, boosts, and the
 * signature move each form learns.
 *
 * Pure data only — no DOM, no rendering, no I/O.
 */

import type { CreatureStats, StatKey } from "./creature"

/** One champion form: identity, favored pair, boosts, and signature move. */
export interface BranchDef {
  /** Stable branch id used in saves and copy. `legacy` is the only fake id. */
  id: string
  /** Owning species id; null on the synthetic legacy branch. */
  speciesId: string | null
  /** Proper-noun form name ("Cinder Courser"). */
  label: string
  /** One-line coach copy explaining the form's approach to a fight. */
  line: string
  /** The two stats this form is trained on (offense: atk+spd; defense: hp+def). */
  favors: readonly StatKey[]
  /** Boost applied to the rolled base when leaving `baby`. */
  juvenileBoost: CreatureStats
  /** Cumulative boost applied when leaving `juvenile` (includes the first). */
  championBoost: CreatureStats
  /** The special this form learns at the juvenile gate; null for legacy. */
  signatureMove: string | null
  /** Runtime accent hue for the form's presentation. */
  accentHue: number
}

interface BranchSeed {
  id: string
  speciesId: string | null
  label: string
  line: string
  favors: readonly StatKey[]
  juvenileBoost: CreatureStats
  championBoost: CreatureStats
  signatureMove: string | null
  accentHue: number
}

/** Freeze a branch all the way down so no caller can retune it at runtime. */
function branchDef(seed: BranchSeed): BranchDef {
  return Object.freeze({
    ...seed,
    favors: Object.freeze([...seed.favors]),
    juvenileBoost: Object.freeze({ ...seed.juvenileBoost }),
    championBoost: Object.freeze({ ...seed.championBoost }),
  })
}

/**
 * The eighteen real forms: two per species, one offense and one defense.
 * Their boosts preserve the legacy effective-stat budget (11 juvenile, 22
 * champion, HP counted double), so neither branch is a stat upgrade over
 * the other. A form's signature may be a kit row of its own species' element
 * vocabulary that another species carries in its kit (user decision
 * 2026-10-25): the signature is still form-exclusive in the boss sense —
 * no boss wields the signature of a species it is not.
 */
export const BRANCHES: readonly BranchDef[] = Object.freeze([
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
