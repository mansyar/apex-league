/**
 * The live cup session (part of the cup, live-cup spec): the bracket
 * pre-resolves its player-independent rival subtree at entry; the player's
 * branch resolves on demand with the coaching room's picks, and the bracket
 * always plays out to a champion.
 *
 * Everything here is pure and DOM-free: every resolution returns a new
 * immutable session. Split out of the former monolithic cup.ts
 * (cup_module_refactor_20261018) — pure relocation, no behavior change.
 * Bracket construction lives in ./bracket, pairing resolution in
 * ./verdicts.
 *
 * Barrel module (sim-voxel-size-guard, phase 2): the implementation lives in
 * the ./session submodules —
 *
 * - `./session/walk` — the live walk: entry, the player's match, the finish
 * - `./session/standing` — the final placement and the boss scalps
 *
 * This module re-exports the same public surface the monolith exported, so
 * every consumer import (`./cup/session`) stays untouched.
 */

export { bossScalps, cupPlacement } from "./session/standing"
export {
  type CupSession,
  completeCup,
  forfeitCup,
  resolvePlayerMatch,
  startCupSession,
} from "./session/walk"
