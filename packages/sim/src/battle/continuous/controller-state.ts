/**
 * The controller's own state and the decision it hands back (FR-11): the
 * cadence clock, the held intent, the burst timers, and the bounded read on
 * the foe.
 *
 * Extracted from ./controller so the reach, punish, and memory seams each get
 * their own module without growing that file past the sim size cap. The shape
 * is unchanged; only where it is defined moved.
 */

import { EMPTY_MEMORY, type PatternMemory } from "./controller-memory"
import type { ControllerProfile } from "./controller-profile"
import type { RuleId } from "./controller-rule"
import { type FightState, HOLD, type MoveIntent, STEP_MS } from "./types"

/**
 * How often the controller re-decides, in ms (tunable, whole steps, FR-3):
 * 240 ms is four decisions a second, inside the 200-240 ms band.
 */
export const DECISION_MS = 240

/** The same cadence counted in fixed steps: a decision every twelve of them. */
export const DECISION_STEPS = DECISION_MS / STEP_MS

/** The seven things a fighter can want (FR-11). */
export type ControllerVerb =
  | "advance"
  | "retreat"
  | "strafe"
  | "hold"
  | "commit"
  | "dodge"
  | "slip"

/**
 * The controller's own state: its clock, the intent it is holding, when it may
 * lunge again, and the bounded read on the foe. Everything else it needs comes
 * from the fight.
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
  /** Fight time this controller may next order a step-around, in ms (FR-11). */
  readonly slipReadyMs: number
  /** Fight time the current cut ends, in ms; 0 when no cut is running. */
  readonly slipUntilMs: number
  /** The bounded read on the foe (FR-14); empty until the fight shows one. */
  readonly memory: PatternMemory
}

/**
 * Open a controller held still. It decides on its first step, so the opening
 * beat of a fight is a choice rather than a default, and it may lunge at once.
 */
export function createController(): ControllerState {
  return {
    decisions: 0,
    intent: HOLD,
    verb: "hold",
    dodgeReadyMs: 0,
    slipReadyMs: 0,
    slipUntilMs: 0,
    memory: EMPTY_MEMORY,
  }
}

/**
 * Fight time of the next decision, in ms. After `n` decisions the next lands
 * at `n * DECISION_MS`: a 600-step fight ends with 50 decisions and a next
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
  /**
   * The conditional rule in force (FR-13). Absent is the default and changes
   * nothing; exactly one id can be carried, so rules never stack.
   */
  readonly rule?: RuleId
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
  /** The rule that changed this decision (FR-13), or absent when none did. */
  readonly rule?: RuleId
}

/** Between decisions the controller repeats exactly what it ordered. */
export function hold(controller: ControllerState): ControllerDecision {
  return {
    state: controller,
    verb: controller.verb,
    intent: controller.intent,
    commit: null,
    dodgeCost: 0,
  }
}
