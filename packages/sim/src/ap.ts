import type { GameState } from "./state"

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
