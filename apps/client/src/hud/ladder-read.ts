import {
  ACTION_POINTS_PER_DAY,
  type GameState,
  GOLD_THRESHOLDS,
  LADDER_THRESHOLDS,
  SILVER_THRESHOLDS,
  type StatKey,
} from "@apex/sim"
import { TIER_NAME } from "../tier-name"
import { spendFlashIndex } from "./copy-care"

/** The score-bug's ladder standing, as the update writes it. */
export interface LadderRead {
  tierName: string
  rank: string
  points: string
  ariaLabel: string
  /** Tier accent class for the score-bug rank segment. */
  tierClass: "bronze" | "silver" | "gold" | "legend"
  /** Collected legend titles (plateau only, e.g. "★ 2"); null elsewhere. */
  titles: string | null
}

/**
 * Ladder standing (save v14): tier + sub-tier + points, matching the
 * trophy segment's one-fact-per-segment grammar. Below the top sub-tier
 * the read is progress-to-next; at the tier's top the points are banked
 * toward the next tier, so the raw total is the honest number (Bronze I
 * banks toward Silver, Silver I toward Gold, Gold I toward the Legend
 * gate). Legend is the plateau — its points are banked and its collected
 * titles ride along (gold_legend_ladder_20261017).
 */
export function ladderRead(
  ladder: GameState["ladder"],
  legendTitles = 0,
): LadderRead {
  const tierName = TIER_NAME[ladder.tier]
  const rank = `${tierName} ${ladder.subTier}`
  const nextThreshold =
    ladder.subTier === "III"
      ? ladder.tier === "silver"
        ? SILVER_THRESHOLDS.silverII
        : ladder.tier === "gold"
          ? GOLD_THRESHOLDS.goldII
          : LADDER_THRESHOLDS.bronzeII
      : ladder.tier === "silver"
        ? SILVER_THRESHOLDS.silverI
        : ladder.tier === "gold"
          ? GOLD_THRESHOLDS.goldI
          : LADDER_THRESHOLDS.bronzeI
  const nextTier = ladder.subTier === "III" ? "II" : "I"
  const titles =
    ladder.tier === "legend" && legendTitles > 0 ? `★ ${legendTitles}` : null
  const ariaTitles = titles === null ? "" : `, ${legendTitles} legend titles`
  if (ladder.subTier === "I") {
    return {
      tierName,
      rank,
      points: `${ladder.points} pts`,
      ariaLabel: `League standing: ${tierName} I, ${ladder.points} points banked${ariaTitles}`,
      tierClass: ladder.tier,
      titles,
    }
  }
  return {
    tierName,
    rank,
    points: `${ladder.points}/${nextThreshold}`,
    ariaLabel: `League standing: ${tierName} ${ladder.subTier}, ${ladder.points} of ${nextThreshold} points toward ${tierName} ${nextTier}`,
    tierClass: ladder.tier,
    titles,
  }
}

/** The one-update promotion callout (never repeats next update). */
export function promotionLine(tierName: string, subTier: string): string {
  return `Promotion — ${tierName} ${subTier}!`
}

/**
 * The one-update climb announcement: fires on sub-tier climbs and
 * cross-tier promotions alike. Keyed on the full standing — a Gold I →
 * Legend I flip keeps subTier "I", so comparing sub-tiers alone would
 * miss the plateau promotion (gold_legend_ladder_20261017). The first
 * update (no previous standing) never announces.
 */
export function climbAnnouncement(
  prev: GameState["ladder"] | null,
  next: GameState["ladder"],
): string | null {
  if (
    prev === null ||
    (prev.tier === next.tier && prev.subTier === next.subTier)
  ) {
    return null
  }
  return promotionLine(TIER_NAME[next.tier], next.subTier)
}

/** How the AP segmented meter renders for one update. */
export interface ApPipPlan {
  /** Cup bonus points beyond the daily max (chevron-cut pips). */
  bonus: number
  /** Action points clamped to the daily meter body. */
  clamped: number
  /** Total pips the meter should show after this update. */
  wantPips: number
  /** Index of the pip that just drained (one-shot flash), or null. */
  flash: number | null
}

/**
 * AP segmented meter plan. Cup bonus points extend past the daily max as
 * chevron-cut bonus pips; a fresh spend flashes the drained pip out.
 */
export function apPipPlan(
  actionPoints: number,
  prevAp: number | null,
): ApPipPlan {
  const bonus = Math.max(0, actionPoints - ACTION_POINTS_PER_DAY)
  const clamped = Math.min(actionPoints, ACTION_POINTS_PER_DAY)
  return {
    bonus,
    clamped,
    wantPips: ACTION_POINTS_PER_DAY + bonus,
    flash: prevAp === null ? null : spendFlashIndex(prevAp, actionPoints),
  }
}

/** The lineage plate's meta line: generation, prestige, cup tally. */
export function lineageMeta(
  generation: number,
  prestige: number,
  cupsWon: number,
): string {
  return `Gen ${generation} · Prestige ${prestige} · ${cupsWon} cup${cupsWon === 1 ? "" : "s"}`
}

/** One condition bar's transient change state. */
export interface ConditionDelta {
  swing: number
  /** Signed delta chip text, or null when the swing is too small to show. */
  text: string | null
}

/**
 * Condition-bar delta: the first observation never flashes (no baseline to
 * swing from); a meaningful swing (|Δ| ≥ 2) gets a transient signed chip.
 */
export function conditionDelta(
  prev: number | null,
  value: number,
): ConditionDelta {
  const swing = prev === null ? 0 : value - prev
  if (Math.abs(swing) >= 2) {
    return { swing, text: `${swing > 0 ? "+" : "−"}${Math.abs(swing)}` }
  }
  return { swing, text: null }
}

/** One stat cell's values: rolled base + trained, bonus when above 0. */
export function statCell(
  creature: NonNullable<GameState["creature"]>,
  key: StatKey,
): { total: number; bonus: string } {
  const base = creature.stats[key]
  const trained = creature.trained[key]
  return { total: base + trained, bonus: trained > 0 ? `+${trained}` : "" }
}
