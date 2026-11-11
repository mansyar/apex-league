import { STREAM_PHASE, type StreamFrame } from "@apex/sim"
import { clamp01 } from "./anim"

/**
 * Stream-to-pose mapping (presentation mapping Phase 1: FR-1, FR-2, FR-5,
 * FR-10). The dense stream is the only source of truth — one side's frame
 * already carries the attack window (phase/phaseT), the hitstun still to
 * serve (hitstunMs in ms), and whether the body is down (hp). This module
 * maps that frame onto exactly one body pose per step, so no event ever
 * renders as a snap and no two poses ever fire at once.
 *
 * Priority is fixed: KO owns the body (the existing topple path keeps
 * rendering it), then the poise-break crumple, then the hitstun flinch,
 * then the startup crouch, then nothing. Everything is parametric over the
 * fighter driver's existing channels (position offset, lean, display
 * squash) — no mesh rebuilds, no new geometry — and every intensity derives
 * from the frame itself (hitstun remaining, startup progress), never from a
 * wall clock or random source, so replay hashes stay byte-identical.
 */

/** Every pose the Phase-1 mapping can name. */
export type StreamPose = "none" | "crouch" | "flinch" | "crumple" | "ko"

/**
 * A plain landed blow stuns for this long, in ms. Mirrors the sim's
 * impulse.HITSTUN_MS, which the stream does not export: the stream carries
 * only the ms, so the presentation layer pins the one number that tells a
 * plain hit (exactly this long, never stacked) from a poise break (far
 * longer). If the sim retunes, this is the line that moves — the mapping
 * shape (break dwarfs plain) does not.
 */
const PLAIN_HITSTUN_MS = 100

/**
 * How long a poise break holds the body, in ms. Mirrors the sim's
 * poise.POISE_BREAK_MS: the break outlasts its own hitstun and the stream
 * carries no break clock, so the tracker counts stream steps against the
 * stream's own stepMs to hold the crumple until the window ends.
 */
const POISE_BREAK_MS = 600

/** One side's pose for one step, with its intensity. */
export interface StreamPoseState {
  readonly pose: StreamPose
  /**
   * Intensity 0..1: a flinch fades with the hitstun still to serve, a
   * crouch deepens with startup progress, a held crumple and a KO read 1,
   * and none reads 0.
   */
  readonly intensity: number
}

/**
 * Map one stream frame onto its pose (FR-10). Exactly one pose wins: a
 * downed body reports ko for the topple path, a break-length hitstun
 * reports crumple, any shorter hitstun reports flinch, a startup window
 * reports crouch, and everything else reports none. A pinned-but-free or
 * recovering frame reports none — Phase 2 owns the fence pin, and a
 * recovery is the absence of a telegraph, not a pose.
 */
export function poseForFrame(frame: StreamFrame): StreamPoseState {
  if (frame.hp <= 0) return { pose: "ko", intensity: 1 }
  if (frame.hitstunMs > PLAIN_HITSTUN_MS) {
    return { pose: "crumple", intensity: 1 }
  }
  if (frame.hitstunMs > 0) {
    return {
      pose: "flinch",
      intensity: clamp01(frame.hitstunMs / PLAIN_HITSTUN_MS),
    }
  }
  if (frame.phase === STREAM_PHASE.startup) {
    return { pose: "crouch", intensity: clamp01(frame.phaseT / 255) }
  }
  return { pose: "none", intensity: 0 }
}

/** Step-counted pose state for one side: the latch behind the crumple. */
export interface PoseTracker {
  /** Map this step's frame, holding a break's crumple until it ends. */
  update(step: number, frame: StreamFrame): StreamPoseState
  /** Forget a latched break (new fight, panel closed). */
  reset(): void
}

/**
 * Track one side's pose across steps. A break-length hitstun latches a
 * crumple for the whole break window (POISE_BREAK_MS counted in stream
 * steps): the break outlasts its hitstun, and without the latch the tail
 * would decay into a flinch — a longer flinch instead of a distinct pose.
 * A same-step repeat latches identically, so a slow frame can never stack
 * it, and a plain hit can never trip it (hitstun never exceeds plain
 * length without a break behind it).
 */
export function createPoseTracker(stepMs = 20): PoseTracker {
  const per = stepMs > 0 ? stepMs : 20
  const holdSteps = Math.ceil(POISE_BREAK_MS / per)
  let breakUntil = -1
  return {
    update(step, frame) {
      if (frame.hp <= 0) {
        breakUntil = -1
        return { pose: "ko", intensity: 1 }
      }
      if (frame.hitstunMs > PLAIN_HITSTUN_MS) {
        if (step + holdSteps > breakUntil) breakUntil = step + holdSteps
      }
      if (step < breakUntil) return { pose: "crumple", intensity: 1 }
      return poseForFrame(frame)
    },
    reset() {
      breakUntil = -1
    },
  }
}

/** The driver's per-frame pose contribution, world units and radians. */
export interface PoseAdjust {
  /** Lateral recoil along the fighter's away axis. */
  readonly dx: number
  /** Vertical dip (never positive — a pose never lifts the body). */
  readonly dy: number
  /** Pitch: negative leans back from the blow, positive coils forward. */
  readonly pitch: number
  /** Roll: the crumple's held list, which the flinch never has. */
  readonly roll: number
  /** Display-only squash over the spring (never written back into it). */
  readonly squash: number
}

/** Crouch dip at full startup progress, world units. */
const CROUCH_DIP = 0.09
/** Crouch coil at full startup progress, radians forward. */
const CROUCH_LEAN = 0.16
/** Crouch squash at full startup progress, display-only. */
const CROUCH_SQUASH = 0.06
/** Flinch recoil at full intensity, world units along away. */
const FLINCH_BACK = 0.12
/** Flinch sink at full intensity, world units. */
const FLINCH_DIP = 0.02
/** Flinch lean-back at full intensity, radians. */
const FLINCH_PITCH = 0.22
/** Flinch squash pop at full intensity, display-only. */
const FLINCH_SQUASH = 0.1
/** Crumple fold depth at full hold, world units. */
const CRUMPLE_DIP = 0.16
/** Crumple forward fold at full hold, radians. */
const CRUMPLE_FOLD = 0.38
/** Crumple lateral list at full hold, radians. */
const CRUMPLE_ROLL = 0.08
/** Crumple squash at full hold, display-only. */
const CRUMPLE_SQUASH = 0.35

/** A zero contribution: the pose that leaves the composed pose alone. */
const NO_ADJUST: PoseAdjust = { dx: 0, dy: 0, pitch: 0, roll: 0, squash: 0 }

/**
 * The driver's pose contribution for one frame. Each pose owns a distinct
 * channel signature — the crouch dips and coils forward, the flinch
 * recoils back and leans away, the crumple folds deep and lists — so a
 * break can never read as a longer flinch. Scales with the frame's
 * intensity and the motion life (zero under reduced motion, where Phase 4
 * owns the flash language instead).
 */
export function poseAdjust(
  pose: StreamPose,
  intensity: number,
  away: 1 | -1,
  life: number,
): PoseAdjust {
  if (pose === "none" || pose === "ko") return NO_ADJUST
  const k = clamp01(intensity) * life
  if (k === 0) return NO_ADJUST
  if (pose === "crouch") {
    return {
      dx: 0,
      dy: -CROUCH_DIP * k,
      pitch: CROUCH_LEAN * k,
      roll: 0,
      squash: CROUCH_SQUASH * k,
    }
  }
  if (pose === "flinch") {
    return {
      dx: away * FLINCH_BACK * k,
      dy: -FLINCH_DIP * k,
      pitch: -FLINCH_PITCH * k,
      roll: 0,
      squash: FLINCH_SQUASH * k,
    }
  }
  return {
    dx: 0,
    dy: -CRUMPLE_DIP * k,
    pitch: CRUMPLE_FOLD * k,
    roll: CRUMPLE_ROLL * k,
    squash: CRUMPLE_SQUASH * k,
  }
}
