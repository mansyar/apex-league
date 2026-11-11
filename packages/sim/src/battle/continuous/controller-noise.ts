/**
 * Execution-only noise for the continuous controller (variance track Phase 2).
 *
 * FR-3/FR-4: the same matchup must fight differently per seed. The controller
 * may vary commit timing, dodge side, and punish-window use per seed. It must
 * NEVER change doctrine range bands, strafe intent, dodge policy (when a dodge
 * is ordered, its thresholds, cooldown, and price), or move-selection
 * strategy. Every helper here is therefore a gate or a mirror around a
 * decision the controller already made: bands come from
 * `controller-profile.ts`, intents from `controller-aim.ts`, and move choice
 * from `controller-moves.ts`, all untouched.
 *
 * FR-7/NFR-1: integer arithmetic only, one seeded RNG per fight, no wall
 * clock, no `Math.random`/`Date`. Every draw goes through the fight RNG, whose
 * cursor is mixed into `stateHash`, so the same seed replays byte-identically
 * and different seeds diverge.
 */

import type { Rng } from "../../rng"
import { awayFrom } from "./controller-aim"
import type { ControllerDecision, ControllerState } from "./controller-state"
import { hold } from "./controller-state"
import type { FighterState, MoveIntent } from "./types"

/**
 * Cadence jitter (FR-3/AC-3): one cadence in sixteen is skipped, holding the
 * previous order without advancing the doctrine cycle. Cadence and commit
 * phasing therefore drift per seed while the 12-step decision rhythm stays.
 */
export const CADENCE_SKIP_DENOM = 16

/** Commit timing (FR-4/AC-4): one press-slot commit in 32 is delayed a step. */
export const COMMIT_SKIP_DENOM = 32

/**
 * Punish-window use (FR-4/AC-4): one punish window in sixteen is let go. The
 * same density as press slots: punish windows are rarer, so each skipped one
 * still shows in the variance, while the telemetry cap share (AC-24) keeps
 * its headroom.
 */
export const PUNISH_SKIP_DENOM = 16

/**
 * Cadence jitter gate. Returns a hold when this cadence is skipped, or null
 * when the controller decides normally. The hold does not advance the
 * doctrine cycle, so the cycle phase drifts per seed.
 */
export function cadenceHold(
  controller: ControllerState,
  rng: Rng,
): ControllerDecision | null {
  if (rng.int(CADENCE_SKIP_DENOM) === 0) return hold(controller)
  return null
}

/**
 * Commit gate. Returns true when a commit the controller already ordered may
 * go ahead. `punish` selects the denser punish-window rate. With no RNG (unit
 * tests, legacy callers) every commit goes ahead, exactly as before.
 */
export function takeCommit(rng: Rng | undefined, punish: boolean): boolean {
  if (!rng) return true
  const denom = punish ? PUNISH_SKIP_DENOM : COMMIT_SKIP_DENOM
  return rng.int(denom) !== 0
}

/**
 * Dodge-side mirror (FR-4/AC-4). Swing-away dodges are radial: they have no
 * side, so mirroring them would send the fighter into the swing and they pass
 * through untouched. Shot-across dodges are perpendicular, so a 50/50 mirror
 * varies the side per seed. Dodge policy (when, thresholds, cooldown, price)
 * is unchanged: this only mirrors an already-ordered shot dodge.
 */
export function flankDodge(
  intent: MoveIntent,
  me: FighterState,
  foe: FighterState,
  rng: Rng | undefined,
): MoveIntent {
  if (!rng || !("dodge" in intent)) return intent
  const away = awayFrom(me, foe)
  if (intent.dodge.x === away.x && intent.dodge.z === away.z) return intent
  if (rng.int(2) === 0) {
    return { dodge: { x: -intent.dodge.x, z: -intent.dodge.z } }
  }
  return intent
}
