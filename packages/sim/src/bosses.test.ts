/**
 * The boss registry (silver_ladder_bosses_20261016, FR8).
 *
 * Bosses are authored rivals: existing species with pinned absolute stats
 * (legal by construction), pinned kits that obey the equip rules, and coach
 * persona copy the client reads in Phase 4. The registry is pure frozen
 * data — no RNG, no state.
 */
import { describe, expect, it } from "bun:test"
import { BASIC_MOVE } from "./battle/moves"
import type { Tactic } from "./battle/policy"
import { BOSSES, getBoss } from "./bosses"
import { getSpecies } from "./species"

describe("boss registry", () => {
  it("holds exactly six bosses with stable ids, tiers and milestones", () => {
    expect(BOSSES.map((b) => b.id)).toEqual([
      "koda",
      "hesse",
      "marlow",
      "delmar",
      "fenn",
      "thessa",
    ])
    expect(BOSSES.map((b) => [b.tier, b.milestone])).toEqual([
      ["bronze", "promotion"],
      ["silver", "checkpoint"],
      ["silver", "apex"],
      ["silver", "promotion"],
      ["gold", "checkpoint"],
      ["gold", "apex"],
    ])
  })

  it("keeps one boss per (tier, milestone) pair", () => {
    const seen = new Set(BOSSES.map((b) => `${b.tier}:${b.milestone}`))
    expect(seen.size).toBe(BOSSES.length)
  })

  it("freezes the registry so callers cannot bend it", () => {
    expect(Object.isFrozen(BOSSES)).toBe(true)
  })

  it("looks bosses up by id and returns undefined for unknown ids", () => {
    expect(getBoss("koda")?.name).toBe("Sear Marshal Koda")
    expect(getBoss("nope")).toBeUndefined()
  })

  it("gives every boss a species that exists in the catalog", () => {
    for (const boss of BOSSES) {
      expect(getSpecies(boss.speciesId)).toBeDefined()
    }
  })

  it("pins absolute stats inside the species' legal roll bounds", () => {
    for (const boss of BOSSES) {
      const species = getSpecies(boss.speciesId)
      expect(species).toBeDefined()
      if (!species) continue
      for (const stat of ["hp", "atk", "def", "spd"] as const) {
        const [min, max] = species.statBounds[stat]
        expect(boss.stats[stat]).toBeGreaterThanOrEqual(min)
        expect(boss.stats[stat]).toBeLessThanOrEqual(max)
      }
    }
  })

  it("pins a legal loadout: 2-4 unique moves from the species' kit", () => {
    for (const boss of BOSSES) {
      const species = getSpecies(boss.speciesId)
      expect(species).toBeDefined()
      if (!species) continue
      expect(boss.loadout.length).toBeGreaterThanOrEqual(2)
      expect(boss.loadout.length).toBeLessThanOrEqual(4)
      expect(new Set(boss.loadout).size).toBe(boss.loadout.length)
      for (const move of boss.loadout) {
        expect(species.kit).toContain(move)
        expect(move).not.toBe(BASIC_MOVE.id)
      }
    }
  })

  it("uses a tactic from the existing tactic set", () => {
    const LEGAL: readonly Tactic[] = ["balanced", "specials"]
    for (const boss of BOSSES) {
      expect(LEGAL).toContain(boss.tactic)
    }
  })

  it("carries complete persona copy: name, intro, win and loss quips", () => {
    for (const boss of BOSSES) {
      expect(boss.name.length).toBeGreaterThan(0)
      expect(boss.intro.length).toBeGreaterThan(0)
      expect(boss.quips.win.length).toBeGreaterThan(0)
      expect(boss.quips.loss.length).toBeGreaterThan(0)
    }
  })
})
