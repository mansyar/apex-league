import { describe, expect, test } from "bun:test"
import { createWalk, lerpAngle, type WalkDrive, wrapPi } from "../scene-logic"

const STAND = { x: -1.27, z: 0.21 } // production stand spot: 1.15 short of the pile on the origin→pile line

/** Drive a walk machine at a fixed 60fps cadence, returning the final
 * drive state plus a phase log. Stops early once `done` reports true. */
function run(
  machine: ReturnType<typeof createWalk>,
  seconds: number,
  opts: { dt?: number; from?: { x: number; z: number } } = {},
) {
  const dt = opts.dt ?? 1 / 60
  let x = opts.from?.x ?? 0
  let z = opts.from?.z ?? 0
  const phases: string[] = []
  let last: WalkDrive = machine.advance(x, z, 0)
  let elapsed = 0
  const nibbleEntry = { x: NaN, z: NaN }
  let maxDistanceToStand = 0
  for (let i = 0; i < Math.ceil(seconds / dt); i++) {
    last = machine.advance(x, z, dt)
    x = last.x
    z = last.z
    elapsed += dt
    if (last.phase !== "idle" && phases[phases.length - 1] !== last.phase) {
      phases.push(last.phase)
      if (last.phase === "nibble") {
        nibbleEntry.x = x
        nibbleEntry.z = z
      }
    }
    if (last.phase === "walk-out" || last.phase === "nibble") {
      maxDistanceToStand = Math.max(
        maxDistanceToStand,
        Math.hypot(STAND.x - x, STAND.z - z),
      )
    }
    if (last.done) break
  }
  return { last, x, z, elapsed, phases, nibbleEntry, maxDistanceToStand }
}

describe("position-driven walk", () => {
  test("walks out to the stand spot, nibbles, and walks home to exactly (0,0)", () => {
    const m = createWalk(false)
    m.begin(0, 0, STAND.x, STAND.z, 0)
    const r = run(m, 12)
    expect(r.last.done).toBe(true)
    expect(r.last.phase).toBe("idle")
    expect(Math.abs(r.x)).toBeLessThan(1e-3)
    expect(Math.abs(r.z)).toBeLessThan(1e-3)
    expect(r.phases).toEqual(["walk-out", "nibble", "walk-home"])
  })

  test("arrives at the stand spot before nibbling", () => {
    const m = createWalk(false)
    m.begin(0, 0, STAND.x, STAND.z, 0)
    const r = run(m, 12)
    expect(Math.abs(r.nibbleEntry.x - STAND.x)).toBeLessThan(0.05)
    expect(Math.abs(r.nibbleEntry.z - STAND.z)).toBeLessThan(0.05)
  })

  test("never overshoots the stand target while walking out", () => {
    const m = createWalk(false)
    m.begin(0, 0, STAND.x, STAND.z, 0)
    const r = run(m, 12)
    // Start distance ~3.6; distance to stand must only shrink.
    expect(r.maxDistanceToStand).toBeLessThan(
      Math.hypot(STAND.x, STAND.z) + 1e-6,
    )
  })

  test("full trip lands in the 4–6s window at 60fps", () => {
    const m = createWalk(false)
    m.begin(0, 0, STAND.x, STAND.z, 0)
    const r = run(m, 12)
    expect(r.elapsed).toBeGreaterThan(3.99)
    expect(r.elapsed).toBeLessThanOrEqual(6.0)
  })

  test("walk-home faces the direction of travel (forward, not backward)", () => {
    const m = createWalk(false)
    m.begin(0, 0, STAND.x, STAND.z, 0)
    let saw = false
    let walkHomeElapsed = 0
    let x = 0
    let z = 0
    for (let i = 0; i < 12 * 60; i++) {
      const d = m.advance(x, z, 1 / 60)
      x = d.x
      z = d.z
      if (d.phase === "walk-home") {
        saw = true
        walkHomeElapsed += 1 / 60
        const expected = Math.atan2(-x, -z)
        if (walkHomeElapsed > 0.8) {
          // The first ~0.8s is the in-place pivot at the turnaround; after
          // that the yaw must agree with the direction of travel (compare
          // through the ±π seam with wrapPi).
          expect(Math.abs(wrapPi(d.yaw - expected))).toBeLessThan(0.6)
        }
      }
      if (d.done) break
    }
    expect(saw).toBe(true)
  })

  test("nibble dips rise and fall more than once", () => {
    const m = createWalk(false)
    m.begin(0, 0, STAND.x, STAND.z, 0)
    const offsets: number[] = []
    let x = 0
    let z = 0
    for (let i = 0; i < 12 * 60; i++) {
      const d = m.advance(x, z, 1 / 60)
      x = d.x
      z = d.z
      if (d.phase === "nibble") offsets.push(d.dipOffset)
      if (d.done) break
    }
    let rises = 0
    let falls = 0
    let prev = offsets[0] ?? 0
    for (let i = 1; i < offsets.length; i++) {
      const cur = offsets[i] ?? 0
      if (cur > prev) rises++
      else if (cur < prev) falls++
      prev = cur
    }
    expect(rises).toBeGreaterThan(1)
    expect(falls).toBeGreaterThan(1)
  })

  test("a dt spike never teleports past the target and still completes", () => {
    const m = createWalk(false)
    m.begin(0, 0, STAND.x, STAND.z, 0)
    const r = run(m, 30, { dt: 0.5 })
    expect(r.last.done).toBe(true)
    expect(Math.abs(r.x)).toBeLessThan(1e-3)
    expect(Math.abs(r.z)).toBeLessThan(1e-3)
    // Never placed farther from the stand spot than the start distance.
    expect(r.maxDistanceToStand).toBeLessThan(
      Math.hypot(STAND.x, STAND.z) + 1e-6,
    )
  })

  test("reduced motion nibbles in place and never travels", () => {
    const m = createWalk(true)
    m.begin(0, 0, STAND.x, STAND.z, 0)
    const r = run(m, 12)
    expect(r.last.done).toBe(true)
    expect(Math.abs(r.x)).toBe(0)
    expect(Math.abs(r.z)).toBe(0)
    expect(r.phases).toEqual(["nibble"])
  })

  test("re-begin mid-ceremony restarts the walk from the current position", () => {
    const m = createWalk(false)
    m.begin(0, 0, STAND.x, STAND.z, 0)
    let x = 0
    let z = 0
    for (let i = 0; i < 30; i++) {
      const d = m.advance(x, z, 1 / 60)
      x = d.x
      z = d.z
    }
    // Restart from wherever the creature now stands.
    m.begin(x, z, STAND.x, STAND.z, 0)
    const r = run(m, 12, { from: { x, z } })
    expect(r.last.done).toBe(true)
    expect(Math.abs(r.x)).toBeLessThan(1e-3)
    expect(Math.abs(r.z)).toBeLessThan(1e-3)
  })

  test("idle advance is a passthrough no-op", () => {
    const m = createWalk(false)
    const d = m.advance(1.5, -2.5, 1 / 60)
    expect(d.x).toBe(1.5)
    expect(d.z).toBe(-2.5)
    expect(d.phase).toBe("idle")
    expect(d.done).toBe(true)
  })
})

describe("lerpAngle — shortest-arc yaw blend", () => {
  test("wraps the short way across ±π", () => {
    // 3.0 → -3.0: short way is +0.283 through π, not the long way back.
    expect(lerpAngle(3.0, -3.0, 1)).toBeCloseTo(-3.0, 5)
    // 0.2 → 5.9: short way wraps DOWN through 0 (Δ ≈ -0.583).
    expect(lerpAngle(0.2, 5.9, 0.5)).toBeCloseTo(0.2 - 0.583184 / 2, 3)
  })
  test("clamps at the endpoints", () => {
    expect(lerpAngle(1, 2, 0)).toBe(1)
    expect(lerpAngle(1, 2, 1)).toBe(2)
  })
})
