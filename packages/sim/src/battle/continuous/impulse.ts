/**
 * Hit reactions: a landed blow moves the victim and costs it a moment.
 *
 * Continuous Arena Battle FR-22 and FR-23. Contact geometry gives a blow a
 * place to land; this module gives it force. A hit adds velocity along the
 * blow's direction, scaled by the move's poise damage and resisted by the
 * victim's mass — mass comes from body volume, so the same blow throws a light
 * body further than a heavy one. The same blow opens hitstun: the victim's
 * intent is ignored and its velocity decays for a short window, and a blow
 * that breaks poise suspends it for longer. Neither effect ever stacks: the
 * longer of the window already running and the new one wins.
 *
 * Everything is integer — whole mass units, thousandths of a mm/ms, whole ms —
 * and the decay is a fixed fraction per step, so a replay is exact. No clock,
 * no random source, no floats.
 */

import { BLOW_WEIGHT, BODY_RADIUS_MM } from "../frames"
import { DEFAULT_BODY_HEIGHT_MM, divRound, shotDirection } from "./contact"
import {
  DIR_SCALE,
  type Dir2,
  type FighterState,
  STEP_MS,
  type Vec3,
} from "./types"

/**
 * The divisor that turns `radius² × height` (mm³) into whole mass units
 * (tunable). A body's volume is that product times π; the constant is dropped
 * because only ratios of mass matter, and every body shares one shape.
 */
export const MASS_VOLUME_DIVISOR = 1000

/**
 * The mass a knockback is quoted against (tunable): the default body, so a
 * blow on an average fighter reads as its authored poise damage. A heavier
 * body divides the push down, a lighter one scales it up.
 */
export const KNOCKBACK_REFERENCE_MASS = Math.floor(
  (BODY_RADIUS_MM * BODY_RADIUS_MM * DEFAULT_BODY_HEIGHT_MM) /
    MASS_VOLUME_DIVISOR,
)

/**
 * Velocity added per point of poise damage at reference mass (tunable), in
 * thousandths of a mm/ms. A basic blow gives an average body about 2 m/s of
 * knockback before decay, which slides it a few tens of mm; a light body takes
 * low hundreds, a heavy one less still.
 *
 * Divided by `BLOW_WEIGHT` because the weight triples every move's poise
 * damage: the shove is already tuned, so only the damage gets heavier and a
 * blow still displaces what it did before the weight (Phase 6).
 */
export const KNOCKBACK_PER_POISE = Math.trunc(1000 / BLOW_WEIGHT)

/**
 * Fraction of a stunned body's velocity kept per step (tunable): a half. The
 * slide is therefore bounded by twice the impulse, however hard the blow, and
 * the last mm is shed well inside the hitstun window.
 */
export const KNOCKBACK_DECAY_NUM = 1
export const KNOCKBACK_DECAY_DEN = 2

/**
 * How long a landed blow suspends the victim, in ms (tunable). Long enough to
 * cost a step of footwork, short enough to answer back in the same exchange.
 */
export const HITSTUN_MS = 100

/**
 * How long a poise break suspends the victim, in ms (tunable). A break already
 * owns the attack cancellation (FR-9); this is the body's helplessness on top
 * of it, several times a plain hit so a break reads as a real opening.
 */
export const BREAK_HITSTUN_MS = 400

/** The hitstun fields one fighter carries; see `FighterState` in ./types. */
export interface HitstunFields {
  /** Hitstun still to serve, in ms; 0 when the fighter is free to act. */
  readonly hitstunMs: number
}

/** A fighter that has just been hit, or has never been hit. */
export function openingHitstun(): HitstunFields {
  return { hitstunMs: 0 }
}

/** True while a blow still has the fighter's body: no intent, no commits. */
export function isStunned(fighter: FighterState): boolean {
  return fighter.hitstunMs > 0
}

/**
 * A body's mass in whole volume units, floored so it always divides. Derived
 * from the body it already carries rather than a species column (FR-22): the
 * roster's radii and heights spread mass over roughly a factor of four.
 */
export function massOf(radiusMm: number, heightMm: number): number {
  return Math.max(
    1,
    Math.floor((radiusMm * radiusMm * heightMm) / MASS_VOLUME_DIVISOR),
  )
}

/**
 * The velocity one blow adds, along `dir`, for a poise damage and a mass. The
 * push is linear in the damage and inverse in the mass, and a directionless
 * blow (two centres on one point) adds nothing.
 */
export function knockbackVelocity(
  dir: Dir2,
  poiseDamage: number,
  mass: number,
): Dir2 {
  if (poiseDamage <= 0) return { x: 0, z: 0 }
  const speed = divRound(
    poiseDamage * KNOCKBACK_PER_POISE * KNOCKBACK_REFERENCE_MASS,
    mass,
  )
  return {
    x: divRound(speed * dir.x, DIR_SCALE),
    z: divRound(speed * dir.z, DIR_SCALE),
  }
}

/** The line a melee blow pushes along: attacker centre to victim centre. */
export function blowDirection(from: Vec3, to: Vec3): Dir2 {
  return shotDirection(from, to)
}

/**
 * Take one landed blow (FR-22, FR-23): add its knockback along `dir` and open
 * or extend hitstun. Hitstun never stacks — `max` of what is left and the new
 * window — so a cornered fighter cannot be locked down by a flurry. A break is
 * the longer window.
 */
export function reactToBlow(
  fighter: FighterState,
  dir: Dir2,
  poiseDamage: number,
  broke: boolean,
): FighterState {
  const push = knockbackVelocity(
    dir,
    poiseDamage,
    massOf(fighter.radiusMm, fighter.heightMm),
  )
  const duration = broke ? BREAK_HITSTUN_MS : HITSTUN_MS
  return {
    ...fighter,
    vel: {
      x: fighter.vel.x + push.x,
      y: 0,
      z: fighter.vel.z + push.z,
    },
    hitstunMs: Math.max(fighter.hitstunMs, duration),
  }
}

/**
 * One step of knockback decay: a fixed fraction of the velocity, truncated
 * toward zero. Truncating (rather than rounding) is what guarantees the slide
 * ends instead of leaving a body crawling at one unit forever.
 */
export function decayVelocity(vel: Vec3): Vec3 {
  return {
    x: Math.trunc((vel.x * KNOCKBACK_DECAY_NUM) / KNOCKBACK_DECAY_DEN),
    y: 0,
    z: Math.trunc((vel.z * KNOCKBACK_DECAY_NUM) / KNOCKBACK_DECAY_DEN),
  }
}

/** A hitstun timer one fixed step closer to zero. */
export function advanceHitstun(fighter: FighterState): FighterState {
  if (fighter.hitstunMs <= 0) return fighter
  return { ...fighter, hitstunMs: Math.max(0, fighter.hitstunMs - STEP_MS) }
}
