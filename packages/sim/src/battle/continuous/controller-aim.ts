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

/** The perpendicular of the approach: circling without closing. */
export function strafeIntent(
  me: FighterState,
  foe: FighterState,
  sign: 1 | -1,
): MoveIntent {
  const dir = shotDirection(me.pos, foe.pos)
  if (dir.x === 0 && dir.z === 0) return HOLD
  return { x: -dir.z * sign, z: dir.x * sign }
}

/** A half-speed step at the foe: plant and keep the facing on the target. */
export function pressIntent(me: FighterState, foe: FighterState): MoveIntent {
  const dir = shotDirection(me.pos, foe.pos)
  return { x: Math.trunc(dir.x / 2), z: Math.trunc(dir.z / 2) }
}

/**
 * Whether a body can put two of its own widths between itself and where it
 * stands in `dir` without crossing a fence: the room a retreat needs. A body
 * with its back to the wall has none, so it stands and fights (FR-21).
 */
export function hasRoomToBackOff(
  me: FighterState,
  dir: Dir2,
  bounds: ArenaBounds,
): boolean {
  const margin = me.radiusMm * 2
  const x = me.pos.x + Math.trunc((dir.x * margin) / 1000)
  const z = me.pos.z + Math.trunc((dir.z * margin) / 1000)
  return (
    x >= bounds.minX && x <= bounds.maxX && z >= bounds.minZ && z <= bounds.maxZ
  )
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
