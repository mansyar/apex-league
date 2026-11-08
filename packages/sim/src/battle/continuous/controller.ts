/**
 * The real-time controller: what one fighter wants, re-decided on a fixed
 * cadence while the fight keeps moving underneath it.
 *
 * Continuous Arena Battle FR-11 and AC-11. `../policy` picks one action per
 * gauge window; this orders six verbs — advance, retreat, strafe, hold,
 * commit, dodge — every `DECISION_MS` of fight time and holds that intent in
 * between, so a replay observes the cadence and two runs from one seed order
 * the same fight.
 *
 * A fighter locked into an attack is never re-decided out of it (FR-6), so a
 * swing cannot be twitched away and a refused commit cannot be spammed. The
 * one thing worth interrupting for is a blow about to land: a swing still
 * winding up, or a shot nearly home on this body's line, is answered with a
 * one-window dodge burst aimed clear of it (FR-20), then held off by a
 * cooldown. One `ControllerProfile` table keyed off `Temperament` serves
 * rivals and bosses alike, and nothing rolls: a profile's shares partition a
 * fixed ten-decision cycle, so the rhythm comes from the table, not from a
 * random source.
 */

import {
  aimAt,
  awayFrom,
  dodgeIntent,
  hasRoomToBackOff,
  planarGapSq,
  pressIntent,
  strafeIntent,
} from "./controller-aim"
import { chooseMove } from "./controller-moves"
import type { ControllerProfile } from "./controller-profile"
import { DODGE_LEAD_MS, incomingShot, incomingSwing } from "./controller-threat"
import { isBroken } from "./poise"
import { DODGE_STAMINA_COST, spendDodge } from "./stamina"
import { type FightState, HOLD, type MoveIntent, STEP_MS } from "./types"

export {
  CONTROLLER_PROFILES,
  type ControllerProfile,
  type ProfileTable,
  profileFor,
} from "./controller-profile"

export { DODGE_LEAD_MS } from "./controller-threat"

/** How often the controller re-decides, in ms (tunable, whole steps). */
export const DECISION_MS = 120

/** The same cadence counted in fixed steps: a decision every six of them. */
export const DECISION_STEPS = DECISION_MS / STEP_MS

/** Half-width of the range band a fighter tries to hold, in mm (tunable). */
export const RANGE_BAND_MM = 400

/** Decisions in one tactical cycle; a profile's shares partition it. */
const CYCLE = 10

/**
 * How long a fighter must wait after a burst before it can lunge again, in ms
 * (tunable, FR-20): long enough that a dodge is a commitment, not a stutter.
 */
export const DODGE_COOLDOWN_MS = 700

/**
 * How far past its own width a body must clear an incoming line before it
 * stops dodging, in mm (tunable, FR-20): the margin over `radiusMm` that makes
 * a cleared shot a miss rather than a graze.
 */
export const DODGE_MARGIN_MM = 40

/** The six things a fighter can want (FR-11). */
export type ControllerVerb =
  | "advance"
  | "retreat"
  | "strafe"
  | "hold"
  | "commit"
  | "dodge"

/**
 * The controller's own state: its clock, the intent it is holding, and when it
 * may lunge again. Everything else it needs comes from the fight.
 */
export interface ControllerState {
  /** Decisions taken since the opening; the cadence AC-11 observes. */
  readonly decisions: number
  /** The intent held between decisions; the fight moves under it. */
  readonly intent: MoveIntent
  /** The verb that intent expresses. */
  readonly verb: ControllerVerb
  /** Fight time this controller may next order a dodge, in ms (FR-20). */
  readonly dodgeReadyMs: number
}

/**
 * Open a controller held still. It decides on its first step, so the opening
 * beat of a fight is a choice rather than a default, and it may lunge at once.
 */
export function createController(): ControllerState {
  return { decisions: 0, intent: HOLD, verb: "hold", dodgeReadyMs: 0 }
}

/**
 * Fight time of the next decision, in ms. After `n` decisions the next lands
 * at `n * DECISION_MS`: a 600-step fight ends with 100 decisions and a next
 * decision at 12,000 ms.
 */
export function nextDecisionMs(state: ControllerState): number {
  return state.decisions * DECISION_MS
}

/** Everything one decision reads: the fight, the side, and its own tuning. */
export interface DecisionInput {
  /** The fight as it stands at the top of the step. */
  readonly state: FightState
  /** Which side this controller orders. */
  readonly side: 0 | 1
  /** The controller's state, as the last decision left it. */
  readonly controller: ControllerState
  /** The archetype tuning the controller reads. */
  readonly profile: ControllerProfile
  /** The moves this side may commit, in kit order. */
  readonly kit: readonly string[]
}

/** What one decision ordered: the next state, the verb, and any commit. */
export interface ControllerDecision {
  /** The controller's state after the decision, or the held one. */
  readonly state: ControllerState
  /** The verb the intent expresses. */
  readonly verb: ControllerVerb
  /** The movement order to advance the next step with. */
  readonly intent: MoveIntent
  /** Move id to commit, or null. Refusals are avoided, never spammed. */
  readonly commit: string | null
  /** Stamina the step charges for this dodge, in points; 0 otherwise. */
  readonly dodgeCost: number
}

/** Between decisions the controller repeats exactly what it ordered. */
function hold(controller: ControllerState): ControllerDecision {
  return {
    state: controller,
    verb: controller.verb,
    intent: controller.intent,
    commit: null,
    dodgeCost: 0,
  }
}

/**
 * Order one fighter's next intent. Between decisions this returns the held
 * intent untouched; on a cadence step it picks a verb from the fight state
 * alone. A locked fighter keeps the verb and intent it had and asks for no
 * commit, so nothing here can cancel a swing or spam a refusal.
 */
export function decide(input: DecisionInput): ControllerDecision {
  const { state, side, controller, profile, kit } = input
  const me = state.fighters[side]
  const foe = state.fighters[side === 0 ? 1 : 0]
  const sign: 1 | -1 = side === 0 ? 1 : -1

  // The cadence: one decision per cadence step, and never twice on one step.
  if (state.step % DECISION_STEPS !== 0) return hold(controller)
  if (controller.decisions > state.step / DECISION_STEPS)
    return hold(controller)

  const decisions = controller.decisions + 1
  const settle = (
    verb: ControllerVerb,
    intent: MoveIntent,
    commit: string | null = null,
    dodgeCost = 0,
    dodgeReadyMs = controller.dodgeReadyMs,
  ): ControllerDecision => {
    const next: ControllerState = { decisions, intent, verb, dodgeReadyMs }
    return { state: next, verb, intent, commit, dodgeCost }
  }

  // Commitment lock (FR-6): startup, active, and recovery all own the
  // fighter. Re-deciding here is what would let it kite mid-swing.
  if (me.attack) return settle(controller.verb, controller.intent)
  if (isBroken(me)) return settle(controller.verb, controller.intent)

  // A blow about to land is the one thing worth interrupting for (FR-20): a
  // swing still winding up is stepped away from, and a shot nearly home on
  // this body's line is stepped across. Both are gated by the price
  // `spendDodge` charges and by the burst cooldown, so the gate and the pool
  // cannot drift and a refusal is never a no-op.
  if (state.elapsedMs >= controller.dodgeReadyMs && spendDodge(me) !== null) {
    const ready = state.elapsedMs + DODGE_COOLDOWN_MS
    const swing = incomingSwing(state, side)
    const away = swing ? awayFrom(me, swing) : HOLD
    if (away.x !== 0 || away.z !== 0) {
      return settle("dodge", { dodge: away }, null, DODGE_STAMINA_COST, ready)
    }
    const shot = incomingShot(
      state,
      side,
      profile.dodgeThresholdMm,
      me.radiusMm + DODGE_MARGIN_MM,
      DODGE_LEAD_MS,
    )
    if (shot) {
      const intent = dodgeIntent(shot, me, sign)
      return settle("dodge", intent, null, DODGE_STAMINA_COST, ready)
    }
  }

  const gapSq = planarGapSq(me.pos, foe.pos)
  const preferred = profile.preferredRangeMm
  const outer = preferred + RANGE_BAND_MM
  const inner = Math.max(0, preferred - RANGE_BAND_MM)
  if (gapSq > outer * outer) return settle("advance", aimAt(me, foe))
  if (gapSq < inner * inner) {
    const away = awayFrom(me, foe)
    // A body against a fence has nowhere to back off to (FR-21). Retreating
    // into the wall is how a cornered fighter used to spend the whole fight:
    // Phase 10 measured a pinned tortoise ordering 462 retreats, landing
    // nothing, while the foe swung freely. With its back to the fence it
    // fights instead, so being cornered costs position, not the fight.
    if (hasRoomToBackOff(me, away, state.bounds)) {
      return settle("retreat", away)
    }
  }

  // Inside the band the cycle decides: press, circle, or close.
  const slot = (decisions - 1) % CYCLE
  const press = Math.min(CYCLE, Math.round(profile.aggression / 10))
  const strafe = Math.min(CYCLE - press, Math.round(profile.strafeBias / 10))
  if (slot < press) {
    const moveId = chooseMove(me, foe, kit, gapSq)
    if (moveId) return settle("commit", pressIntent(me, foe), moveId)
    return settle("advance", aimAt(me, foe))
  }
  if (slot < press + strafe) {
    return settle("strafe", strafeIntent(me, foe, sign))
  }
  return settle("advance", aimAt(me, foe))
}
