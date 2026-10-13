import { describe, expect, test } from "bun:test"
import {
  advanceWalkPhase,
  clampStage,
  composePosition,
  composeScale,
  leanTarget,
  shortestAngle,
  topplePose,
  yawStep,
} from "./fighter-driver"

describe("shortestAngle", () => {
  test("leaves in-range deltas untouched", () => {
    expect(shortestAngle(0.3)).toBeCloseTo(0.3)
    expect(shortestAngle(-1.2)).toBeCloseTo(-1.2)
  })

  test("wraps a delta just past π onto the short side", () => {
    // 3.2 rad is 0.083.. short of 2π; the short way is -2.94.., not +3.2.
    const wrapped = shortestAngle(Math.PI + 0.08)
    expect(wrapped).toBeLessThan(0)
    expect(Math.abs(wrapped)).toBeCloseTo(Math.PI - 0.08)
  })

  test("maps π itself to -π (the half-open [-π, π) contract)", () => {
    expect(shortestAngle(Math.PI)).toBeCloseTo(-Math.PI)
  })
})

describe("composeScale", () => {
  test("upright squash widens x/z and flattens y around the base scale", () => {
    const s = composeScale(2, 0.5, false)
    expect(s.x).toBeCloseTo(2 * 1.17)
    expect(s.y).toBeCloseTo(2 * 0.75)
    expect(s.z).toBeCloseTo(2 * 1.17)
  })

  test("downed keeps the same widen but floors the y collapse at 0.05", () => {
    const s = composeScale(1, 3, true)
    expect(s.x).toBeCloseTo(1 * (1 + 3 * 0.34))
    expect(s.y).toBeCloseTo(0.05) // 1 - 3*0.5 = -0.5 -> floored
    expect(s.z).toBeCloseTo(s.x)
  })

  test("zero squash is the untouched base scale", () => {
    const s = composeScale(1.7, 0, false)
    expect(s.x).toBeCloseTo(1.7)
    expect(s.y).toBeCloseTo(1.7)
    expect(s.z).toBeCloseTo(1.7)
  })
})

describe("composePosition", () => {
  const smooth = { x: 1, y: 0, z: 2 }

  test("adds the action offset per axis", () => {
    const p = composePosition(smooth, { x: 0.4, y: 0.2, z: -0.3 }, 0, 0, 0, 0)
    expect(p.x).toBeCloseTo(1.4)
    expect(p.z).toBeCloseTo(1.7)
  })

  test("stacks gait, breath, and the squash dip on y; sway on z", () => {
    const p = composePosition(
      smooth,
      { x: 0, y: 0, z: 0 },
      0.1,
      0.05,
      0.02,
      0.1,
    )
    expect(p.y).toBeCloseTo(0.1 + 0.05 - 0.1 * 0.42)
    expect(p.z).toBeCloseTo(2 + 0.02) // sway rides the z axis only
  })

  test("never lets the creature sink below the floor", () => {
    const p = composePosition(smooth, { x: 0, y: -1, z: 0 }, 0, 0, 0, 2)
    expect(p.y).toBe(0)
  })
})

describe("yawStep", () => {
  test("factor 1 snaps exactly onto the desired yaw", () => {
    expect(yawStep(0.5, 1.4, 1)).toBeCloseTo(1.4)
  })

  test("turns the short way across the π wrap", () => {
    // Current 3.0, desired -3.0: short path is +0.283.. through π, not
    // the long way back through 0 — factor 1 lands at 2π - 3.
    const next = yawStep(3.0, -3.0, 1)
    expect(next).toBeCloseTo(Math.PI * 2 - 3.0)
    expect(next).toBeGreaterThan(0) // arrived via the +π side
  })

  test("a partial factor closes only part of the gap", () => {
    const next = yawStep(0, 2, 0.5)
    expect(next).toBeGreaterThan(0)
    expect(next).toBeLessThan(2)
  })
})

describe("leanTarget", () => {
  test("scales with speed and the profile's lean pitch", () => {
    expect(leanTarget(2, 1)).toBeCloseTo(2 * 0.045)
  })

  test("clamps at LEAN_MAX no matter how fast the fighter moves", () => {
    expect(leanTarget(100, 1)).toBeCloseTo(0.14)
    expect(leanTarget(100, 3)).toBeCloseTo(0.14)
  })

  test("a zero-lean profile never leans", () => {
    expect(leanTarget(5, 0)).toBe(0)
  })
})

describe("advanceWalkPhase", () => {
  test("advances with distance travelled scaled by the gait frequency", () => {
    expect(advanceWalkPhase(1, 2, 0.5, 2)).toBeCloseTo(1 + 2 * 0.5 * 5.2 * 2)
  })

  test("standing still never advances the phase", () => {
    expect(advanceWalkPhase(3, 0, 0.016, 1)).toBeCloseTo(3)
  })
})

describe("clampStage", () => {
  test("keeps in-bounds targets untouched", () => {
    const s = clampStage(1, -1)
    expect(s.x).toBe(1)
    expect(s.z).toBe(-1)
  })

  test("funnels overshoot back inside the painted ring", () => {
    const s = clampStage(9, -7)
    expect(s.x).toBe(3.2)
    expect(s.z).toBe(-1.8)
  })
})

describe("topplePose", () => {
  test("mid-fall pitches onto the back away from the rival at a lift", () => {
    const p = topplePose(1, 0.5, 0.1)
    expect(p.rotZ).toBeCloseTo(-Math.PI / 4)
    expect(p.rotX).toBeCloseTo(0.1)
    expect(p.y).toBeCloseTo(0.14)
  })

  test("fully fallen lies flat with the full quarter-turn", () => {
    const p = topplePose(-1, 1, 0)
    expect(p.rotZ).toBeCloseTo(Math.PI / 2) // away = -1 flips the sign
    expect(p.y).toBeCloseTo(0.28)
  })

  test("fall 0 is upright on the floor", () => {
    const p = topplePose(1, 0, 0)
    expect(p.rotZ).toBeCloseTo(0) // -1 * (π/2) * 0 → -0 is fine
    expect(p.y).toBe(0)
  })
})
