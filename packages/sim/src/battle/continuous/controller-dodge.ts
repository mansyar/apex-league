/**
 * The reactive dodge (FR-20): a blow about to land is the one thing worth
 * interrupting for. A swing still winding up is stepped away from; a shot
 * nearly home on this body's line is stepped across. The gate is the same
 * `spendDodge` price the seam charges, so the two cannot drift.
 */

import { awayFrom, dodgeIntent } from "./controller-aim"
import type { ControllerProfile } from "./controller-profile"
import { DODGE_LEAD_MS, incomingShot, incomingSwing } from "./controller-threat"
import { spendDodge } from "./stamina"
import type { FighterState, FightState, MoveIntent } from "./types"
/**
 * How long a fighter must wait after a burst before it can lunge again, in ms
 * (tunable, FR-20): long enough that a dodge is a commitment, not a stutter.
 */
export const DODGE_COOLDOWN_MS = 700

/**
 * How far past its own width a body must clear an incoming line before it
 * stops dodging, in mm (tunable, FR-20): the margin over `radiusMm` that makes
 * a cleared shot a miss rather than a graze.
 */
export const DODGE_MARGIN_MM = 40

/** A dodge order: the intent and the clock mark the controller stores. */
export interface DodgeOrder {
  readonly intent: MoveIntent
  readonly readyMs: number
}

/** The dodge this side can afford right now, or null. */
export function dodgeOrder(
  state: FightState,
  side: 0 | 1,
  me: FighterState,
  profile: ControllerProfile,
  readyMs: number,
): DodgeOrder | null {
  if (state.elapsedMs < readyMs || spendDodge(me) === null) return null
  const ready = state.elapsedMs + DODGE_COOLDOWN_MS
  const swing = incomingSwing(state, side)
  const away = swing ? awayFrom(me, swing) : { x: 0, z: 0 }
  if (away.x !== 0 || away.z !== 0) {
    return { intent: { dodge: away }, readyMs: ready }
  }
  const shot = incomingShot(
    state,
    side,
    profile.dodgeThresholdMm,
    me.radiusMm + DODGE_MARGIN_MM,
    DODGE_LEAD_MS,
  )
  if (!shot) return null
  return { intent: dodgeIntent(shot, me, side === 0 ? 1 : -1), readyMs: ready }
}
