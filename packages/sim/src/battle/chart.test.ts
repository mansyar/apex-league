import { describe, expect, test } from "bun:test"

import type { Element } from "../creature"
import { incomingTypeFactor, typeFactor } from "./chart"
import { strikeDamage } from "./damage"

const ELEMENTS: readonly Element[] = [
  "fire",
  "water",
  "plant",
  "electric",
  "earth",
  "wind",
]

/** Attacker beats defender. The reverse pair must be a resist. */
const BEATS: ReadonlyArray<readonly [Element, Element]> = [
  ["fire", "plant"],
  ["plant", "water"],
  ["water", "fire"],
  ["electric", "earth"],
  ["earth", "wind"],
  ["wind", "electric"],
]

describe("typeFactor", () => {
  test("a beating edge is 3/2×", () => {
    for (const [attack, defense] of BEATS) {
      expect(typeFactor(attack, defense)).toEqual({ num: 3, den: 2 })
    }
  })

  test("the reverse of a beating edge is 2/3×", () => {
    for (const [attack, defense] of BEATS) {
      expect(typeFactor(defense, attack)).toEqual({ num: 2, den: 3 })
    }
  })

  test("a pair with no edge either way is 1×", () => {
    expect(typeFactor("fire", "electric")).toEqual({ num: 1, den: 1 })
    expect(typeFactor("electric", "fire")).toEqual({ num: 1, den: 1 })
  })

  test("no pair is 0×", () => {
    for (const attack of ELEMENTS) {
      for (const defense of ELEMENTS) {
        const factor = typeFactor(attack, defense)
        expect(factor.num).toBeGreaterThan(0)
        expect(factor.den).toBeGreaterThan(0)
      }
    }
  })
})

describe("chart symmetry (FR-18, AC-10)", () => {
  test("every element wins exactly once and loses exactly once", () => {
    for (const element of ELEMENTS) {
      const wins = BEATS.filter(([attack]) => attack === element).length
      const losses = BEATS.filter(([, defense]) => defense === element).length
      expect(wins, `${element} wins`).toBe(1)
      expect(losses, `${element} losses`).toBe(1)
    }
  })

  test("the two cycles are the only edges and they are disjoint", () => {
    // Fire > Plant > Water > Fire and Electric > Earth > Wind > Electric:
    // six edges, no element appearing twice on the same side, and the two
    // groups share no element.
    expect(BEATS.length).toBe(6)
    const first = new Set(["fire", "plant", "water"])
    for (const [attack, defense] of BEATS) {
      const inFirst = first.has(attack)
      expect(first.has(defense)).toBe(inFirst)
    }
    expect(typeFactor("electric", "earth")).toEqual({ num: 3, den: 2 })
    expect(typeFactor("earth", "wind")).toEqual({ num: 3, den: 2 })
    expect(typeFactor("wind", "electric")).toEqual({ num: 3, den: 2 })
    expect(typeFactor("electric", "water")).toEqual({ num: 1, den: 1 })
    expect(typeFactor("water", "electric")).toEqual({ num: 1, den: 1 })
    expect(typeFactor("earth", "electric")).toEqual({ num: 2, den: 3 })
    expect(typeFactor("wind", "earth")).toEqual({ num: 2, den: 3 })
  })

  test("the strength stays 3/2 and 2/3, never 2× or 0.5×", () => {
    for (const [attack, defense] of BEATS) {
      expect(typeFactor(attack, defense)).toEqual({ num: 3, den: 2 })
      expect(typeFactor(defense, attack)).toEqual({ num: 2, den: 3 })
    }
  })

  test("the affinity collapse still reads the new edges", () => {
    // Electric beats earth; wind resists electric, so an earth defender with a
    // wind affinity takes incoming electric at neutral.
    expect(incomingTypeFactor("electric", "earth", "wind")).toEqual({
      num: 1,
      den: 1,
    })
    // A neutral secondary cannot cancel the super-effective edge.
    expect(incomingTypeFactor("electric", "earth", "water")).toEqual({
      num: 3,
      den: 2,
    })
    // And a resisted primary stays resisted.
    expect(incomingTypeFactor("earth", "electric", null)).toEqual({
      num: 2,
      den: 3,
    })
  })
})

describe("strikeDamage", () => {
  test("matches the integer formula on the spec's ATK 11 / DEF 10 checks", () => {
    // basic, neutral
    expect(strikeDamage(4, 11, 10, 1, 1, true)).toBe(4)
    // Blaze Bolt, neutral / super-effective / resisted
    expect(strikeDamage(12, 11, 10, 1, 1, true)).toBe(13)
    expect(strikeDamage(12, 11, 10, 2, 1, true)).toBe(26)
    expect(strikeDamage(12, 11, 10, 1, 2, true)).toBe(6)
  })

  test("a hit deals at least 1 even when the formula floors to 0", () => {
    expect(strikeDamage(1, 1, 100, 1, 1, true)).toBe(1)
  })

  test("a miss deals 0 and does not apply the minimum of 1", () => {
    expect(strikeDamage(12, 11, 10, 2, 1, false)).toBe(0)
  })
})
