import { headStartAp } from "./ap"
import { isCupDay } from "./calendar"
import type { LadderTier } from "./ladder"
import { hatchDayOf, lineagePerks, lineagePrestige } from "./legacy"
import { makeRng, type Rng } from "./rng"
import { settleCreature } from "./settlement"
import {
  ACTION_POINTS_PER_DAY,
  type GameState,
  markEvolutionKnown,
} from "./state"

/**
 * Advance the simulation by one in-game day.
 * Pure: returns a new state, never mutates the input.
 *
 * When the state owns a creature, the nightly settlement runs in fixed
 * order (hunger, sleep recovery, sickness, mood, bond). The rng parameter
 * feeds the sickness roll; when omitted it defaults to a day-seeded rng so
 * plain day-ticking stays deterministic and replayable.
 */
/** Extra AP budget for the day following a cup win (cup reward FR5). */
export const CUP_WIN_AP_BONUS = 1

/**
 * Extra AP budget on top of CUP_WIN_AP_BONUS for champions of the higher
 * tiers (gold_legend_ladder_20261017, spec FR4): a Gold cup win pays +1
 * extra (champion budget +2 total), a Legend cup win +2 (+3 total).
 * Derived from the ladder tier at advance time — the ladder is final
 * between the cup day and the next advanceDay, so no extra stamp is
 * needed.
 */
export const TIER_AP_BONUS: Readonly<Record<LadderTier, number>> =
  Object.freeze({ bronze: 0, silver: 0, gold: 1, legend: 2 })

export function advanceDay(state: GameState, rng?: Rng): GameState {
  const day = state.day + 1
  // Cup win bonus: the machine stamps the WIN on the cup day itself
  // (lastCupDay === current day means "today was a won cup"), so the next
  // advanceDay starts with the bonus budget. The tier stacks its extra on
  // top (gold/legend champions train on a bigger budget).
  const budget =
    ACTION_POINTS_PER_DAY +
    (state.lastCupDay === state.day
      ? CUP_WIN_AP_BONUS + TIER_AP_BONUS[state.ladder.tier]
      : 0) +
    // Champion Stable head-start (prestige perks FR-5): +1 max AP for the
    // hatchling's first five in-game days, derived from the lineage's
    // hatch-day data so it auto-expires — a cup day is budgeted by the
    // same rule, so match prep on the expiry day resolves correctly.
    (state.creature
      ? headStartAp(
          hatchDayOf(state.lineage),
          day,
          lineagePerks(lineagePrestige(state)).championStable,
        )
      : 0)
  const next: GameState = {
    day,
    phase: isCupDay(day) ? "cup" : "day",
    actionPoints: budget,
    creature: state.creature,
    settings: state.settings,
    cupsWon: state.cupsWon,
    lastCupDay: state.lastCupDay,
    ladder: state.ladder,
    // The bloodline carries across every day (save v10) — ticking a day can
    // never touch generations or the Hall of Fame.
    lineage: state.lineage,
    // The boss ledger carries across every day (save v11) — ticking a day
    // never revises defeat history.
    bossDefeats: state.bossDefeats,
    legendTitles: state.legendTitles,
    // Evolution discovery (save v17) carries across every day; the settlement
    // below only ever adds a gate, never removes one.
    evolutionKnowledge: state.evolutionKnowledge,
    // The per-tier league reward claims (save v25) carry across every day —
    // the stamps are applied only by the cup finalize's reward seam.
    claimedTiers: [...state.claimedTiers],
    // The granted eggs wait for the player (save v25): a day tick never
    // hatches them and never drops them.
    pendingRewards: [...state.pendingRewards],
    // The stable (save v24) carries across every day untouched: a stashed
    // pet is frozen — it never ages, never decays and never trains.
    stable: [...state.stable],
  }
  if (!next.creature) return next
  const before = next.creature.stage
  const settled = settleCreature(
    next.creature,
    rng ?? makeRng(day),
    state.cupsWon,
  )
  // The night the pet just slept makes it a day older: the age it carries
  // during the next day is one more than the age the gate judged tonight
  // (the gate reads the age the pet had lived, not the age it gained).
  // Only the active pet is settled, so only the active pet ages — a pet in
  // the stable (Phase 2) never sees this seam.
  const aged: typeof settled = { ...settled, ageDays: settled.ageDays + 1 }
  // Discovery is earned, not inferred: only a real stage change proves the
  // gate. A baby that matured reveals the juvenile gate; a juvenile that took
  // the champion step reveals both (the champion gate only exists once the
  // juvenile one is cleared). A no-evolution night records nothing, and a
  // champion never resets what the player already learned.
  const evolved = { ...next, creature: aged }
  if (before === "baby" && settled.stage === "juvenile") {
    return markEvolutionKnown(evolved, "juvenile")
  }
  if (before === "juvenile" && settled.stage === "champion") {
    return markEvolutionKnown(
      markEvolutionKnown(evolved, "juvenile"),
      "champion",
    )
  }
  return evolved
}
