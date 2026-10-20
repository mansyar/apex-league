/**
 * The single form seam, spar side (training_programs FR9). `makeExhibition`
 * is the only place the owned creature's combat stats are assembled for a
 * spar, so `battleStats` there is the whole of the wiring: every tactic,
 * kit, and resolver path downstream reads `ownedSide.stats` and nothing
 * else. `battle/` never reads mood or bond — the form is pure in `form.ts`
 * and arrives as numbers.
 *
 * The rival is form-neutral by construction: it is rolled fresh from
 * `createCreature` inside `makeExhibition`, so no condition of the owner's
 * creature can reach it.
 */

import { describe, expect, test } from "bun:test"
import { type Creature, createCreature, effectiveStats } from "../creature"
import { battleStats, formTier } from "../form"
import { makeExhibition } from "./exhibition"
import { resolveBattle } from "./resolver"

/** A fire drake seed 42 with the mood/bond a care routine left behind. */
function withCare(mood: number, bond: number, seed = 42): Creature {
  const base = createCreature("fire_drake", seed)
  return { ...base, conditions: { ...base.conditions, mood, bond } }
}

describe("spar seam — the owned side fights with its form", () => {
  test("a sharp owner spars one ATK up and nothing else", () => {
    const owned = withCare(100, 100)
    expect(formTier(owned)).toBe("sharp")
    const eff = effectiveStats(owned)
    const spar = makeExhibition(owned, "balanced", 7)
    expect(spar.ownedSide.stats).toEqual({
      hp: eff.hp,
      atk: eff.atk + 1,
      def: eff.def,
      spd: eff.spd,
    })
    expect(spar.ownedSide.stats).toEqual(battleStats(owned))
  })

  test("a sluggish owner spars two ATK down and keeps its SPD", () => {
    const owned = withCare(10, 0)
    expect(formTier(owned)).toBe("sluggish")
    const eff = effectiveStats(owned)
    const spar = makeExhibition(owned, "specials", 3)
    expect(spar.ownedSide.stats).toEqual({
      hp: eff.hp,
      atk: Math.max(1, eff.atk - 2),
      def: eff.def,
      spd: eff.spd,
    })
    expect(spar.ownedSide.stats.spd).toBe(eff.spd)
  })

  test("a flat owner spars one ATK down and keeps its SPD", () => {
    const owned = withCare(40, 0)
    expect(formTier(owned)).toBe("flat")
    const eff = effectiveStats(owned)
    expect(makeExhibition(owned, "balanced", 1).ownedSide.stats).toEqual({
      hp: eff.hp,
      atk: eff.atk - 1,
      def: eff.def,
      spd: eff.spd,
    })
  })

  test("the form delta reaches the resolver", () => {
    // Same rival, same seed, different owner conditions: only the form
    // delta can explain a different battle. Any seed flipping proves the
    // resolver is reading the side stats the seam handed it.
    const sharp = makeExhibition(withCare(100, 100), "balanced", 7)
    const sluggish = makeExhibition(withCare(10, 0), "balanced", 7)
    expect(sharp.rivalSide).toEqual(sluggish.rivalSide)
    const differs = [1, 2, 3, 4, 5, 6, 7, 8].some((seed) => {
      const a = resolveBattle(sharp.ownedSide, sharp.rivalSide, seed)
      const b = resolveBattle(sluggish.ownedSide, sluggish.rivalSide, seed)
      return JSON.stringify(a) !== JSON.stringify(b)
    })
    expect(differs).toBe(true)
  })

  test("a fresh owner's spar is unchanged (AC-1, NFR-2)", () => {
    for (const seed of [0, 3, 15, 42]) {
      const owned = createCreature("fire_drake", seed)
      expect(formTier(owned)).toBe("steady")
      expect(battleStats(owned)).toEqual(effectiveStats(owned))
      expect(makeExhibition(owned, "balanced", seed).ownedSide.stats).toEqual(
        effectiveStats(owned),
      )
    }
  })

  test("the owner's mood and bond never reach the rival (FR-10)", () => {
    for (const seed of [3, 15, 42, 101]) {
      const sharp = makeExhibition(withCare(100, 100), "balanced", seed)
      const sluggish = makeExhibition(withCare(10, 0), "balanced", seed)
      expect(sharp.rivalSide).toEqual(sluggish.rivalSide)
      expect(sharp.rival).toEqual(sluggish.rival)
      expect(sharp.rivalSpeciesId).toBe(sluggish.rivalSpeciesId)
      expect(sharp.rivalTactic).toBe(sluggish.rivalTactic)
      expect(sharp.rivalSide.stats).toEqual(sharp.rival.stats)
    }
  })
})
