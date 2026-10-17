import { isCupDay } from "./calendar"
import type { LadderTier } from "./ladder"
import { makeRng, type Rng } from "./rng"
import { settleCreature } from "./settlement"
import { ACTION_POINTS_PER_DAY, type GameState } from "./state"

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
  }
  if (!next.creature) return next
  const settled = settleCreature(
    next.creature,
    rng ?? makeRng(day),
    state.day,
    state.cupsWon,
  )
  return { ...next, creature: settled }
}
