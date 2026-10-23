/**
 * Branch catalog and the training-derived lean (`branching_evolution_20261020`):
 * every starter grows into one of two champion forms, and the form is earned
 * from how the creature was trained — never picked from a menu.
 *
 * The catalog is the single source of truth for branch ids, boosts, and the
 * signature move each form learns. `legacy` is synthetic: it carries the
 * pre-branch juvenile and champion boosts for migrated and boss creatures and
 * is never returned by a species lookup.
 *
 * Pure data and pure functions only — no DOM, no rendering, no I/O.
 */

import {
  type Creature,
  type CreatureStats,
  effectiveStats,
  type StatKey,
} from "./creature"
import type { SpeciesDef } from "./species"

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

/** Offense favors power and sprint. */
const OFFENSE: readonly StatKey[] = Object.freeze(["atk", "spd"])

/** Defense favors endurance and ring work. */
const DEFENSE: readonly StatKey[] = Object.freeze(["hp", "def"])

/** The four trainable stats, in display order. */
const STAT_KEYS: readonly StatKey[] = ["hp", "atk", "def", "spd"]

/**
 * The pre-branch juvenile boost. Defined here so the legacy numbers have one
 * home; `evolution.ts` re-exports them under the historical names.
 */
export const LEGACY_JUVENILE_BOOST: CreatureStats = Object.freeze({
  hp: 3,
  atk: 2,
  def: 2,
  spd: 1,
})

/**
 * The pre-branch cumulative champion boost ({hp:6, atk:4, def:4, spd:2} =
 * two juvenile steps), pinned so a migrated champion's stats can never drift.
 */
export const LEGACY_CHAMPION_BOOST: CreatureStats = Object.freeze({
  hp: 6,
  atk: 4,
  def: 4,
  spd: 2,
})

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
 * The twelve real forms: two per species, one offense and one defense. Their
 * boosts preserve the legacy effective-stat budget (11 juvenile, 22 champion,
 * HP counted double), so neither branch is a stat upgrade over the other.
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
])

/**
 * The synthetic pre-v19 form: legacy boosts, no signature, no species. New
 * creatures can never earn it; only migration and pinned boss definitions
 * carry it.
 */
export const LEGACY_BRANCH: BranchDef = Object.freeze({
  id: "legacy",
  speciesId: null,
  label: "Legacy",
  line: "The old straight line — no fork, no signature, the same climb as before.",
  favors: Object.freeze([]),
  juvenileBoost: LEGACY_JUVENILE_BOOST,
  championBoost: LEGACY_CHAMPION_BOOST,
  signatureMove: null,
  accentHue: 0,
})

const BRANCH_INDEX = new Map(
  [...BRANCHES, LEGACY_BRANCH].map((branch) => [branch.id, branch]),
)

/** Look up a branch by id (including `legacy`), or undefined when unknown. */
export function getBranch(id: string): BranchDef | undefined {
  return BRANCH_INDEX.get(id)
}

/**
 * The real branches for a species, in catalog order. Empty for an unknown
 * species or for `legacy` — the legacy branch is never species-owned.
 */
export function branchesForSpecies(speciesId: string): BranchDef[] {
  return BRANCHES.filter((branch) => branch.speciesId === speciesId)
}

/** Where the lean came from: the training record or the rolled base stats. */
export type LeanSource = "trained" | "nature"

/** The branch a creature would earn now, plus why. */
export interface BranchLean {
  branch: BranchDef
  source: LeanSource
}

function sideTotal(stats: CreatureStats, pair: readonly StatKey[]): number {
  return pair.reduce((total, key) => total + stats[key], 0)
}

function favoredBranch(
  branches: readonly BranchDef[],
  pair: readonly StatKey[],
): BranchDef | null {
  return (
    branches.find(
      (branch) =>
        branch.favors.length === pair.length &&
        pair.every((key) => branch.favors.includes(key)),
    ) ?? null
  )
}

/**
 * Steps 1-2 of the lean rule over one stat block: the higher favored pair
 * wins, then the highest single stat when that maximum belongs to one side
 * only. Null means the block is still tied and the caller must continue.
 */
function decideLean(
  stats: CreatureStats,
  branches: readonly BranchDef[],
): BranchDef | null {
  const offense = sideTotal(stats, OFFENSE)
  const defense = sideTotal(stats, DEFENSE)
  if (offense !== defense) {
    return favoredBranch(branches, offense > defense ? OFFENSE : DEFENSE)
  }
  const highest = Math.max(...STAT_KEYS.map((key) => stats[key]))
  const topKeys = STAT_KEYS.filter((key) => stats[key] === highest)
  const sides = new Set(
    topKeys.map((key) => (OFFENSE.includes(key) ? "o" : "d")),
  )
  if (sides.size !== 1) return null
  return favoredBranch(branches, sides.has("o") ? OFFENSE : DEFENSE)
}

/**
 * The branch this creature would earn right now (FR-2). Pure, integer-only,
 * and deterministic:
 *
 * 1. the higher trained pair (atk+spd vs hp+def) wins;
 * 2. if tied, the highest single trained stat decides when its maximum sits
 *    on one side only;
 * 3. steps 1-2 repeat over `effectiveStats` (rolled base + trained);
 * 4. if still tied, the species' catalog order wins.
 *
 * The source is `trained` when steps 1-2 decided and `nature` when the base
 * stats did. `evolveCreature` and the growth panel both call this — there is
 * no second copy of the rule.
 */
export function branchLean(
  creature: Pick<Creature, "trained" | "stats" | "speciesId">,
  species: SpeciesDef,
): BranchLean {
  const branches = branchesForSpecies(species.id)
  const trained = decideLean(creature.trained, branches)
  if (trained) return { branch: trained, source: "trained" }
  const natural = decideLean(effectiveStats(creature), branches)
  if (natural) return { branch: natural, source: "nature" }
  const first = branches[0]
  return { branch: first ?? LEGACY_BRANCH, source: "nature" }
}
