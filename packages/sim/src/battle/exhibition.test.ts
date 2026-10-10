import { describe, expect, test } from "bun:test"
import { type Creature, createCreature } from "../creature"
import { getSpecies } from "../species"
import { makeExhibition } from "./exhibition"

function buildOwned(seed: number): Creature {
  return createCreature("fire_drake", seed)
}

describe("makeExhibition", () => {
  test("the rival is always an available starter over many seeds", () => {
    for (let seed = 0; seed < 60; seed++) {
      const spar = makeExhibition(buildOwned(seed + 1), "balanced", seed)
      expect(["fire_drake", "plant_ox"]).toContain(spar.rivalSpeciesId)
    }
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
    expect(spar.ownedSide.kit).toEqual(owned.kit)
    expect(spar.rivalSide.kit).toEqual(rival.kit)
    expect(spar.rivalSide.temperament).toBe(rival.temperament)
    expect(spar.rivalSpeciesId).not.toBe("water_axolotl")
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
