/**
 * Scene-logic: pure, DOM-free motion math for the ranch scene. Unit-tested
 * here so `scene.ts` stays thin visual glue. Presentational only — nothing
 * in this module touches `@apex/sim` state, the save, or voxel geometry.
 *
 * Phase A: wind sway. Per-prop-class base amplitudes, a seeded phase hash
 * of each prop's world position, and a slow gust envelope. Sway is applied
 * by the scene as a runtime transform — the determinism gate sees nothing.
 */

/**
 * Base sway amplitude (radians) per prop id, by class: tufts flutter most,
 * bushes medium, trees least; rocks and the food pile are anchored and
 * never move. Unknown ids fail closed to 0 so a new registry prop can't
 * accidentally start dancing before it is tuned.
 */
const WIND_BASE_AMPS: Record<string, number> = {
  tuft: 0.09,
  bush: 0.045,
  broadleafTree: 0.018,
  rock: 0,
  foodPile: 0,
}

export function windBaseAmp(propId: string): number {
  return WIND_BASE_AMPS[propId] ?? 0
}

/**
 * Gust envelope: two incommensurate slow waves (periods in the tens of
 * seconds) mixed with a faster ripple, remapped into [0.4, 1.2]. Sum of
 * sinusoids is smooth by construction — calm moments and stronger gusts
 * alternate, never storm force, with no discontinuities to pop the eye.
 *
 * Pure function of time; the same `t` always yields the same breeze.
 */
export function gustEnvelope(t: number): number {
  const waveA = Math.sin(t * ((2 * Math.PI) / 37))
  const waveB = Math.sin(t * ((2 * Math.PI) / 53) + 1.7)
  const ripple = Math.sin(t * ((2 * Math.PI) / 23) + 4.1)
  const mix = (waveA + 0.5 * waveB + 0.3 * ripple) / 1.8 // [-1, 1]
  return 0.8 + 0.4 * mix // [0.4, 1.2]
}

/**
 * Deterministic phase hash of a prop's world position: each prop sways on
 * its own clock so the meadow ripples rather than pulsing in lockstep.
 * Quantized to 1/32 of a unit so infinitesimal float drift in the scatter
 * can never shift the phase. Salt separates props placed at identical
 * positions. No `Math.random` anywhere — same position, same phase, forever.
 */
export function phaseHash(x: number, z: number, salt: number): number {
  const xi = Math.round(x * 32) | 0
  const zi = Math.round(z * 32) | 0
  let h =
    (Math.imul(xi, 0x9e3779b1) ^
      Math.imul(zi, 0x85ebca6b) ^
      Math.imul(salt | 0, 0xc2b2ae35)) >>>
    0
  h ^= h >>> 15
  h = Math.imul(h, 0x2c1b3c6d) >>> 0
  h ^= h >>> 12
  h = Math.imul(h, 0x297a2d39) >>> 0
  h = (h ^ (h >>> 15)) >>> 0
  return (h / 4294967296) * Math.PI * 2
}

/** Season flutter cadence: slow enough to read as breeze, fast enough to notice. */
const WIND_OMEGA = 1.9

/**
 * Total sway angle (radians) for a prop at time `t`: base amplitude × gust
 * envelope × a phase-offset flutter. Reduced motion flattens every prop to
 * exactly 0 — the same gate the mood bounce already honors.
 */
export function swayAngle(
  baseAmp: number,
  phase: number,
  t: number,
  reducedMotion: boolean,
): number {
  if (reducedMotion || baseAmp === 0) return 0
  return baseAmp * gustEnvelope(t) * Math.sin(t * WIND_OMEGA + phase)
}

// -- Feeding ceremony ---------------------------------------------------------

/**
 * Blend two yaw angles along the SHORTEST arc (shortest-arc turn for the
 * ceremony's facing phase — never a 5-radian spin to look at the food).
 */
export function lerpAngle(a: number, b: number, k: number): number {
  if (k <= 0) return a
  if (k >= 1) return b
  return a + wrapPi(b - a) * k
}

/** Wrap an angle delta into (-π, π]. */
export function wrapPi(delta: number): number {
  let d = delta
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return d
}
//
// A pure state machine for the walk→nibble→home sequence the scene plays
// after a successful Feed. Timings are fixed and transitions derive from
// tick deltas. Policy (2026-10-10): the ceremony is non-cancelable — HUD
// input applies to the sim immediately but never interrupts the motion, so
// the scene never calls cancel(); the capability stays on the machine and
// under test as a safety valve. The scene reads the returned state to drive
// yaw, travel, and the head-dip overlay as a visual layer on an
// already-committed sim action.

export type CeremonyPhase =
  | "idle"
  | "turn"
  | "walk-out"
  | "nibble"
  | "walk-home"

/** Fixed phase durations (seconds). Total lands mid-spec-window at ~5.5 s. */
const CEREMONY_TURN = 0.5
const CEREMONY_WALK_OUT = 1.2
const CEREMONY_NIBBLE = 2.6
const CEREMONY_WALK_HOME = 1.2
/** Reduced motion: in-place nibble only — no travel, no turn. */
const CEREMONY_NIBBLE_REDUCED = 2.0

/** Snapshot returned by every tick; the scene's per-frame drive signal. */
export interface CeremonyState {
  phase: CeremonyPhase
  /** Seconds elapsed inside the current phase (0 when idle). */
  phaseElapsed: number
  /** Current phase's full duration (0 when idle). */
  phaseDuration: number
  dipOffset: number
  /** Completed head-dip cycles so far this nibble (2–3 by the end). */
  dips: number
  /** True only on the tick that crosses the walk-home → idle boundary. */
  done: boolean
}

export interface CeremonyMachine {
  /** Begin a ceremony anchored at time `now`. Safe mid-ceremony: resets. */
  start(now: number): void
  /** Instantly cancel from ANY phase; no-op when already idle. */
  cancel(): void
  /** Advance to `now` (monotonic wall/sim time) and sample the state. */
  tick(now: number): CeremonyState
}

/** The fresh idle sample every idle tick copies. */
function idleState(): CeremonyState {
  return {
    phase: "idle",
    phaseElapsed: 0,
    phaseDuration: 0,
    dipOffset: 0,
    dips: 0,
    done: false,
  }
}

/**
 * Build the feeding-ceremony machine. Normal motion plays the full
 * turn→walk-out→nibble→walk-home sequence; `reducedMotion` collapses it
 * to a short in-place nibble at the anchor. The scene treats the whole
 * sequence as non-cancelable (2026-10-10); `cancel` remains on the
 * machine as a tested safety valve.
 */
export function createCeremony(reducedMotion: boolean): CeremonyMachine {
  let running = false
  let startAt = 0

  const bounds = reducedMotion
    ? { turn: 0, walkOut: 0, nibble: CEREMONY_NIBBLE_REDUCED, walkHome: 0 }
    : {
        turn: CEREMONY_TURN,
        walkOut: CEREMONY_WALK_OUT,
        nibble: CEREMONY_NIBBLE,
        walkHome: CEREMONY_WALK_HOME,
      }
  const total = bounds.turn + bounds.walkOut + bounds.nibble + bounds.walkHome

  const tick = (now: number): CeremonyState => {
    if (!running) return idleState()
    const e = Math.max(0, now - startAt)
    if (e >= total) {
      running = false
      return { ...idleState(), done: true }
    }
    // Walk the fixed-duration phases left to right.
    let phase: CeremonyPhase = "idle"
    let phaseDuration = 0
    let phaseElapsed = 0
    let offset = e
    let dips = 0
    for (const [name, dur] of [
      ["turn", bounds.turn],
      ["walk-out", bounds.walkOut],
      ["nibble", bounds.nibble],
      ["walk-home", bounds.walkHome],
    ] as const) {
      if (dur <= 0) continue
      if (offset < dur) {
        phase = name
        phaseDuration = dur
        phaseElapsed = offset
        if (name === "nibble") {
          const dipPeriod = dur / 2.5 // 2–3 gentle dip cycles
          dips = Math.floor(phaseElapsed / dipPeriod)
        }
        break
      }
      offset -= dur
    }
    return {
      phase,
      phaseElapsed,
      phaseDuration,
      dipOffset:
        phase === "nibble"
          ? Math.abs(Math.sin((Math.PI * phaseElapsed) / (phaseDuration / 2.5)))
          : 0,
      dips,
      done: false,
    }
  }

  return {
    start(now: number) {
      running = true
      startAt = now
    },
    cancel() {
      running = false
    },
    tick,
  }
}

// ---------------------------------------------------------------------------
// Diagonal-pair walk gait
// ---------------------------------------------------------------------------

/** Step-cycle angular speed: a full cycle (one step per diagonal pair) every
 * ~0.5 s — brisk enough to read as a walk at ceremony travel speeds. */
export const GAIT_CADENCE = (Math.PI * 2) / 0.5
/** Leg swing amplitude in radians around each hip pivot. */
export const GAIT_SWING = 0.35
/** Body bob amplitude (world units) — one bump per step pair. */
export const GAIT_BOB = 0.05
/** Weight-shift roll amplitude (radians on the body pivot). */
export const GAIT_ROLL = 0.03

/** One frame of the walk cycle, ready to map onto the creature rig. */
export interface GaitPose {
  /** Front-left / back-right swing (rotation.x on the hip pivots). */
  fl: number
  br: number
  /** Front-right / back-left swing — exactly counterphase to fl/br. */
  fr: number
  bl: number
  /** Body lift (0..GAIT_BOB·amp), one bump per step pair. */
  bob: number
  /** Weight shift left/right (rotation.z on the body pivot). */
  roll: number
}

/**
 * Sample the walk cycle at time `t`. `amp` (0..1) scales the whole pose so
 * callers can blend the gait in/out with a walk phase's easing — the scene
 * drives amp from the ceremony's walk phase progress. Reduced motion
 * flattens everything to zero.
 */
export function gaitPose(
  t: number,
  amp: number,
  reducedMotion: boolean,
): GaitPose {
  const zero: GaitPose = { fl: 0, br: 0, fr: 0, bl: 0, bob: 0, roll: 0 }
  if (reducedMotion || amp <= 0) return zero
  const phase = t * GAIT_CADENCE
  const swing = Math.sin(phase) * GAIT_SWING * amp
  return {
    fl: swing,
    br: swing,
    fr: -swing,
    bl: -swing,
    bob: Math.abs(Math.sin(phase)) * GAIT_BOB * amp,
    roll: Math.sin(phase) * GAIT_ROLL * amp,
  }
}
