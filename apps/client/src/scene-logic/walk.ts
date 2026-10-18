/**
 * Scene logic - walk primitives shared by the feeding ceremony, the
 * evolution garden walk, and the wander machine: stride speed, pivot-in-
 * place turning, the heading for a world direction, and one clamped step of
 * straight-line travel. Split out of scene-logic.ts (ranch_decomposition);
 * behavior unchanged.
 */
import { wrapPi } from "./math"

/** Constant stride speed in world units per second. */
const WALK_SPEED = 2.2

/** Pivot speed while turning in place (radians per second). */
const TURN_SPEED = 6

/** Yaw error above which the creature pivots before walking (radians).
 * Small enough that any residual angle while striding is invisible. */
const TURN_THRESHOLD = 0.12

/** The creature mesh faces +z at rest (confirmed live: with the
 * visual-center anchor in place the walk-out toward −x read tail-first), so
 * heading toward a world direction (dx, dz) is atan2(dx, dz) directly. */
export function heading(dx: number, dz: number): number {
  return Math.atan2(dx, dz)
}

/** One clamped step of straight-line travel, shared by the ceremony and
 * wander machines: pivot in place until facing the target within
 * TURN_THRESHOLD, then move at WALK_SPEED with yaw locked. Never
 * overshoots. The caller owns the returned yaw. */
export function strideStep(
  x: number,
  z: number,
  yaw: number,
  targetX: number,
  targetZ: number,
  step: number,
): { x: number; z: number; yaw: number; arrived: boolean; pivoting: boolean } {
  const dx = targetX - x
  const dz = targetZ - z
  const d = Math.hypot(dx, dz)
  const reach = WALK_SPEED * step
  if (d <= reach + 1e-4)
    return { x: targetX, z: targetZ, yaw, arrived: true, pivoting: false }
  const want = heading(dx, dz)
  const err = wrapPi(want - yaw)
  if (Math.abs(err) > TURN_THRESHOLD) {
    // Pivot first: rotate toward the heading without translating, so
    // the subsequent travel is a visibly straight line.
    const turn = Math.min(Math.abs(err), TURN_SPEED * step)
    return {
      x,
      z,
      yaw: yaw + Math.sign(err) * turn,
      arrived: false,
      pivoting: true,
    }
  }
  const k = reach / d
  return {
    x: x + dx * k,
    z: z + dz * k,
    yaw,
    arrived: false,
    pivoting: false,
  }
}
