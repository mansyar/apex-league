/**
 * The ladder (bronze_ladder_20261012, extended by
 * silver_ladder_bosses_20261016): cup placements convert to ladder points;
 * crossing thresholds climbs sub-tiers automatically within a tier. Bronze's
 * ceiling is the Promotion Cup gate — points bank past Bronze I and the next
 * entered cup is the Promotion Cup (spec FR2/FR3); its champion flips the
 * tier to Silver. Silver's sub-tiers climb on total points via
 * SILVER_THRESHOLDS. There is no demotion and no decay: a loss banks its
 * placement points or zero, never subtracts, never drops a sub-tier.
 *
 * Pure: returns a new GameState; the input is never mutated. No RNG — the
 * ladder is a pure function of cup results, which keeps the byte-parity
 * between the legacy one-sitting cup path and the live CupSession path.
 */

import type { GameState } from "./state"

/** Ladder tiers, lowest first. Silver is Phase 2 (this track). */
export type LadderTier = "bronze" | "silver"

/** Sub-tiers within a tier, lowest first. */
export type LadderSubTier = "III" | "II" | "I"

/** The kind of cup being scored: regular championships, and the Promotion
 * Cup that gates Bronze → Silver (silver_ladder_bosses_20261016). */
export type CupKind = "championship" | "promotion"

/** The ladder slice of GameState (save v8; `tier` since v11). */
export interface LadderState {
  /** Accumulated ladder points (never decrease). */
  points: number
  /** The current tier. */
  tier: LadderTier
  /** The current sub-tier within the tier. */
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

/** Bronze points required to reach each sub-tier above the floor:
 * 6 → Bronze II, 12 → Bronze I (~2 cup cycles per climb at ~3 points per
 * cup win). Points past Bronze I keep banking — that surplus is what makes
 * the next cup the Promotion Cup (spec FR2). */
export const LADDER_THRESHOLDS = Object.freeze({
  bronzeII: 6,
  bronzeI: 12,
})

/** Silver points required to reach each sub-tier above the floor, as
 * absolute totals (points are global and monotonic). Provisional values:
 * the Bronze I ceiling is 12 and a champion banks +3 per cup, so 21 ≈
 * three more cups to Silver II and 30 ≈ three after that to Silver I.
 * The Phase 3 balance probe of silver_ladder_bosses_20261016 tunes these —
 * see its probe-before/probe-after reports. */
export const SILVER_THRESHOLDS = Object.freeze({
  silverII: 21,
  silverI: 30,
})

/** The starting ladder slice: Bronze III, no points. */
export function initialLadder(): LadderState {
  return { points: 0, tier: "bronze", subTier: "III" }
}

/** Derive the sub-tier from a tier and point total. Bronze clamps at I —
 * banked surplus never fakes a climb (that is the Promotion Cup's job).
 * Silver floors at III and clamps at I; there is no Gold tier. */
export function subTierFor(tier: LadderTier, points: number): LadderSubTier {
  if (tier === "bronze") {
    if (points >= LADDER_THRESHOLDS.bronzeI) return "I"
    if (points >= LADDER_THRESHOLDS.bronzeII) return "II"
    return "III"
  }
  if (points >= SILVER_THRESHOLDS.silverI) return "I"
  if (points >= SILVER_THRESHOLDS.silverII) return "II"
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
  /** True when the placement crossed a threshold into a higher sub-tier
   * (or flipped the tier via promotion). */
  climbed: boolean
  /** True when points were earned while already at the tier's top sub-tier
   * without promoting — Bronze I drives the one-time "Silver awaits"
   * callout, Silver I the Gold teaser. */
  topReached: boolean
  /** True when a Promotion Cup champion flipped the tier Bronze → Silver
   * (spec FR4). The client plays its promotion ceremony off this flag. */
  promoted: boolean
}

/**
 * Apply a finished cup's placement to the ladder. Pure: the input state is
 * untouched. A forfeited cup (`forfeited` — the machine detects it from the
 * session's null-battle verdict) awards 0 regardless of the round it was
 * given away in; losses award their placement's points and never subtract.
 *
 * `kind` defaults to "championship" so existing call sites stay valid. A
 * "promotion" cup's champion placement additionally flips the tier to
 * Silver III (spec FR4); any other promotion outcome banks points only.
 */
export function applyCupPlacement(
  state: GameState,
  placement: CupPlacement,
  forfeited: boolean,
  kind: CupKind = "championship",
): LadderUpdate {
  const earned = forfeited ? 0 : LADDER_POINTS_BY_PLACEMENT[placement]
  const prev = state.ladder
  const points = prev.points + earned
  const promoted =
    kind === "promotion" &&
    !forfeited &&
    placement === 1 &&
    prev.tier === "bronze"
  const ladder: LadderState = promoted
    ? { points, tier: "silver", subTier: "III" }
    : { points, tier: prev.tier, subTier: subTierFor(prev.tier, points) }
  return {
    state: { ...state, ladder },
    climbed: ladder.subTier !== prev.subTier,
    topReached: !promoted && earned > 0 && prev.subTier === "I",
    promoted,
  }
}

const LADDER_POINTS_BY_PLACEMENT: Readonly<Record<CupPlacement, number>> =
  Object.freeze({
    1: LADDER_POINTS.champion,
    2: LADDER_POINTS.runnerUp,
    3: LADDER_POINTS.semifinal,
    4: LADDER_POINTS.early,
  })
