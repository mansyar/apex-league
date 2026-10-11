import { describe, expect, test } from "bun:test"
import {
  chevronsFor,
  hitReaction,
  hpFraction,
  type RangeState,
  rangeAfterStep,
} from "./battleHud"

describe("rangeAfterStep", () => {
  const cases: Array<{
    name: string
    kind: Parameters<typeof rangeAfterStep>[0]
    prev: RangeState
    expected: RangeState
  }> = [
    {
      name: "an approach closes the distance",
      kind: "approach",
      prev: "hold",
      expected: "close",
    },
    {
      name: "a close stays close",
      kind: "approach",
      prev: "close",
      expected: "close",
    },
    {
      name: "a hold keeps the previous state",
      kind: "idle",
      prev: "hold",
      expected: "hold",
    },
    {
      name: "a strike does not change range",
      kind: "melee",
      prev: "close",
      expected: "close",
    },
    {
      name: "a launch does not change range",
      kind: "projectile",
      prev: "hold",
      expected: "hold",
    },
    {
      name: "an impact does not change range",
      kind: "impact",
      prev: "close",
      expected: "close",
    },
    {
      name: "a down does not change range",
      kind: "down",
      prev: "hold",
      expected: "hold",
    },
    {
      name: "the judge call does not change range",
      kind: "judge",
      prev: "close",
      expected: "close",
    },
  ]
  for (const { name, kind, prev, expected } of cases) {
    test(name, () => {
      expect(rangeAfterStep(kind, prev)).toBe(expected)
    })
  }
})

describe("hpFraction", () => {
  const cases: Array<{ hp: number; max: number; expected: number }> = [
    { hp: 45, max: 45, expected: 1 },
    { hp: 22, max: 45, expected: 22 / 45 },
    { hp: 0, max: 45, expected: 0 },
    // Overkill damage leaves hpAfter negative — the bar must floor at 0.
    { hp: -7, max: 45, expected: 0 },
    // A degenerate max must never divide by zero.
    { hp: 10, max: 0, expected: 0 },
  ]
  for (const { hp, max, expected } of cases) {
    test(`hp ${hp} of ${max} → ${expected}`, () => {
      expect(hpFraction(hp, max)).toBe(expected)
    })
  }
})

describe("hpFraction", () => {
  test("caps at 1 when hp somehow exceeds max", () => {
    expect(hpFraction(50, 45)).toBe(1)
  })
})

describe("hitReaction", () => {
  const cases: Array<{
    name: string
    damage: number | undefined
    expected: { jolt: boolean; kick: boolean }
  }> = [
    {
      name: "a missed shot causes no reaction",
      damage: undefined,
      expected: { jolt: false, kick: false },
    },
    {
      name: "a zero-damage chip causes no reaction",
      damage: 0,
      expected: { jolt: false, kick: false },
    },
    {
      name: "a light hit jolts the plate",
      damage: 5,
      expected: { jolt: true, kick: false },
    },
    {
      name: "a heavy special kicks the whole placard",
      damage: 19,
      expected: { jolt: true, kick: true },
    },
    // The kick threshold itself: 14 stays a jolt, 15 crosses over.
    {
      name: "14 damage is still a jolt",
      damage: 14,
      expected: { jolt: true, kick: false },
    },
    {
      name: "15 damage crosses the kick line",
      damage: 15,
      expected: { jolt: true, kick: true },
    },
  ]
  for (const { name, damage, expected } of cases) {
    test(name, () => {
      expect(hitReaction(damage)).toEqual(expected)
    })
  }
})

describe("chevronsFor", () => {
  test("holding range lights one chevron", () => {
    expect(chevronsFor("hold")).toBe(1)
  })
  test("close quarters lights all three", () => {
    expect(chevronsFor("close")).toBe(3)
  })
})
