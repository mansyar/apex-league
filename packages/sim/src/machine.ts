import { isCupDay } from "./calendar"
import { type Creature, effectiveStats } from "./creature"
import { type CupSession, cupPlacement, startCupSession } from "./cup"
import { applyCupRewards } from "./cupRewards"
import { applyCupPlacement } from "./ladder"
import type { GameState } from "./state"

/**
 * The cup-phase machine. The Day ↔ Cup phase contract (begin/end) stays
 * for the loop; the live cup flow is `prepareCup` (open a session on a
 * cup day, pre-resolving the player-independent rival subtree) and
 * `finalizeCup` (close a finished session: rewards, bookkeeping, and the
 * phase flip back to "day"). The player's own matches resolve on demand
 * through `resolvePlayerMatch` (see cup.ts) with the coaching room's picks.
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
  // Seed = day ⊕ creature identity: an identical day with a different
  // roster draws a different bracket; the same save draws the same one.
  const eff = effectiveStats(creature)
  const identity = eff.hp * 7 + eff.atk * 13 + eff.def * 17 + eff.spd * 23
  const seed = (day * 2654435761 + identity * 97 + 1) >>> 0
  return startCupSession(creature, day, seed)
}

/**
 * Close out a finished cup session (live-cup spec FR5): map the player's
 * placement (champion 1, final loss 2, semifinal exit 3, quarterfinal exit
 * 4 — forfeits count as a loss in their round) to the reward bundle, stamp
 * the bookkeeping, and flip the phase back to "day". Pure; throws when the
 * session has no champion yet (call `completeCup` first).
 */
export function finalizeCup(state: GameState, session: CupSession): GameState {
  if (session.championName === null) {
    throw new Error("The cup has no champion yet — complete it first")
  }
  // The machine owns the placement → outcome mapping (the reward layer
  // accepts only a resolved "won"/"lost" — see cupRewards.ts).
  const rewarded = applyCupRewards(
    state,
    cupPlacement(session) === 1 ? "won" : "lost",
    state.day,
  )
  // A forfeit verdict is the only one with a null battle replay (see
  // RoundVerdict): it zeroes the placement's ladder points (bronze ladder
  // spec — giving a round away earns nothing, whatever the round).
  const lastVerdict = session.playerVerdicts.at(-1)
  const forfeited = lastVerdict !== undefined && lastVerdict.battle === null
  const laddered = applyCupPlacement(rewarded, cupPlacement(session), forfeited)
  return { ...laddered.state, phase: "day" }
}
