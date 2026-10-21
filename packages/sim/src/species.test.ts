/**
 * Species registry (electric_species_line FR-3): the electric_hound record,
 * its fast-striker stat profile, and the locked-species registry seam.
 */

import { describe, expect, test } from "bun:test"
import { getMove } from "./battle/moves"
import { branchesForSpecies } from "./branches"
import { speciesOptions } from "./breeding"
import { createCreature } from "./creature"
import type { RetiredRecord } from "./legacy"
import { getSpecies, LOCKED_SPECIES, STARTER_SPECIES } from "./species"

const HOUND = "electric_hound"

function speciesOf(id: string) {
  const species = getSpecies(id)
  if (!species) throw new Error(`species missing: ${id}`)
  return species
}

/** A retired Hall of Fame record of the given species, for the seam tests. */
function record(speciesId: string, generation: number): RetiredRecord {
  const species = speciesOf(speciesId)
  return {
    name: species.displayName,
    speciesId,
    archetypeId: species.archetypeId,
    element: species.element,
    affinity: null,
    stats: { hp: 90, atk: 12, def: 9, spd: 11 },
    trained: { hp: 0, atk: 0, def: 0, spd: 0 },
    cupsWon: 1,
    generation,
    retiredOnDay: 60,
    traits: [],
    parents: [],
    branch: "legacy",
  }
}

describe("electric_hound species record", () => {
  test("is registered and findable by id", () => {
    expect(getSpecies(HOUND)?.id).toBe(HOUND)
  })

  test("carries its pinned identity", () => {
    const hound = speciesOf(HOUND)
    expect(hound.displayName).toBe("Storm Hound")
    expect(hound.element).toBe("electric")
    expect(hound.archetypeId).toBe("storm_hound")
    expect(hound.temperament).toBe("rush")
    expect(hound.flavor.trim().length).toBeGreaterThan(0)
    expect(hound.kit).toEqual([
      "static_jolt",
      "volt_dash",
      "arc_shot",
      "storm_bolt",
      "ion_dart",
      "gigavolt",
    ])
  })

  test("is not a starter — the starter roster stays the playable trio", () => {
    expect(STARTER_SPECIES).toHaveLength(3)
    expect(STARTER_SPECIES.map((s) => s.id)).not.toContain(HOUND)
    expect(LOCKED_SPECIES.map((s) => s.id)).toEqual([HOUND])
    expect(speciesOf(HOUND).available).toBe(false)
  })

  test("cannot be created while locked", () => {
    expect(() => createCreature(HOUND, 1)).toThrow(/not yet available/i)
  })

  test("stat profile is a fast striker distinct from every starter", () => {
    const hound = speciesOf(HOUND)
    const starters = STARTER_SPECIES
    // Speed: the hound's whole roll range sits at or above every starter's
    // fastest possible roll.
    const fastestStarter = Math.max(...starters.map((s) => s.statBounds.spd[1]))
    expect(hound.statBounds.spd[0]).toBeGreaterThanOrEqual(fastestStarter)
    expect(hound.statBounds.spd[1]).toBeGreaterThan(fastestStarter)
    // Attack: a harder ceiling than any starter.
    const hardestStarter = Math.max(...starters.map((s) => s.statBounds.atk[1]))
    expect(hound.statBounds.atk[1]).toBeGreaterThan(hardestStarter)
    // Defense and bulk: strictly frailer than every starter's ceiling.
    const sturdiestStarter = Math.min(
      ...starters.map((s) => s.statBounds.def[1]),
    )
    expect(hound.statBounds.def[1]).toBeLessThan(sturdiestStarter)
    const beefiestStarter = Math.min(...starters.map((s) => s.statBounds.hp[1]))
    expect(hound.statBounds.hp[1]).toBeLessThan(beefiestStarter)
    // The bounds stay legal rolls for the roller (positive, ordered).
    for (const key of ["hp", "atk", "def", "spd"] as const) {
      const [lo, hi] = hound.statBounds[key]
      expect(lo).toBeGreaterThan(0)
      expect(hi).toBeGreaterThanOrEqual(lo)
    }
  })

  test("has exactly two champion branches, offense and defense", () => {
    const branches = branchesForSpecies(HOUND)
    expect(branches.map((b) => b.id)).toEqual([
      "storm_courser",
      "tempest_warden",
    ])
    const [offense, defense] = branches
    if (!offense || !defense) throw new Error("branch rows missing")
    expect([...offense.favors]).toEqual(["atk", "spd"])
    expect([...defense.favors]).toEqual(["hp", "def"])
    for (const branch of branches) {
      expect(branch.speciesId).toBe(HOUND)
      expect(branch.label.trim().length).toBeGreaterThan(0)
      expect(branch.line.trim().length).toBeGreaterThan(0)
      // The evolution budget: 11 juvenile, 22 champion, HP counted double.
      const juvenile = branch.juvenileBoost
      expect(juvenile.hp * 2 + juvenile.atk + juvenile.def + juvenile.spd).toBe(
        11,
      )
      const champion = branch.championBoost
      expect(champion.hp * 2 + champion.atk + champion.def + champion.spd).toBe(
        22,
      )
    }
  })

  test("each branch learns an electric signature outside the kit", () => {
    const kit = speciesOf(HOUND).kit
    const signatures = branchesForSpecies(HOUND).map((b) => b.signatureMove)
    expect(signatures).toEqual(["storm_surge", "ion_wall"])
    for (const signature of signatures) {
      if (!signature) throw new Error("branch has no signature")
      expect(getMove(signature)?.element).toBe("electric")
      expect(kit).not.toContain(signature)
    }
  })

  test("flows through breeding speciesOptions naturally", () => {
    const pair = [record(HOUND, 1), record("fire_drake", 2)]
    expect(speciesOptions(pair)).toEqual([HOUND, "fire_drake"])
    expect(speciesOptions([record(HOUND, 1), record(HOUND, 2)])).toEqual([
      HOUND,
    ])
  })
})
