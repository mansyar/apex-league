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

import type { GameState } from "./state"

const CONDITION_TOP = 100

function clampCondition(value: number): number {
  return Math.min(CONDITION_TOP, Math.max(0, value))
}

/** The approved win bundle (2026-10-11 decision). */
export const CUP_REWARDS = Object.freeze({
  bond: 10,
  mood: 15,
  consolations: Object.freeze({ mood: 2 }),
})

/** Extra AP budget the day after a cup win (3 → 4). */
export const CUP_BONUS_AP = 1

export type CupOutcome = "won" | "lost" | 1 | 2 | 3 | 4

/** Map a placement (or a pre-resolved won/lost) to the outcome. */
function toOutcome(outcome: CupOutcome): "won" | "lost" {
  if (outcome === "won" || outcome === 1) return "won"
  return "lost"
}

/**
 * Apply the cup outcome's rewards to the state's creature and report the
 * bookkeeping the caller must persist. Pure: the input state is untouched.
 * Throws when the state has no creature (rewards need somewhere to land).
 * The cupsWon bonus flows in via `state.cupPrevWins` when present so the
 * accumulator stays in one place; GameState grows that optional field in
 * the save v5 step of this track.
 */
export function applyCupRewards(
  state: GameState,
  outcome: CupOutcome,
): {
  state: GameState
  /** AP budget for the day after the cup (4 on a win, else the standard). */
  nextDayApBudget: number
  /** Total cups won after this cup (already including it). */
  cupsWon: number
} {
  const creature = state.creature
  if (!creature) throw new Error("Cup rewards need a creature to reward")
  // Boolean from the mapped outcome (the string "lost" is truthy!).
  const won = toOutcome(outcome) === "won"
  const holder = state as { cupPrevWins?: unknown }
  const prevWins =
    typeof holder.cupPrevWins === "number" ? holder.cupPrevWins : 0
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
    state: {
      ...state,
      creature: { ...creature, conditions: nextConditions },
    },
    nextDayApBudget: won ? 3 + CUP_BONUS_AP : 3,
    cupsWon: won ? prevWins + 1 : prevWins,
  }
}
