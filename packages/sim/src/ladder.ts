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

/** Ladder tiers, lowest first. Legend is the plateau capstone. */
export type LadderTier = "bronze" | "silver" | "gold" | "legend"

/** The climb order of the tiers, lowest first — the comparison every
 * "at or above this tier" rule needs (reward unlocks, boss gates). */
export const TIER_ORDER: readonly LadderTier[] = Object.freeze([
  "bronze",
  "silver",
  "gold",
  "legend",
])

/** True when `tier` sits at or above `min` on the ladder. */
export function tierAtLeast(tier: LadderTier, min: LadderTier): boolean {
  return TIER_ORDER.indexOf(tier) >= TIER_ORDER.indexOf(min)
}

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
 * absolute totals (points are global and monotonic). Tuned by the Phase 3
 * balance probe of silver_ladder_bosses_20261016: realistic mid-trained
 * pace banks ~1–2 pts per cup, so 18/24 ≈ two champion cups per leg with
 * mixed placements — a deliberate Silver grind that still moves. */
export const SILVER_THRESHOLDS = Object.freeze({
  silverII: 18,
  silverI: 24,
})

/** Gold points required to reach each sub-tier above the floor, as absolute
 * totals (gold_legend_ladder_20261017). Continues the uniform +6 spacing
 * (Bronze 6/12, Silver 18/24 → Gold 30/36); points past Gold I bank toward
 * Legend eligibility. */
export const GOLD_THRESHOLDS = Object.freeze({
  goldII: 30,
  goldI: 36,
})

/** The starting ladder slice: Bronze III, no points. */
export function initialLadder(): LadderState {
  return { points: 0, tier: "bronze", subTier: "III" }
}

/** Derive the sub-tier from a tier and point total. Bronze clamps at I —
 * banked surplus never fakes a climb (that is the Promotion Cup's job).
 * Silver and Gold floor at III and clamp at I; Legend is a plateau with a
 * single implicit sub-tier. */
export function subTierFor(tier: LadderTier, points: number): LadderSubTier {
  if (tier === "bronze") {
    if (points >= LADDER_THRESHOLDS.bronzeI) return "I"
    if (points >= LADDER_THRESHOLDS.bronzeII) return "II"
    return "III"
  }
  if (tier === "gold") {
    if (points >= GOLD_THRESHOLDS.goldI) return "I"
    if (points >= GOLD_THRESHOLDS.goldII) return "II"
    return "III"
  }
  if (tier === "legend") return "I"
  if (points >= SILVER_THRESHOLDS.silverI) return "I"
  if (points >= SILVER_THRESHOLDS.silverII) return "II"
  return "III"
}

/**
 * Whether the player's next entered cup is a Promotion Cup (spec FR2):
 * a top-sub-tier creature with points banked past that tier's ceiling.
 * Bronze I → Silver, Silver I → Gold, Gold I → Legend (the plateau —
 * Legend itself never promotes). Derived from the ladder slice — never
 * stored — so it can never drift out of sync with the points it is
 * computed from.
 */
export function promotionEligible(ladder: LadderState): boolean {
  if (ladder.tier === "legend") return false
  if (ladder.subTier !== "I") return false
  const ceiling =
    ladder.tier === "bronze"
      ? LADDER_THRESHOLDS.bronzeI
      : ladder.tier === "silver"
        ? SILVER_THRESHOLDS.silverI
        : GOLD_THRESHOLDS.goldI
  return ladder.points > ceiling
}

/** The tier a Promotion Cup champion ascends to, keyed by the tier they
 * left. Legend is absent — the capstone never promotes. */
const NEXT_TIER: Readonly<Record<Exclude<LadderTier, "legend">, LadderTier>> =
  Object.freeze({
    bronze: "silver",
    silver: "gold",
    gold: "legend",
  })

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
  const nextTier =
    kind === "promotion" &&
    !forfeited &&
    placement === 1 &&
    prev.tier !== "legend"
      ? NEXT_TIER[prev.tier]
      : undefined
  const promoted = nextTier !== undefined
  const ladder: LadderState = nextTier
    ? { points, tier: nextTier, subTier: prev.tier === "gold" ? "I" : "III" }
    : { points, tier: prev.tier, subTier: subTierFor(prev.tier, points) }
  return {
    state: { ...state, ladder },
    climbed: promoted || ladder.subTier !== prev.subTier,
    // The plateau never reports topReached — Legend is the capstone, there
    // is no next tier for a "next tier awaits" callout to point at.
    topReached:
      !promoted &&
      ladder.tier !== "legend" &&
      earned > 0 &&
      prev.subTier === "I",
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
