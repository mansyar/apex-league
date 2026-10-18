import { describe, expect, test } from "bun:test"
import { createTreatCeremony } from "../scene-logic"

// 0.0625 s (2^-4) steps are binary-exact and under the machine's 0.1 s dt
// clamp, so phase boundaries are crossed exactly — no float-noise.
const DT = 0.0625
const SETTLE_STEPS = 10 // 0.625 s > 0.6 s settle
const BALM_STEPS = 23 // 1.4375 s > 1.4 s balm hold
const RECOVER_STEPS = 13 // 0.8125 s > 0.8 s recover

const run = (
  m: ReturnType<typeof createTreatCeremony>,
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
      subdued: number
      relief: number
      active: boolean
      done: boolean
    } => {
  if (drives.length === 0) throw new Error("no drives")
  return drives[drives.length - 1] as never
}

describe("treat ceremony", () => {
  test("fresh machine is idle and inactive", () => {
    const drive = createTreatCeremony().advance(0.016)
    expect(drive.phase).toBe("idle")
    expect(drive.active).toBe(false)
    expect(drive.done).toBe(true)
    expect(drive.subdued).toBe(0)
    expect(drive.relief).toBe(0)
  })

  test("settle eases the creature subdued, then the balm holds", () => {
    const m = createTreatCeremony()
    m.begin(false)
    const subdued = run(m, DT, SETTLE_STEPS).map((d) => d.subdued)
    expect(subdued[0]).toBeGreaterThan(0)
    expect(subdued[9]).toBe(1)
    for (let i = 1; i < subdued.length; i++) {
      expect(subdued[i]!).toBeGreaterThanOrEqual(subdued[i - 1]!)
    }
    const balmDrive = m.advance(0.016)
    expect(balmDrive.phase).toBe("balm")
    expect(balmDrive.subdued).toBe(1)
  })

  test("balm holds subdued while relief arcs up and back down", () => {
    const m = createTreatCeremony()
    m.begin(false)
    run(m, DT, SETTLE_STEPS)
    const balmDrives = run(m, DT, BALM_STEPS)
    const reliefs = balmDrives.map((d) => d.relief)
    expect(reliefs[0]).toBeGreaterThan(0)
    expect(Math.max(...reliefs)).toBeGreaterThan(0.8)
    const end = last(balmDrives)
    expect(end.phase).toBe("recover")
    expect(end.relief).toBe(0)
  })

  test("recover eases the creature back to normal, then settles done", () => {
    const m = createTreatCeremony()
    m.begin(false)
    run(m, DT, SETTLE_STEPS)
    run(m, DT, BALM_STEPS)
    const recoverDrives = run(m, DT, RECOVER_STEPS)
    const subdued = recoverDrives.map((d) => d.subdued)
    expect(subdued[0]).toBeLessThan(1)
    const final = last(recoverDrives)
    expect(final.phase).toBe("idle")
    expect(final.subdued).toBe(0)
    expect(final.relief).toBe(0)
    expect(final.done).toBe(true)
    expect(final.active).toBe(false)
  })

  test("reduced motion: subdued hold only, no relief pulse", () => {
    const m = createTreatCeremony()
    m.begin(true)
    const first = m.advance(0.016)
    expect(first.phase).toBe("balm")
    expect(first.subdued).toBe(1)
    expect(first.relief).toBe(0)
    // Shortened hold, then a direct settle — no recover easing to watch.
    const tail = run(m, DT, 14)[13]! // 0.875 s: past the 0.8 s hold
    expect(tail.phase).toBe("idle")
    expect(tail.done).toBe(true)
    expect(tail.subdued).toBe(0)
  })

  test("successive treats re-trigger cleanly from any settled state", () => {
    const m = createTreatCeremony()
    m.begin(false)
    run(m, DT, SETTLE_STEPS)
    run(m, DT, BALM_STEPS)
    run(m, DT, RECOVER_STEPS)
    expect(m.advance(0.016).phase).toBe("idle")
    m.begin(false)
    expect(m.advance(0.05).phase).toBe("settle")
  })
})
