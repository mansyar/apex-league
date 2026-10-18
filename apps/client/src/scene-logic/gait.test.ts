import { describe, expect, test } from "bun:test"

import {
  GAIT_BOB,
  GAIT_CADENCE,
  GAIT_ROLL,
  GAIT_SWING,
  gaitPose,
} from "../scene-logic"

/**
 * Diagonal-pair walk gait: FL+BR swing together, FR+BL in counterphase,
 * with a two-beat body bob and a small weight-shift roll. Pure math —
 * the scene maps the pose onto the existing leg pivots.
 */
describe("gaitPose — diagonal-pair walk gait", () => {
  test("reduced motion zeroes the whole pose even at full amplitude", () => {
    const p = gaitPose(1.23, 1, true)
    expect(p.fl).toBe(0)
    expect(p.fr).toBe(0)
    expect(p.bl).toBe(0)
    expect(p.br).toBe(0)
    expect(p.bob).toBe(0)
    expect(p.roll).toBe(0)
  })

  test("zero amplitude zeroes the whole pose (idle/reset path)", () => {
    const p = gaitPose(1.23, 0, false)
    expect(p.fl).toBe(0)
    expect(p.br).toBe(0)
    expect(p.bob).toBe(0)
    expect(p.roll).toBe(0)
  })

  test("diagonal pairs: FL mirrors FR, FL matches BR, BL mirrors BR", () => {
    for (let t = 0; t < 2; t += 0.017) {
      const p = gaitPose(t, 1, false)
      expect(p.br).toBeCloseTo(p.fl)
      expect(p.bl).toBeCloseTo(p.fr)
      expect(p.fr).toBeCloseTo(-p.fl)
    }
  })

  test("angles stay within their amplitude bounds", () => {
    for (let t = 0; t < 3; t += 0.013) {
      const p = gaitPose(t, 1, false)
      expect(Math.abs(p.fl)).toBeLessThanOrEqual(GAIT_SWING + 1e-9)
      expect(Math.abs(p.roll)).toBeLessThanOrEqual(GAIT_ROLL + 1e-9)
      expect(p.bob).toBeGreaterThanOrEqual(0)
      expect(p.bob).toBeLessThanOrEqual(GAIT_BOB + 1e-9)
    }
  })

  test("amplitude scales the pose linearly (ease-driven blending)", () => {
    const full = gaitPose(0.37, 1, false)
    const half = gaitPose(0.37, 0.5, false)
    expect(half.fl).toBeCloseTo(full.fl * 0.5)
    expect(half.bob).toBeCloseTo(full.bob * 0.5)
    expect(half.roll).toBeCloseTo(full.roll * 0.5)
  })

  test("swing oscillates with the declared cadence period", () => {
    const period = (Math.PI * 2) / GAIT_CADENCE
    let max = -Infinity
    let min = Infinity
    for (let t = 0; t <= period; t += period / 200) {
      const fl = gaitPose(t, 1, false).fl
      max = Math.max(max, fl)
      min = Math.min(min, fl)
    }
    expect(max).toBeGreaterThan(GAIT_SWING * 0.95)
    expect(min).toBeLessThan(-GAIT_SWING * 0.95)
    // Period repeats: pose at t and t+period agree.
    expect(gaitPose(0.21 + period, 1, false).fl).toBeCloseTo(
      gaitPose(0.21, 1, false).fl,
    )
  })

  test("body bob lands twice per cycle (one bump per step pair)", () => {
    const period = (Math.PI * 2) / GAIT_CADENCE
    // |sin| touches zero at phase 0 and π — count threshold crossings
    // (down through eps, up through eps) rather than exact equality.
    const eps = 1e-6
    let crossings = 0
    let prev = gaitPose(0, 1, false).bob
    for (let t = period / 200; t <= period + period / 200; t += period / 200) {
      const bob = gaitPose(t, 1, false).bob
      if ((prev <= eps && bob > eps) || (prev > eps && bob <= eps)) crossings++
      prev = bob
    }
    expect(crossings).toBe(4) // down at ~π, up just after, down at ~2π, up just after
  })

  test("pose is continuous in t (no jumps between adjacent frames)", () => {
    let prevFl = gaitPose(0, 1, false).fl
    for (let t = 0.001; t < 1; t += 0.001) {
      const fl = gaitPose(t, 1, false).fl
      expect(Math.abs(fl - prevFl)).toBeLessThan(0.02)
      prevFl = fl
    }
  })
})
