/**
 * The single form seam, cup side (training_programs FR9/FR10). Form enters
 * the cup exactly once, in `makeBracket`: the player's frozen slot carries
 * `battleStats(owned)` and every later read (`slotPlayerSide`,
 * `resolvePlayerMatch`, the coach room) sees that snapshot.
 *
 * The draws do not: the rival ramp still reads `effectiveStats(owned)`, and
 * the cup seed identity in `machine.ts` does too, so mood and bond can never
 * move a seed, a pairing, or a rival's stats (FR-10, NFR-2). Rivals, bosses,
 * and the pre-resolved rival subtree are form-neutral by construction.
 */

import { describe, expect, test } from "bun:test"
import { type Creature, createCreature, effectiveStats } from "../creature"
import { battleStats, formTier } from "../form"
import { defaultLoadout } from "../loadout"
import { prepareCup } from "../machine"
import { getSpecies } from "../species"
import { createInitialState } from "../state"
import { makeBracket } from "./bracket"
import { resolvePlayerMatch, startCupSession } from "./session"

/** A fire drake seed 42 with the mood/bond a care routine left behind. */
function withCare(mood: number, bond: number, seed = 42): Creature {
  const base = createCreature("fire_drake", seed)
  return { ...base, conditions: { ...base.conditions, mood, bond } }
}

/**
 * The creature the cup-day contract fixture actually walked in with before
 * form was wired: six unfed nights, so starved, sick, and sluggish.
 */
function neglected(seed = 42): Creature {
  const base = createCreature("fire_drake", seed)
  return {
    ...base,
    conditions: {
      ...base.conditions,
      hunger: 0,
      health: 60,
      mood: 45,
      bond: 0,
    },
  }
}

/** The player branch's first resolved match. */
function playFirst(c: Creature, day: number, seed: number) {
  const def = getSpecies(c.speciesId)
  if (!def) throw new Error(`unknown species ${c.speciesId}`)
  const session = startCupSession(c, day, seed)
  return resolvePlayerMatch(session, defaultLoadout(c, def), "balanced")
}

describe("cup seam — the player slot carries the form snapshot", () => {
  test("a sharp creature's slot fights one ATK up and keeps its SPD", () => {
    const owned = withCare(100, 100)
    expect(formTier(owned)).toBe("sharp")
    const eff = effectiveStats(owned)
    const slot = makeBracket(owned, 7, 101).slots[0]
    expect(slot?.stats).toEqual(battleStats(owned))
    expect(slot?.stats).toEqual({
      hp: eff.hp,
      atk: eff.atk + 1,
      def: eff.def,
      spd: eff.spd,
    })
  })

  test("a neglected creature's slot fights two ATK down and keeps its SPD", () => {
    const owned = neglected()
    expect(formTier(owned)).toBe("sluggish")
    const eff = effectiveStats(owned)
    const slot = startCupSession(owned, 7, 101).bracket.slots[0]
    expect(slot?.stats).toEqual({
      hp: eff.hp,
      atk: Math.max(1, eff.atk - 2),
      def: eff.def,
      spd: eff.spd,
    })
  })

  test("the frozen slot is what the player fights with", () => {
    const sharp = playFirst(withCare(100, 100), 7, 101)
    const sluggish = playFirst(neglected(), 7, 101)
    expect(sharp.verdict.battle).not.toEqual(sluggish.verdict.battle)
  })

  test("a fresh creature's slot is unchanged (AC-1, NFR-2)", () => {
    const owned = createCreature("fire_drake", 42)
    expect(formTier(owned)).toBe("steady")
    expect(makeBracket(owned, 7, 101).slots[0]?.stats).toEqual(
      effectiveStats(owned),
    )
  })
})

describe("the draws are form-neutral (FR-10, NFR-2)", () => {
  test("mood and bond never move a bracket draw", () => {
    for (const day of [7, 14, 21]) {
      for (const seed of [101, 202, 1]) {
        const sharp = makeBracket(withCare(100, 100), day, seed)
        const sluggish = makeBracket(withCare(10, 0), day, seed)
        expect(sharp.slots.slice(1)).toEqual(sluggish.slots.slice(1))
        expect(sharp.finalRival).toEqual(sluggish.finalRival)
      }
    }
  })

  test("rival slots keep reading effective stats, never form stats", () => {
    const fresh = createCreature("fire_drake", 42)
    const sharp = withCare(100, 100)
    const sharpBracket = makeBracket(sharp, 7, 101)
    const freshBracket = makeBracket(fresh, 7, 101)
    expect(sharpBracket.slots.slice(1)).toEqual(freshBracket.slots.slice(1))
    // The player slot is the only slot form moves.
    expect(sharpBracket.slots[0]?.stats).not.toEqual(
      freshBracket.slots[0]?.stats,
    )
  })

  test("the cup seed identity stays on effective stats", () => {
    const creature = withCare(100, 100)
    const sharp = { ...createInitialState(), day: 7, phase: "cup" as const }
    const sharpState = { ...sharp, creature }
    const sluggishState = { ...sharp, creature: withCare(10, 0) }
    const a = prepareCup(sharpState)
    const b = prepareCup(sluggishState)
    if (!a || !b) throw new Error("the cup did not open")
    expect(a.seed).toBe(b.seed)
    expect(a.bracket.slots.slice(1)).toEqual(b.bracket.slots.slice(1))
    expect(a.bracket.slots[0]?.stats).toEqual(battleStats(creature))
    expect(b.bracket.slots[0]?.stats).not.toEqual(a.bracket.slots[0]?.stats)
  })
})
