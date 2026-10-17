/**
 * The cup: a seeded 8-slot single-elimination bracket on cup days.
 *
 * Barrel module (cup_module_refactor_20261018): the implementation lives in
 * the ./cup submodules —
 *
 * - `./cup/bracket` — bracket construction and boss substitution
 * - `./cup/verdicts` — pairing resolution, battle sides, double-KO tiebreak
 * - `./cup/session` — the live session: entry, the player's branch, the
 *   bracket's completion, forfeit, placement, scalps
 *
 * This module re-exports the same public surface the monolith exported, so
 * every consumer import (`./cup`, `../cup`) stays untouched.
 */

export {
  BRACKET_SLOTS,
  type CupBracket,
  type CupSlot,
  CUP_ROUNDS,
  makeBracket,
  RIVAL_NAME_POOL,
  RIVAL_RAMP,
  substituteFinalBoss,
} from "./cup/bracket"
export {
  battleSideForSlot,
  cupMatchSeed,
  doubleKoAdvancingName,
  doubleKoWinner,
  type RivalResolution,
  type RoundVerdict,
  roundLabel,
} from "./cup/verdicts"
export {
  bossScalps,
  completeCup,
  cupPlacement,
  type CupSession,
  forfeitCup,
  resolvePlayerMatch,
  startCupSession,
} from "./cup/session"
