import type { LadderTier } from "@apex/sim"

/** Display names for the four ladder tiers (gold_legend_ladder_20261017).
 * One map for the score bug, the entry chip, the bracket board, and the
 * results rows — the tier's display name never drifts between surfaces. */
export const TIER_NAME: Record<LadderTier, string> = Object.freeze({
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  legend: "Legend",
})
