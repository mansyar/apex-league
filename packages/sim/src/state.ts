/**
 * Core game state types and initial state factory.
 * Pure data only — no DOM, no rendering, no I/O.
 */

import { type Creature, createCreature } from "./creature"
import { initialLadder, type LadderState } from "./ladder"
// Type-only on purpose: `legacy` reads the action-point constant from this
// module, so a value import here would close a runtime cycle
// (state → legacy → state). Nothing else in the sim imports values from
// `state`, and the fresh-lineage literal below keeps it that way.
import type { LineageState } from "./legacy"

/** Top-level game phases: the day loop and the cup-day loop. */
export type Phase = "day" | "cup"

/** Persisted player preferences (part of the versioned save). */
export interface GameSettings {
  /**
   * Suppression flag for ornamental screen motion: when true the client
   * disallows camera shake and impact flash effects. Gameplay stays legible.
   */
  reducedMotion: boolean
  /**
   * Dismissed onboarding hint ids (save v7). Each first-day callout shows
   * once, then records its id here so it never nags again.
   */
  seenHints: string[]
  /**
   * Arena camera presentation (save v9): "cinematic" drives the battle
   * through the shot-grammar director, "broadcast" pins the fixed wide
   * framing. Reduced motion always forces the broadcast feel at render
   * time regardless of this preference.
   */
  arenaCamera: "cinematic" | "broadcast"
  /**
   * The persisted audio mute toggle (save v13,
   * audio_foundation_20261017). `false` = sound on — the default, so a
   * fresh or migrated save plays bundled CC0 cues until the player
   * silences them in the settings modal.
   */
  muted: boolean
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
  /** Lifetime cup championships (banner counter, save v5). */
  cupsWon: number
  /** The last cup day the player entered, if any (save v5). */
  lastCupDay: number | null
  /** The Bronze ladder slice: points + sub-tier (save v8). */
  ladder: LadderState
  /** The bloodline slice: generation + Hall of Fame (save v10). */
  lineage: LineageState
  /**
   * Boss ids defeated by the current creature's career, in defeat order
   * (save v11, silver_ladder_bosses_20261016). Idempotent ledger — the
   * client derives callouts, coach lines, and Hall of Fame scalps from it.
   */
  bossDefeats: string[]
  /**
   * Legend plateau championships won by the current creature
   * (gold_legend_ladder_20261017, save v14). The capstone's honor
   * counter — the client renders it as collected titles on the rank plate.
   */
  legendTitles: number
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
    settings: {
      reducedMotion: false,
      seenHints: [],
      arenaCamera: "cinematic",
      muted: false,
    },
    cupsWon: 0,
    lastCupDay: null,
    ladder: initialLadder(),
    // The literal (rather than `initialLineage()`) is what keeps this module
    // free of a runtime import from `legacy` — see the import note above.
    lineage: { generation: 0, hallOfFame: [] },
    bossDefeats: [],
    legendTitles: 0,
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
 * Record an onboarding hint as dismissed (save v7's seenHints ledger).
 * Pure and idempotent: an already-seen id keeps the list unchanged.
 */
export function markHintSeen(state: GameState, hintId: string): GameState {
  const seen = state.settings.seenHints
  if (seen.includes(hintId)) return state
  return {
    ...state,
    settings: { ...state.settings, seenHints: [...seen, hintId] },
  }
}

/**
 * Pick the arena camera presentation (save v9). Pure: the next state keeps
 * everything else untouched, and callers persist via saveGame.
 */
export function setArenaCamera(
  state: GameState,
  value: "cinematic" | "broadcast",
): GameState {
  return { ...state, settings: { ...state.settings, arenaCamera: value } }
}

/**
 * Flip the persisted audio mute toggle (save v13). Pure: the next state
 * keeps everything else untouched, and callers persist via saveGame.
 */
export function setMuted(state: GameState, value: boolean): GameState {
  return { ...state, settings: { ...state.settings, muted: value } }
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
