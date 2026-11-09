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
  planarGapSq,
  pressIntent,
  retreatRoom,
  strafeIntent,
} from "./controller-aim"
import { dodgeOrder } from "./controller-dodge"
import { chooseMove } from "./controller-moves"
import {
  bandFor,
  type ControllerProfile,
  reachEdgeMm,
} from "./controller-profile"
import { rearCommit } from "./controller-rear"
import { slipOrder } from "./controller-slip"
import { isBroken } from "./poise"
import { DODGE_STAMINA_COST } from "./stamina"
import { type FightState, HOLD, type MoveIntent, STEP_MS } from "./types"

export {
  bandFor,
  CONTROLLER_PROFILES,
  type ControllerProfile,
  DOCTRINE_IDS,
  DOCTRINE_LABELS,
  DOCTRINES,
  type Doctrine,
  type DoctrineId,
  doctrineForTactic,
  PREFERRED_REACH_BAND_PERMILLE,
  type ProfileTable,
  preferredRangeFor,
  profileFor,
  profileForDoctrine,
  RANGE_BAND_MM,
  type RangeBand,
  REFERENCE_REACH_EDGE_MM,
  RETREAT_FRACTION_PERMILLE,
  reachEdgeMm,
  tacticForDoctrine,
} from "./controller-profile"

export { DODGE_LEAD_MS } from "./controller-threat"

/**
 * How often the controller re-decides, in ms (tunable, whole steps, FR-3):
 * 240 ms is four decisions a second, inside the 200-240 ms band. The old
 * 120 ms cadence let a fighter re-commit the moment recovery ended, which is
 * what made a fight read as a machine gun.
 */
export const DECISION_MS = 240

/** The same cadence counted in fixed steps: a decision every twelve of them. */
export const DECISION_STEPS = DECISION_MS / STEP_MS

/**
 * How many of its own radii of open floor a retreat needs, in radii (tunable,
 * FR-21): a body with less than this between it and the fence cannot give
 * ground, so it circles and fights instead of backing into the wall.
 */
export const RETREAT_ROOM_RADII = 2

/** Decisions in one tactical cycle; a profile's shares partition it. */
const CYCLE = 10

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
  /** Fight time this controller may next order a step-around, in ms (FR-11). */
  readonly slipReadyMs: number
  /** Fight time the current cut ends, in ms; 0 when no cut is running. */
  readonly slipUntilMs: number
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
  const decisionStep =
    state.step % DECISION_STEPS === 0 &&
    controller.decisions <= state.step / DECISION_STEPS
  if (!decisionStep) {
    // A cut has a fixed length (FR-11): between decisions it is released into
    // a hold at the step the window closes, so the burst is a cut and not a
    // second walk speed.
    if (
      controller.slipUntilMs > 0 &&
      state.elapsedMs >= controller.slipUntilMs
    ) {
      return {
        state: { ...controller, intent: HOLD, verb: "hold", slipUntilMs: 0 },
        verb: "hold",
        intent: HOLD,
        commit: null,
        dodgeCost: 0,
      }
    }
    return hold(controller)
  }

  const decisions = controller.decisions + 1
  const settle = (
    verb: ControllerVerb,
    intent: MoveIntent,
    commit: string | null = null,
    dodgeCost = 0,
    dodgeReadyMs = controller.dodgeReadyMs,
    slipReadyMs = controller.slipReadyMs,
    slipUntilMs = 0,
  ): ControllerDecision => {
    const next: ControllerState = {
      decisions,
      intent,
      verb,
      dodgeReadyMs,
      slipReadyMs,
      slipUntilMs,
    }
    return { state: next, verb, intent, commit, dodgeCost }
  }

  // Commitment lock (FR-6): startup, active, and recovery all own the
  // fighter. Re-deciding here is what would let it kite mid-swing.
  if (me.attack) return settle(controller.verb, controller.intent)
  if (isBroken(me)) return settle(controller.verb, controller.intent)

  // Circle takes the rear the moment it has it (FR-11): a basic strike's
  // startup is short enough that a body deep in the arc still lands there.
  // This outranks the dodge gate: the rear window is exactly when the foe has
  // just swung past, and punching the back beats stepping away from it.
  if (profile.seeksRear) {
    const rearMove = rearCommit(me, foe, kit)
    if (rearMove) return settle("commit", pressIntent(me, foe), rearMove)
  }

  // A blow about to land is the one thing worth interrupting for (FR-20).
  // ./controller-dodge owns the gate, its price, and the burst cooldown.
  const dodge = dodgeOrder(state, side, me, profile, controller.dodgeReadyMs)
  if (dodge) {
    return settle(
      "dodge",
      dodge.intent,
      null,
      DODGE_STAMINA_COST,
      dodge.readyMs,
    )
  }

  // A step-around cut (FR-11): a circling doctrine spends stamina for a short
  // burst of angle while the foe's facing is held down by its own swing. Its
  // own price and cooldown live in ./controller-slip; ./advance charges it.
  const cut = slipOrder(
    me,
    foe,
    profile.seeksRear === true,
    state.elapsedMs,
    controller.slipReadyMs,
  )
  const circle = (): ControllerDecision =>
    cut
      ? settle(
          "slip",
          cut.intent,
          null,
          0,
          controller.dodgeReadyMs,
          cut.readyMs,
          cut.untilMs,
        )
      : settle("strafe", strafeIntent(me, foe, sign, profile.seeksRear))

  const gapSq = planarGapSq(me.pos, foe.pos)
  const band = bandFor(profile, reachEdgeMm(me, foe))
  if (gapSq > band.ceilingMm * band.ceilingMm) {
    return settle("advance", aimAt(me, foe))
  }

  const slot = (decisions - 1) % CYCLE
  const press = Math.min(CYCLE, Math.round(profile.aggression / 10))
  const strafe = Math.min(CYCLE - press, Math.round(profile.strafeBias / 10))

  // Giving ground (FR-2): below the doctrine's range floor the pair is too
  // close to fight from, so the fighter backs off. Once it starts it keeps
  // backing off until the preferred range is reached, so the threshold cannot
  // be crossed back and forth decision after decision. The baseline's 2,014
  // retreats against a 539 mm median were exactly that oscillation: the verb
  // fired at contact distance and the fighter re-closed on the next window.
  const retreating = controller.verb === "retreat"
  const threshold = retreating ? band.preferredMm : band.floorMm
  if (gapSq < threshold * threshold) {
    const away = awayFrom(me, foe)
    // A body against a fence has nowhere to back off to (FR-21). Retreating
    // into the wall is how a cornered fighter used to spend the whole fight:
    // Phase 10 measured a pinned tortoise ordering 462 retreats, landing
    // nothing, while the foe swung freely. With its back to the fence it
    // circles and takes its press slots instead, so being cornered costs
    // position, not the fight, and it never shivers against the wall.
    const room = retreatRoom(me, away, state.bounds)
    if (room >= me.radiusMm * RETREAT_ROOM_RADII) {
      return settle("retreat", away)
    }
    const waiting =
      profile.commit === "punish" && foe.attack?.phase === "startup"
    if (slot < press && !waiting) {
      const moveId = chooseMove(me, foe, kit, gapSq)
      if (moveId) return settle("commit", pressIntent(me, foe), moveId)
    }
    return circle()
  }

  // Inside the band the cycle decides: press, circle, or close. Counter waits
  // out startup and only commits into recovery (FR-11).
  if (slot < press) {
    if (profile.commit === "punish" && foe.attack?.phase === "startup") {
      return circle()
    }
    const moveId = chooseMove(me, foe, kit, gapSq)
    if (moveId) return settle("commit", pressIntent(me, foe), moveId)
    return settle("advance", aimAt(me, foe))
  }
  if (slot < press + strafe) {
    return circle()
  }
  return settle("advance", aimAt(me, foe))
}
