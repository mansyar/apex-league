/**
 * Branch catalog and training-derived lean (branching_evolution_20261020):
 * two champion forms per starter, earned from how the creature was trained.
 */

import { describe, expect, test } from "bun:test"

import { CATALOG } from "./battle/moves"
import {
  BRANCHES,
  type BranchDef,
  branchesForSpecies,
  branchLean,
  CHAMPION_STAT_BOOST,
  type Creature,
  type CreatureStats,
  createCreature,
  EVOLUTION_STAT_BOOST,
  getBranch,
  getSpecies,
  LEGACY_BRANCH,
  LEGACY_CHAMPION_BOOST,
  LEGACY_JUVENILE_BOOST,
  STARTER_SPECIES,
} from "./index"

/** Effective-stat weight: HP counts double, the other three once each. */
function boostTotal(boost: CreatureStats): number {
  return boost.hp * 2 + boost.atk + boost.def + boost.spd
}

interface BranchContract {
  id: string
  speciesId: string
  label: string
  favors: readonly string[]
  juvenileBoost: CreatureStats
  championBoost: CreatureStats
  signatureMove: string
  accentHue: number
}

/** The frozen FR-1 table: ids, numbers, and signatures cannot drift. */
const CONTRACT: readonly BranchContract[] = [
  {
    id: "cinder_courser",
    speciesId: "fire_drake",
    label: "Cinder Courser",
    favors: ["atk", "spd"],
    juvenileBoost: { hp: 2, atk: 4, def: 1, spd: 2 },
    championBoost: { hp: 5, atk: 7, def: 3, spd: 2 },
    signatureMove: "cinder_dive",
    accentHue: 30,
  },
  {
    id: "pyre_warden",
    speciesId: "fire_drake",
    label: "Pyre Warden",
    favors: ["hp", "def"],
    juvenileBoost: { hp: 3, atk: 2, def: 3, spd: 0 },
    championBoost: { hp: 7, atk: 2, def: 6, spd: 0 },
    signatureMove: "pyre_wall",
    accentHue: 6,
  },
  {
    id: "thorn_ram",
    speciesId: "plant_ox",
    label: "Thorn Ram",
    favors: ["atk", "spd"],
    juvenileBoost: { hp: 2, atk: 4, def: 1, spd: 2 },
    championBoost: { hp: 5, atk: 5, def: 3, spd: 4 },
    signatureMove: "thorn_charge",
    accentHue: 122,
  },
  {
    id: "bramble_bulwark",
    speciesId: "plant_ox",
    label: "Bramble Bulwark",
    favors: ["hp", "def"],
    juvenileBoost: { hp: 3, atk: 2, def: 3, spd: 0 },
    championBoost: { hp: 7, atk: 3, def: 5, spd: 0 },
    signatureMove: "bramble_guard",
    accentHue: 98,
  },
  {
    id: "riptide_runner",
    speciesId: "water_axolotl",
    label: "Riptide Runner",
    favors: ["atk", "spd"],
    juvenileBoost: { hp: 2, atk: 4, def: 1, spd: 2 },
    championBoost: { hp: 5, atk: 5, def: 4, spd: 3 },
    signatureMove: "riptide_rush",
    accentHue: 217,
  },
  {
    id: "reef_keeper",
    speciesId: "water_axolotl",
    label: "Reef Keeper",
    favors: ["hp", "def"],
    juvenileBoost: { hp: 3, atk: 2, def: 3, spd: 0 },
    championBoost: { hp: 7, atk: 3, def: 5, spd: 0 },
    signatureMove: "tide_aegis",
    accentHue: 193,
  },
  {
    id: "storm_courser",
    speciesId: "electric_hound",
    label: "Storm Courser",
    favors: ["atk", "spd"],
    juvenileBoost: { hp: 2, atk: 4, def: 1, spd: 2 },
    championBoost: { hp: 4, atk: 7, def: 4, spd: 3 },
    signatureMove: "storm_surge",
    accentHue: 62,
  },
  {
    id: "tempest_warden",
    speciesId: "electric_hound",
    label: "Tempest Warden",
    favors: ["hp", "def"],
    juvenileBoost: { hp: 3, atk: 2, def: 3, spd: 0 },
    championBoost: { hp: 6, atk: 3, def: 7, spd: 0 },
    signatureMove: "ion_wall",
    accentHue: 38,
  },
]

describe("branch catalog", () => {
  test("holds exactly the eight contracted branches", () => {
    expect(BRANCHES.length).toBe(8)
    expect(BRANCHES.map((branch) => branch.id)).toEqual(
      CONTRACT.map((row) => row.id),
    )
  })

  test("every branch carries its pinned identity, lean, and boosts", () => {
    for (const row of CONTRACT) {
      const branch = getBranch(row.id)
      if (!branch) throw new Error(`branch missing: ${row.id}`)
      expect(branch.speciesId).toBe(row.speciesId)
      expect(branch.label).toBe(row.label)
      expect([...branch.favors].join(",")).toBe([...row.favors].join(","))
      expect(branch.juvenileBoost).toEqual(row.juvenileBoost)
      expect(branch.championBoost).toEqual(row.championBoost)
      expect(branch.signatureMove).toBe(row.signatureMove)
      expect(branch.accentHue).toBe(row.accentHue)
      expect(branch.line.trim().length).toBeGreaterThan(0)
    }
  })

  test("gives every shipped starter exactly two real branches", () => {
    for (const species of STARTER_SPECIES) {
      if (!species.available) continue
      const branches = branchesForSpecies(species.id)
      expect(branches.length, species.id).toBe(2)
      expect(new Set(branches.map((branch) => branch.id)).size).toBe(2)
      for (const branch of branches) {
        expect(branch.speciesId).toBe(species.id)
        expect(branch.signatureMove).not.toBeNull()
      }
    }
  })

  test("ids are unique across the catalog and legacy", () => {
    const ids = [...BRANCHES.map((branch) => branch.id), LEGACY_BRANCH.id]
    expect(new Set(ids).size).toBe(ids.length)
  })

  test("legacy is synthetic and never returned by a species lookup", () => {
    expect(LEGACY_BRANCH.id).toBe("legacy")
    expect(LEGACY_BRANCH.signatureMove).toBeNull()
    for (const species of STARTER_SPECIES) {
      const ids = branchesForSpecies(species.id).map((branch) => branch.id)
      expect(ids).not.toContain("legacy")
    }
    expect(branchesForSpecies("legacy")).toEqual([])
    expect(branchesForSpecies("no_such_species")).toEqual([])
    expect(getBranch("legacy")).toBe(LEGACY_BRANCH)
  })

  test("unknown branch ids return undefined", () => {
    expect(getBranch("no_such_branch")).toBeUndefined()
    expect(getBranch("")).toBeUndefined()
  })

  test("every signature is a catalog special of its species' element", () => {
    for (const branch of BRANCHES) {
      const signature = branch.signatureMove
      if (!signature) throw new Error(`branch has no signature: ${branch.id}`)
      const move = CATALOG.find((entry) => entry.id === signature)
      if (!move) throw new Error(`signature not in catalog: ${signature}`)
      const species = getSpecies(branch.speciesId ?? "")
      if (!species) throw new Error(`branch species missing: ${branch.id}`)
      expect(move.element).toBe(species.element)
      expect(species.kit).not.toContain(signature)
    }
    const signatures = BRANCHES.map((branch) => branch.signatureMove)
    expect(new Set(signatures).size).toBe(BRANCHES.length)
  })
})

describe("branch budgets", () => {
  test("every juvenile boost totals 11, HP counted double", () => {
    for (const branch of [...BRANCHES, LEGACY_BRANCH]) {
      expect(boostTotal(branch.juvenileBoost), branch.id).toBe(11)
    }
  })

  test("every cumulative champion boost totals 22, HP counted double", () => {
    for (const branch of [...BRANCHES, LEGACY_BRANCH]) {
      expect(boostTotal(branch.championBoost), branch.id).toBe(22)
    }
  })

  test("legacy is the pinned pre-v19 boost pair", () => {
    expect(LEGACY_JUVENILE_BOOST).toEqual({ hp: 3, atk: 2, def: 2, spd: 1 })
    expect(LEGACY_CHAMPION_BOOST).toEqual({ hp: 6, atk: 4, def: 4, spd: 2 })
    expect(LEGACY_BRANCH.juvenileBoost).toBe(LEGACY_JUVENILE_BOOST)
    expect(LEGACY_BRANCH.championBoost).toBe(LEGACY_CHAMPION_BOOST)
  })

  test("the public evolution constants are the same legacy literals", () => {
    expect(EVOLUTION_STAT_BOOST).toBe(LEGACY_JUVENILE_BOOST)
    expect(CHAMPION_STAT_BOOST).toBe(LEGACY_CHAMPION_BOOST)
  })
})

describe("branchLean", () => {
  /** A creature with hand-set rolled and trained stats. */
  function leanCreature(
    speciesId: string,
    stats: CreatureStats,
    trained: CreatureStats,
  ): Creature {
    const base = createCreature(speciesId, 42)
    return { ...base, stats, trained }
  }

  /** Neutral rolled stats: the trained profile is the only signal. */
  const EVEN_STATS: CreatureStats = { hp: 12, atk: 4, def: 4, spd: 4 }

  function speciesOf(id: string) {
    const species = getSpecies(id)
    if (!species) throw new Error(`species missing: ${id}`)
    return species
  }

  test("a power-and-sprint baby leans offense for every starter", () => {
    const expected = {
      fire_drake: "cinder_courser",
      plant_ox: "thorn_ram",
      water_axolotl: "riptide_runner",
    } as const
    for (const [speciesId, branchId] of Object.entries(expected)) {
      const creature = leanCreature(speciesId, EVEN_STATS, {
        hp: 0,
        atk: 3,
        def: 0,
        spd: 2,
      })
      const lean = branchLean(creature, speciesOf(speciesId))
      expect(lean.branch.id, speciesId).toBe(branchId)
      expect(lean.source).toBe("trained")
    }
  })

  test("an endurance-and-ring baby leans defense for every starter", () => {
    const expected = {
      fire_drake: "pyre_warden",
      plant_ox: "bramble_bulwark",
      water_axolotl: "reef_keeper",
    } as const
    for (const [speciesId, branchId] of Object.entries(expected)) {
      const creature = leanCreature(speciesId, EVEN_STATS, {
        hp: 3,
        atk: 0,
        def: 2,
        spd: 0,
      })
      const lean = branchLean(creature, speciesOf(speciesId))
      expect(lean.branch.id, speciesId).toBe(branchId)
      expect(lean.source).toBe("trained")
    }
  })

  test("equal pairs fall through to the highest single trained stat", () => {
    // atk+spd = 4 and hp+def = 4; SPD alone holds the maximum 4, so the
    // offense side wins even though the rolled stats are defense-heavy.
    const creature = leanCreature(
      "fire_drake",
      { hp: 90, atk: 2, def: 30, spd: 3 },
      { hp: 1, atk: 0, def: 3, spd: 4 },
    )
    const lean = branchLean(creature, speciesOf("fire_drake"))
    expect(lean.branch.id).toBe("cinder_courser")
    expect(lean.source).toBe("trained")
  })

  test("an even trained split is decided by effective stats", () => {
    // All four trained values tie, so steps 1-2 continue; the rolled HP
    // makes the defense pair strictly larger once HP is weighted double.
    const creature = leanCreature(
      "fire_drake",
      { hp: 10, atk: 3, def: 3, spd: 3 },
      { hp: 2, atk: 2, def: 2, spd: 2 },
    )
    const lean = branchLean(creature, speciesOf("fire_drake"))
    expect(lean.branch.id).toBe("pyre_warden")
    expect(lean.source).toBe("nature")
  })

  test("zero training falls through to nature", () => {
    const creature = leanCreature(
      "fire_drake",
      { hp: 80, atk: 10, def: 8, spd: 8 },
      { hp: 0, atk: 0, def: 0, spd: 0 },
    )
    const lean = branchLean(creature, speciesOf("fire_drake"))
    expect(lean.branch.id).toBe("pyre_warden")
    expect(lean.source).toBe("nature")
  })

  test("a fully even profile falls back to species catalog order", () => {
    const creature = leanCreature(
      "fire_drake",
      { hp: 5, atk: 5, def: 5, spd: 5 },
      { hp: 0, atk: 0, def: 0, spd: 0 },
    )
    const first = branchesForSpecies("fire_drake")[0]
    if (!first) throw new Error("fire_drake has no branches")
    const lean = branchLean(creature, speciesOf("fire_drake"))
    expect(lean.branch.id).toBe(first.id)
    expect(lean.source).toBe("nature")
  })

  test("repeated calls return the same branch and source", () => {
    const creature = leanCreature(
      "water_axolotl",
      { hp: 9, atk: 4, def: 4, spd: 4 },
      { hp: 2, atk: 1, def: 2, spd: 1 },
    )
    const species = speciesOf("water_axolotl")
    const results = Array.from({ length: 5 }, () =>
      branchLean(creature, species),
    )
    const first = results[0]
    if (!first) throw new Error("no lean results")
    for (const lean of results) {
      expect(lean.branch.id).toBe(first.branch.id)
      expect(lean.source).toBe(first.source)
    }
  })

  test("is pure — the creature is never mutated", () => {
    const creature = leanCreature("fire_drake", EVEN_STATS, {
      hp: 1,
      atk: 2,
      def: 1,
      spd: 2,
    })
    const snapshot = structuredClone(creature)
    branchLean(creature, speciesOf("fire_drake"))
    expect(creature).toEqual(snapshot)
  })

  test("the lean always answers with one of that species' branches", () => {
    for (const species of STARTER_SPECIES) {
      const creature = leanCreature(species.id, EVEN_STATS, {
        hp: 3,
        atk: 2,
        def: 1,
        spd: 0,
      })
      const lean: { branch: BranchDef } = branchLean(creature, species)
      const ids = branchesForSpecies(species.id).map((branch) => branch.id)
      expect(ids).toContain(lean.branch.id)
    }
  })
})
