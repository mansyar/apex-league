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
  /**
   * Music bus level, 0..1 (save v16, release_polish_20261018). Applied to
   * the scene-driven music beds; the mute toggle overrides it.
   */
  musicVolume: number
  /**
   * SFX bus level, 0..1 (save v16, release_polish_20261018). Applied at the
   * cue seam; the mute toggle overrides it.
   */
  sfxVolume: number
}

/**
 * Which evolution gates the player has already cleared once (save v17,
 * evolution_discovery_20261020). Discovery is per gate and save-wide: a gate
 * flips known the night a creature actually evolves through it, and the
 * Growth panel keeps its exact thresholds hidden until then.
 */
export interface EvolutionKnowledge {
  /** Baby → juvenile thresholds, learned on the first juvenile evolution. */
  juvenile: boolean
  /** Juvenile → champion thresholds, learned on the first champion evolution. */
  champion: boolean
}

/** The untouched discovery record a fresh run starts with. */
export function initialEvolutionKnowledge(): EvolutionKnowledge {
  return { juvenile: false, champion: false }
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
  /**
   * Per-gate evolution discovery (save v17). A gate becomes known the night
   * a creature evolves through it, and stays known for the rest of the save;
   * the client reveals exact thresholds only for a known gate.
   */
  evolutionKnowledge: EvolutionKnowledge
  /**
   * The Silver tier-reward claim (save v21, electric species line FR-5).
   * Stamped exactly once by the cup finalize's reward seam when a
   * non-forfeit cup closes on a post-placement Silver-or-higher ladder —
   * never below Silver, never on a forfeit, never twice. The granted
   * "Storm Gift" egg itself lives in the nursery flow (breeding.ts).
   */
  stormGiftClaimed: boolean
  /**
   * The granted Storm Gift egg, waiting in the nursery for the player to
   * hatch it (save v22, electric species line FR-5/FR-6). Null when no
   * gift is waiting — never granted yet, or already hatched. The seed
   * travels with the egg so the preview and the hatch roll the same
   * individual.
   */
  pendingGift: PendingGift | null
  /**
   * The stable (save v24, stable & partner reserve FR-1): every pet the
   * player owns that is **not** in the ranch, oldest first, with no
   * capacity limit. Exactly one pet is active at a time (`creature`); the
   * pets in here are frozen — no condition decay, no training, no cups, no
   * evolution and no age while they wait. A stashed pet resumes exactly
   * where it left off when it comes back to the ranch.
   */
  stable: Creature[]
}

/**
 * A granted reward egg (save v22). The league hands over the species and
 * the roll; the player decides when to hatch it.
 */
export interface PendingGift {
  /** The species the league granted (the Storm Gift species). */
  speciesId: string
  /** The roll seed: the preview and the hatch use this same seed, so what
   * the player is shown is exactly what they get. */
  seed: number
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
      musicVolume: 1,
      sfxVolume: 1,
    },
    cupsWon: 0,
    lastCupDay: null,
    ladder: initialLadder(),
    // The literal (rather than `initialLineage()`) is what keeps this module
    // free of a runtime import from `legacy` — see the import note above.
    lineage: { generation: 0, hallOfFame: [] },
    bossDefeats: [],
    legendTitles: 0,
    evolutionKnowledge: initialEvolutionKnowledge(),
    stormGiftClaimed: false,
    pendingGift: null,
    // The stable starts empty (save v24): a fresh run owns one pet.
    stable: [],
  }
}

/**
 * Mark one evolution gate's thresholds as known (save v17). Pure and
 * idempotent: a gate that is already known returns the input state
 * unchanged, so a repeated settlement can never dirty the save.
 */
export function markEvolutionKnown(
  state: GameState,
  gate: keyof EvolutionKnowledge,
): GameState {
  if (state.evolutionKnowledge[gate]) return state
  return {
    ...state,
    evolutionKnowledge: { ...state.evolutionKnowledge, [gate]: true },
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
 * Clamp a bus level into 0..1. Non-finite input (a hand-edited save or a
 * broken range control) lands at 0 rather than poisoning the gain math.
 */
function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

/**
 * Set the persisted music bus level, 0..1 (save v16). Pure: the next state
 * keeps everything else untouched, and callers persist via saveGame.
 */
export function setMusicVolume(state: GameState, value: number): GameState {
  return {
    ...state,
    settings: { ...state.settings, musicVolume: clampVolume(value) },
  }
}

/**
 * Set the persisted SFX bus level, 0..1 (save v16). Pure: the next state
 * keeps everything else untouched, and callers persist via saveGame.
 */
export function setSfxVolume(state: GameState, value: number): GameState {
  return {
    ...state,
    settings: { ...state.settings, sfxVolume: clampVolume(value) },
  }
}

/**
 * Record the player's starter choice: create the creature from a seed and
 * return a new state with it set. Pure. Throws on unknown/locked species and
 * on states that already own a creature.
 *
 * The starter hatches on the day it is chosen, so it starts at one day of
 * life (save v23): its age counts from here, not from the world's day 1.
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
