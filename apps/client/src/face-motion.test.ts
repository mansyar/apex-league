/**
 * Face idle seams: the blink scheduler and the eye-only glance. Both are
 * pure functions of (seed, seconds) so a blink is reproducible in a
 * capture and the render loop allocates nothing to ask for one.
 *
 * The schedule is deliberately slot-based rather than list-based: blink
 * k starts somewhere inside slot k (`k * BLINK_CYCLE`), and the jitter is
 * bounded by half the shortest allowed gap - so consecutive starts can
 * never fall closer than BLINK_CYCLE - BLINK_JITTER or further apart than
 * BLINK_CYCLE + BLINK_JITTER, which is exactly the 2.4-5.6 s band the
 * track asks for. That keeps `blinkAt` O(1) no matter how long the tab
 * has been open, without walking a cumulative sum.
 */
import { describe, expect, test } from "bun:test"
import {
  BLINK_CYCLE,
  BLINK_JITTER,
  blinkAt,
  driveFace,
  GLANCE_CYCLE,
  GLANCE_JITTER,
  GLANCE_MAX,
  glanceAt,
  LID_CLOSED,
} from "./face-motion"

/** Blink start times in [from, to), found by watching the lid leave open. */
function blinkStarts(seed: number, from: number, to: number): number[] {
  const step = 0.002
  const starts: number[] = []
  let wasOpen = true
  for (let t = from; t < to; t += step) {
    const open = blinkAt(seed, t) >= 0.999
    if (wasOpen && !open) starts.push(t)
    wasOpen = open
  }
  return starts
}

function glanceOffsets(
  seed: number,
  from: number,
  to: number,
): Array<{ t: number; yaw: number }> {
  const step = 0.002
  const out: Array<{ t: number; yaw: number }> = []
  let wasResting = true
  for (let t = from; t < to; t += step) {
    const yaw = glanceAt(seed, t)
    const resting = yaw === 0
    if (wasResting && !resting) out.push({ t, yaw })
    wasResting = resting
  }
  return out
}

describe("blinkAt", () => {
  test("the lid is fully open between blinks", () => {
    expect(blinkAt(42, 0)).toBe(1)
  })

  test("is deterministic for a seed", () => {
    for (let t = 0; t < 40; t += 0.37) {
      expect(blinkAt(7, t)).toBe(blinkAt(7, t))
    }
  })

  test("differs between seeds", () => {
    const a: number[] = []
    const b: number[] = []
    for (let t = 0; t < 40; t += 0.13) {
      a.push(blinkAt(1, t))
      b.push(blinkAt(2, t))
    }
    expect(a).not.toEqual(b)
  })

  test("consecutive blinks land inside the 2.4-5.6 s band", () => {
    const starts = blinkStarts(1234, 0, 120)
    expect(starts.length).toBeGreaterThan(18)
    for (let i = 1; i < starts.length; i++) {
      const gap = (starts[i] ?? 0) - (starts[i - 1] ?? 0)
      expect(gap).toBeGreaterThanOrEqual(BLINK_CYCLE - BLINK_JITTER - 0.01)
      expect(gap).toBeLessThanOrEqual(BLINK_CYCLE + BLINK_JITTER + 0.01)
    }
  })

  test("the lid only ever sits between closed and open", () => {
    for (let t = 0; t < 60; t += 0.017) {
      const lid = blinkAt(9, t)
      expect(lid).toBeGreaterThanOrEqual(LID_CLOSED)
      expect(lid).toBeLessThanOrEqual(1)
    }
  })

  test("closes fast and opens slow", () => {
    // Find a blink, then time the two legs off the same curve.
    const start = blinkStarts(5, 0, 20)[0] ?? 0
    let bottom = start
    let bottomLid = 1
    for (let t = start; t < start + 0.5; t += 0.001) {
      const lid = blinkAt(5, t)
      if (lid < bottomLid) {
        bottomLid = lid
        bottom = t
      }
    }
    const closeLeg = bottom - start
    let reopen = bottom
    for (let t = bottom; t < bottom + 0.5; t += 0.001) {
      if (blinkAt(5, t) >= 0.999) {
        reopen = t
        break
      }
    }
    const openLeg = reopen - bottom
    expect(closeLeg).toBeLessThan(openLeg)
    expect(bottomLid).toBeLessThanOrEqual(LID_CLOSED + 0.001)
  })
})

describe("glanceAt", () => {
  test("is zero at rest and never exceeds two degrees", () => {
    for (let t = 0; t < 90; t += 0.011) {
      const yaw = glanceAt(3, t)
      expect(Math.abs(yaw)).toBeLessThanOrEqual(GLANCE_MAX + 1e-9)
    }
  })

  test("is deterministic for a seed", () => {
    for (let t = 0; t < 40; t += 0.31) {
      expect(glanceAt(11, t)).toBe(glanceAt(11, t))
    }
  })

  test("looks somewhere at least once", () => {
    let peak = 0
    for (let t = 0; t < 30; t += 0.005) {
      peak = Math.max(peak, Math.abs(glanceAt(11, t)))
    }
    expect(peak).toBeGreaterThan(GLANCE_MAX * 0.8)
  })

  test("consecutive glances land inside the 4-9 s band", () => {
    const glances = glanceOffsets(77, 0, 180)
    expect(glances.length).toBeGreaterThan(15)
    for (let i = 1; i < glances.length; i++) {
      const gap = (glances[i]?.t ?? 0) - (glances[i - 1]?.t ?? 0)
      expect(gap).toBeGreaterThanOrEqual(GLANCE_CYCLE - GLANCE_JITTER - 0.01)
      expect(gap).toBeLessThanOrEqual(GLANCE_CYCLE + GLANCE_JITTER + 0.01)
    }
  })

  test("returns to rest between glances", () => {
    const glances = glanceOffsets(77, 0, 180)
    const first = glances[0]?.t ?? 0
    // Somewhere well before the next glance, the eye must be at rest.
    const restAt = first + 1.5
    expect(glanceAt(77, restAt)).toBe(0)
  })

  test("suppression parks the eye at rest", () => {
    for (let t = 0; t < 40; t += 0.05) {
      expect(glanceAt(11, t, true)).toBe(0)
    }
  })
})

describe("driveFace", () => {
  const eye = (): { scale: { y: number }; rotation: { y: number } } => ({
    scale: { y: 1 },
    rotation: { y: 0 },
  })

  test("writes one lid and one yaw to both eyes", () => {
    const left = eye()
    const right = eye()
    const start = blinkStarts(21, 0, 20)[0] ?? 0
    driveFace({ left, right }, 21, start + 0.05)
    expect(left.scale.y).toBe(right.scale.y)
    expect(left.rotation.y).toBe(right.rotation.y)
    expect(left.scale.y).toBeLessThan(1)
  })

  test("a suppressed face still blinks but never glances", () => {
    const left = eye()
    const right = eye()
    let blinked = false
    for (let t = 0; t < 30; t += 0.01) {
      driveFace({ left, right }, 31, t, true)
      if (left.scale.y < 1) blinked = true
      expect(left.rotation.y).toBe(0)
    }
    expect(blinked).toBe(true)
  })

  test("tolerates a rig with one eye missing", () => {
    const right = eye()
    expect(() => driveFace({ right }, 4, 12.5)).not.toThrow()
    expect(Number.isFinite(right.scale.y)).toBe(true)
  })
})
