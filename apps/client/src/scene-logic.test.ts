import { describe, expect, test } from "bun:test"
import { props } from "@apex/voxel"

import { gustEnvelope, phaseHash, swayAngle, windBaseAmp } from "./scene-logic"

describe("wind sway — amplitude table", () => {
  test("covers every registry prop id with a finite amplitude", () => {
    for (const id of Object.keys(props)) {
      const amp = windBaseAmp(id)
      expect(Number.isFinite(amp)).toBe(true)
    }
  })

  test("vegetation sways more than trees: tuft > bush > tree", () => {
    const tuft = windBaseAmp("tuft")
    const bush = windBaseAmp("bush")
    const tree = windBaseAmp("broadleafTree")
    expect(tuft).toBeGreaterThan(bush)
    expect(bush).toBeGreaterThan(tree)
    expect(tree).toBeGreaterThan(0)
  })

  test("rocks and the food pile never move", () => {
    expect(windBaseAmp("rock")).toBe(0)
    expect(windBaseAmp("foodPile")).toBe(0)
  })

  test("unknown prop ids default to zero amplitude (fail closed)", () => {
    expect(windBaseAmp("notAProp")).toBe(0)
  })
})

describe("wind sway — gust envelope", () => {
  test("stays within [0.4, 1.2] across a long simulated run", () => {
    for (let t = 0; t <= 600; t += 0.25) {
      const g = gustEnvelope(t)
      expect(g).toBeGreaterThanOrEqual(0.4 - 1e-9)
      expect(g).toBeLessThanOrEqual(1.2 + 1e-9)
    }
  })

  test("is continuous — no jumps between adjacent samples", () => {
    let prev = gustEnvelope(0)
    for (let t = 0.1; t <= 600; t += 0.1) {
      const g = gustEnvelope(t)
      expect(Math.abs(g - prev)).toBeLessThan(0.025)
      prev = g
    }
  })

  test("actually varies over time (calm and gusty moments exist)", () => {
    let min = Number.POSITIVE_INFINITY
    let max = Number.NEGATIVE_INFINITY
    for (let t = 0; t <= 600; t += 0.25) {
      const g = gustEnvelope(t)
      min = Math.min(min, g)
      max = Math.max(max, g)
    }
    expect(max - min).toBeGreaterThan(0.2)
  })

  test("is a pure function of time", () => {
    expect(gustEnvelope(12.5)).toBe(gustEnvelope(12.5))
    expect(gustEnvelope(88)).toBe(gustEnvelope(88))
  })
})

describe("wind sway — position-hash phase", () => {
  test("is stable for the same world position", () => {
    expect(phaseHash(3.2, -4.9, 7)).toBe(phaseHash(3.2, -4.9, 7))
  })

  test("falls in [0, 2π)", () => {
    for (let i = 0; i < 200; i++) {
      const p = phaseHash(i * 1.3 - 60, i * -0.7 + 40, 11)
      expect(p).toBeGreaterThanOrEqual(0)
      expect(p).toBeLessThan(Math.PI * 2)
    }
  })

  test("differs across positions (no large-scale lockstep)", () => {
    const seen = new Set<number>()
    for (let i = 0; i < 100; i++) {
      seen.add(phaseHash((i % 10) * 1.1, Math.floor(i / 10) * 1.1, 11))
    }
    expect(seen.size).toBeGreaterThan(90)
  })

  test("is not Math.random — deterministic across a fresh call sequence", () => {
    // Drawing other values in between must not disturb the result.
    phaseHash(1, 1, 5)
    phaseHash(2, 2, 5)
    expect(phaseHash(3, 3, 5)).toBe(phaseHash(3, 3, 5))
  })
})

describe("wind sway — composed sway angle", () => {
  const base = windBaseAmp("tuft")

  test("never exceeds base amplitude × gust ceiling", () => {
    for (let t = 0; t <= 120; t += 0.11) {
      const angle = swayAngle(base, phaseHash(1, 2, 3), t, false)
      expect(Math.abs(angle)).toBeLessThanOrEqual(base * 1.2 + 1e-9)
    }
  })

  test("moves over time when not reduced", () => {
    const a0 = swayAngle(base, 0, 0, false)
    const a1 = swayAngle(base, 0, 0.4, false)
    expect(a0 === a1).toBe(false)
  })

  test("responds to phase offset between props", () => {
    const p1 = swayAngle(base, 0, 2, false)
    const p2 = swayAngle(base, 2.5, 2, false)
    expect(p1).not.toBe(p2)
  })

  test("reduced-motion flattens every amplitude to exactly 0", () => {
    for (let t = 0; t <= 60; t += 0.37) {
      for (const phase of [0, 1.7, 4.2]) {
        expect(swayAngle(base, phase, t, true)).toBe(0)
      }
    }
  })
})
