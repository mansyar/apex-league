import { describe, expect, test } from "bun:test"

import type { Element } from "../creature"
import { typeFactor } from "./chart"
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
  ["electric", "water"],
  ["earth", "electric"],
  ["wind", "earth"],
]

describe("typeFactor", () => {
  test("a beating edge is 2×", () => {
    for (const [attack, defense] of BEATS) {
      expect(typeFactor(attack, defense)).toEqual({ num: 2, den: 1 })
    }
  })

  test("the reverse of a beating edge is 0.5×", () => {
    for (const [attack, defense] of BEATS) {
      expect(typeFactor(defense, attack)).toEqual({ num: 1, den: 2 })
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
