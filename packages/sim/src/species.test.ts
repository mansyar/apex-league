/**
 * Species registry (electric_species_line FR-3): the electric_hound record,
 * its fast-striker stat profile, and the locked-species registry seam.
 * Extended by the species-roster-expansion line: fernstag (Silver),
 * reefclaw (Gold) and cindermoor (Legend) join the reward roster.
 * Extended by roster_wave_3: voltfox, galeheron and shalemole join as
 * breeding-discovery lines — locked, tierless, reachable only through the
 * breed-time recipe lookup. Extended by roster_wave_4: embercub, mossboar
 * and mistkit join the same seam on the fire triangle.
 */

import { describe, expect, test } from "bun:test"
import { getMove } from "./battle/moves"
import { branchesForSpecies } from "./branches"
import { createBredCreature, speciesOptions } from "./breeding"
import { createCreature } from "./creature"
import type { RetiredRecord } from "./legacy"
import {
  ALL_SPECIES,
  DISCOVERY_SPECIES,
  getSpecies,
  obtainableSpecies,
  REWARD_SPECIES,
  STARTER_SPECIES,
} from "./species"

const HOUND = "electric_hound"
const FERNSTAG = "fernstag"
const FALCON = "wind_falcon"
const REEFCLAW = "reefclaw"
const TORTOISE = "earth_tortoise"
const CINDERMOOR = "cindermoor"

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
    expect(REWARD_SPECIES.map((s) => s.id)).toEqual([
      HOUND,
      FERNSTAG,
      FALCON,
      REEFCLAW,
      TORTOISE,
      CINDERMOOR,
    ])
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

// The six branch-form suites below pin the champion forms of the three
// shared-element lines. User decision 2026-10-25 (species-roster-expansion
// Phase 1): a form's signatureMove may be a kit row another species carries
// in its kit, and the boss invariant is scoped to its spirit — no boss
// wields the signature of a species it is not. The picks below stay outside
// each species' own kit.

describe("fernstag species record", () => {
  test("is registered and findable by id", () => {
    expect(getSpecies(FERNSTAG)?.id).toBe(FERNSTAG)
  })

  test("carries its pinned identity", () => {
    const fernstag = speciesOf(FERNSTAG)
    expect(fernstag.displayName).toBe("Whistlefern")
    expect(fernstag.element).toBe("plant")
    expect(fernstag.archetypeId).toBe("frond")
    expect(fernstag.temperament).toBe("obedient")
    expect(fernstag.flavor.trim().length).toBeGreaterThan(0)
    expect(fernstag.kit).toEqual([
      "seed_shot",
      "thorn_volley",
      "vine_lash",
      "thorn_charge",
      "bramble_dart",
      "bramble_guard",
    ])
  })

  test("unlocks as the Silver league reward — bronze does not field it yet", () => {
    expect(speciesOf(FERNSTAG).rewardFromTier).toBe("silver")
    expect(obtainableSpecies("bronze").map((s) => s.id)).not.toContain(FERNSTAG)
    for (const tier of ["silver", "gold", "legend"] as const) {
      expect(obtainableSpecies(tier).map((s) => s.id)).toContain(FERNSTAG)
    }
  })

  test("cannot be created while locked", () => {
    expect(() => createCreature(FERNSTAG, 1)).toThrow(/not yet available/i)
  })

  test("stat profile is a quick frond beside the slow ox", () => {
    const fernstag = speciesOf(FERNSTAG)
    const ox = speciesOf("plant_ox")
    // Speed: the fern's whole roll range sits above the ox's.
    expect(fernstag.statBounds.spd[0]).toBeGreaterThan(ox.statBounds.spd[1])
    // Bulk: its whole HP range sits below the ox's.
    expect(fernstag.statBounds.hp[1]).toBeLessThan(ox.statBounds.hp[0])
    // Armor: strictly less plated than the ox's ceiling.
    expect(fernstag.statBounds.def[1]).toBeLessThan(ox.statBounds.def[1])
    // The bounds stay legal rolls for the roller (positive, ordered).
    for (const key of ["hp", "atk", "def", "spd"] as const) {
      const [lo, hi] = fernstag.statBounds[key]
      expect(lo).toBeGreaterThan(0)
      expect(hi).toBeGreaterThanOrEqual(lo)
    }
  })

  test("its kit recomposes the plant vocabulary, distinct from the ox's", () => {
    const fernstag = speciesOf(FERNSTAG)
    const ox = speciesOf("plant_ox")
    expect(fernstag.kit).toHaveLength(6)
    expect([...fernstag.kit].sort()).not.toEqual([...ox.kit].sort())
    // The first four are the classic loadout row, in tier order.
    expect(fernstag.kit.slice(0, 4)).toEqual([
      "seed_shot",
      "thorn_volley",
      "vine_lash",
      "thorn_charge",
    ])
  })

  test("has exactly two champion branches, offense and defense", () => {
    const branches = branchesForSpecies(FERNSTAG)
    expect(branches.map((b) => b.id)).toEqual(["frond_lasher", "spore_warden"])
    const [offense, defense] = branches
    if (!offense || !defense) throw new Error("branch rows missing")
    expect([...offense.favors]).toEqual(["atk", "spd"])
    expect([...defense.favors]).toEqual(["hp", "def"])
    for (const branch of branches) {
      expect(branch.speciesId).toBe(FERNSTAG)
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

  test("each branch learns a plant signature outside the kit", () => {
    const kit = speciesOf(FERNSTAG).kit
    const signatures = branchesForSpecies(FERNSTAG).map((b) => b.signatureMove)
    expect(signatures).toEqual(["root_quake", "spore_burst"])
    for (const signature of signatures) {
      if (!signature) throw new Error("branch has no signature")
      expect(getMove(signature)?.element).toBe("plant")
      expect(kit).not.toContain(signature)
    }
  })

  test("a fernstag pair breeds a fernstag once the registry holds it", () => {
    expect(() => createCreature(FERNSTAG, 1)).toThrow(/not yet available/i)
    const parents = [record(FERNSTAG, 1), record(FERNSTAG, 2)]
    const child = createBredCreature(FERNSTAG, 42, parents, 3)
    expect(child.speciesId).toBe(FERNSTAG)
    expect(child.element).toBe("plant")
    expect(child.giftEgg).toBe(false)
    const species = speciesOf(FERNSTAG)
    for (const key of ["hp", "atk", "def", "spd"] as const) {
      const [lo, hi] = species.statBounds[key]
      expect(child.stats[key]).toBeGreaterThanOrEqual(lo)
      expect(child.stats[key]).toBeLessThanOrEqual(hi)
    }
  })
})

describe("reefclaw species record", () => {
  test("is registered and findable by id", () => {
    expect(getSpecies(REEFCLAW)?.id).toBe(REEFCLAW)
  })

  test("carries its pinned identity", () => {
    const reefclaw = speciesOf(REEFCLAW)
    expect(reefclaw.displayName).toBe("Coral Claw")
    expect(reefclaw.element).toBe("water")
    expect(reefclaw.archetypeId).toBe("crab")
    expect(reefclaw.temperament).toBe("slow")
    expect(reefclaw.flavor.trim().length).toBeGreaterThan(0)
    expect(reefclaw.kit).toEqual([
      "bubble",
      "mist_spray",
      "foam_volley",
      "riptide_rush",
      "splash_bolt",
      "tide_aegis",
    ])
  })

  test("unlocks as the Gold league reward — silver does not field it yet", () => {
    expect(speciesOf(REEFCLAW).rewardFromTier).toBe("gold")
    for (const tier of ["bronze", "silver"] as const) {
      expect(obtainableSpecies(tier).map((s) => s.id)).not.toContain(REEFCLAW)
    }
    for (const tier of ["gold", "legend"] as const) {
      expect(obtainableSpecies(tier).map((s) => s.id)).toContain(REEFCLAW)
    }
  })

  test("cannot be created while locked", () => {
    expect(() => createCreature(REEFCLAW, 1)).toThrow(/not yet available/i)
  })

  test("stat profile is the armored pincer beside the easygoing axolotl", () => {
    const reefclaw = speciesOf(REEFCLAW)
    const axolotl = speciesOf("water_axolotl")
    // Armor: the claw's whole defense range sits above the axolotl's.
    expect(reefclaw.statBounds.def[0]).toBeGreaterThan(
      axolotl.statBounds.def[1],
    )
    // Bulk: its floor beats the axolotl's floor.
    expect(reefclaw.statBounds.hp[0]).toBeGreaterThan(axolotl.statBounds.hp[0])
    // Pace: its whole roll range sits below the axolotl's.
    expect(reefclaw.statBounds.spd[1]).toBeLessThan(axolotl.statBounds.spd[0])
    // The bounds stay legal rolls for the roller (positive, ordered).
    for (const key of ["hp", "atk", "def", "spd"] as const) {
      const [lo, hi] = reefclaw.statBounds[key]
      expect(lo).toBeGreaterThan(0)
      expect(hi).toBeGreaterThanOrEqual(lo)
    }
  })

  test("its kit recomposes the water vocabulary, distinct from the axolotl's", () => {
    const reefclaw = speciesOf(REEFCLAW)
    const axolotl = speciesOf("water_axolotl")
    expect(reefclaw.kit).toHaveLength(6)
    expect([...reefclaw.kit].sort()).not.toEqual([...axolotl.kit].sort())
    expect(reefclaw.kit.slice(0, 4)).toEqual([
      "bubble",
      "mist_spray",
      "foam_volley",
      "riptide_rush",
    ])
  })

  test("has exactly two champion branches, offense and defense", () => {
    const branches = branchesForSpecies(REEFCLAW)
    expect(branches.map((b) => b.id)).toEqual([
      "whirlpool_claw",
      "tide_sentinel",
    ])
    const [offense, defense] = branches
    if (!offense || !defense) throw new Error("branch rows missing")
    expect([...offense.favors]).toEqual(["atk", "spd"])
    expect([...defense.favors]).toEqual(["hp", "def"])
    for (const branch of branches) {
      expect(branch.speciesId).toBe(REEFCLAW)
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

  test("each branch learns a water signature outside the kit", () => {
    const kit = speciesOf(REEFCLAW).kit
    const signatures = branchesForSpecies(REEFCLAW).map((b) => b.signatureMove)
    expect(signatures).toEqual(["maelstrom", "tide_shot"])
    for (const signature of signatures) {
      if (!signature) throw new Error("branch has no signature")
      expect(getMove(signature)?.element).toBe("water")
      expect(kit).not.toContain(signature)
    }
  })

  test("a reefclaw pair breeds a reefclaw once the registry holds it", () => {
    expect(() => createCreature(REEFCLAW, 1)).toThrow(/not yet available/i)
    const parents = [record(REEFCLAW, 1), record(REEFCLAW, 2)]
    const child = createBredCreature(REEFCLAW, 42, parents, 3)
    expect(child.speciesId).toBe(REEFCLAW)
    expect(child.element).toBe("water")
    expect(child.giftEgg).toBe(false)
    const species = speciesOf(REEFCLAW)
    for (const key of ["hp", "atk", "def", "spd"] as const) {
      const [lo, hi] = species.statBounds[key]
      expect(child.stats[key]).toBeGreaterThanOrEqual(lo)
      expect(child.stats[key]).toBeLessThanOrEqual(hi)
    }
  })
})

describe("cindermoor species record", () => {
  test("is registered and findable by id", () => {
    expect(getSpecies(CINDERMOOR)?.id).toBe(CINDERMOOR)
  })

  test("carries its pinned identity", () => {
    const cindermoor = speciesOf(CINDERMOOR)
    expect(cindermoor.displayName).toBe("Moor Cinder")
    expect(cindermoor.element).toBe("fire")
    expect(cindermoor.archetypeId).toBe("smolder")
    expect(cindermoor.temperament).toBe("rush")
    expect(cindermoor.flavor.trim().length).toBeGreaterThan(0)
    expect(cindermoor.kit).toEqual([
      "spark",
      "flare_dart",
      "cinder_shot",
      "cinder_dive",
      "blaze_bolt",
      "pyre_wall",
    ])
  })

  test("unlocks as the Legend league reward — only the Legend tier fields it", () => {
    expect(speciesOf(CINDERMOOR).rewardFromTier).toBe("legend")
    for (const tier of ["bronze", "silver", "gold"] as const) {
      expect(obtainableSpecies(tier).map((s) => s.id)).not.toContain(CINDERMOOR)
    }
    expect(obtainableSpecies("legend").map((s) => s.id)).toContain(CINDERMOOR)
  })

  test("cannot be created while locked", () => {
    expect(() => createCreature(CINDERMOOR, 1)).toThrow(/not yet available/i)
  })

  test("stat profile is the heavy burn beside the nimble drake", () => {
    const cindermoor = speciesOf(CINDERMOOR)
    const drake = speciesOf("fire_drake")
    // Bulk: its floor beats the drake's floor.
    expect(cindermoor.statBounds.hp[0]).toBeGreaterThan(drake.statBounds.hp[0])
    // Power: a harder ceiling than the drake's.
    expect(cindermoor.statBounds.atk[1]).toBeGreaterThan(
      drake.statBounds.atk[1],
    )
    // Pace: its whole roll range sits below the drake's.
    expect(cindermoor.statBounds.spd[1]).toBeLessThan(drake.statBounds.spd[0])
    // The bounds stay legal rolls for the roller (positive, ordered).
    for (const key of ["hp", "atk", "def", "spd"] as const) {
      const [lo, hi] = cindermoor.statBounds[key]
      expect(lo).toBeGreaterThan(0)
      expect(hi).toBeGreaterThanOrEqual(lo)
    }
  })

  test("its kit recomposes the fire vocabulary, distinct from the drake's", () => {
    const cindermoor = speciesOf(CINDERMOOR)
    const drake = speciesOf("fire_drake")
    expect(cindermoor.kit).toHaveLength(6)
    expect([...cindermoor.kit].sort()).not.toEqual([...drake.kit].sort())
    expect(cindermoor.kit.slice(0, 4)).toEqual([
      "spark",
      "flare_dart",
      "cinder_shot",
      "cinder_dive",
    ])
  })

  test("has exactly two champion branches, offense and defense", () => {
    const branches = branchesForSpecies(CINDERMOOR)
    expect(branches.map((b) => b.id)).toEqual(["pyre_colossus", "ember_bank"])
    const [offense, defense] = branches
    if (!offense || !defense) throw new Error("branch rows missing")
    expect([...offense.favors]).toEqual(["atk", "spd"])
    expect([...defense.favors]).toEqual(["hp", "def"])
    for (const branch of branches) {
      expect(branch.speciesId).toBe(CINDERMOOR)
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

  test("each branch learns a fire signature outside the kit", () => {
    const kit = speciesOf(CINDERMOOR).kit
    const signatures = branchesForSpecies(CINDERMOOR).map(
      (b) => b.signatureMove,
    )
    expect(signatures).toEqual(["pyre_lance", "flame_charge"])
    for (const signature of signatures) {
      if (!signature) throw new Error("branch has no signature")
      expect(getMove(signature)?.element).toBe("fire")
      expect(kit).not.toContain(signature)
    }
  })

  test("a cindermoor pair breeds a cindermoor once the registry holds it", () => {
    expect(() => createCreature(CINDERMOOR, 1)).toThrow(/not yet available/i)
    const parents = [record(CINDERMOOR, 1), record(CINDERMOOR, 2)]
    const child = createBredCreature(CINDERMOOR, 42, parents, 3)
    expect(child.speciesId).toBe(CINDERMOOR)
    expect(child.element).toBe("fire")
    expect(child.giftEgg).toBe(false)
    const species = speciesOf(CINDERMOOR)
    for (const key of ["hp", "atk", "def", "spd"] as const) {
      const [lo, hi] = species.statBounds[key]
      expect(child.stats[key]).toBeGreaterThanOrEqual(lo)
      expect(child.stats[key]).toBeLessThanOrEqual(hi)
    }
  })
})

describe("breeding-discovery species records (roster_wave_3 + roster_wave_4)", () => {
  const VOLTFOX = "voltfox"
  const GALEHERON = "galeheron"
  const SHALEMOLE = "shalemole"
  const EMBERCUB = "embercub"
  const MOSSBOAR = "mossboar"
  const MISTKIT = "mistkit"

  const DISCOVERY_LINES = [
    {
      id: VOLTFOX,
      displayName: "Voltfox",
      element: "electric",
      archetypeId: "fox",
      temperament: "obedient",
      sibling: HOUND,
      kit: [
        "static_jolt",
        "volt_dash",
        "ion_dart",
        "arc_shot",
        "storm_surge",
        "ion_wall",
      ],
    },
    {
      id: GALEHERON,
      displayName: "Galeheron",
      element: "wind",
      archetypeId: "heron",
      temperament: "slow",
      sibling: FALCON,
      kit: [
        "gust",
        "feather_dart",
        "talon_slash",
        "gale_cutter",
        "cyclone_dive",
        "zephyr_veil",
      ],
    },
    {
      id: SHALEMOLE,
      displayName: "Shalemole",
      element: "earth",
      archetypeId: "mole",
      temperament: "rush",
      sibling: TORTOISE,
      kit: [
        "pebble_shot",
        "dust_devil",
        "sand_blast",
        "clay_burst",
        "quake_stomp",
        "basalt_guard",
      ],
    },
    {
      id: EMBERCUB,
      displayName: "Embercub",
      element: "fire",
      archetypeId: "cub",
      temperament: "obedient",
      sibling: "fire_drake",
      kit: [
        "flame_charge",
        "blaze_bolt",
        "flare_dart",
        "pyre_lance",
        "cinder_dive",
        "pyre_wall",
      ],
    },
    {
      id: MOSSBOAR,
      displayName: "Mossboar",
      element: "plant",
      archetypeId: "boar",
      temperament: "rush",
      sibling: "plant_ox",
      kit: [
        "thorn_volley",
        "spore_burst",
        "vine_lash",
        "root_quake",
        "thorn_charge",
        "bramble_guard",
      ],
    },
    {
      id: MISTKIT,
      displayName: "Mistkit",
      element: "water",
      archetypeId: "otter",
      temperament: "rush",
      sibling: "water_axolotl",
      kit: [
        "tide_shot",
        "foam_volley",
        "mist_spray",
        "maelstrom",
        "riptide_rush",
        "tide_aegis",
      ],
    },
  ] as const

  /** The wave-4 lines each have two element siblings; wave-3 lines one. */
  const SIBLING_SETS: Record<string, readonly string[]> = {
    [EMBERCUB]: ["fire_drake", CINDERMOOR],
    [MOSSBOAR]: ["plant_ox", FERNSTAG],
    [MISTKIT]: ["water_axolotl", REEFCLAW],
  }

  test("ALL_SPECIES holds 15 species: starters, rewards, discovery", () => {
    expect(ALL_SPECIES).toHaveLength(15)
    expect(STARTER_SPECIES).toHaveLength(3)
    expect(REWARD_SPECIES.map((s) => s.id)).toEqual([
      HOUND,
      FERNSTAG,
      FALCON,
      REEFCLAW,
      TORTOISE,
      CINDERMOOR,
    ])
    expect(DISCOVERY_SPECIES.map((s) => s.id)).toEqual([
      VOLTFOX,
      GALEHERON,
      SHALEMOLE,
      EMBERCUB,
      MOSSBOAR,
      MISTKIT,
    ])
    expect(ALL_SPECIES.map((s) => s.id)).toEqual([
      ...STARTER_SPECIES.map((s) => s.id),
      ...REWARD_SPECIES.map((s) => s.id),
      ...DISCOVERY_SPECIES.map((s) => s.id),
    ])
  })

  for (const line of DISCOVERY_LINES) {
    test(`${line.id} carries its pinned identity`, () => {
      const species = speciesOf(line.id)
      expect(species.displayName).toBe(line.displayName)
      expect(species.element).toBe(line.element)
      expect(species.archetypeId).toBe(line.archetypeId)
      expect(species.temperament).toBe(line.temperament)
      expect(species.flavor.trim().length).toBeGreaterThan(0)
      expect(species.kit).toEqual(line.kit)
    })

    test(`${line.id} is breeding-only: locked, tierless, never obtainable`, () => {
      const species = speciesOf(line.id)
      expect(species.available).toBe(false)
      expect(species.rewardFromTier).toBeUndefined()
      for (const tier of ["bronze", "silver", "gold", "legend"] as const) {
        expect(obtainableSpecies(tier).map((s) => s.id)).not.toContain(line.id)
      }
      expect(() => createCreature(line.id, 1)).toThrow(/not yet available/i)
    })

    test(`${line.id} kit recomposes its element's vocabulary, distinct from its siblings`, () => {
      const species = speciesOf(line.id)
      const others = SIBLING_SETS[line.id] ?? [line.sibling]
      expect(species.kit).toHaveLength(6)
      expect(new Set(species.kit).size).toBe(6)
      for (const moveId of species.kit) {
        expect(getMove(moveId)?.element).toBe(line.element)
      }
      for (const other of others) {
        const sibling = speciesOf(other)
        expect([...species.kit].sort()).not.toEqual([...sibling.kit].sort())
      }
    })

    test(`${line.id} bounds are legal rolls that respect the extremal pins`, () => {
      const species = speciesOf(line.id)
      for (const key of ["hp", "atk", "def", "spd"] as const) {
        const [lo, hi] = species.statBounds[key]
        expect(lo).toBeGreaterThan(0)
        expect(hi).toBeGreaterThanOrEqual(lo)
      }
      // The falcon stays the fastest, frailest record in the game.
      const falcon = speciesOf(FALCON)
      expect(falcon.statBounds.spd[0]).toBeGreaterThan(
        species.statBounds.spd[1],
      )
      expect(falcon.statBounds.hp[1]).toBeLessThan(species.statBounds.hp[0])
      expect(falcon.statBounds.def[1]).toBeLessThan(species.statBounds.def[1])
      // The tortoise stays the bulkiest, slowest record in the game.
      const tortoise = speciesOf(TORTOISE)
      expect(tortoise.statBounds.hp[0]).toBeGreaterThan(
        species.statBounds.hp[1],
      )
      expect(tortoise.statBounds.def[0]).toBeGreaterThan(
        species.statBounds.def[1],
      )
      expect(tortoise.statBounds.spd[1]).toBeLessThan(species.statBounds.spd[0])
    })

    test(`a ${line.id} pair breeds a ${line.id} once the nursery hatches it`, () => {
      const parents = [record(line.id, 1), record(line.id, 2)]
      const child = createBredCreature(line.id, 42, parents, 3)
      expect(child.speciesId).toBe(line.id)
      expect(child.element).toBe(line.element)
      expect(child.giftEgg).toBe(false)
      const species = speciesOf(line.id)
      for (const key of ["hp", "atk", "def", "spd"] as const) {
        const [lo, hi] = species.statBounds[key]
        expect(child.stats[key]).toBeGreaterThanOrEqual(lo)
        expect(child.stats[key]).toBeLessThanOrEqual(hi)
      }
    })
  }

  describe("the fire-triangle lines (roster_wave_4)", () => {
    test("each kit embeds its siblings' branch signatures, reserving the free specials", () => {
      // Option-1, wave-3 precedent: the new kit carries the element's
      // already-claimed signatures, so the two specials it omits stay free
      // for its own champion branches.
      const embercub = speciesOf(EMBERCUB)
      expect(embercub.kit).toEqual(
        expect.arrayContaining([
          "cinder_dive",
          "pyre_wall",
          "pyre_lance",
          "flame_charge",
        ]),
      )
      const mossboar = speciesOf(MOSSBOAR)
      expect(mossboar.kit).toEqual(
        expect.arrayContaining([
          "thorn_charge",
          "bramble_guard",
          "root_quake",
          "spore_burst",
        ]),
      )
      const mistkit = speciesOf(MISTKIT)
      expect(mistkit.kit).toEqual(
        expect.arrayContaining([
          "riptide_rush",
          "tide_aegis",
          "maelstrom",
          "tide_shot",
        ]),
      )
    })

    test("each line's stat profile differs from both element siblings", () => {
      const embercub = speciesOf(EMBERCUB)
      const drake = speciesOf("fire_drake")
      const cindermoor = speciesOf(CINDERMOOR)
      expect(embercub.statBounds.hp[0]).toBeGreaterThan(drake.statBounds.hp[0])
      expect(embercub.statBounds.spd[0]).toBeGreaterThan(
        cindermoor.statBounds.spd[1],
      )
      expect(embercub.statBounds.hp[1]).toBeLessThan(
        cindermoor.statBounds.hp[1],
      )

      const mossboar = speciesOf(MOSSBOAR)
      const ox = speciesOf("plant_ox")
      const fernstag = speciesOf(FERNSTAG)
      expect(mossboar.statBounds.hp[1]).toBeLessThan(ox.statBounds.hp[1])
      expect(mossboar.statBounds.hp[0]).toBeGreaterThan(
        fernstag.statBounds.hp[1],
      )
      expect(mossboar.statBounds.spd[1]).toBeLessThan(
        fernstag.statBounds.spd[0],
      )

      const mistkit = speciesOf(MISTKIT)
      const axolotl = speciesOf("water_axolotl")
      const reefclaw = speciesOf(REEFCLAW)
      expect(mistkit.statBounds.hp[1]).toBeLessThan(axolotl.statBounds.hp[1])
      expect(mistkit.statBounds.spd[1]).toBeGreaterThan(
        axolotl.statBounds.spd[1],
      )
      expect(mistkit.statBounds.spd[0]).toBeGreaterThan(
        reefclaw.statBounds.spd[1],
      )
      expect(mistkit.statBounds.def[1]).toBeLessThan(reefclaw.statBounds.def[0])
    })

    test("each line reserves its voxel archetype id", () => {
      expect(speciesOf(EMBERCUB).archetypeId).toBe("cub")
      expect(speciesOf(MOSSBOAR).archetypeId).toBe("boar")
      expect(speciesOf(MISTKIT).archetypeId).toBe("otter")
    })
  })
})
