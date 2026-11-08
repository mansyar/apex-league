/**
 * Positional damage (Continuous Arena Battle FR-4, AC-4): the catalog's
 * integer formula with a positional and a counter term folded in before the
 * floor, so a bonus is exact, integer, and never a no-op.
 */

import { describe, expect, test } from "bun:test"
import { strikeDamage } from "../damage"
import {
  COUNTER_RATIO,
  FLANK_RATIO,
  NEUTRAL_RATIO,
  type PositionalDamage,
  positionalDamage,
  positionRatio,
  REAR_RATIO,
} from "./damage"

const NEUTRAL = { num: 1, den: 1 }

function hit(overrides: Partial<PositionalDamage> = {}): number {
  return positionalDamage({
    power: 6,
    atk: 30,
    def: 20,
    type: NEUTRAL,
    position: "front",
    counter: false,
    ...overrides,
  })
}

describe("positional damage — the existing formula, extended", () => {
  test("a front non-counter hit is the catalog formula exactly", () => {
    expect(hit()).toBe(strikeDamage(6, 30, 20, 1, 1, true))
  })

  test("the type factor still multiplies through", () => {
    const neutral = hit()
    const superEffective = hit({ type: { num: 3, den: 2 } })
    const resisted = hit({ type: { num: 2, den: 3 } })
    expect(superEffective).toBeGreaterThan(neutral)
    expect(resisted).toBeLessThan(neutral)
  })

  test("every result is a whole number", () => {
    for (const position of ["front", "flank", "rear"] as const) {
      for (const counter of [false, true]) {
        expect(Number.isInteger(hit({ position, counter }))).toBe(true)
      }
    }
  })
})

describe("positional damage — the positional bonus (FR-4, AC-4)", () => {
  test("a flank hit deals strictly more than a front hit", () => {
    expect(hit({ position: "flank" })).toBeGreaterThan(hit())
  })

  test("a rear hit deals strictly more than a flank hit", () => {
    expect(hit({ position: "rear" })).toBeGreaterThan(
      hit({ position: "flank" }),
    )
  })

  test("the bonus survives a chip hit the floor would swallow", () => {
    const chip = { power: 4, atk: 1, def: 100 } as const
    expect(hit(chip)).toBe(1)
    expect(hit({ ...chip, position: "flank" })).toBeGreaterThan(1)
  })
})

describe("positional damage — the counter bonus (FR-6, AC-6)", () => {
  test("a counter hit deals strictly more than the same blow without one", () => {
    expect(hit({ counter: true })).toBeGreaterThan(hit())
  })

  test("a flank counter stacks both integer terms", () => {
    expect(hit({ position: "flank", counter: true })).toBeGreaterThan(
      hit({ position: "flank" }),
    )
  })
})

describe("positional damage — the ratios", () => {
  test("front is neutral and the others are strict bonuses", () => {
    expect(positionRatio("front")).toBe(NEUTRAL_RATIO)
    expect(positionRatio("flank")).toBe(FLANK_RATIO)
    expect(positionRatio("rear")).toBe(REAR_RATIO)
    for (const ratio of [FLANK_RATIO, REAR_RATIO, COUNTER_RATIO]) {
      expect(ratio.num).toBeGreaterThan(ratio.den)
    }
  })
})
