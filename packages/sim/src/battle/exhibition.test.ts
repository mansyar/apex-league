import { describe, expect, test } from "bun:test"
import {
  type Creature,
  createCreature,
  effectiveStats,
  TRAINED_START,
} from "../creature"
import { defaultLoadout } from "../loadout"
import { getSpecies } from "../species"
import { makeExhibition } from "./exhibition"

function buildOwned(seed: number): Creature {
  return createCreature("fire_drake", seed)
}

function trainedOwned(seed: number, trained: Creature["trained"]): Creature {
  return { ...buildOwned(seed), trainingDays: 4, trained }
}

describe("makeExhibition — prep consumption", () => {
  test("the owned side fights with effective stats", () => {
    for (let seed = 0; seed < 6; seed++) {
      const owned = trainedOwned(seed, { hp: 2, atk: 5, def: 1, spd: 3 })
      const spar = makeExhibition(owned, "balanced", seed + 100)
      expect(spar.ownedSide.stats).toEqual(effectiveStats(owned))
    }
  })

  test("an explicit loadout overrides the kit", () => {
    const owned: Creature = {
      ...trainedOwned(7, { hp: 0, atk: 0, def: 0, spd: 0 }),
      loadout: ["blaze_bolt", "cinder_shot"],
    }
    const spar = makeExhibition(owned, "specials", 9)
    expect(spar.ownedSide.kit).toEqual(["blaze_bolt", "cinder_shot"])
  })

  test("loadout null resolves to the default slicing", () => {
    const owned = trainedOwned(2, TRAINED_START)
    const species = getSpecies(owned.speciesId)
    if (!species) throw new Error("The starter species are missing")
    const spar = makeExhibition(owned, "balanced", 5)
    expect(spar.ownedSide.kit).toEqual(defaultLoadout(owned, species))
  })

  test("the rival stays untouched whatever the owner trained", () => {
    for (let seed = 0; seed < 8; seed++) {
      const owned = trainedOwned(seed, { hp: 6, atk: 6, def: 6, spd: 6 })
      const spar = makeExhibition(owned, "specials", seed + 200)
      const rivalSpecies = getSpecies(spar.rivalSpeciesId)
      if (!rivalSpecies) throw new Error("The rival species is missing")
      expect(spar.rivalSide.kit).toEqual(rivalSpecies.kit)
      expect(spar.rivalSide.stats).toEqual(spar.rival.stats)
      expect(spar.rival.trainingDays).toBe(0)
    }
  })

  test("the owned creature is never mutated", () => {
    const owned = trainedOwned(11, { hp: 1, atk: 2, def: 0, spd: 0 })
    const snapshot = structuredClone(owned)
    makeExhibition(owned, "balanced", 300)
    expect(owned).toEqual(snapshot)
  })
})

describe("makeExhibition", () => {
  test("every starter appears as a rival across many seeds", () => {
    const seen = new Set<string>()
    for (let seed = 0; seed < 240; seed++) {
      const spar = makeExhibition(buildOwned(seed + 1), "balanced", seed)
      expect(["fire_drake", "plant_ox", "water_axolotl"]).toContain(
        spar.rivalSpeciesId,
      )
      seen.add(spar.rivalSpeciesId)
    }
    expect(seen).toEqual(new Set(["fire_drake", "plant_ox", "water_axolotl"]))
  })

  test("the rival tactic is one of the two tactics", () => {
    for (let seed = 0; seed < 20; seed++) {
      const spar = makeExhibition(buildOwned(seed + 1), "balanced", seed)
      expect(["balanced", "specials"]).toContain(spar.rivalTactic)
    }
  })

  test("both sides carry their species kit and the rival's temperament", () => {
    const spar = makeExhibition(buildOwned(1), "specials", 3)
    const owned = getSpecies("fire_drake")
    const rival = getSpecies(spar.rivalSpeciesId)
    if (!owned || !rival) throw new Error("The starter species are missing")
    expect(spar.ownedSide.kit).toEqual(defaultLoadout(buildOwned(1), owned))
    expect(spar.rivalSide.kit).toEqual(rival.kit)
    expect(spar.rivalSide.temperament).toBe(rival.temperament)
  })

  test("the rival's stats land inside the species stat bounds", () => {
    for (let seed = 0; seed < 30; seed++) {
      const spar = makeExhibition(buildOwned(seed + 1), "balanced", seed)
      const bounds = getSpecies(spar.rivalSpeciesId)?.statBounds
      if (!bounds) throw new Error("The rival species has no stat bounds")
      const stats = spar.rival.stats
      expect(stats.hp).toBeGreaterThanOrEqual(bounds.hp[0])
      expect(stats.hp).toBeLessThanOrEqual(bounds.hp[1])
      expect(stats.atk).toBeGreaterThanOrEqual(bounds.atk[0])
      expect(stats.atk).toBeLessThanOrEqual(bounds.atk[1])
      expect(stats.def).toBeGreaterThanOrEqual(bounds.def[0])
      expect(stats.def).toBeLessThanOrEqual(bounds.def[1])
      expect(stats.spd).toBeGreaterThanOrEqual(bounds.spd[0])
      expect(stats.spd).toBeLessThanOrEqual(bounds.spd[1])
    }
  })

  test("the helper never mutates the owned creature", () => {
    const owned = buildOwned(9)
    const snapshot = structuredClone(owned)
    makeExhibition(owned, "specials", 11)
    expect(owned).toEqual(snapshot)
  })

  test("two builds with the same seed match in full", () => {
    const first = makeExhibition(buildOwned(2), "balanced", 15)
    const second = makeExhibition(buildOwned(2), "balanced", 15)
    expect(second).toEqual(first)
  })
})
