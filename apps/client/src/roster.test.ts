import { describe, expect, test } from "bun:test"

import { bodyScaleFor, bodyWorldDiameter } from "./arena-scale"

describe("bodyScaleFor", () => {
  test("sizes each rig to its simulated diameter", () => {
    // A tortoise (r 300) must read larger than a heron (r 180).
    expect(bodyWorldDiameter("tortoise")).toBeCloseTo(0.48)
    expect(bodyWorldDiameter("heron")).toBeCloseTo(0.288)
    expect(bodyScaleFor("tortoise", 1)).toBeCloseTo(0.48)
    expect(bodyScaleFor("heron", 1)).toBeCloseTo(0.288)
    expect(bodyScaleFor("tortoise", 2)).toBeCloseTo(0.24)
  })

  test("falls back to the default body for an unknown archetype", () => {
    expect(bodyScaleFor("not-a-creature", 1)).toBeCloseTo(0.352)
  })

  test("never divides by zero on a degenerate rig", () => {
    expect(bodyScaleFor("tortoise", 0)).toBeCloseTo(480)
  })
})
