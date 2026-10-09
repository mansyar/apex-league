import { isCupDay } from "./calendar"
import { ACTION_POINTS_PER_DAY, type GameState } from "./state"

/**
 * Advance the simulation by one in-game day.
 * Pure: returns a new state, never mutates the input.
 */
export function advanceDay(state: GameState): GameState {
  const day = state.day + 1
  return {
    day,
    phase: isCupDay(day) ? "cup" : "day",
    actionPoints: ACTION_POINTS_PER_DAY,
  }
}
