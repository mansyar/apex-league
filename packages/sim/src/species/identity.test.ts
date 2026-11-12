/**
 * The earth tortoise's identity fence (Capshare Pacing FR-2a, AC-2a).
 *
 * This file exists because the cheapest way to stop a slow body from stalling is
 * to speed it up, and that would delete the species. The tortoise is the roster's
 * slowest, tankiest earth wall: `spd` rolls 3-5, its bulk is its whole thesis,
 * and its six moves are its own. A fix may make it effective *from where it
 * stands* — a different four of its own six moves, a stat line inside its
 * authored envelope — but it may not make it fast, re-tempered, re-skinned, or
 * hand it a move it does not own.
 *
 * Every value below is the shipped one, written as a literal rather than read
 * from the record, so a change to the record fails here instead of quietly
 * re-baselining the fence. `hp`/`def` are floors (raising them is allowed, the
 * species may not be made frailer to pay for damage); `spd` is exact, because a
 * raised ceiling is the shortcut this test exists to reject.
 */

import { describe, expect, test } from "bun:test"
import { getSpecies } from "./catalog"

/** The six moves the tortoise shipped with — the only kit it may draw from. */
const OWNED_KIT = [
  "pebble_shot",
  "dust_devil",
  "clay_burst",
  "boulder_toss",
  "sand_blast",
  "tectonic_slam",
] as const

/** The shipped stat envelope. `hp`/`def` are floors; `spd` is exact. */
const SHIPPED = {
  hp: [163, 209],
  def: [10, 13],
  spd: [3, 5],
} as const

function tortoise() {
  const species = getSpecies("earth_tortoise")
  if (!species) throw new Error("the roster lost earth_tortoise")
  return species
}

describe("earth_tortoise identity — the fix may not re-skin the species (FR-2a)", () => {
  test("stays the slowest body: spd bounds are exactly [3, 5]", () => {
    // Exact, not a floor: raising the ceiling is how a slow body is turned into
    // a fast one, and that is the one change AC-2a is written to reject.
    expect(tortoise().statBounds.spd).toEqual([...SHIPPED.spd])
  })

  test("stays the tankiest earth wall: hp and def bounds are not lowered", () => {
    const bounds = tortoise().statBounds
    expect(bounds.hp[0]).toBeGreaterThanOrEqual(SHIPPED.hp[0])
    expect(bounds.hp[1]).toBeGreaterThanOrEqual(SHIPPED.hp[1])
    expect(bounds.def[0]).toBeGreaterThanOrEqual(SHIPPED.def[0])
    expect(bounds.def[1]).toBeGreaterThanOrEqual(SHIPPED.def[1])
  })

  test("stays slow, a tortoise, and earth", () => {
    const species = tortoise()
    expect(species.temperament).toBe("slow")
    expect(species.archetypeId).toBe("tortoise")
    expect(species.element).toBe("earth")
  })

  test("draws its six-move kit only from the moves it already owns", () => {
    // The kit is a fixed six-tuple of distinct moves, so "every id is one of the
    // six" plus "six of them" is exactly "the same six, in some order". Order is
    // deliberately free: which four the carried loadout takes is the lever this
    // track is allowed to pull.
    const kit = tortoise().kit
    expect(kit.length).toBe(OWNED_KIT.length)
    expect(new Set(kit).size).toBe(OWNED_KIT.length)
    expect([...kit].sort()).toEqual([...OWNED_KIT].sort())
  })
})
