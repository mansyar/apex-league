/**
 * Continuous movement: an intent becomes velocity, and velocity becomes
 * displacement.
 *
 * Continuous Arena Battle FR-3. Every value is an integer in the units
 * ./types documents, so a step is reproducible arithmetic: no trigonometry,
 * no clock, no random source. Acceleration and deceleration are per-step
 * rates, which is what makes them frame-rate independent — the same intent
 * sequence always walks the same path.
 */

import {
  type ArenaBounds,
  DIR_SCALE,
  type Dir2,
  type FighterState,
  type MoveIntent,
  STEP_MS,
  type Vec3,
} from "./types"

/** Velocity units per millimetre per millisecond: 1000 units = 1 mm/ms. */
export const VEL_UNITS_PER_MM_PER_MS = 1000

/**
 * Top speed for a fighter with `spd`, in thousandths of a mm/ms (tunable):
 * a base every fighter gets, plus a gain per point of `spd`. Balance is a
 * later track, so the numbers are plausible rather than tuned.
 */
export const SPEED_BASE_MILLI_MM_PER_MS = 100
export const SPEED_GAIN_MILLI_MM_PER_MS = 90

/** Velocity a fighter adds toward its intent each step (tunable). */
export const ACCEL_MILLI_MM_PER_MS_PER_STEP = 400

/** Velocity a fighter sheds when the intent slows or reverses (tunable). */
export const DECEL_MILLI_MM_PER_MS_PER_STEP = 600

/** The diagonal length in thousandths: √2/2, so diagonals are not faster. */
const DIAGONAL = 707

/** Top speed in thousandths of a mm/ms for a speed stat. */
export function topSpeed(spd: number): number {
  return SPEED_BASE_MILLI_MM_PER_MS + SPEED_GAIN_MILLI_MM_PER_MS * spd
}

/** Integer division rounding halves away from zero, so mirrored paths match. */
function divRound(value: number, divisor: number): number {
  return value < 0 ? -Math.round(-value / divisor) : Math.round(value / divisor)
}

/** The velocity an intent asks for once fully ramped up, per axis. */
export function targetVelocity(spd: number, intent: MoveIntent): Dir2 {
  const top = topSpeed(spd)
  return {
    x: divRound(top * intent.x, DIR_SCALE),
    z: divRound(top * intent.z, DIR_SCALE),
  }
}

/**
 * Move one velocity axis toward its target: at the accel rate while the
 * fighter is adding speed along that axis, at the decel rate while it is
 * shedding or reversing. Rates are per step, never scaled by a clock.
 */
function approach(current: number, target: number): number {
  if (current === target) return target
  const sameWay = current === 0 || Math.sign(current) === Math.sign(target)
  const adding = sameWay && Math.abs(target) > Math.abs(current)
  const rate = adding
    ? ACCEL_MILLI_MM_PER_MS_PER_STEP
    : DECEL_MILLI_MM_PER_MS_PER_STEP
  return current < target
    ? Math.min(target, current + rate)
    : Math.max(target, current - rate)
}

/** One step of acceleration toward the intent. */
export function accelerate(vel: Vec3, spd: number, intent: MoveIntent): Vec3 {
  const target = targetVelocity(spd, intent)
  return {
    x: approach(vel.x, target.x),
    y: 0,
    z: approach(vel.z, target.z),
  }
}

/** Whole millimetres one step of a velocity covers. */
function perStep(units: number): number {
  return divRound(units * STEP_MS, VEL_UNITS_PER_MM_PER_MS)
}

/**
 * Move a position by one step of velocity, then keep it inside the fence.
 * A clamped axis has its velocity zeroed in the same step, so the fighter
 * rests against the wall instead of buzzing at it.
 */
export function integrate(
  pos: Vec3,
  vel: Vec3,
  bounds: ArenaBounds,
): { pos: Vec3; vel: Vec3 } {
  let x = pos.x + perStep(vel.x)
  let z = pos.z + perStep(vel.z)
  let vx = vel.x
  let vz = vel.z
  if (x < bounds.minX) {
    x = bounds.minX
    vx = 0
  } else if (x > bounds.maxX) {
    x = bounds.maxX
    vx = 0
  }
  if (z < bounds.minZ) {
    z = bounds.minZ
    vz = 0
  } else if (z > bounds.maxZ) {
    z = bounds.maxZ
    vz = 0
  }
  return { pos: { x, y: 0, z }, vel: { x: vx, y: 0, z: vz } }
}

/** -1, 0, or 1 for a signed number. */
function sign(value: number): number {
  if (value === 0) return 0
  return value > 0 ? 1 : -1
}

/**
 * The 8-way direction nearest an intent, for facing. A zero intent keeps
 * the old facing; a near-diagonal snaps to the diagonal length so every
 * facing vector has a comparable magnitude.
 */
export function facingFor(intent: MoveIntent, previous: Dir2): Dir2 {
  const ax = Math.abs(intent.x)
  const az = Math.abs(intent.z)
  if (ax === 0 && az === 0) return previous
  const sx = sign(intent.x)
  const sz = sign(intent.z)
  const nearDiagonal = Math.min(ax, az) * 2 >= Math.max(ax, az)
  if (ax > 0 && az > 0 && nearDiagonal) {
    return { x: sx * DIAGONAL, z: sz * DIAGONAL }
  }
  return ax >= az ? { x: sx * DIR_SCALE, z: 0 } : { x: 0, z: sz * DIR_SCALE }
}

/** One fighter's whole step: accelerate toward the intent, move, turn. */
export function moveFighter(
  fighter: FighterState,
  intent: MoveIntent,
  bounds: ArenaBounds,
): FighterState {
  const moved = integrate(
    fighter.pos,
    accelerate(fighter.vel, fighter.spd, intent),
    bounds,
  )
  return {
    key: fighter.key,
    pos: moved.pos,
    vel: moved.vel,
    facing: facingFor(intent, fighter.facing),
    spd: fighter.spd,
  }
}
