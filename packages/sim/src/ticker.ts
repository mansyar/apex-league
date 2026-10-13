import { isCupDay } from "./calendar"
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

export function advanceDay(state: GameState, rng?: Rng): GameState {
  const day = state.day + 1
  // Cup win bonus: the machine stamps the WIN on the cup day itself
  // (lastCupDay === current day means "today was a won cup"), so the next
  // advanceDay starts with the bonus budget.
  const budget =
    ACTION_POINTS_PER_DAY +
    (state.lastCupDay === state.day ? CUP_WIN_AP_BONUS : 0)
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
