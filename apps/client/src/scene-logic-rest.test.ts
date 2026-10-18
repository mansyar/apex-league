/**
 * The rest ceremony machine (ranch_rituals_20261018 FR3): curl-down sleep
 * pose, a held deep-sleep beat, and a wake-and-stretch. Position-clock
 * like the feed/evolution machines — dt-clamped steps, so a paused tab or
 * a long frame can never skip a phase.
 */
import { describe, expect, test } from "bun:test"
import { createRestCeremony } from "./scene-logic"

/** Drive one machine with fixed dt steps and collect the drive per step. */
const run = (
  machine: ReturnType<typeof createRestCeremony>,
  dt: number,
  steps: number,
) => {
  const drives = []
  for (let i = 0; i < steps; i++) drives.push(machine.advance(dt))
  return drives
}

/** The final drive of a run (throws rather than return undefined). */
const last = (
  drives: ReturnType<typeof run>,
): ReturnType<typeof run>[number] => {
  const drive = drives.at(-1)
  if (!drive) throw new Error("no drives collected")
  return drive
}

// The machine clamps dt to 0.1 s (tab-pause protection), so steps must be
// under that. 0.0625 s (2^-4) sums are binary-exact, so phase boundaries are
// crossed exactly — no float-noise like 3.9999999999999996.
const DT = 0.0625
const CURL_STEPS = 13 // 0.8125 s > 0.8 s curl
const SLEEP_STEPS = 64 // exactly 4.0 s hold
const WAKE_STEPS = 20 // exactly 1.2 s wake

describe("rest ceremony", () => {
  test("fresh machine is idle and inactive", () => {
    const drive = createRestCeremony().advance(0.016)
    expect(drive.phase).toBe("idle")
    expect(drive.active).toBe(false)
    expect(drive.done).toBe(true)
    expect(drive.curl).toBe(0)
    expect(drive.stretch).toBe(0)
  })

  test("curl eases in, then sleep holds the full curl", () => {
    const m = createRestCeremony()
    m.begin(false)
    const curls = run(m, DT, CURL_STEPS).map((d) => d.curl)
    expect(curls[0]).toBeGreaterThan(0)
    expect(curls[12]).toBe(1)
    let prev = 0
    for (const c of curls) {
      expect(c).toBeGreaterThanOrEqual(prev)
      prev = c
    }
    const sleepDrive = m.advance(0.016)
    expect(sleepDrive.phase).toBe("sleep")
    expect(sleepDrive.curl).toBe(1)
    expect(sleepDrive.stretch).toBe(0)
  })

  test("sleep holds for SLEEP_TIME then hands over to wake", () => {
    const m = createRestCeremony()
    m.begin(false)
    run(m, DT, CURL_STEPS) // curl completes
    const mid = last(run(m, DT, 32)) // 2 s into the hold
    expect(mid.phase).toBe("sleep")
    expect(mid.curl).toBe(1)
    const end = last(run(m, DT, 33)) // 2.0625 s more: past the 4 s hold
    expect(end.phase).toBe("wake")
  })

  test("wake eases the curl back out with a stretch arc, then settles done", () => {
    const m = createRestCeremony()
    m.begin(false)
    run(m, DT, CURL_STEPS) // curl
    run(m, DT, SLEEP_STEPS) // 4 s sleep
    const wakeDrives = run(m, DT, WAKE_STEPS) // 1.2 s wake
    // Stretch rises then falls back to 0 (an arc).
    const stretches = wakeDrives.map((d) => d.stretch)
    expect(stretches[0]).toBeGreaterThan(0)
    expect(Math.max(...stretches)).toBeGreaterThan(0.5)
    const final = last(wakeDrives)
    expect(final.phase).toBe("idle")
    expect(final.curl).toBe(0)
    expect(final.stretch).toBe(0)
    expect(final.done).toBe(true)
    expect(final.active).toBe(false)
  })

  test("reduced motion: still sleep, no curl or stretch animation", () => {
    const m = createRestCeremony()
    m.begin(true)
    const first = m.advance(0.016)
    expect(first.phase).toBe("sleep")
    expect(first.curl).toBe(1)
    expect(first.stretch).toBe(0)
    // Sleep shortens and skips the wake arc entirely.
    const tail = last(run(m, DT, 33)) // 2.0625 s: past the 2 s hold
    expect(tail.phase).toBe("idle")
    expect(tail.done).toBe(true)
    expect(tail.stretch).toBe(0)
  })

  test("successive rests re-trigger cleanly from any settled state", () => {
    const m = createRestCeremony()
    m.begin(false)
    run(m, DT, CURL_STEPS)
    run(m, DT, SLEEP_STEPS)
    run(m, DT, WAKE_STEPS)
    expect(m.advance(0.016).phase).toBe("idle")
    m.begin(false)
    expect(m.advance(0.05).phase).toBe("curl")
  })
})
