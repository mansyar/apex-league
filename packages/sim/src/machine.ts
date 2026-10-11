import { isCupDay } from "./calendar"
import { type Creature, effectiveStats } from "./creature"
import { type CupResult, makeBracket, resolveCup } from "./cup"
import { applyCupRewards } from "./cupRewards"
import type { GameState } from "./state"

/**
 * The cup-phase machine. The phase itself is granted by the ticker on a
 * cup day; the real cup behavior lives in `enterCup`, which the client
 * calls on a cup day: it resolves the seeded bracket in one sitting,
 * applies the reward bundle, and returns the state plus the resolved cup
 * for presentation (flipping the phase back to "day").
 */

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
  // The machine owns the placement → outcome mapping (the reward layer
  // accepts only a resolved "won"/"lost" — see cupRewards.ts).
  const rewarded = applyCupRewards(
    state,
    cup.playerPlacement === 1 ? "won" : "lost",
    day,
  )
  // The cup has been played: leave the cup phase behind (back to the day
  // loop). Winning stamps lastCupDay (rewards); a loss leaves it null.
  return { state: { ...rewarded, phase: "day" }, ok: true, cup }
}
