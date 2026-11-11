import { STREAM_PHASE, type StreamFrame } from "@apex/sim"
import { clamp01 } from "./anim"

/**
 * Stream-to-pose mapping (presentation mapping Phases 1-2: FR-1–FR-5,
 * FR-7, FR-10). The dense stream is the only source of truth — one side's
 * frame already carries the attack window (phase/phaseT), the hitstun still
 * to serve (hitstunMs in ms), whether the body is down (hp), and whether
 * knockback holds it against the fence (pinned). This module maps that
 * frame onto exactly one body pose per step, so no event ever renders as a
 * snap and no two poses ever fire at once.
 *
 * Priority is fixed: KO owns the body (the existing topple path keeps
 * rendering it), then the poise-break crumple, then the fence-pin and
 * knockback recoil, then the hitstun flinch, then the dodge roll, then the
 * contact press, then the startup crouch, then nothing. The roll, recoil
 * and press read motion the single frame cannot carry — travel since the
 * previous step, the gap to the foe — so the tracker feeds them in and the
 * pure `poseForFrame` stays testable on one frame plus that motion.
 * Everything is parametric over the fighter driver's existing channels
 * (position offset, lean, display squash) — no mesh rebuilds, no new
 * geometry — and every intensity derives from the stream itself (hitstun
 * remaining, startup progress, millimetres travelled), never from a wall
 * clock or random source, so replay hashes stay byte-identical.
 */

/** Every pose the mapping can name (Phase 2 adds roll, recoil, press). */
export type StreamPose =
  | "none"
  | "crouch"
  | "flinch"
  | "crumple"
  | "ko"
  | "roll"
  | "recoil"
  | "press"

/**
 * A plain landed blow stuns for this long, in ms. Mirrors the sim's
 * impulse.HITSTUN_MS, which the stream does not export: the stream carries
 * only the ms, so the presentation layer pins the one number that tells a
 * plain hit (exactly this long, never stacked) from a poise break (far
 * longer). If the sim retunes, this is the line that moves — the mapping
 * shape (break dwarfs plain) does not.
 */
export const PLAIN_HITSTUN_MS = 100

/**
 * How long a poise break holds the body, in ms. Mirrors the sim's
 * poise.POISE_BREAK_MS: the break outlasts its own hitstun and the stream
 * carries no break clock, so the tracker counts stream steps against the
 * stream's own stepMs to hold the crumple until the window ends.
 */
export const POISE_BREAK_MS = 600

/**
 * Travel that reads as a dodge roll, in mm per step. A free body walks at
 * most 2 + 1.8·spd mm/step (sim movement.topSpeed, spd ≤ 19 roster-wide) —
 * under 37 mm — while a paid dodge snaps to at least 3× walk floored at
 * 3000 velocity units, i.e. 60 mm/step. 50 sits between: no walk trips it,
 * every dodge does. A short lateral slip can read as a partial roll; the
 * stream carries no order flag, so a burst sideways is a burst sideways.
 */
/** Travel per step that trips the roll. */
const ROLL_TRAVEL_MM = 50
/** Travel per step that tucks the roll fully (fastest dodge ≈ 108 mm). */
const ROLL_FULL_MM = 120

/**
 * Slide that reads as knockback recoil, in mm per step. A basic blow moves
 * an average body ~40 mm on its first step and halves every step after;
 * the heaviest roster body still slides ~16 mm. 12 catches that while the
 * clinch shoves of separation (single mm) stay flinches. Hitstun separates
 * the two: a stunned body ignores its orders, so any real slide under
 * hitstun is the sim's knockback, never footwork.
 */
/** Slide per step that trips the recoil. */
export const RECOIL_TRAVEL_MM = 12
/** Slide per step that recoils fully (dodge-scale bursts top out here). */
const RECOIL_FULL_MM = 90
/** A tripped recoil never reads weaker than this, however heavy the body. */
export const RECOIL_FLOOR = 0.35

/**
 * Lean-in margin past touch, in mm: the press starts when the centre gap
 * drops below both body radii plus this. Bodies at rest touch at exactly
 * their radii sum (the sim separates overlap), so the margin is the only
 * tuning — half-press at its edge, full press at touch.
 */
export const CONTACT_MARGIN_MM = 40

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
 * The motion one frame cannot carry, measured by the tracker from the
 * stream itself: millimetres travelled since the previous step (the dodge
 * burst and the knockback slide both read here), plus the centre-to-centre
 * gap to the foe and the contact distance for this pair (radii sum plus
 * the margin) when the foe's frame is known.
 */
export interface PoseMotion {
  /** Millimetres this side travelled since the previous step. */
  readonly travelMm: number
  /** Centre-to-centre gap to the foe, in mm (absent before the first foe). */
  readonly gapMm?: number
  /** Gap below which the pair reads as contact, in mm. */
  readonly contactMm?: number
}

/** Press intensity 0.5 at the contact edge, 1 at touch or deeper. */
function pressIntensity(gapMm: number, contactMm: number): number {
  return 0.5 + 0.5 * clamp01((contactMm - gapMm) / CONTACT_MARGIN_MM)
}

/**
 * Map one stream frame plus its motion onto its pose (FR-10). Exactly one
 * pose wins: a downed body reports ko for the topple path, a break-length
 * hitstun reports crumple, a pinned body reports a full recoil (the stream
 * reports the pin only while knockback holds a stunned body on the fence),
 * a sliding hitstun reports recoil, any other hitstun reports flinch, a
 * fast free step reports roll along its own travel, a foe inside contact
 * distance reports press, a startup window reports crouch, and everything
 * else reports none. The roll never turns the body — yaw stays the
 * driver's face-the-rival, the tuck is all pitch — and a recovering frame
 * still reports none: recovery is the absence of a telegraph, not a pose.
 */
export function poseForFrame(
  frame: StreamFrame,
  motion: PoseMotion = { travelMm: 0 },
): StreamPoseState {
  if (frame.hp <= 0) return { pose: "ko", intensity: 1 }
  if (frame.hitstunMs > PLAIN_HITSTUN_MS) {
    return { pose: "crumple", intensity: 1 }
  }
  if (frame.pinned) return { pose: "recoil", intensity: 1 }
  if (frame.hitstunMs > 0) {
    if (motion.travelMm >= RECOIL_TRAVEL_MM) {
      return {
        pose: "recoil",
        intensity: Math.max(
          RECOIL_FLOOR,
          clamp01(motion.travelMm / RECOIL_FULL_MM),
        ),
      }
    }
    return {
      pose: "flinch",
      intensity: clamp01(frame.hitstunMs / PLAIN_HITSTUN_MS),
    }
  }
  if (motion.travelMm >= ROLL_TRAVEL_MM) {
    return {
      pose: "roll",
      intensity: clamp01(motion.travelMm / ROLL_FULL_MM),
    }
  }
  if (
    motion.gapMm !== undefined &&
    motion.contactMm !== undefined &&
    motion.gapMm < motion.contactMm
  ) {
    return {
      pose: "press",
      intensity: pressIntensity(motion.gapMm, motion.contactMm),
    }
  }
  if (frame.phase === STREAM_PHASE.startup) {
    return { pose: "crouch", intensity: clamp01(frame.phaseT / 255) }
  }
  return { pose: "none", intensity: 0 }
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
/** Roll tuck depth at full travel, world units — the glide carries it. */
const ROLL_DIP = 0.12
/** Roll tuck at full travel, radians forward into the run. */
const ROLL_TUCK = 0.3
/** Roll squash at full travel, display-only. */
const ROLL_SQUASH = 0.2
/** Recoil shove at full intensity, world units along away. */
const RECOIL_PUSH = 0.2
/** Recoil sink at full intensity, world units — feet stay planted. */
const RECOIL_DIP = 0.04
/** Recoil lean-back at full intensity, radians. */
const RECOIL_LEAN = 0.3
/** Recoil squash at full intensity, display-only. */
const RECOIL_SQUASH = 0.22
/** Press sink at full contact, world units. */
const PRESS_DIP = 0.05
/** Press lean into the foe at full contact, radians forward. */
const PRESS_LEAN = 0.1
/** Press squash at full contact, display-only. */
const PRESS_SQUASH = 0.18

/** A zero contribution: the pose that leaves the composed pose alone. */
const NO_ADJUST: PoseAdjust = { dx: 0, dy: 0, pitch: 0, roll: 0, squash: 0 }

/**
 * The driver's pose contribution for one frame. Each pose owns a distinct
 * channel signature — the crouch dips and coils forward, the flinch
 * recoils back and leans away, the crumple folds deep and lists, the roll
 * tucks forward without recoiling, the recoil shoves back harder than any
 * flinch with its feet planted, the press leans into the foe without
 * recoiling at all — so no two impacts ever read alike. Scales with the
 * frame's intensity and the motion life (zero under reduced motion, where
 * Phase 4 owns the flash language instead).
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
  if (pose === "roll") {
    return {
      dx: 0,
      dy: -ROLL_DIP * k,
      pitch: ROLL_TUCK * k,
      roll: 0,
      squash: ROLL_SQUASH * k,
    }
  }
  if (pose === "recoil") {
    return {
      dx: away * RECOIL_PUSH * k,
      dy: -RECOIL_DIP * k,
      pitch: -RECOIL_LEAN * k,
      roll: 0,
      squash: RECOIL_SQUASH * k,
    }
  }
  if (pose === "press") {
    return {
      dx: 0,
      dy: -PRESS_DIP * k,
      pitch: PRESS_LEAN * k,
      roll: 0,
      squash: PRESS_SQUASH * k,
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
