/**
 * Species registry (electric_species_line FR-3): the electric_hound record,
 * its fast-striker stat profile, and the locked-species registry seam.
 */

import { describe, expect, test } from "bun:test"
import { getMove } from "./battle/moves"
import { branchesForSpecies } from "./branches"
import { createBredCreature, speciesOptions } from "./breeding"
import { createCreature } from "./creature"
import type { RetiredRecord } from "./legacy"
import {
  ALL_SPECIES,
  getSpecies,
  obtainableSpecies,
  REWARD_SPECIES,
  STARTER_SPECIES,
} from "./species"

const HOUND = "electric_hound"
const FALCON = "wind_falcon"
const TORTOISE = "earth_tortoise"

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
    giftEgg: false,
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
    expect(REWARD_SPECIES.map((s) => s.id)).toEqual([HOUND, FALCON, TORTOISE])
    expect(speciesOf(HOUND).available).toBe(false)
  })

  test("carries the tier that unlocks it — the pool reads the contract, not the array", () => {
    expect(speciesOf(HOUND).rewardFromTier).toBe("silver")
    // Bronze has not reached the tier that grants the hound.
    expect(obtainableSpecies("bronze").map((s) => s.id)).toEqual(
      STARTER_SPECIES.map((s) => s.id),
    )
    // Silver and above can field it.
    for (const tier of ["silver", "gold", "legend"] as const) {
      expect(obtainableSpecies(tier).map((s) => s.id)).toContain(HOUND)
    }
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

  test("a hound pair breeds a hound (review round 1, F2)", () => {
    // The starter gate stays shut for the hound...
    expect(() => createCreature(HOUND, 1)).toThrow(/not yet available/i)
    // ...but a pair the player already owns breeds normally.
    const parents = [record(HOUND, 1), record(HOUND, 2)]
    const child = createBredCreature(HOUND, 42, parents, 3)
    expect(child.speciesId).toBe(HOUND)
    expect(child.element).toBe("electric")
    expect(child.giftEgg).toBe(false)
    // The offspring's stats stay inside the species' own bounds.
    const species = speciesOf(HOUND)
    for (const key of ["hp", "atk", "def", "spd"] as const) {
      const [lo, hi] = species.statBounds[key]
      expect(child.stats[key]).toBeGreaterThanOrEqual(lo)
      expect(child.stats[key]).toBeLessThanOrEqual(hi)
    }
  })
})

describe("wind_falcon species record", () => {
  test("is registered and findable by id", () => {
    expect(getSpecies(FALCON)?.id).toBe(FALCON)
  })

  test("carries its pinned identity", () => {
    const falcon = speciesOf(FALCON)
    expect(falcon.displayName).toBe("Zephyr Falcon")
    expect(falcon.element).toBe("wind")
    expect(falcon.archetypeId).toBe("falcon")
    expect(falcon.temperament).toBe("rush")
    expect(falcon.flavor.trim().length).toBeGreaterThan(0)
    expect(falcon.kit).toEqual([
      "gust",
      "feather_dart",
      "gale_cutter",
      "sky_bolt",
      "talon_slash",
      "hurricane_spiral",
    ])
  })

  test("unlocks as the Gold league reward — silver does not field it yet", () => {
    expect(speciesOf(FALCON).rewardFromTier).toBe("gold")
    for (const tier of ["bronze", "silver"] as const) {
      expect(obtainableSpecies(tier).map((s) => s.id)).not.toContain(FALCON)
    }
    for (const tier of ["gold", "legend"] as const) {
      expect(obtainableSpecies(tier).map((s) => s.id)).toContain(FALCON)
    }
  })

  test("cannot be created while locked", () => {
    expect(() => createCreature(FALCON, 1)).toThrow(/not yet available/i)
  })

  test("stat profile is the fastest, frailest record in the game", () => {
    const falcon = speciesOf(FALCON)
    const others = ALL_SPECIES.filter((s) => s.id !== FALCON)
    // Speed: strictly above every other species' whole roll range — no
    // individual of any other species can out-roll a falcon.
    for (const other of others) {
      expect(falcon.statBounds.spd[0]).toBeGreaterThan(other.statBounds.spd[1])
    }
    // Bulk: its whole HP range sits below every other species' minimum roll.
    for (const other of others) {
      expect(falcon.statBounds.hp[1]).toBeLessThan(other.statBounds.hp[0])
    }
    // Defense: strictly frailer than every other species' ceiling.
    for (const other of others) {
      expect(falcon.statBounds.def[1]).toBeLessThan(other.statBounds.def[1])
    }
    // The bounds stay legal rolls for the roller (positive, ordered).
    for (const key of ["hp", "atk", "def", "spd"] as const) {
      const [lo, hi] = falcon.statBounds[key]
      expect(lo).toBeGreaterThan(0)
      expect(hi).toBeGreaterThanOrEqual(lo)
    }
  })

  test("has exactly two champion branches, offense and defense", () => {
    const branches = branchesForSpecies(FALCON)
    expect(branches.map((b) => b.id)).toEqual(["squall_diver", "aerie_warden"])
    const [offense, defense] = branches
    if (!offense || !defense) throw new Error("branch rows missing")
    expect([...offense.favors]).toEqual(["atk", "spd"])
    expect([...defense.favors]).toEqual(["hp", "def"])
    for (const branch of branches) {
      expect(branch.speciesId).toBe(FALCON)
      expect(branch.label.trim().length).toBeGreaterThan(0)
      expect(branch.line.trim().length).toBeGreaterThan(0)
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

  test("each branch learns a wind signature outside the kit", () => {
    const kit = speciesOf(FALCON).kit
    const signatures = branchesForSpecies(FALCON).map((b) => b.signatureMove)
    expect(signatures).toEqual(["cyclone_dive", "zephyr_veil"])
    for (const signature of signatures) {
      if (!signature) throw new Error("branch has no signature")
      expect(getMove(signature)?.element).toBe("wind")
      expect(kit).not.toContain(signature)
    }
  })

  test("a falcon pair breeds a falcon once the registry holds it", () => {
    expect(() => createCreature(FALCON, 1)).toThrow(/not yet available/i)
    const parents = [record(FALCON, 1), record(FALCON, 2)]
    const child = createBredCreature(FALCON, 42, parents, 3)
    expect(child.speciesId).toBe(FALCON)
    expect(child.element).toBe("wind")
    expect(child.giftEgg).toBe(false)
    const species = speciesOf(FALCON)
    for (const key of ["hp", "atk", "def", "spd"] as const) {
      const [lo, hi] = species.statBounds[key]
      expect(child.stats[key]).toBeGreaterThanOrEqual(lo)
      expect(child.stats[key]).toBeLessThanOrEqual(hi)
    }
  })
})

describe("earth_tortoise species record", () => {
  test("is registered and findable by id", () => {
    expect(getSpecies(TORTOISE)?.id).toBe(TORTOISE)
  })

  test("carries its pinned identity", () => {
    const tortoise = speciesOf(TORTOISE)
    expect(tortoise.displayName).toBe("Basalt Tortoise")
    expect(tortoise.element).toBe("earth")
    expect(tortoise.archetypeId).toBe("tortoise")
    expect(tortoise.temperament).toBe("slow")
    expect(tortoise.flavor.trim().length).toBeGreaterThan(0)
    expect(tortoise.kit).toEqual([
      "pebble_shot",
      "dust_devil",
      "clay_burst",
      "boulder_toss",
      "sand_blast",
      "tectonic_slam",
    ])
  })

  test("unlocks as the Legend league reward — only the Legend tier fields it", () => {
    expect(speciesOf(TORTOISE).rewardFromTier).toBe("legend")
    for (const tier of ["bronze", "silver", "gold"] as const) {
      expect(obtainableSpecies(tier).map((s) => s.id)).not.toContain(TORTOISE)
    }
    expect(obtainableSpecies("legend").map((s) => s.id)).toContain(TORTOISE)
  })

  test("cannot be created while locked", () => {
    expect(() => createCreature(TORTOISE, 1)).toThrow(/not yet available/i)
  })

  test("stat profile is the bulkiest, slowest record in the game", () => {
    const tortoise = speciesOf(TORTOISE)
    const others = ALL_SPECIES.filter((s) => s.id !== TORTOISE)
    // HP and defense: strictly above every other species' whole roll range.
    for (const other of others) {
      expect(tortoise.statBounds.hp[0]).toBeGreaterThan(other.statBounds.hp[1])
      expect(tortoise.statBounds.def[0]).toBeGreaterThan(
        other.statBounds.def[1],
      )
    }
    // Speed: strictly below every other species' whole roll range.
    for (const other of others) {
      expect(tortoise.statBounds.spd[0]).toBeLessThan(other.statBounds.spd[0])
      expect(tortoise.statBounds.spd[1]).toBeLessThan(other.statBounds.spd[1])
    }
    // The bounds stay legal rolls for the roller (positive, ordered).
    for (const key of ["hp", "atk", "def", "spd"] as const) {
      const [lo, hi] = tortoise.statBounds[key]
      expect(lo).toBeGreaterThan(0)
      expect(hi).toBeGreaterThanOrEqual(lo)
    }
  })

  test("has exactly two champion branches, offense and defense", () => {
    const branches = branchesForSpecies(TORTOISE)
    expect(branches.map((b) => b.id)).toEqual([
      "landslide_ram",
      "rampart_keeper",
    ])
    const [offense, defense] = branches
    if (!offense || !defense) throw new Error("branch rows missing")
    expect([...offense.favors]).toEqual(["atk", "spd"])
    expect([...defense.favors]).toEqual(["hp", "def"])
    for (const branch of branches) {
      expect(branch.speciesId).toBe(TORTOISE)
      expect(branch.label.trim().length).toBeGreaterThan(0)
      expect(branch.line.trim().length).toBeGreaterThan(0)
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

  test("each branch learns an earth signature outside the kit", () => {
    const kit = speciesOf(TORTOISE).kit
    const signatures = branchesForSpecies(TORTOISE).map((b) => b.signatureMove)
    expect(signatures).toEqual(["quake_stomp", "basalt_guard"])
    for (const signature of signatures) {
      if (!signature) throw new Error("branch has no signature")
      expect(getMove(signature)?.element).toBe("earth")
      expect(kit).not.toContain(signature)
    }
  })

  test("a tortoise pair breeds a tortoise once the registry holds it", () => {
    expect(() => createCreature(TORTOISE, 1)).toThrow(/not yet available/i)
    const parents = [record(TORTOISE, 1), record(TORTOISE, 2)]
    const child = createBredCreature(TORTOISE, 42, parents, 3)
    expect(child.speciesId).toBe(TORTOISE)
    expect(child.element).toBe("earth")
    expect(child.giftEgg).toBe(false)
    const species = speciesOf(TORTOISE)
    for (const key of ["hp", "atk", "def", "spd"] as const) {
      const [lo, hi] = species.statBounds[key]
      expect(child.stats[key]).toBeGreaterThanOrEqual(lo)
      expect(child.stats[key]).toBeLessThanOrEqual(hi)
    }
  })
})
