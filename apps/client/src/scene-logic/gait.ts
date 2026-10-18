/**
 * Scene logic - the diagonal-pair walk gait: leg swing, body bob, and
 * weight-shift roll. Split out of scene-logic.ts (ranch_decomposition);
 * behavior unchanged.
 */
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
