import { describe, expect, test } from "bun:test"
import { createPlayCeremony } from "./scene-logic"

// 0.0625 s (2^-4) steps are binary-exact and under the machine's 0.1 s dt
// clamp, so phase boundaries are crossed exactly — no float-noise.
const DT = 0.0625
const TOSS_STEPS = 8 // 0.5 s exactly
const NUDGE_STEPS = 12 // 0.75 s > 0.7 s nudge
const CELEBRATE_STEPS = 20 // 1.25 s > 1.2 s celebrate

const ORIGIN = { x: 0, z: 0 }
const LANDING = { x: 6, z: 0 }

const run = (
  m: ReturnType<typeof createPlayCeremony>,
  dt: number,
  steps: number,
) => {
  const drives = []
  for (let i = 0; i < steps; i++) drives.push(m.advance(dt))
  return drives
}

const last = (
  drives: unknown[],
):
  | never
  | {
      phase: string
      ballVisible: boolean
      ballX: number
      ballY: number
      ballZ: number
      bounce: number
      active: boolean
      done: boolean
    } => {
  if (drives.length === 0) throw new Error("no drives")
  return drives[drives.length - 1] as never
}

describe("play ceremony", () => {
  test("fresh machine is idle, done, ball hidden", () => {
    const drive = createPlayCeremony().advance(0.016)
    expect(drive.phase).toBe("idle")
    expect(drive.active).toBe(false)
    expect(drive.done).toBe(true)
    expect(drive.ballVisible).toBe(false)
    expect(drive.bounce).toBe(0)
  })

  test("toss arcs the ball to the landing spot", () => {
    const m = createPlayCeremony()
    m.begin(ORIGIN.x, ORIGIN.z, LANDING.x, LANDING.z, false)
    const tossDrives = run(m, DT, TOSS_STEPS)
    // The ball rises and comes back down: a mid-flight y above both ends.
    const mid = tossDrives[3]!
    expect(mid.ballY).toBeGreaterThan(0.5)
    expect(mid.ballVisible).toBe(true)
    const end = last(tossDrives)
    expect(end.phase).toBe("chase")
    expect(end.ballX).toBe(LANDING.x)
    expect(end.ballZ).toBe(LANDING.z)
    expect(end.ballY).toBe(0)
  })

  test("walkDone during the toss is a no-op", () => {
    const m = createPlayCeremony()
    m.begin(ORIGIN.x, ORIGIN.z, LANDING.x, LANDING.z, false)
    m.walkDone()
    expect(m.advance(0.016).phase).toBe("toss")
  })

  test("chase waits, then nudge slides the ball away from home", () => {
    const m = createPlayCeremony()
    m.begin(ORIGIN.x, ORIGIN.z, LANDING.x, LANDING.z, false)
    run(m, DT, TOSS_STEPS)
    const chaseDrive = m.advance(0.016)
    expect(chaseDrive.phase).toBe("chase")
    expect(chaseDrive.ballX).toBe(LANDING.x)
    m.walkDone()
    const nudgeDrives = run(m, DT, NUDGE_STEPS)
    // The ball keeps moving away from the origin through the nudge.
    const dists = nudgeDrives.map((d) => Math.hypot(d.ballX, d.ballZ))
    const firstDist = dists.shift() ?? 0
    expect(firstDist).toBeGreaterThan(6)
    let prevDist = firstDist
    for (const d of dists) {
      expect(d).toBeGreaterThanOrEqual(prevDist)
      prevDist = d
    }
    const end = last(nudgeDrives)
    expect(end.phase).toBe("return")
    expect(end.ballVisible).toBe(true)
  })

  test("return waits, then celebrate hops and settles done", () => {
    const m = createPlayCeremony()
    m.begin(ORIGIN.x, ORIGIN.z, LANDING.x, LANDING.z, false)
    run(m, DT, TOSS_STEPS)
    m.walkDone()
    run(m, DT, NUDGE_STEPS)
    m.walkDone()
    const celebrateDrives = run(m, DT, CELEBRATE_STEPS)
    const bounces = celebrateDrives.map((d) => d.bounce)
    expect(Math.max(...bounces)).toBeGreaterThan(0.5)
    const final = last(celebrateDrives)
    expect(final.phase).toBe("idle")
    expect(final.done).toBe(true)
    expect(final.bounce).toBe(0)
    expect(final.ballVisible).toBe(false)
  })

  test("reduced motion: no toss arc, no nudge slide, no celebrate", () => {
    const m = createPlayCeremony()
    m.begin(ORIGIN.x, ORIGIN.z, LANDING.x, LANDING.z, true)
    const first = m.advance(0.016)
    expect(first.phase).toBe("chase")
    expect(first.ballX).toBe(LANDING.x)
    expect(first.ballY).toBe(0)
    m.walkDone()
    expect(m.advance(0.016).phase).toBe("return")
    m.walkDone()
    const final = m.advance(0.016)
    expect(final.phase).toBe("idle")
    expect(final.done).toBe(true)
    expect(final.bounce).toBe(0)
  })

  test("successive plays re-trigger cleanly from a settled state", () => {
    const m = createPlayCeremony()
    m.begin(ORIGIN.x, ORIGIN.z, LANDING.x, LANDING.z, false)
    run(m, DT, TOSS_STEPS)
    m.walkDone()
    run(m, DT, NUDGE_STEPS)
    m.walkDone()
    run(m, DT, CELEBRATE_STEPS)
    expect(m.advance(0.016).phase).toBe("idle")
    m.begin(ORIGIN.x, ORIGIN.z, LANDING.x, LANDING.z, false)
    expect(m.advance(0.05).phase).toBe("toss")
  })
})
