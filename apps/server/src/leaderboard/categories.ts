/**
 * The boards and what counts as a believable score on each. The categories are
 * a closed union, never free text: a submit names one of these four and
 * anything else is a 400. The caps are server-side plausibility rails, not
 * game rules — they reject fat-fingered or forged payloads, so each sits far
 * above any legitimate lifetime total but far below absurdity, and retuning
 * one is a code change with no migration.
 */

/** Cup victories: the save's `cupsWon` tally, all-time. */
export const MAX_CUP_WINS = 10_000
/** Accumulated ladder points (`ladder.points`, which never decrease). */
export const MAX_LADDER_POINTS = 30_000
/** Lifetime trainer AP earned. */
export const MAX_TRAINER_AP = 1_000_000
/** Collection breadth: distinct species, stages, and forms collected. */
export const MAX_COLLECTION_BREADTH = 10_000

export const LEADERBOARD_CATEGORIES = [
  "cups",
  "ladder",
  "ap",
  "collection",
] as const

export type LeaderboardCategory = (typeof LEADERBOARD_CATEGORIES)[number]

/**
 * The plausibility cap per category. A win a day for 27 years (cups); a
 * champion's +3 — the most any cup pays — times the cups cap (ladder); ten AP
 * a day, triple the base daily budget, for 270 years (ap); two orders of
 * magnitude past a full roster of every species, stage, and branch
 * (collection).
 */
export const SCORE_CAPS: Record<LeaderboardCategory, number> = {
  cups: MAX_CUP_WINS,
  ladder: MAX_LADDER_POINTS,
  ap: MAX_TRAINER_AP,
  collection: MAX_COLLECTION_BREADTH,
}

export function isLeaderboardCategory(
  value: unknown,
): value is LeaderboardCategory {
  return (
    typeof value === "string" &&
    (LEADERBOARD_CATEGORIES as readonly string[]).includes(value)
  )
}

/**
 * A score is plausible when it is an integer inside its category's cap. All
 * four boards count whole things — wins, points, AP, entries — so fractions
 * are rejected, and the integer check rejects NaN and the infinities along
 * with the negatives and the over-cap claims.
 */
export function isPlausibleScore(
  category: LeaderboardCategory,
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= SCORE_CAPS[category]
  )
}
