import { describe, expect, test } from "bun:test"
import { getBoss } from "../bosses"
import type { CupSlot } from "../cup/bracket"
import { battleSideForSlot } from "../cup/verdicts"
import { MAX_LOADOUT } from "../loadout"
import { makeRng } from "../rng"
import { getSpecies } from "../species"
import { rivalKit } from "./rival-kit"

const SPECIES = ["fire_drake", "plant_ox", "water_axolotl"] as const

function speciesOf(id: string) {
  const species = getSpecies(id)
  if (!species) throw new Error(`Unknown species: ${id}`)
  return species
}

function slot(speciesId: string, name: string, bossId?: string): CupSlot {
  return {
    isPlayer: false,
    name,
    speciesId,
    stats: { hp: 90, atk: 10, def: 10, spd: 10 },
    ...(bossId === undefined ? {} : { bossId }),
  }
}

describe("rivalKit — the four a rival fields from its six", () => {
  test("returns four distinct moves from the species pool", () => {
    for (const id of SPECIES) {
      const species = speciesOf(id)
      for (let seed = 0; seed < 40; seed++) {
        const kit = rivalKit(species, seed)
        expect(kit.length).toBe(MAX_LOADOUT)
        expect(new Set(kit).size).toBe(kit.length)
        for (const moveId of kit) expect(species.kit).toContain(moveId)
      }
    }
  })

  test("the same seed always fields the same four", () => {
    const species = speciesOf("fire_drake")
    for (let seed = 0; seed < 20; seed++) {
      expect(rivalKit(species, seed)).toEqual(rivalKit(species, seed))
    }
  })

  test("different seeds field different fours", () => {
    for (const id of SPECIES) {
      const species = speciesOf(id)
      const kits = new Set<string>()
      for (let seed = 0; seed < 40; seed++) {
        kits.add(rivalKit(species, seed).join(","))
      }
      expect(kits.size).toBeGreaterThan(1)
    }
  })

  test("every move in the pool can be fielded", () => {
    for (const id of SPECIES) {
      const species = speciesOf(id)
      const seen = new Set<string>()
      for (let seed = 0; seed < 120; seed++) {
        for (const moveId of rivalKit(species, seed)) seen.add(moveId)
      }
      expect([...seen].sort()).toEqual([...species.kit].sort())
    }
  })

  test("draws from its own stream, not the caller's", () => {
    const species = speciesOf("plant_ox")
    const control = makeRng(99)
    const controlDraws = [control.next(), control.next(), control.next()]

    const interrupted = makeRng(99)
    const first = interrupted.next()
    rivalKit(species, 7)
    const second = interrupted.next()
    rivalKit(species, 11)
    const third = interrupted.next()

    expect([first, second, third]).toEqual(controlDraws)
  })
})

describe("cup opponents draw from the wider pool", () => {
  test("a generated slot fields four moves from its species pool", () => {
    for (const id of SPECIES) {
      const side = battleSideForSlot(slot(id, "Test Rival"), 1234)
      const species = speciesOf(id)
      expect(side.kit.length).toBe(MAX_LOADOUT)
      for (const moveId of side.kit) expect(species.kit).toContain(moveId)
    }
  })

  test("the same slot and seed always fields the same four", () => {
    const first = battleSideForSlot(
      slot("water_axolotl", "Mossbottom Brute"),
      77,
    )
    const second = battleSideForSlot(
      slot("water_axolotl", "Mossbottom Brute"),
      77,
    )
    expect(second.kit).toEqual(first.kit)
  })

  test("a pinned boss keeps its authored kit", () => {
    const boss = getBoss("koda")
    if (!boss) throw new Error("The koda boss is missing")
    const side = battleSideForSlot(slot("fire_drake", "Koda", "koda"), 5)
    expect(side.kit).toEqual(boss.loadout)
  })
})
