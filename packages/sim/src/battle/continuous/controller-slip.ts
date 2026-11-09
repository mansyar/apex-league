/**
 * The step-around cut (FR-11): a circling doctrine buys a short lateral burst
 * with stamina and its own cooldown, aimed at the foe's back. Keeping the
 * price and the window here keeps them out of the controller's decision body;
 * ./advance is what actually charges the cut and moves the body.
 */

import { strafeIntent } from "./controller-aim"
import { spendSlip } from "./stamina"
import type { FighterState, MoveIntent } from "./types"

/**
 * How long a cut runs, in ms (tunable, FR-11): 200 ms is ten fixed steps, long
 * enough to cross a committed window's startup and short enough that the cut
 * still costs a real decision.
 */
export const SLIP_MS = 200

/**
 * How long a fighter must wait after a cut before it can cut again, in ms
 * (tunable, FR-11): one decision, so a circling doctrine can chain cuts while
 * the foe is committed but cannot chain them faster than it can re-decide.
 */
export const SLIP_COOLDOWN_MS = 240

/** A cut order: the intent and the two clock marks the controller stores. */
export interface SlipOrder {
  readonly intent: MoveIntent
  readonly readyMs: number
  readonly untilMs: number
}

/**
 * The cut a rear-seeking profile can afford right now, or null. The caller
 * only stores the order; the stamina is spent again at the seam that moves.
 */
export function slipOrder(
  me: FighterState,
  foe: FighterState,
  seeksRear: boolean,
  nowMs: number,
  readyMs: number,
): SlipOrder | null {
  if (!seeksRear || nowMs < readyMs || spendSlip(me) === null) return null
  const dir = strafeIntent(me, foe, 1, true)
  const slip = "x" in dir ? { x: dir.x, z: dir.z } : { x: 0, z: 0 }
  return {
    intent: { slip },
    readyMs: nowMs + SLIP_COOLDOWN_MS,
    untilMs: nowMs + SLIP_MS,
  }
}
