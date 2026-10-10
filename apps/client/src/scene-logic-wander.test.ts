import { describe, expect, test } from "bun:test"
import { makeRng } from "@apex/voxel"
import { createWander, nextGap, pickVisitTarget } from "./scene-logic"

const PILE = { x: -2.4, z: 0.4 }
const DISC = 8.5 // moss-disc radius; drive targets must land inside
const MIN_PILE = 1.8 // never stand on the food pile

const props = [
  { x: 3.0, z: -1.0 },
  { x: -4.0, z: 2.0 },
  { x: 1.0, z: 5.0 },
  { x: -1.0, z: -3.0 },
]

/** Drive a wander machine for `seconds` at 60 fps, returning a summary. */
function run(
  m: ReturnType<typeof createWander>,
  seconds: number,
  opts: {
    dt?: number
    allow?: (elapsed: number) => boolean
    startX?: number
    startZ?: number
    yawNow?: () => number
    onAdvance?: (result: ReturnType<typeof m.advance>) => void
  } = {},
) {
  const dt = opts.dt ?? 1 / 60
  let elapsed = 0
  const allow = opts.allow ?? (() => true)
  const yawNow = opts.yawNow ?? (() => 0)
  let x = opts.startX ?? 0
  let z = opts.startZ ?? 0
  const phases = new Set<string>()
  // Prime with a begin so the free-running countdown starts at idle.
  m.begin(x, z)
  let pauseTime = 0
  for (let i = 0; i < seconds / dt; i++) {
    const d = m.advance(x, z, yawNow(), dt, allow(elapsed))
    phases.add(d.phase)
    opts.onAdvance?.(d)
    x = d.x
    z = d.z
    if (d.phase === "visit-pause") pauseTime += dt
    elapsed += dt
  }
  return {
    x,
    z,
    phases,
    pauseTime,
    last: m.advance(x, z, yawNow(), dt, allow(elapsed)),
  }
}

describe("wander gap chooser", () => {
  test("gaps land in the 20–40 s window", () => {
    for (const seed of [1, 7, 123, 99931]) {
      const rng = makeRng(seed)
      const gaps = Array.from({ length: 20 }, () => nextGap(rng))
      for (const g of gaps) {
        expect(g).toBeGreaterThanOrEqual(20)
        expect(g).toBeLessThanOrEqual(40)
      }
      // Not stuck at the endpoints
      expect(new Set(gaps.map((g) => Math.round(g))).size).toBeGreaterThan(3)
    }
  })

  test("gaps are deterministic per seed", () => {
    const a = Array.from({ length: 12 }, () => nextGap(makeRng(4242)))
    const b = Array.from({ length: 12 }, () => nextGap(makeRng(4242)))
    expect(a).toEqual(b)
  })
})

describe("wander target chooser", () => {
  test("picks a point near a prop, away from the pile, inside the disc", () => {
    const t = pickVisitTarget(props, PILE.x, PILE.z, makeRng(11))
    expect(t).not.toBeNull()
    const tt = t as { x: number; z: number }
    expect(Math.hypot(tt.x - PILE.x, tt.z - PILE.z)).toBeGreaterThanOrEqual(
      MIN_PILE,
    )
    expect(Math.hypot(tt.x, tt.z)).toBeLessThanOrEqual(DISC)
    const nearSomeProp = props.some(
      (p) => Math.hypot(tt.x - p.x, tt.z - p.z) < 1.6,
    )
    expect(nearSomeProp).toBe(true)
  })

  test("deterministic per rng state", () => {
    const a = pickVisitTarget(props, 0, 0, makeRng(77))
    const b = pickVisitTarget(props, 0, 0, makeRng(77))
    expect(a).toEqual(b)
  })

  test("skips every candidate when all props crowd the pile", () => {
    const crowded = [
      { x: PILE.x + 0.3, z: PILE.z + 0.2 },
      { x: PILE.x - 0.4, z: PILE.z - 0.5 },
    ]
    expect(pickVisitTarget(crowded, 0, 0, makeRng(3))).toBeNull()
  })

  test("returns null with no candidates at all", () => {
    expect(pickVisitTarget([], 0, 0, makeRng(5))).toBeNull()
  })
})

describe("wander machine", () => {
  test("a full trip ends back at the home anchor in home-idle", () => {
    const m = createWander(false, 123)
    m.setCandidates(props)
    const r = run(m, 60)
    expect(r.phases).toContain("walk-out")
    expect(r.phases).toContain("visit-pause")
    expect(r.phases).toContain("walk-home")
    expect(r.last.phase).toBe("home-idle")
    expect(Math.abs(r.last.x)).toBeLessThan(0.02)
    expect(Math.abs(r.last.z)).toBeLessThan(0.02)
  })

  test("never starts a trip inside the first 20 s (gap window Edge)", () => {
    const m = createWander(false, 9)
    m.setCandidates(props)
    const r = run(m, 18)
    expect(r.phases.has("walk-out")).toBe(false)
    expect(r.last.phase).toBe("home-idle")
  })

  test("droopy/sick (allow=false) never starts a trip and never accrues the gap", () => {
    const m = createWander(false, 9)
    m.setCandidates(props)
    const r = run(m, 80, { allow: () => false })
    expect(r.phases.has("walk-out")).toBe(false)
    expect(r.last.phase).toBe("home-idle")
  })

  test("a mood drop mid-trip lets the trip finish, then no new trips", () => {
    // Allow for the first half of the run (a trip starts or is under way),
    // then flip the gate off. The in-flight trip must still finish through
    // walk-home, and no second walk-out may ever start.
    const gateOpen = 40
    const m = createWander(false, 500)
    m.setCandidates(props)
    const order: string[] = []
    const r = run(m, 80, {
      allow: (elapsed) => elapsed < gateOpen,
      onAdvance: (d) => {
        if (order[order.length - 1] !== d.phase) order.push(d.phase)
      },
    })
    expect(order[0]).toBe("home-idle")
    expect(order).toContain("walk-out")
    expect(order).toContain("walk-home")
    // Exactly one trip may ever start; after the gate closed no new one begins.
    expect(order.filter((p) => p === "walk-out")).toEqual(["walk-out"])
    expect(r.last.phase).toBe("home-idle")
  })

  test("reduced motion never wanders at all", () => {
    const m = createWander(true, 123)
    m.setCandidates(props)
    const r = run(m, 90)
    expect(r.phases.has("walk-out")).toBe(false)
    expect(r.phases.has("visit-pause")).toBe(false)
    expect(r.last.phase).toBe("home-idle")
  })

  test("look-around sweeps the yaw during the visit pause", () => {
    const m = createWander(false, 321)
    m.setCandidates(props)
    let x = 0
    let z = 0
    m.begin(x, z)
    const looks: number[] = []
    for (let i = 0; i < 90 * 60; i++) {
      const d = m.advance(x, z, 0, 1 / 60, true)
      x = d.x
      z = d.z
      if (d.phase === "visit-pause") looks.push(d.lookOffset)
    }
    expect(looks.length).toBeGreaterThan(10)
    const max = Math.max(...looks)
    const min = Math.min(...looks)
    expect(max).toBeGreaterThan(0.2)
    // The sweep goes both directions (rise and fall), not a monotonic lean.
    expect(min).toBeLessThan(max - 0.3)
  })

  test("abort() returns straight to home-idle", () => {
    const m = createWander(false, 321)
    m.setCandidates(props)
    run(m, 45) // likely mid-trip or at least started
    m.abort()
    const d = m.advance(1.5, 0.4, 0, 1 / 60, true)
    expect(d.phase).toBe("home-idle")
  })

  test("pause() keeps the accrued gap across rebuilds", () => {
    const m = createWander(false, 321)
    m.setCandidates(props)
    m.begin(0, 0) // establish rng + fresh gap (production lifecycle start)
    // Accrue exactly 19 s — no trip may fire inside the 20 s window edge.
    for (let i = 0; i < 19 * 60; i++) {
      m.advance(0, 0, 0, 1 / 60, true)
    }
    expect(m.advance(0, 0, 0, 1 / 60, true).phase).toBe("home-idle")
    m.pause() // the scene rebuilt the creature (day advance, training)
    // The machine still owes only the remainder of the original 20–40 s
    // gap — a trip must fire well before another full 20 s accrues.
    let x = 0
    let z = 0
    let tripped = false
    for (let i = 0; i < 25 * 60; i++) {
      const d = m.advance(x, z, 0, 1 / 60, true)
      x = d.x
      z = d.z
      if (d.phase !== "home-idle") {
        tripped = true
        break
      }
    }
    expect(tripped).toBe(true)
  })
})

describe("trip-start yaw easing (review fix)", () => {
  test("the first drive of a trip eases from the creature's actual facing", () => {
    const m = createWander(false, 123)
    m.setCandidates(props)
    // Face the creature somewhere unused elsewhere (~-2.4 rad) so a stale
    // machine yaw (0 or a prior trip's) would be visibly wrong.
    const FACING = -2.4
    let tripStarted = false
    const seenFirst: number[] = []
    run(m, 60, {
      yawNow: () => FACING,
      onAdvance: (d) => {
        if (d.phase !== "home-idle" && !tripStarted) {
          tripStarted = true
          seenFirst.push(d.yaw)
        }
      },
    })
    expect(tripStarted).toBe(true)
    expect(seenFirst.length).toBeGreaterThan(0)
    const first = seenFirst[0] ?? 0
    // The first applied yaw must sit within the pivot turn rate of the
    // creature's actual facing (TURN_SPEED * dt ≈ 0.1 rad/frame) — not a
    // snap to a stale machine yaw.
    expect(Math.abs(first - FACING)).toBeLessThan(0.3)
  })
})
