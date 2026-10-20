/**
 * Cup screen facade — the bracket board, coaching room, results card,
 * give-up modal and battle chrome used to live here; each one is now its
 * own module under cup/screens/ (cup_modules_per_screen split). This file
 * stays the single import site for cup.ts and cup/shared.ts, so the public
 * surface is unchanged: same names, same signatures.
 *
 * Pure structure — no session reads, no timers.
 */

export { buildBattleChips } from "./cup/screens/battle-chips"
export {
  type BracketScreenRefs,
  buildBracketScreen,
  type MatchCard,
} from "./cup/screens/bracket"
export { buildCoachScreen, type CoachScreenRefs } from "./cup/screens/coach"
export { buildGiveupModal, type GiveupModalRefs } from "./cup/screens/giveup"
export {
  buildResultsScreen,
  type ResultsScreenRefs,
} from "./cup/screens/results"
