/**
 * The controller's geometry: which way to step, circle, press, and lunge.
 *
 * Continuous Arena Battle FR-11 and FR-20. Every intent is built from the
 * arena's one integer unit vector (`shotDirection`), so a step is a comparison
 * and never a root. Extracted from ./controller when the dodge burst pushed
 * that module past the 12 KB cap; ./controller re-exports nothing from here,
 * because these are its private vocabulary.
 */

import type { ProjectileState } from "./projectile"
import { shotDirection } from "./projectile"
import {
  type ArenaBounds,
  DIR_SCALE,
  type Dir2,
  type FighterState,
  HOLD,
  type MoveIntent,
  type Vec3,
} from "./types"

/** Squared planar distance: every range test is a comparison, never a root. */
export function planarGapSq(a: Vec3, b: Vec3): number {
  const dx = b.x - a.x
  const dz = b.z - a.z
  return dx * dx + dz * dz
}

/** The unit direction to the foe: the arena's one integer unit vector. */
export function aimAt(me: FighterState, foe: FighterState): MoveIntent {
  return shotDirection(me.pos, foe.pos)
}

/** The unit direction away from the foe; bodies that share a centre hold. */
export function awayFrom(me: FighterState, foe: FighterState): Dir2 {
  const dir = shotDirection(me.pos, foe.pos)
  if (dir.x === 0 && dir.z === 0) return HOLD
  return { x: -dir.x, z: -dir.z }
}

/**
 * The side that puts the body behind the foe: the approach crossed with the
 * foe's facing. A foe looking straight down the line has no rear side to
 * prefer, so the fallback sign circles as before.
 */
function rearSign(dir: Dir2, facing: Dir2, fallback: 1 | -1): 1 | -1 {
  const cross = dir.x * facing.z - dir.z * facing.x
  if (cross === 0) return fallback
  return cross > 0 ? -1 : 1
}

/**
 * True when the body is deep in the foe's rear arc: the foe's facing, read
 * against the line back to this body, points at least 154 degrees away. The
 * margin covers the victim's turn during a basic strike's startup, so a
 * commit made from here still lands on the rear (Circle, FR-11).
 */
export function rearArc(me: FighterState, foe: FighterState): boolean {
  const dir = shotDirection(foe.pos, me.pos)
  const dot = dir.x * foe.facing.x + dir.z * foe.facing.z
  return dot < -900000
}

/**
 * The perpendicular of the approach: circling without closing. A doctrine
 * that seeks the rear arc circles toward the foe's back (Circle, FR-11).
 */
export function strafeIntent(
  me: FighterState,
  foe: FighterState,
  sign: 1 | -1,
  seeksRear = false,
): MoveIntent {
  const dir = shotDirection(me.pos, foe.pos)
  if (dir.x === 0 && dir.z === 0) return HOLD
  const around = seeksRear ? rearSign(dir, foe.facing, sign) : sign
  return { x: -dir.z * around, z: dir.x * around }
}

/** A half-speed step at the foe: plant and keep the facing on the target. */
export function pressIntent(me: FighterState, foe: FighterState): MoveIntent {
  const dir = shotDirection(me.pos, foe.pos)
  return { x: Math.trunc(dir.x / 2), z: Math.trunc(dir.z / 2) }
}

/**
 * How much open floor a body has behind it in `dir`, in mm: the distance it
 * could walk along that direction before a fence stopped it. A direction with
 * no component has no room to measure and reads zero. Each axis is scaled by
 * its share of the unit direction, so a diagonal reads the first fence it
 * would meet, and the arithmetic stays whole-numbered.
 */
export function retreatRoom(
  me: FighterState,
  dir: Dir2,
  bounds: ArenaBounds,
): number {
  const x = axisRoom(dir.x, me.pos.x - bounds.minX, bounds.maxX - me.pos.x)
  const z = axisRoom(dir.z, me.pos.z - bounds.minZ, bounds.maxZ - me.pos.z)
  if (x === null) return z ?? 0
  if (z === null) return x
  return Math.min(x, z)
}

/** Room along one axis, or null when the direction has no component there. */
function axisRoom(dir: number, behind: number, ahead: number): number | null {
  if (dir === 0) return null
  const room = dir > 0 ? ahead : behind
  return Math.trunc((room * DIR_SCALE) / Math.abs(dir))
}

/**
 * Step off the shot's line: one cadence of perpendicular burst, on the side
 * the body already leans toward. A shot with no direction has no line to
 * leave, so the fighter holds.
 */
export function dodgeIntent(
  shot: ProjectileState,
  me: FighterState,
  fallback: 1 | -1,
): MoveIntent {
  if (shot.dir.x === 0 && shot.dir.z === 0) return HOLD
  const dx = me.pos.x - shot.origin.x
  const dz = me.pos.z - shot.origin.z
  const cross = shot.dir.x * dz - shot.dir.z * dx
  let sign = fallback
  if (cross > 0) sign = 1
  else if (cross < 0) sign = -1
  return { dodge: { x: -shot.dir.z * sign, z: shot.dir.x * sign } }
}
