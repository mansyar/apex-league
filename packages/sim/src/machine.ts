import { isCupDay } from "./calendar"
import { type Creature, effectiveStats } from "./creature"
import {
  type CupResult,
  type CupSession,
  makeBracket,
  resolveCup,
  startCupSession,
} from "./cup"
import { applyCupRewards } from "./cupRewards"
import type { GameState } from "./state"

/**
 * The cup-phase machine. The Day ↔ Cup phase contract (begin/end) stays
 * for the loop; the real cup behavior lives in `enterCup`, which the
 * client calls on a cup day: it resolves the seeded bracket in one
 * sitting, applies the reward bundle, and returns the state plus the
 * resolved cup for presentation.
 */

/** Enter the cup phase. Only allowed the day before a cup day. */
export function beginCup(state: GameState): { state: GameState; ok: boolean } {
  if (state.phase !== "day" || !isCupDay(state.day + 1)) {
    return { state, ok: false }
  }
  return { state: { ...state, phase: "cup" }, ok: true }
}

/** Leave the cup phase and return to the day phase. */
export function endCup(state: GameState): { state: GameState; ok: boolean } {
  if (state.phase !== "cup") {
    return { state, ok: false }
  }
  return { state: { ...state, phase: "day" }, ok: true }
}

/** Guards: entering needs a creature, the cup phase (which is what the
 * ticker grants on a cup day), and a day not yet played. The phase gate
 * doubles as the one-entry-per-cup marker: resolving flips the phase back
 * to "day", so a second enterCup call is rejected naturally. */
function canEnterCup(state: GameState): boolean {
  if (!state.creature) return false
  if (state.phase !== "cup") return false
  if (!isCupDay(state.day)) return false
  return true
}

/**
 * Enter today's cup: resolve the whole seeded bracket, apply the outcome
 * rewards, and return the new state plus the resolved cup (for the client
 * to present). Pure: the input state is untouched. `ok` is false when the
 * entry is illegal (no creature, non-cup day, already entered) — the state
 * then comes back unchanged and `cup` is null.
 */
export function enterCup(state: GameState): {
  state: GameState
  ok: boolean
  cup: CupResult | null
} {
  if (!canEnterCup(state)) {
    return { state, ok: false, cup: null }
  }
  // canEnterCup guarantees the creature exists past this point.
  const creature = state.creature as Creature
  const day = state.day
  // The seed folds in the creature's identity + training so an identical
  // day with a different roster draws a different bracket, while the same
  // save at the same day always draws the same one. It seeds the bracket
  // itself (FR2: bracket from day + save seed).
  const eff = effectiveStats(creature)
  const identity = eff.hp * 7 + eff.atk * 13 + eff.def * 17 + eff.spd * 23
  const seed = (day * 2654435761 + identity * 97 + 1) >>> 0
  const bracket = makeBracket(creature, day, seed)
  const cup = resolveCup(bracket, creature)
  const rewarded = applyCupRewards(state, cup.playerPlacement, day)
  // The cup has been played: leave the cup phase behind (back to the day
  // loop). Winning stamps lastCupDay (rewards); a loss leaves it null.
  return { state: { ...rewarded, phase: "day" }, ok: true, cup }
}

/**
 * Open a live cup session (live-cup spec): build the seeded bracket and
 * pre-resolve the player-independent rival subtree. This does NOT consume
 * the cup — the state is untouched and the phase stays "cup"; looking at
 * the bracket is free. The commit happens at the player's first arena
 * fight (later tasks wire `resolvePlayerMatch`). Pure: returns null when
 * entry is illegal (no creature).
 */
export function prepareCup(state: GameState): CupSession | null {
  if (!state.creature) return null
  const creature = state.creature
  const day = state.day
  // Same identity fold as enterCup: an identical day with a different
  // roster draws a different bracket; the same save draws the same one.
  const eff = effectiveStats(creature)
  const identity = eff.hp * 7 + eff.atk * 13 + eff.def * 17 + eff.spd * 23
  const seed = (day * 2654435761 + identity * 97 + 1) >>> 0
  return startCupSession(creature, day, seed)
}
