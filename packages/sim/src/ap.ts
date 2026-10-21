/**
 * Action points — spend from the current day's budget, plus the pure
 * budget primitives the day ticker and the graduation seams share.
 * Pure data and pure functions only — no DOM, no rendering, no I/O.
 */

import type { GameState } from "./state"

/**
 * The Champion Stable head-start window (affinity_drift prestige perks,
 * spec FR-5): the hatchling's first five in-game days of life.
 */
export const HEAD_START_DAYS = 5

/** Extra max AP per day inside the head-start window (Champion Stable). */
export const HEAD_START_AP_BONUS = 1

/**
 * The head-start AP budget bonus for a given day, or 0 outside the window
 * or without the perk. Pure and fully derived from its arguments — the
 * caller passes the hatchling's hatch day, the day being budgeted, and the
 * champion-stable flag — so every read (the day ticker's budget, the
 * graduation reset, a match-prep read on a cup day) resolves the same way
 * and the bonus auto-expires with no extra save state.
 *
 * Life day 1 is the hatch day itself; day 6 of life is the first normal
 * day. A hatch day later than the budgeted day (corrupt data) clamps to
 * life day 1 rather than producing a negative window.
 */
export function headStartAp(
  hatchDay: number,
  day: number,
  championStable: boolean,
): number {
  if (!championStable) return 0
  const lifeDay = Math.max(1, day - hatchDay + 1)
  return lifeDay <= HEAD_START_DAYS ? HEAD_START_AP_BONUS : 0
}

/**
 * Spend action points from the current day's budget.
 * Pure: returns a new state; the input is never mutated.
 */
export function spendActionPoints(
  state: GameState,
  amount: number,
): { state: GameState; ok: boolean } {
  if (amount < 0 || amount > state.actionPoints) {
    return { state, ok: false }
  }
  return {
    state: { ...state, actionPoints: state.actionPoints - amount },
    ok: true,
  }
}
