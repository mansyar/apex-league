/**
 * Core game state types and initial state factory.
 * Pure data only — no DOM, no rendering, no I/O.
 */

/** Top-level game phases. Cup is a placeholder until the cup system lands. */
export type Phase = "day" | "cup"

/** The single source of truth for a run's simulation state. */
export interface GameState {
  /** Current in-game day, 1-based. */
  day: number
  /** Current phase of the game loop. */
  phase: Phase
  /** Action points remaining for the current day. */
  actionPoints: number
}

/** Action points granted at the start of each day. Stub value for Phase 0. */
export const ACTION_POINTS_PER_DAY = 3

/** Create the starting state of a fresh run. */
export function createInitialState(): GameState {
  return {
    day: 1,
    phase: "day",
    actionPoints: ACTION_POINTS_PER_DAY,
  }
}
