/**
 * The morning-after ritual machine (postcup_morning_after FR-2): a
 * one-shot, class-adaptive, dismissible arrival ceremony with per-class
 * caps, the amplifier's overlay beat, and the reduced-motion jump-cut —
 * plus the pure day ledger the controller drives (one shot per ritual
 * day, night settle, the evolution-reveal yield seedling FR-9). The
 * schedule is pure derived values — dt-clamped steps like every care
 * ceremony, no wall clocks, no randomness (NFR-5).
 */
import { describe, expect, test } from "bun:test"
import type { MorningAfterClass } from "../morning-after/derive"
import type { Amplifier } from "../morning-after/milestones"
import {
  createMorningAfterCeremony,
  createMorningAfterLedger,
  MORNING_AFTER_AMPLIFY_TIME,
  MORNING_AFTER_GLOW_REDUCED,
  type MorningAfterDerivation,
  type MorningAfterMachine,
  mintMorningAfter,
  morningAfterSchedule,
  morningAfterTintOf,
  settleMorningAfterNight,
  takeMorningAfter,
} from "../scene-logic"
import { morningAfterDue } from "./morning-after-ledger"

/** A derivation straight off the phase-1 classifier's shape. */
const derivation = (
  cls: MorningAfterClass,
  amplifiers: Amplifier[] = [],
): MorningAfterDerivation => ({
  class: cls,
  amplifiers,
  bossId: null,
})

/** Drive a machine with fixed dt steps until it reports done, collecting
 * every drive. The step cap keeps a stuck machine from looping forever. */
const runToDone = (machine: MorningAfterMachine, dt = 0.0625) => {
  const drives: ReturnType<MorningAfterMachine["advance"]>[] = []
  for (let i = 0; i < 400; i++) {
    const drive = machine.advance(dt)
    drives.push(drive)
    if (drive.done) break
  }
  const last = drives.at(-1)
  if (!last) throw new Error("no drives collected")
  return { drives, last }
}

// The machine clamps dt to 0.1 s (tab-pause protection). 0.0625 s (2^-4)
// steps cross every beat boundary exactly — all the beat durations are
// multiples of 1/16 s, so no float noise shifts a cap reading.
const DT = 0.0625

/** The wall time a run consumed: every step but the final `done` report
 * advanced the schedule, so the count minus one is the exact total. */
const wall = (drives: { length: number }): number => (drives.length - 1) * DT

/** FR-2's class caps: title 8–10 s, gatekeep 5–6 s, exit 4–5 s,
 * withdrawn 3 s (the low bound guards a degenerate near-zero schedule). */
const CAPS = [
  ["title", 8, 10],
  ["gatekeep", 5, 6],
  ["exit", 4, 5],
  ["withdrawn", 2, 3],
] as const satisfies ReadonlyArray<[MorningAfterClass, number, number]>

describe("the class-adaptive schedule (FR-2 caps)", () => {
  test("each class's base schedule sits inside its cap window", () => {
    for (const [cls, low, high] of CAPS) {
      const schedule = morningAfterSchedule(cls, false, false)
      expect(schedule.cls).toBe(cls)
      expect(schedule.reduced).toBe(false)
      expect(schedule.total).toBeGreaterThanOrEqual(low)
      expect(schedule.total).toBeLessThanOrEqual(high)
    }
  })

  test("the amplifier adds exactly one overlay beat of at most +1 s", () => {
    for (const [cls, , high] of CAPS) {
      const base = morningAfterSchedule(cls, false, false)
      const boosted = morningAfterSchedule(cls, true, false)
      expect(boosted.amplifyTime).toBe(MORNING_AFTER_AMPLIFY_TIME)
      expect(MORNING_AFTER_AMPLIFY_TIME).toBeLessThanOrEqual(1)
      expect(boosted.total).toBe(base.total + MORNING_AFTER_AMPLIFY_TIME)
      expect(boosted.total).toBeLessThanOrEqual(high + 1)
    }
  })

  test("reduced motion schedules only the jump-cut glow, ≤ 2 s, nothing else", () => {
    for (const [cls] of CAPS) {
      for (const amplified of [false, true]) {
        const schedule = morningAfterSchedule(cls, amplified, true)
        expect(schedule.reduced).toBe(true)
        expect(schedule.arrivalTime).toBe(0)
        expect(schedule.poseTime).toBe(0)
        expect(schedule.holdTime).toBe(0)
        expect(schedule.releaseTime).toBe(0)
        expect(schedule.amplifyTime).toBe(0)
        expect(schedule.glowTime).toBe(MORNING_AFTER_GLOW_REDUCED)
        expect(schedule.total).toBeLessThanOrEqual(2)
      }
    }
  })
})

describe("the arrival ceremony machine (FR-2)", () => {
  test("a fresh machine is idle and inactive", () => {
    const drive = createMorningAfterCeremony().advance(0.016)
    expect(drive.phase).toBe("idle")
    expect(drive.active).toBe(false)
    expect(drive.done).toBe(true)
    expect(drive.outcome).toBe("none")
    expect(drive.strut).toBe(0)
    expect(drive.droop).toBe(0)
    expect(drive.glow).toBe(0)
    expect(drive.amplified).toBe(false)
  })

  test("the title morning arcs into the strut, pulses the glow twice, and completes inside its cap", () => {
    const m = createMorningAfterCeremony()
    m.begin(derivation("title"), false)
    const { drives, last } = runToDone(m)
    expect([...new Set(drives.map((d) => d.phase))]).toEqual([
      "arrival",
      "pose",
      "glow",
      "hold",
      "release",
      "idle",
    ])
    // The strut lifts all the way before the glow takes over.
    expect(Math.max(...drives.map((d) => d.strut))).toBe(1)
    expect(drives.every((d) => d.droop === 0)).toBe(true)
    // The glow swells twice — the title morning's twin sparkle.
    const swells = drives.filter((d) => d.phase === "glow").map((d) => d.glow)
    expect(Math.max(...swells)).toBeGreaterThan(0.9)
    let peaks = 0
    for (let i = 1; i < swells.length - 1; i++) {
      const prev = swells[i - 1] ?? 0
      const cur = swells[i] ?? 0
      const next = swells[i + 1] ?? 0
      if (cur > prev && cur >= next) peaks++
    }
    expect(peaks).toBe(2)
    expect(last.outcome).toBe("completed")
    expect(last.active).toBe(false)
    expect(wall(drives)).toBeGreaterThanOrEqual(8)
    expect(wall(drives)).toBeLessThanOrEqual(10)
  })

  test("the loss mornings droop to their graded stance and hold their caps", () => {
    const table = [
      ["gatekeep", 0.8, 5, 6],
      ["exit", 0.5, 4, 5],
      ["withdrawn", 0.3, 2, 3],
    ] as const satisfies ReadonlyArray<
      [MorningAfterClass, number, number, number]
    >
    for (const [cls, droop, low, high] of table) {
      const m = createMorningAfterCeremony()
      m.begin(derivation(cls), false)
      const { drives, last } = runToDone(m)
      expect(Math.max(...drives.map((d) => d.droop))).toBe(droop)
      expect(drives.every((d) => d.strut === 0)).toBe(true)
      expect(last.outcome).toBe("completed")
      expect(wall(drives)).toBeGreaterThanOrEqual(low)
      expect(wall(drives)).toBeLessThanOrEqual(high)
    }
  })

  test("player intent dismisses politely: the glow fades out and the outcome latches", () => {
    const m = createMorningAfterCeremony()
    m.begin(derivation("title"), false)
    let mid = m.advance(DT)
    for (let i = 0; i < 47; i++) mid = m.advance(DT) // 3 s: mid first swell
    expect(mid.glow).toBeGreaterThan(0)
    m.dismiss()
    const fades: ReturnType<MorningAfterMachine["advance"]>[] = []
    let drive = mid
    for (let i = 0; i < 40; i++) {
      drive = m.advance(DT)
      fades.push(drive)
      if (drive.done) break
    }
    expect(drive.outcome).toBe("dismissed")
    expect(drive.done).toBe(true)
    expect(drive.glow).toBe(0)
    // The swell fades monotonically — a polite release, never a snap.
    expect(fades[0]?.glow).toBeGreaterThan(0)
    for (let i = 1; i < fades.length; i++) {
      expect(fades[i]?.glow ?? 0).toBeLessThanOrEqual(
        (fades[i - 1]?.glow ?? 0) + 1e-9,
      )
    }
  })

  test("dismissal outside a running ceremony is a no-op", () => {
    const m = createMorningAfterCeremony()
    m.dismiss()
    expect(m.advance(0.016).outcome).toBe("none")
    m.begin(derivation("exit"), false)
    const { last } = runToDone(m)
    expect(last.outcome).toBe("completed")
    m.dismiss()
    expect(m.advance(0.016).outcome).toBe("completed")
  })

  test("the amplifier beat fires once after the main glow and adds its second to the run", () => {
    const m = createMorningAfterCeremony()
    m.begin(derivation("title", [{ kind: "first_title" }]), false)
    const { drives, last } = runToDone(m)
    const beats = drives.filter((d) => d.amplified)
    expect(beats.length).toBeGreaterThan(0)
    expect(beats.every((d) => d.phase === "amplify")).toBe(true)
    expect(Math.max(...beats.map((d) => d.glow))).toBeGreaterThan(0.9)
    // The beat ends clean: the hold that follows carries no glow.
    const after = drives.find((d, i) => i > drives.indexOf(beats.at(-1) ?? d))
    expect(after?.amplified).toBe(false)
    expect(last.outcome).toBe("completed")
    expect(wall(drives)).toBeLessThanOrEqual(10)
    expect(wall(drives)).toBeGreaterThan(
      morningAfterSchedule("title", false, false).total,
    )
  })

  test("a running ceremony yields to nothing — begin is a no-op while active", () => {
    const m = createMorningAfterCeremony()
    m.begin(derivation("title"), false)
    for (let i = 0; i < 20; i++) m.advance(DT) // into the pose arc
    m.begin(derivation("withdrawn"), false)
    const { drives, last } = runToDone(m)
    expect(Math.max(...drives.map((d) => d.strut))).toBe(1)
    expect(Math.max(...drives.map((d) => d.droop))).toBe(0)
    expect(last.outcome).toBe("completed")
  })

  test("a dt spike is clamped and the ceremony still completes in order", () => {
    const m = createMorningAfterCeremony()
    m.begin(derivation("gatekeep"), false)
    const { drives, last } = runToDone(m, 0.5)
    expect(last.done).toBe(true)
    for (const drive of drives) {
      expect(drive.droop).toBeLessThanOrEqual(0.8 + 1e-9)
      expect(drive.strut).toBe(0)
    }
  })
})

describe("the reduced-motion jump-cut (FR-7)", () => {
  test("the pose holds from the first frame and only the glow plays", () => {
    for (const [cls] of CAPS) {
      const m = createMorningAfterCeremony()
      m.begin(derivation(cls), true)
      const { drives, last } = runToDone(m)
      const phases = [...new Set(drives.map((d) => d.phase))]
      // No travel, leap, or spin beats: the arrival and pose arcs never play.
      expect(phases).not.toContain("arrival")
      expect(phases).not.toContain("pose")
      const first = drives[0]
      expect(first?.phase).toBe("glow")
      expect(first?.active).toBe(true)
      // The outcome pose is held from the first frame — a jump-cut, not a blend.
      expect(first?.strut).toBe(morningAfterTintOf(cls).strut)
      expect(first?.droop).toBe(morningAfterTintOf(cls).droop)
      expect(wall(drives)).toBeLessThanOrEqual(2)
      expect(last.done).toBe(true)
      expect(last.outcome).toBe("completed")
    }
  })

  test("the amplifier still surfaces inside the ≤ 2 s glow window", () => {
    const m = createMorningAfterCeremony()
    m.begin(derivation("exit", [{ kind: "first_scalp", bossId: "koda" }]), true)
    const { drives } = runToDone(m)
    expect(drives.some((d) => d.amplified)).toBe(true)
    expect(wall(drives)).toBeLessThanOrEqual(2)
  })

  test("reduced-motion dismissal cuts straight to done", () => {
    const m = createMorningAfterCeremony()
    m.begin(derivation("title"), true)
    m.advance(DT)
    m.dismiss()
    const drive = m.advance(DT)
    expect(drive.done).toBe(true)
    expect(drive.outcome).toBe("dismissed")
    expect(drive.glow).toBe(0)
  })
})

describe("the day-long idle tint (FR-3)", () => {
  test("strut after a title, graded droops after the losses", () => {
    expect(morningAfterTintOf("title")).toEqual({ strut: 1, droop: 0 })
    expect(morningAfterTintOf("gatekeep")).toEqual({ strut: 0, droop: 0.8 })
    expect(morningAfterTintOf("exit")).toEqual({ strut: 0, droop: 0.5 })
    expect(morningAfterTintOf("withdrawn")).toEqual({ strut: 0, droop: 0.3 })
  })
})

describe("the ritual ledger — one shot per ritual day (FR-2, FR-9)", () => {
  const DAY = 12

  test("an un-minted ledger is never due", () => {
    const ledger = createMorningAfterLedger()
    expect(morningAfterDue(ledger, DAY)).toBe(false)
    expect(takeMorningAfter(ledger, DAY, false)).toBeNull()
  })

  test("the ritual plays once on its own day, never again", () => {
    const ledger = createMorningAfterLedger()
    mintMorningAfter(ledger, derivation("title"), DAY)
    expect(morningAfterDue(ledger, DAY)).toBe(true)
    expect(takeMorningAfter(ledger, DAY, false)).toEqual(derivation("title"))
    expect(ledger.consumedDay).toBe(DAY)
    // No same-day replay.
    expect(morningAfterDue(ledger, DAY)).toBe(false)
    expect(takeMorningAfter(ledger, DAY, false)).toBeNull()
    // The ritual belongs to the finalize's morning — a later day re-runs
    // nothing.
    expect(morningAfterDue(ledger, DAY + 1)).toBe(false)
    expect(takeMorningAfter(ledger, DAY + 1, false)).toBeNull()
  })

  test("an evolution-reveal day yields: consumed silently, derivation stays banked for the debrief", () => {
    const ledger = createMorningAfterLedger()
    mintMorningAfter(ledger, derivation("exit"), DAY)
    expect(takeMorningAfter(ledger, DAY, true)).toBeNull()
    expect(ledger.consumedDay).toBe(DAY)
    expect(ledger.pending).not.toBeNull()
    // A second arrival the same day cannot resurrect the ceremony either.
    expect(takeMorningAfter(ledger, DAY, false)).toBeNull()
  })

  test("the night settle drops every leftover (NFR-7)", () => {
    const ledger = createMorningAfterLedger()
    mintMorningAfter(ledger, derivation("gatekeep"), DAY)
    ledger.consumedDay = DAY
    settleMorningAfterNight(ledger, DAY + 1)
    expect(ledger.pending).toBeNull()
    expect(ledger.mintedDay).toBeNull()
    expect(ledger.consumedDay).toBeNull()
    expect(morningAfterDue(ledger, DAY + 1)).toBe(false)
  })

  test("a settle still on the ritual day keeps the pending (the debrief day is not over)", () => {
    const ledger = createMorningAfterLedger()
    mintMorningAfter(ledger, derivation("exit"), DAY)
    settleMorningAfterNight(ledger, DAY)
    expect(ledger.pending).not.toBeNull()
  })
})

describe("no lingering timers — deterministic cleanup (NFR-7)", () => {
  /** Count every timer the machine (or anything it calls) tries to
   * schedule while the globals are stood in for. The stub replaces the
   * globals only for the guarded run; the casts are the price of a test
   * double with the exact global signature (the sim tests do the same for
   * synthetic verdicts). */
  function countTimers(): { scheduled: string[]; restore(): void } {
    const scheduled: string[] = []
    const realSetTimeout = globalThis.setTimeout
    const realSetInterval = globalThis.setInterval
    const counting = (kind: string) => () => {
      scheduled.push(kind)
      return 0
    }
    // `as unknown as` per the compiler's own suggestion: the stub only
    // needs to be callable, never used — the machine never holds a handle.
    globalThis.setTimeout = counting(
      "setTimeout",
    ) as unknown as typeof setTimeout
    globalThis.setInterval = counting(
      "setInterval",
    ) as unknown as typeof setInterval
    return {
      scheduled,
      restore: () => {
        globalThis.setTimeout = realSetTimeout
        globalThis.setInterval = realSetInterval
      },
    }
  }

  test("a full ceremony and a dismissal never schedule a timer, and stay settled past done", () => {
    const { scheduled, restore } = countTimers()
    try {
      // A full title run with the amplifier: every phase crosses, still no
      // timer anywhere — the schedule is pure derived values (NFR-5).
      const machine = createMorningAfterCeremony()
      machine.begin(derivation("title", [{ kind: "first_title" }]), false)
      let last = machine.advance(DT)
      for (let i = 0; i < 400 && !last.done; i++) last = machine.advance(DT)
      expect(last.done).toBe(true)
      // A dismissed run completes through the same dt steps.
      const dismissed = createMorningAfterCeremony()
      dismissed.begin(derivation("gatekeep"), false)
      dismissed.advance(DT)
      dismissed.dismiss()
      let lastDismissed = dismissed.advance(DT)
      for (let i = 0; i < 400 && !lastDismissed.done; i++) {
        lastDismissed = dismissed.advance(DT)
      }
      expect(lastDismissed.done).toBe(true)
      expect(lastDismissed.outcome).toBe("dismissed")
      // Post-done advance stability: the settled machines report the same
      // clean drive forever — no hidden timer ever has to fire (NFR-7).
      for (let i = 0; i < 64; i++) {
        for (const settled of [machine.advance(DT), dismissed.advance(DT)]) {
          expect(settled.done).toBe(true)
          expect(settled.active).toBe(false)
          expect(settled.glow).toBe(0)
          expect(settled.strut).toBe(0)
          expect(settled.droop).toBe(0)
        }
      }
      expect(scheduled).toEqual([])
    } finally {
      restore()
    }
  })
})
