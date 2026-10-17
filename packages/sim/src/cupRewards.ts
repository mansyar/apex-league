/**
 * Cup rewards (spec FR5): winning pays — the approved full bundle is a
 * next-day AP budget bump (+1, 3 → 4), bond +10, mood +15, and a permanent
 * `cupsWon` counter for the banner case. Early exit pays a +2 mood
 * consolation ("the crowd respects the effort") so a loss is warm, never
 * punitive — death-free stakes. No currency, no stat gains.
 *
 * Pure: returns a new GameState plus the reward bookkeeping; the input is
 * never mutated. The caller (the machine or the client) owns where the
 * next-day AP budget and the cupsWon counter are persisted.
 */

import { clampCondition } from "./settlement"
import type { GameState } from "./state"

/** The approved win bundle (2026-10-11 decision). */
export const CUP_REWARDS = Object.freeze({
  bond: 10,
  mood: 15,
  consolations: Object.freeze({ mood: 2 }),
})

/** Extra AP budget the day after a cup win. The bonus itself is defined in
 * ticker.ts (CUP_WIN_AP_BONUS) so the grant sits next to the budget math. */

/** The resolved cup outcome. The machine (machine.ts) collapses the cup
 * result's numeric placement into this — the reward layer never sees raw
 * placements. */
export type CupOutcome = "won" | "lost"

/**
 * Apply the cup outcome's rewards to the state. Pure: the input state is
 * untouched; the returned state carries the new mood/bond, the drummed-up
 * `cupsWon` counter, and `lastCupDay` bookkeeping (the machine stamps the
 * current day on a win so the next `advanceDay` starts with the bonus AP).
 * Throws when the state has no creature (rewards need somewhere to land).
 */
export function applyCupRewards(
  state: GameState,
  outcome: CupOutcome,
  cupDay: number,
): GameState {
  const creature = state.creature
  if (!creature) throw new Error("Cup rewards need a creature to reward")
  if (outcome !== "won" && outcome !== "lost") {
    throw new Error(`Unknown cup outcome: ${String(outcome)}`)
  }
  const won = outcome === "won"
  // The lifetime counter lives on GameState (save v5) and accumulates here.
  const prevWins = state.cupsWon
  const conditions = creature.conditions
  const nextConditions = won
    ? {
        ...conditions,
        bond: clampCondition(conditions.bond + CUP_REWARDS.bond),
        mood: clampCondition(conditions.mood + CUP_REWARDS.mood),
      }
    : {
        ...conditions,
        mood: clampCondition(conditions.mood + CUP_REWARDS.consolations.mood),
      }
  return {
    ...state,
    creature: { ...creature, conditions: nextConditions },
    cupsWon: won ? prevWins + 1 : prevWins,
    // The Legend plateau keeps score (gold_legend_ladder_20261017): every
    // cup won AT the legend tier is a collected title. The machine orders
    // placement before rewards, so the gate-cup champion that flips into
    // Legend is crowned here too — the gate cup is the first title.
    legendTitles:
      won && state.ladder.tier === "legend"
        ? state.legendTitles + 1
        : state.legendTitles,
    // Stamp the cup day only on a win — the ticker reads "today was a won
    // cup" from lastCupDay === day to grant tomorrow's bonus AP (stacked
    // with the tier's extra, TIER_AP_BONUS).
    lastCupDay: won ? cupDay : state.lastCupDay,
  }
}
