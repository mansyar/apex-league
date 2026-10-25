/**
 * Scene logic — the morning-after ritual (postcup_morning_after FR-2):
 * the one-shot, dismissible, class-adaptive arrival ceremony a finalized
 * cup leaves behind. The day ledger lives in morning-after-ledger.ts. The
 * machine never re-derives: it receives the phase-1 classifier's
 * `MorningAfterDerivation` (type-only import — no runtime sim coupling)
 * and plays it. Pure: no DOM, no Three, no sim values at runtime.
 *
 * Position-clock like every care ceremony — dt-clamped steps, so a paused
 * tab or a long frame can never skip a beat (learnings.md). The schedule
 * is pure derived values: class constants and the amplifier's overlay
 * beat, no wall clocks, no randomness anywhere (NFR-5).
 */
import type {
  MorningAfterClass,
  MorningAfterDerivation,
} from "../morning-after/derive"
import { smoothstep } from "./math"

// The classifier's derivation type rides the machine's public surface —
// re-exported so importers keep the single barrel entry point.
export type { MorningAfterClass, MorningAfterDerivation }

// ---------------------------------------------------------------------------
// The class-adaptive schedule (FR-2)
// ---------------------------------------------------------------------------

export type MorningAfterPhase =
  | "idle"
  | "arrival"
  | "pose"
  | "glow"
  | "amplify"
  | "hold"
  | "release"

/** Per-frame drive for the morning-after ceremony. `strut`/`droop` are the
 * ceremony's own class-stance blend; `glow` pulses the sparkle moments;
 * `amplified` marks the amplifier's one overlay beat. */
export interface MorningAfterDrive {
  phase: MorningAfterPhase
  /** Strut weight 0..1 (the champion's lift). */
  strut: number
  /** Droop weight 0..1 (the morning-after sag). */
  droop: number
  /** Glow/sparkle intensity 0..1 (0 outside the pulse moments). */
  glow: number
  /** True only across the amplifier's overlay beat. */
  amplified: boolean
  /** True while the machine owns the creature. */
  active: boolean
  /** True when the ceremony has finished (or never started). */
  done: boolean
  /** How the ceremony ended: "none" while playing, then latched — the
   * clean "dismissed by intent" event (FR-2). */
  outcome: "none" | "completed" | "dismissed"
}

export interface MorningAfterSchedule {
  readonly cls: MorningAfterClass
  readonly amplified: boolean
  readonly reduced: boolean
  readonly arrivalTime: number
  readonly poseTime: number
  readonly glowTime: number
  readonly amplifyTime: number
  readonly holdTime: number
  readonly releaseTime: number
  readonly total: number
}

interface ClassBeats {
  readonly arrival: number
  readonly pose: number
  readonly glow: number
  /** How many swells the glow pulse carries (the title morning's twin
   * sparkle; one swell everywhere else). */
  readonly glowPulses: number
  readonly hold: number
  readonly release: number
}

/** The per-class beats (seconds). Every duration is a multiple of 1/16 s so
 * 0.0625 s test steps cross each boundary exactly. The sums sit inside
 * FR-2's caps: title 8–10 s, gatekeep 5–6 s, exit 4–5 s, withdrawn 3 s. */
const CLASS_BEATS: Record<MorningAfterClass, ClassBeats> = {
  title: {
    arrival: 1,
    pose: 1.5,
    glow: 3.5,
    glowPulses: 2,
    hold: 1.5,
    release: 1,
  },
  gatekeep: {
    arrival: 0.75,
    pose: 1.25,
    glow: 1.5,
    glowPulses: 1,
    hold: 1.25,
    release: 0.75,
  },
  exit: {
    arrival: 0.625,
    pose: 1,
    glow: 1.25,
    glowPulses: 1,
    hold: 0.875,
    release: 0.75,
  },
  withdrawn: {
    arrival: 0.5,
    pose: 0.75,
    glow: 0.875,
    glowPulses: 1,
    hold: 0,
    release: 0.875,
  },
}

/** The amplifier's overlay beat: one extra burst, at most +1 s (FR-2). */
export const MORNING_AFTER_AMPLIFY_TIME = 1

/** Reduced motion's whole ceremony is the jump-cut glow (FR-7). */
export const MORNING_AFTER_GLOW_REDUCED = 2

/**
 * Build the ceremony schedule for a class. Pure derived values: the class
 * beats plus the amplifier's overlay beat when any persisted first crossed;
 * under reduced motion the whole ceremony collapses to the ≤ 2 s glow —
 * the pose jumps straight to its outcome (no travel, leap, or spin).
 */
export function morningAfterSchedule(
  cls: MorningAfterClass,
  amplified: boolean,
  reduced: boolean,
): MorningAfterSchedule {
  if (reduced) {
    return {
      cls,
      amplified,
      reduced,
      arrivalTime: 0,
      poseTime: 0,
      glowTime: MORNING_AFTER_GLOW_REDUCED,
      amplifyTime: 0,
      holdTime: 0,
      releaseTime: 0,
      total: MORNING_AFTER_GLOW_REDUCED,
    }
  }
  const beats = CLASS_BEATS[cls]
  const amplifyTime = amplified ? MORNING_AFTER_AMPLIFY_TIME : 0
  const total =
    beats.arrival +
    beats.pose +
    beats.glow +
    amplifyTime +
    beats.hold +
    beats.release
  return {
    cls,
    amplified,
    reduced,
    arrivalTime: beats.arrival,
    poseTime: beats.pose,
    glowTime: beats.glow,
    amplifyTime,
    holdTime: beats.hold,
    releaseTime: beats.release,
    total,
  }
}

// ---------------------------------------------------------------------------
// The class stance and the day-long idle tint (FR-3)
// ---------------------------------------------------------------------------

export interface MorningAfterTint {
  /** Strut weight 0..1 — the champion's lift. */
  strut: number
  /** Droop weight 0..1 — the morning-after sag. */
  droop: number
}

/** The class stance each ceremony strikes and the day-long idle tint then
 * holds (FR-3): strut after a title, graded droops after the losses — the
 * gatekeep morning reads heaviest (beaten by a wall), a plain exit
 * lighter, a forfeit lightest (rest was chosen, not suffered). */
const CLASS_STANCE: Record<MorningAfterClass, MorningAfterTint> = {
  title: { strut: 1, droop: 0 },
  gatekeep: { strut: 0, droop: 0.8 },
  exit: { strut: 0, droop: 0.5 },
  withdrawn: { strut: 0, droop: 0.3 },
}

/** The day-long idle tint the ritual leaves behind (FR-3). */
export function morningAfterTintOf(cls: MorningAfterClass): MorningAfterTint {
  return CLASS_STANCE[cls]
}

// ---------------------------------------------------------------------------
// The ceremony machine (FR-2)
// ---------------------------------------------------------------------------

export interface MorningAfterMachine {
  /**
   * Begin the ceremony for a finalized cup's derivation. A no-op while a
   * ceremony is already running (one ceremony owns the moment — the
   * machine-level yield guard the controller's no-start decision rides).
   */
  begin(derivation: MorningAfterDerivation, reducedMotion: boolean): void
  /** A player intent dismisses politely: the glow fades out over the
   * release beat and the outcome latches "dismissed". */
  dismiss(): void
  /** Advance one clamped-dt step. */
  advance(dt: number): MorningAfterDrive
}

export function createMorningAfterCeremony(): MorningAfterMachine {
  let phase: MorningAfterPhase = "idle"
  let sched = morningAfterSchedule("exit", false, false)
  let pulses = 1
  let target: MorningAfterTint = CLASS_STANCE.exit
  let elapsed = 0
  let reduced = false
  let strut = 0
  let droop = 0
  let glow = 0
  /** The glow level release began from — a dismissal fades it out. */
  let releaseGlow = 0
  let outcome: MorningAfterDrive["outcome"] = "none"

  const settle = (): void => {
    phase = "idle"
    elapsed = 0
    strut = 0
    droop = 0
    glow = 0
  }

  /** Enter a phase; zero-length beats hand over inside the same call
   * (withdrawn's hold, the reduced schedule's zeroed arrival/pose). */
  const enter = (next: MorningAfterPhase): void => {
    if (next === "release") {
      releaseGlow = glow
      if (outcome === "none") outcome = "completed"
    }
    phase = next
    elapsed = 0
    if (phase === "arrival" && sched.arrivalTime <= 0) enter("pose")
    else if (phase === "pose" && sched.poseTime <= 0) enter("glow")
    else if (phase === "hold" && sched.holdTime <= 0) enter("release")
    else if (phase === "release" && sched.releaseTime <= 0) settle()
  }

  const drive = (): MorningAfterDrive => ({
    phase,
    strut,
    droop,
    glow,
    amplified:
      phase === "amplify" || (reduced && sched.amplified && phase === "glow"),
    active: phase !== "idle",
    done: phase === "idle",
    outcome,
  })

  const begin = (derivation: MorningAfterDerivation, motion: boolean): void => {
    if (phase !== "idle") return
    sched = morningAfterSchedule(
      derivation.class,
      derivation.amplifiers.length > 0,
      motion,
    )
    pulses = CLASS_BEATS[derivation.class].glowPulses
    target = CLASS_STANCE[derivation.class]
    reduced = motion
    strut = reduced ? target.strut : 0
    droop = reduced ? target.droop : 0
    glow = 0
    outcome = "none"
    // Reduced motion jump-cuts straight into the held pose's glow (FR-7).
    enter(reduced ? "glow" : "arrival")
  }

  const dismiss = (): void => {
    if (phase === "idle" || phase === "release") return
    outcome = "dismissed"
    enter("release")
  }

  const advance = (dt: number): MorningAfterDrive => {
    const step = Math.min(Math.max(dt, 0), 0.1)
    if (phase === "arrival") {
      elapsed += step
      const k = Math.min(1, elapsed / sched.arrivalTime)
      if (k >= 1) enter("pose")
      return drive()
    }
    if (phase === "pose") {
      elapsed += step
      const k = Math.min(1, elapsed / sched.poseTime)
      const e = smoothstep(k)
      strut = target.strut * e
      droop = target.droop * e
      if (k >= 1) enter("glow")
      return drive()
    }
    if (phase === "glow") {
      elapsed += step
      const k = Math.min(1, elapsed / sched.glowTime)
      glow = Math.abs(Math.sin(k * Math.PI * pulses))
      if (k >= 1) {
        glow = 0
        enter(sched.amplifyTime > 0 ? "amplify" : "hold")
      }
      return drive()
    }
    if (phase === "amplify") {
      elapsed += step
      const k = Math.min(1, elapsed / sched.amplifyTime)
      glow = Math.sin(k * Math.PI)
      if (k >= 1) {
        glow = 0
        enter("hold")
      }
      return drive()
    }
    if (phase === "hold") {
      elapsed += step
      const k = Math.min(1, elapsed / sched.holdTime)
      if (k >= 1) enter("release")
      return drive()
    }
    if (phase === "release") {
      elapsed += step
      const k =
        sched.releaseTime > 0 ? Math.min(1, elapsed / sched.releaseTime) : 1
      const e = smoothstep(k)
      // The stance eases down while the day-long tint holds the pose (the
      // pose writer takes the max of the two, so nothing snaps); the glow
      // fades from wherever release began — the polite dismissal.
      strut = target.strut * (1 - e)
      droop = target.droop * (1 - e)
      glow = releaseGlow * (1 - e)
      if (k >= 1) settle()
      return drive()
    }
    return drive()
  }

  return { begin, dismiss, advance }
}
