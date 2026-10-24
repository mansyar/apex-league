import { easeOut, easeOutCubic } from "../anim"
import type { DriveFighter } from "../fighter-driver"
import type { Posture } from "../move-fx"

/**
 * Pure step geometry and timing extracted from the staging choreography.
 * No renderer, no clock, no scene graph — each function takes plain
 * numbers (or a structural fighter slice) and returns the pose/target
 * the step handlers apply. Unit-tested in pure.test.ts.
 */

/** Resting gap between fighters (the size of a neutral stance). */
export const STANCE_GAP = 2.1

/** Contact distance an attack pushes into (bodies nearly touch). */
export const CONTACT_GAP = 1.8

/** Lateral weave amplitude: alternate attack sides per tick parity. */
export const WEAVE_AMP = 0.55
/** How far the melee line tilts toward the weave lane. */
export const WEAVE_TILT = 0.12
/** Minimum closing distance a strike keeps from the target's center. */
export const MIN_CLOSE = 0.45
/** Lateral dodge z-shift per dodge direction. */
export const DODGE_Z = 0.45

/**
 * Which combatant is the acting side of a step. Match on the stable key
 * when present: in a mirror match both fighters answer to the same
 * display name, so name matching maps every step onto the same (wrong)
 * combatant.
 */
export function spotOf<F extends { key?: string; name: string }>(
  actor: string,
  o: F,
  r: F,
): { actor: F; target: F } {
  const keyOf = (c: F): string => c.key ?? c.name
  if (actor === "" || (keyOf(o) !== actor && keyOf(r) === actor)) {
    return { actor: r, target: o }
  }
  return { actor: o, target: r }
}

/** Knockback distance for a landed hit, scaled by how hard it landed. */
export function strikeReach(damage: number | undefined): number {
  const d = damage ?? 0
  return Math.min(0.9, Math.max(0.25, d / 8))
}

/** True when a landing blow carries a heavy reaction (the victim reels). */
export function heavyHit(step: { reaction?: string }): boolean {
  return step.reaction === "stagger" || step.reaction === "knockback"
}

/** Lateral weave: alternate attack sides so no two hits share a lane. */
export function weave(step: { tick: number }): number {
  return (step.tick % 2 === 0 ? 1 : -1) * WEAVE_AMP
}

/** The approach step's stage target: a strike-range stance on the
 * target's flank — closes the lane and sets up the weave for the attack
 * that follows. */
export function approachTarget(
  target: { x: number; z: number },
  away: 1 | -1,
  weaveK: number,
): { x: number; z: number } {
  return { x: target.x + away * STANCE_GAP, z: target.z + weaveK }
}

/**
 * The melee strike geometry: the unit direction along the approach line
 * (tilted by the weave so lanes alternate) and the contact point —
 * stopped just short of a body overlap, never closer than MIN_CLOSE.
 */
export function meleeContact(
  from: { x: number; z: number },
  to: { x: number; z: number },
  weaveK: number,
): { dirX: number; dirZ: number; x: number; z: number } {
  const dx = to.x - from.x
  const dz = to.z - from.z
  const dist = Math.hypot(dx, dz)
  let nx = dist === 0 ? 0 : dx / dist
  let nz = dist === 0 ? 0 : dz / dist
  nx += weaveK * WEAVE_TILT
  const len = Math.hypot(nx, nz) || 1
  nx /= len
  nz /= len
  const reach = Math.max(MIN_CLOSE, dist - CONTACT_GAP)
  return { dirX: nx, dirZ: nz, x: from.x + nx * reach, z: from.z + nz * reach }
}

/** A real evasion: dash off the lane in the contract's dodge direction. */
export function dodgeShift(
  away: 1 | -1,
  dash: number,
  dodgeDirection?: string,
): { dx: number; dz: number } {
  return {
    dx: away * dash,
    dz: dodgeDirection === "left" ? DODGE_Z : -DODGE_Z,
  }
}

/**
 * FR8 signature KO collapse: the legs give in stages. The first 35% is
 * a stagger wind-up pitching the body back; the rest is the collapse
 * easing to the floor, thudding once past 30% of the way down.
 */
export function koFall(t: number): {
  pitch: number
  fall: number
  thud: boolean
} {
  if (t < 0.35) {
    const w = t / 0.35
    return { pitch: -0.32 * Math.sin(w * Math.PI * 0.5), fall: 0, thud: false }
  }
  const u = Math.min(1, Math.max(0, (t - 0.35) / 0.65))
  return {
    pitch: -0.32 * (1 - u * 0.4),
    fall: easeOut(u),
    thud: u > 0.3,
  }
}

/** The non-KO down beat: a plain ease to the floor over the reaction's
 * reel, with the landing thud past the mid-beat. */
export function softFall(
  t: number,
  reel: number,
): { fall: number; thud: boolean } {
  return {
    fall: easeOut(Math.min(1, Math.max(0, t / reel))),
    thud: t > 0.55,
  }
}

/** The reel beat: pitch back along a quarter-sine ramp, roll wobbling
 * on a 3 Hz sine — the victim is off-balance after a heavy blow. */
export function reelWobble(
  t: number,
  reel: number,
  reelPitch: number,
): { pitch: number; roll: number } {
  const w = Math.sin((Math.min(1, Math.max(0, t / reel)) * Math.PI) / 2)
  return {
    pitch: -reelPitch * w,
    roll: reelPitch * 0.4 * Math.sin(t * Math.PI * 3),
  }
}

/** One victory-hop frame for the judge stamp: |sin| lift at 0.35, the
 * rising half, and the within-hop local time (each hop is 0.5 of t). */
export function judgeHop(t: number): {
  lift: number
  rising: boolean
  localT: number
} {
  const w = t * Math.PI * 2
  return {
    lift: Math.abs(Math.sin(w)) * 0.35,
    rising: Math.sin(w) > 0,
    localT: (t * 2) % 1,
  }
}

/** The basic strike's coil-back depth (world units) before the commit. */
export const STRIKE_COIL = 0.22
/** The vertical drop while the strike coils and commits. */
export const STRIKE_DROP = 0.05
/** The vertical lift as the strike lands. */
export const STRIKE_LIFT = 0.06
/** The forward lean at the height of the commit. */
export const STRIKE_LEAN = 0.1
/** The lateral roll at the height of the commit. */
export const STRIKE_ROLL = 0.05

/** The squash impulse while the strike commits (a stretch). */
export const STRIKE_COMMIT = 0.28
/** The squash impulse as the attacker settles out of the strike. */
export const STRIKE_SETTLE = 0.12

/** Which beat of the basic strike a frame belongs to. */
export type StrikeBeat = "windup" | "contact" | "recovery"

/**
 * One frame of the basic strike's body, in the attacker's own frame: how
 * far along the attack line it sits, how high it rides, how it leans, and
 * the squash impulse the beat owns. A missing field means the beat does
 * not own that channel (the windup leaves the lean alone, the recovery
 * keeps the height it landed on).
 */
export interface StrikePose {
  /** Distance along the attack line; negative while the body coils back. */
  readonly along: number
  /** Vertical offset of the body. */
  readonly y?: number
  /** Forward lean. */
  readonly pitch?: number
  /** Lateral roll. */
  readonly roll?: number
  /** Squash impulse for this frame; absent when the beat owns none. */
  readonly impulse?: number
}

/**
 * The basic strike's body, weighted by the archetype's `strikeMult`.
 *
 * The multiplier scales the amplitudes - the coil depth, the drop, the
 * lift, the leans, the impulses - so a heavy body commits deeper and a
 * light one snaps. The arrival point never moves: the lunge still ends
 * exactly on the contact point, because the distance between the
 * fighters belongs to the sim, not to the choreography. Timing is
 * untouched as well; only the amplitudes move.
 */
export function strikePose(
  beat: StrikeBeat,
  w: number,
  reach: number,
  strike: number,
  hit = true,
): StrikePose {
  const coil = STRIKE_COIL * strike
  if (beat === "windup") {
    const s = Math.sin(w * Math.PI)
    return {
      along: -coil * s,
      y: -STRIKE_DROP * strike * s,
      roll: STRIKE_ROLL * strike * s,
    }
  }
  if (beat === "contact") {
    const e = easeOutCubic(w)
    return {
      // The fixed arrival path plus the scaled coil: the body always
      // lands on the contact point, no matter how deep it coiled.
      along: reach * e - coil * (1 - e),
      y: (-STRIKE_DROP * (1 - w) + STRIKE_LIFT * w) * strike,
      pitch: STRIKE_LEAN * strike * Math.sin(w * Math.PI),
      roll: -STRIKE_ROLL * strike * (1 - w),
      // Stretch while committing, once the body is past the windup.
      impulse: w > 0.3 ? -STRIKE_COMMIT * strike : undefined,
    }
  }
  const e = easeOut(w)
  return {
    along: reach * (1 - e),
    pitch: STRIKE_LEAN * strike * (1 - e),
    roll: -STRIKE_ROLL * strike * (1 - e),
    // The attacker settles heavy, but only after the hit has landed.
    impulse: hit && w > 0.6 ? STRIKE_SETTLE * strike : undefined,
  }
}

/**
 * Apply a posture phase to a fighter at normalized progress w.
 *
 * The archetype's attack character weights the amplitudes: the windup
 * fields (pitch, roll, rise, coilX) scale by the profile's `windupMult`,
 * the recoil fields (pitchOut, sweepX, riseOut) by `recoilMult`. The
 * phase fractions - the half and full sines - are never touched: a
 * profile changes how far the body travels, never when.
 */
export function applyPosture(
  p: Posture,
  w: number,
  ao: DriveFighter,
  away: number,
): void {
  const half = Math.sin((w * Math.PI) / 2)
  const full = Math.sin(w * Math.PI)
  const wind = ao.profile.windupMult
  const recoil = ao.profile.recoilMult
  if (p.pitch !== undefined) {
    ao.lean.pitch = p.pitch * (p.hold ? half : full) * wind
  }
  if (p.roll !== undefined) ao.lean.roll = p.roll * full * wind
  if (p.rise !== undefined) ao.offset.y = p.rise * full * wind
  if (p.coilX !== undefined) ao.offset.x = -away * p.coilX * (w * w) * wind
  if (p.pitchOut !== undefined) ao.lean.pitch = p.pitchOut * full * recoil
  if (p.sweepX !== undefined) {
    ao.offset.x = -away * (p.sweepX[0] + p.sweepX[1] * full) * recoil
  }
  if (p.riseOut !== undefined) ao.offset.y = p.riseOut * full * recoil
}
