import type * as THREE from "three"
import type { DriveFighter } from "../fighter-driver"
import type { MoveFx } from "../move-fx"
import type { StepIO } from "./context"

/**
 * Per-action flame-trail cursor: the highest twelfth of the transit that
 * has already shed its puff. Bucketed off the action clock (never the
 * wall clock or RNG), so the same tick always sheds the same trail.
 */
export interface TransitTrailState {
  bucket: number
}

/**
 * Row-driven attacker transit (Phase 5 fix, P5.F1/P5.F2): the body
 * lunges toward the foe and rides the same sine back home. Offset-only
 * — the prelude zeroes offsets every step and the sine returns to 0 at
 * t = 1, so later steps are unaffected. The stride is a fraction of the
 * live gap (far-range safe), paced by the action clock, deterministic
 * (no clock or RNG), and dampened under reduced motion exactly like the
 * impulse. A row-authored charge wreath keeps swelling at the mouth
 * line while the body crosses, then clears on the return.
 *
 * Flame trail (Phase 7): when the row carries one, element puffs shed
 * along the crossing — one spawn per twelfth of the transit. Reduced
 * motion needs no handling here: spawnBurst already no-ops under the
 * reduced pref.
 *
 * Lives here (not in steps/fire.ts) so the step pipeline stays under
 * the client module size cap.
 */
export function applyTransit(
  transit: NonNullable<MoveFx["transit"]>,
  charge: MoveFx["charge"],
  t: number,
  release: number,
  ao: DriveFighter,
  targetPos: THREE.Vector3,
  away: number,
  io: StepIO,
  element: string | undefined,
  trail: TransitTrailState,
  chargeRef: { done: boolean },
): void {
  if (t < release) return
  const transitSpan = Math.max(1 - release, 0.0001)
  const u = Math.min(1, (t - release) / transitSpan)
  const curve = Math.sin(u * Math.PI)
  const dx = targetPos.x - ao.group.position.x
  const dz = targetPos.z - ao.group.position.z
  const dist = Math.hypot(dx, dz)
  let nx = -away
  let nz = 0
  if (dist > 1e-6) {
    nx = dx / dist
    nz = dz / dist
  }
  const damp = io.reduced() ? 0.4 : 1
  ao.offset.x += nx * dist * transit.reach * curve * damp
  ao.offset.z += nz * dist * transit.reach * curve * damp
  const lift = transit.lift ?? 0
  if (lift !== 0) ao.offset.y += lift * curve * damp
  if (transit.trail !== undefined) {
    const bucket = Math.floor(u * 12)
    if (bucket > trail.bucket) {
      trail.bucket = bucket
      io.effects.spawnBurst(ao.group.position, element, transit.trail)
    }
  }
  if (charge !== undefined && u < 1) {
    io.effects.setCharge(ao, element, charge.to)
  }
  if (charge !== undefined && u >= 1 && !chargeRef.done) {
    chargeRef.done = true
    io.effects.clearCharge()
  }
}
