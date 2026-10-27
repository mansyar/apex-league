import {
  canGraduate,
  type GameState,
  lineagePrestige,
  PRESTIGE_ESTABLISHED_LINE,
  PRESTIGE_WARM_BLOODLINE,
} from "@apex/sim"

/**
 * The cup/ladder half of the HUD's copy engine: the onboarding callout
 * table. Its cup-eve, ladder-teaser and gatekeeper-scalp entries are the
 * ladder and cup coach copy this file owns, and they sit in one table
 * because `selectHint` is first-match-wins — the array order is the
 * teaching order, so it must never be split.
 */

/**
 * One onboarding hint: a coach-voice nudge that appears once at the moment
 * it matters, then never again (dismissal persists in settings.seenHints).
 */
export interface HudHint {
  id: string
  text: string
}

/**
 * One ladder teaser (FR-15): the topside template both division teasers
 * share — the topped tier and the awaiting division fill the same two
 * sentences, so Silver and Gold can never drift apart again.
 */
export function ladderTeaser(topped: "bronze" | "silver"): string {
  const done = topped === "bronze" ? "Bronze" : "Silver"
  const next = topped === "bronze" ? "Silver" : "Gold"
  return `You've topped ${done} — the ${next} division awaits. Keep banking cup wins; the climb continues soon.`
}

// Onboarding callouts (save v7). First match wins — the array order below
// is the teaching order: AP first, kit depth second, cup last.
const HINTS: Array<HudHint & { when: (state: GameState) => boolean }> = [
  {
    id: "ap-basics",
    when: (s) => s.phase === "day" && s.day === 1 && s.creature !== null,
    text: "Three action points a day — feed, rest, treat, play. Spend them like they matter.",
  },
  {
    id: "training-tier",
    when: (s) => s.phase === "day" && s.day === 5 && s.creature !== null,
    text: "Training programs stick between days, and the kit keeps growing — one more move unlocks tomorrow.",
  },
  {
    id: "cup-eve",
    when: (s) => s.phase === "day" && s.day % 7 === 6 && s.creature !== null,
    text: "Cup day is tomorrow. The bracket takes your partner as they are — spend today wisely.",
  },
  {
    // Silver Ladder (FR11): one-time coach line setting up the Silver
    // division — Bronze-only, since a Silver I climber tops a different
    // tier now.
    id: "silver-awaits",
    when: (s) =>
      s.creature !== null &&
      s.ladder.tier === "bronze" &&
      s.ladder.subTier === "I" &&
      s.ladder.points > 0,
    text: ladderTeaser("bronze"),
  },
  {
    // Four-tier ladder (gold_legend_ladder_20261017): the topside teasers
    // keep one rung ahead of the roster — Silver I teases Gold, Gold I
    // points at the real Legend gate.
    id: "gold-awaits",
    when: (s) =>
      s.creature !== null &&
      s.ladder.tier === "silver" &&
      s.ladder.subTier === "I" &&
      s.ladder.points > 0,
    text: ladderTeaser("silver"),
  },
  {
    id: "legend-awaits",
    when: (s) =>
      s.creature !== null &&
      s.ladder.tier === "gold" &&
      s.ladder.subTier === "I" &&
      s.ladder.points > 0,
    text: "You've banked past Gold I — win your next Promotion Cup and the Legend plateau is yours.",
  },
  {
    // Legacy (v10): the send-off unlocks — teach what graduating does.
    id: "graduation-ready",
    when: (s) => canGraduate(s).eligible,
    text: "A full career. Graduating retires this champion to the Hall of Fame and passes a stat floor to the next egg.",
  },
  {
    // Legacy prestige milestones (v10): teach each perk the first time it
    // takes effect. Gated on a founded line (>0 generations) so a
    // pre-legacy save's cup tally can never trigger them early. The
    // thresholds are the sim's constants, never literals — retuning a
    // milestone there must retune the coach line with it.
    id: "prestige-warm-bloodline",
    when: (s) =>
      s.lineage.generation > 0 && lineagePrestige(s) >= PRESTIGE_WARM_BLOODLINE,
    text: "Warm bloodline — your next egg will start with a stronger bond.",
  },
  {
    id: "prestige-established-line",
    when: (s) =>
      s.lineage.generation > 0 &&
      lineagePrestige(s) >= PRESTIGE_ESTABLISHED_LINE,
    text: "Established line — every inherited stat floor gains +1 from here on.",
  },
  // Silver Ladder (FR11): one-time boss-defeat callouts, deduped by
  // seenHints like every other coach line — the ledger is the trigger,
  // so the callout fires exactly once per scalp, even across reloads.
  {
    id: "boss-koda",
    when: (s) => s.bossDefeats.includes("koda"),
    text: "The Promotion gate is down — Sear Marshal Koda never saw it coming. Silver, meet your climber.",
  },
  {
    id: "boss-hesse",
    when: (s) => s.bossDefeats.includes("hesse"),
    text: "Verdant Dame Hesse falls. The ridge is behind you — the summit is ahead.",
  },
  {
    id: "boss-marlow",
    when: (s) => s.bossDefeats.includes("marlow"),
    text: "Marlow's tide breaks. Silver is yours — the Gold division opens.",
  },
  // Gold & Legend gatekeepers (gold_legend_ladder_20261017): one-time
  // scalp callouts, deduped by the seen-hints ledger like the originals.
  {
    id: "boss-delmar",
    when: (s) => s.bossDefeats.includes("delmar"),
    text: "Squall Herald Delmar blows through. The Gold division is calling your name.",
  },
  {
    id: "boss-fenn",
    when: (s) => s.bossDefeats.includes("fenn"),
    text: "Cinder Abbot Fenn's embers cool. The summit of Gold is close now.",
  },
  {
    id: "boss-thessa",
    when: (s) => s.bossDefeats.includes("thessa"),
    text: "The Grove Sovereign bows. Gold is yours — and the Legend gate stands open.",
  },
]

/** The first unseen hint whose moment is now, or null when all is quiet. */
export function selectHint(
  state: GameState,
  seenIds: ReadonlySet<string>,
): HudHint | null {
  return HINTS.find((h) => h.when(state) && !seenIds.has(h.id)) ?? null
}
