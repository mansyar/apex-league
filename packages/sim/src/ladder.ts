/**
 * The Bronze ladder (bronze_ladder_20261012): cup placements convert to
 * ladder points and crossing thresholds climbs Bronze III → II → I
 * automatically. Silver is Phase 2 — at the top of Bronze I points keep
 * banking and the client shows a one-time "Silver awaits" callout (deduped
 * by the existing seenHints ledger, so the sim only reports the event).
 *
 * Pure: returns a new GameState; the input is never mutated. No RNG — the
 * ladder is a pure function of cup results, which keeps the byte-parity
 * between the legacy one-sitting cup path and the live CupSession path.
 */

import type { GameState } from "./state"

/** Bronze sub-tiers, lowest first. */
export type LadderSubTier = "III" | "II" | "I"

/** The ladder slice of GameState (save v8). */
export interface LadderState {
  /** Accumulated ladder points (never decrease). */
  points: number
  /** The current Bronze sub-tier. */
  subTier: LadderSubTier
}

/** Points per cup placement: champion 3, runner-up 2, semifinal exit 1,
 * earlier exit 0. Forfeits always score 0 (the forfeit flag zeroes the
 * placement's value). */
export const LADDER_POINTS = Object.freeze({
  champion: 3,
  runnerUp: 2,
  semifinal: 1,
  early: 0,
})

/** Points required to reach each sub-tier above the floor: 6 → Bronze II,
 * 12 → Bronze I (~2 cup cycles per climb at ~3 points per cup win). */
export const LADDER_THRESHOLDS = Object.freeze({
  bronzeII: 6,
  bronzeI: 12,
})

/** The starting ladder slice: Bronze III, no points. */
export function initialLadder(): LadderState {
  return { points: 0, subTier: "III" }
}

/** Derive the sub-tier from a point total (floor → Bronze III). */
export function subTierFor(points: number): LadderSubTier {
  if (points >= LADDER_THRESHOLDS.bronzeI) return "I"
  if (points >= LADDER_THRESHOLDS.bronzeII) return "II"
  return "III"
}

/** The player's cup placement: champion 1, final loss 2, semifinal exit 3,
 * quarterfinal exit 4 (see `cupPlacement`). */
type CupPlacement = 1 | 2 | 3 | 4

/** The result of applying a cup placement to the ladder: the new state
 * plus presentation flags. */
export interface LadderUpdate {
  /** The state with the ladder slice updated. */
  state: GameState
  /** True when the placement crossed a threshold into a higher sub-tier. */
  climbed: boolean
  /** True when points were earned while already at Bronze I (the top) —
   * the client shows its one-time "Silver awaits" callout. */
  topReached: boolean
}

/**
 * Apply a finished cup's placement to the ladder. Pure: the input state is
 * untouched. A forfeited cup (`forfeited` — the machine detects it from the
 * session's null-battle verdict) awards 0 regardless of the round it was
 * given away in; losses award their placement's points and never subtract.
 */
export function applyCupPlacement(
  state: GameState,
  placement: CupPlacement,
  forfeited: boolean,
): LadderUpdate {
  const earned = forfeited ? 0 : LADDER_POINTS_BY_PLACEMENT[placement]
  const prev = state.ladder
  const points = prev.points + earned
  const subTier = subTierFor(points)
  return {
    state: { ...state, ladder: { points, subTier } },
    climbed: subTier !== prev.subTier,
    topReached: prev.subTier === "I" && earned > 0,
  }
}

const LADDER_POINTS_BY_PLACEMENT: Readonly<Record<CupPlacement, number>> =
  Object.freeze({
    1: LADDER_POINTS.champion,
    2: LADDER_POINTS.runnerUp,
    3: LADDER_POINTS.semifinal,
    4: LADDER_POINTS.early,
  })
