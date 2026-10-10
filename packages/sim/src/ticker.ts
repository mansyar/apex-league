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
export function advanceDay(state: GameState, rng?: Rng): GameState {
  const day = state.day + 1
  const next: GameState = {
    day,
    phase: isCupDay(day) ? "cup" : "day",
    actionPoints: ACTION_POINTS_PER_DAY,
    creature: state.creature,
    settings: state.settings,
  }
  if (!next.creature) return next
  const settled = settleCreature(next.creature, rng ?? makeRng(day))
  return { ...next, creature: settled }
}
