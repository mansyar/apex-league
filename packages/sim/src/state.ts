/**
 * Core game state types and initial state factory.
 * Pure data only — no DOM, no rendering, no I/O.
 */

import { type Creature, createCreature } from "./creature"

/** Top-level game phases. Cup is a placeholder until the cup system lands. */
export type Phase = "day" | "cup"

/** Persisted player preferences (part of the versioned save). */
export interface GameSettings {
  /**
   * Suppression flag for ornamental screen motion: when true the client
   * disallows camera shake and impact flash effects. Gameplay stays legible.
   */
  reducedMotion: boolean
}

/** The single source of truth for a run's simulation state. */
export interface GameState {
  /** Current in-game day, 1-based. */
  day: number
  /** Current phase of the game loop. */
  phase: Phase
  /** Action points remaining for the current day. */
  actionPoints: number
  /**
   * The player's creature, or null while the starter choice is pending
   * (a brand-new save before the starter screen).
   */
  creature: Creature | null
  /** Player preferences (arena juice toggles). */
  settings: GameSettings
}

/** Action points granted at the start of each day. Stub value for Phase 0. */
export const ACTION_POINTS_PER_DAY = 3

/** Create the starting state of a fresh run. */
export function createInitialState(): GameState {
  return {
    day: 1,
    phase: "day",
    actionPoints: ACTION_POINTS_PER_DAY,
    creature: null,
    settings: { reducedMotion: false },
  }
}

/**
 * Flip the reduced-motion preference. Pure: the next state keeps everything
 * else untouched, and callers persist via saveGame.
 */
export function setReducedMotion(state: GameState, value: boolean): GameState {
  return { ...state, settings: { ...state.settings, reducedMotion: value } }
}

/**
 * Record the player's starter choice: create the creature from a seed and
 * return a new state with it set. Pure. Throws on unknown/locked species and
 * on states that already own a creature.
 */
export function chooseStarter(
  state: GameState,
  speciesId: string,
  seed: number,
): GameState {
  if (state.creature) {
    throw new Error("This save already has a creature")
  }
  return { ...state, creature: createCreature(speciesId, seed) }
}
