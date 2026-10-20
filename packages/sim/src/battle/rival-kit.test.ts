import { describe, expect, test } from "bun:test"
import { getBoss } from "../bosses"
import { branchesForSpecies, branchLean, getBranch } from "../branches"
import { createCreature } from "../creature"
import type { CupSlot } from "../cup/bracket"
import { battleSideForSlot } from "../cup/verdicts"
import { MAX_LOADOUT } from "../loadout"
import { makeRng } from "../rng"
import { getSpecies } from "../species"
import { makeExhibition } from "./exhibition"
import { resolveBattle } from "./resolver"
import { rivalBranch, rivalKit } from "./rival-kit"

const SPECIES = ["fire_drake", "plant_ox", "water_axolotl"] as const
const ZERO = { hp: 0, atk: 0, def: 0, spd: 0 } as const

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

describe("rivalBranch — the form a generated rival fights in", () => {
  test("is deterministic for the same species and stat profile", () => {
    for (const id of SPECIES) {
      const species = speciesOf(id)
      for (let seed = 0; seed < 30; seed++) {
        const { stats } = createCreature(id, seed)
        expect(rivalBranch(species, stats)).toBe(rivalBranch(species, stats))
      }
    }
  })

  test("matches the natural lean of a zeroed training record", () => {
    for (const id of SPECIES) {
      const species = speciesOf(id)
      for (let seed = 0; seed < 30; seed++) {
        const { stats } = createCreature(id, seed)
        const lean = branchLean(
          { speciesId: id, stats, trained: ZERO },
          species,
        )
        expect(rivalBranch(species, stats)).toBe(lean.branch.id)
      }
    }
  })

  test("both real forms are reachable from a stat profile", () => {
    // Rolled starter stats are HP-dominant (hp ~76-92 against atk+spd ~18-25),
    // so a zeroed-training natural lean always resolves to the defense form.
    // These two crafted profiles prove the helper spans both real forms when
    // the profile actually leans that way.
    for (const id of SPECIES) {
      const species = speciesOf(id)
      const expected = branchesForSpecies(id).map((b) => b.id)
      expect(expected.length).toBe(2)
      const seen = new Set<string>()
      seen.add(rivalBranch(species, { hp: 40, atk: 60, def: 10, spd: 40 }))
      seen.add(rivalBranch(species, { hp: 90, atk: 5, def: 20, spd: 5 }))
      expect([...seen].sort()).toEqual([...expected].sort())
    }
  })

  test("a cup side carries the derived branch without changing the fight", () => {
    const a = slot("fire_drake", "Cindersnout")
    const b = slot("plant_ox", "Bramble Knoll Ox")
    for (let seed = 0; seed < 25; seed++) {
      const side = battleSideForSlot(a, seed)
      const foe = battleSideForSlot(b, seed ^ 1)
      expect(side.branch).toBe(rivalBranch(speciesOf(a.speciesId), a.stats))
      const stripped = {
        name: side.name,
        id: side.id,
        element: side.element,
        stats: side.stats,
        kit: side.kit,
        tactic: side.tactic,
        temperament: side.temperament,
      }
      expect(resolveBattle(stripped, foe, seed)).toEqual(
        resolveBattle(side, foe, seed),
      )
    }
  })
})

describe("spar rivals carry a derived form too", () => {
  test("the rival's branch is its own stats' lean and never reaches the fight", () => {
    const owned = createCreature("fire_drake", 42)
    for (let seed = 0; seed < 15; seed++) {
      const spar = makeExhibition(owned, "balanced", seed)
      const species = speciesOf(spar.rivalSpeciesId)
      expect(spar.rival.branch).toBe(rivalBranch(species, spar.rival.stats))
      expect(spar.rivalSide.branch).toBe(spar.rival.branch ?? undefined)
      expect(spar.rivalSide.stats).toEqual(spar.rival.stats)
      expect(spar.rivalSide.kit.length).toBe(MAX_LOADOUT)
      for (const moveId of spar.rivalSide.kit) {
        expect(species.kit).toContain(moveId)
      }
      const stripped = {
        name: spar.rivalSide.name,
        id: spar.rivalSide.id,
        element: spar.rivalSide.element,
        stats: spar.rivalSide.stats,
        kit: spar.rivalSide.kit,
        tactic: spar.rivalSide.tactic,
        temperament: spar.rivalSide.temperament,
      }
      expect(resolveBattle(spar.ownedSide, stripped, seed)).toEqual(
        resolveBattle(spar.ownedSide, spar.rivalSide, seed),
      )
    }
  })

  test("the derived form is a real branch for the sparred species", () => {
    const owned = createCreature("water_axolotl", 7)
    for (let seed = 0; seed < 15; seed++) {
      const spar = makeExhibition(owned, "balanced", seed)
      const branch = getBranch(spar.rival.branch ?? "")
      expect(branch?.speciesId).toBe(spar.rivalSpeciesId)
    }
  })

  test("the owner's side reports the earned form, or legacy when unbranched", () => {
    const branched = {
      ...createCreature("fire_drake", 42),
      branch: "cinder_courser",
    }
    const earned = makeExhibition(branched, "balanced", 5)
    expect(earned.ownedSide.branch).toBe("cinder_courser")

    const unbranched = createCreature("fire_drake", 42)
    expect(unbranched.branch).toBeNull()
    const fresh = makeExhibition(unbranched, "balanced", 5)
    expect(fresh.ownedSide.branch).toBe("legacy")
    expect(fresh.ownedSide.stats).toEqual(earned.ownedSide.stats)
  })
})
