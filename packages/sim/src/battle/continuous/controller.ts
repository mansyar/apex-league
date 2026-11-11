/**
 * The real-time controller: what one fighter wants, re-decided on a fixed
 * cadence while the fight moves underneath it (FR-11, AC-11).
 *
 * A locked fighter is never re-decided out of an attack (FR-6). The one thing
 * worth interrupting for is a blow about to land: a swing winding up, or a
 * shot nearly home, is answered with a one-window dodge burst (FR-20), then
 * held off by a cooldown. Nothing rolls: a profile's shares partition a fixed
 * ten-decision cycle, so the rhythm comes from the table.
 */

import type { Rng } from "../../rng"
import {
  aimAt,
  awayFrom,
  planarGapSq,
  pressIntent,
  retreatRoom,
  strafeIntent,
} from "./controller-aim"
import { dodgeOrder } from "./controller-dodge"
import { observe, strafeSide } from "./controller-memory"
import { chooseMove, landingEdgeMm } from "./controller-moves"
import { cadenceHold, flankDodge, takeCommit } from "./controller-noise"
import {
  PUNISH_RESERVE_STAMINA,
  punishMove,
  whiffStep,
} from "./controller-punish"
import { threatBandFor } from "./controller-reach"
import { rearCommit } from "./controller-rear"
import {
  type RuleOrder,
  ruleDisengage,
  ruleDodge,
  ruleRefuses,
  withRule,
} from "./controller-rule"
import { slipOrder } from "./controller-slip"
import {
  type ControllerDecision,
  type ControllerState,
  type ControllerVerb,
  DECISION_STEPS,
  type DecisionInput,
  hold,
} from "./controller-state"
import { isBroken } from "./poise"
import { DODGE_STAMINA_COST } from "./stamina"
import { HOLD, type MoveIntent } from "./types"

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

export {
  type ControllerDecision,
  type ControllerState,
  type ControllerVerb,
  createController,
  DECISION_MS,
  DECISION_STEPS,
  type DecisionInput,
  nextDecisionMs,
} from "./controller-state"

export { DODGE_LEAD_MS } from "./controller-threat"

/**
 * How many of its own radii of open floor a retreat needs, in radii (tunable,
 * FR-21): a body with less than this between it and the fence cannot give
 * ground, so it circles and fights instead of backing into the wall.
 */
export const RETREAT_ROOM_RADII = 2

/** Decisions in one tactical cycle; a profile's shares partition it. */
const CYCLE = 10

/**
 * Order one fighter's next intent: the held intent between decisions, or a
 * fresh verb from the fight state on a cadence step. A locked fighter keeps
 * what it had, so nothing here can cancel a swing or spam a refusal.
 *
 * Execution-only noise (variance Phase 2, FR-3/FR-4): pass the fight's RNG
 * and the cadence, commits, and dodge sides jitter per seed. Without it the
 * controller decides exactly as before, so doctrine bands, strafe intent,
 * dodge policy, and move choice are pinned unchanged.
 */
export function decide(input: DecisionInput, rng?: Rng): ControllerDecision {
  const { state, side, controller, profile, kit } = input
  const me = state.fighters[side]
  const foe = state.fighters[side === 0 ? 1 : 0]
  const sign: 1 | -1 = side === 0 ? 1 : -1

  // The cadence: one decision per cadence step, and never twice on one step.
  const decisionStep =
    state.step % DECISION_STEPS === 0 &&
    controller.decisions <= state.step / DECISION_STEPS
  if (!decisionStep) {
    // A cut has a fixed length (FR-11): it is released into a hold at the step
    // the window closes, so the burst is a cut and not a second walk speed.
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

  // Seeded cadence jitter (FR-3): a skipped cadence holds without advancing
  // the doctrine cycle, so commit phasing drifts per seed. Slip release above
  // is time-based and never skipped.
  if (rng) {
    const held = cadenceHold(controller, rng)
    if (held) return held
  }

  const decisions = controller.decisions + 1
  const memory = observe(controller.memory, me, foe, state.elapsedMs)
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
      memory,
    }
    return { state: next, verb, intent, commit, dodgeCost }
  }
  const apply = (order: RuleOrder): ControllerDecision =>
    withRule(
      settle(
        order.verb,
        order.intent,
        null,
        order.dodgeCost,
        order.dodgeReadyMs,
      ),
      order.id,
    )

  // Commitment lock (FR-6): startup, active, and recovery all own the
  // fighter. Re-deciding here is what would let it kite mid-swing.
  if (me.attack) return settle(controller.verb, controller.intent)
  if (isBroken(me)) return settle(controller.verb, controller.intent)

  // The dodge rule (FR-13) answers a wind-up before the doctrine reacts;
  // ./controller-rule owns its trigger, direction, and cooldown.
  const dodgeNote = ruleDodge(input)
  if (dodgeNote) return apply(dodgeNote)

  // Circle takes the rear the moment it has it (FR-11): a basic strike's
  // startup is short enough that a body deep in the arc still lands there.
  // This outranks the dodge gate: the rear window is exactly when the foe has
  // just swung past, and punching the back beats stepping away from it.
  if (profile.seeksRear) {
    const rearMove = rearCommit(me, foe, kit)
    if (rearMove && takeCommit(rng, false)) {
      return settle("commit", pressIntent(me, foe), rearMove)
    }
  }

  // A blow about to land is the one thing worth interrupting for (FR-20).
  // ./controller-dodge owns the gate, its price, and the burst cooldown.
  const dodge = dodgeOrder(state, side, me, profile, controller.dodgeReadyMs)
  if (dodge) {
    return settle(
      "dodge",
      flankDodge(dodge.intent, me, foe, rng),
      null,
      DODGE_STAMINA_COST,
      dodge.readyMs,
    )
  }

  const gapSq = planarGapSq(me.pos, foe.pos)

  // Step out of a whiff (FR-14): when the burst is on cooldown or the pool
  // cannot pay, a swing a walk can clear is still left rather than stood in.
  // ./controller-punish owns the clearance and the walk budget.
  const stepOut = whiffStep(me, foe, gapSq)
  if (stepOut) return settle("retreat", stepOut)

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
      : settle(
          "strafe",
          strafeIntent(
            me,
            foe,
            strafeSide(memory, state.elapsedMs, sign, profile.seeksRear),
            profile.seeksRear,
          ),
        )

  // "Keep something back" (FR-13) is a plan-level note: it gives ground while
  // the pool is under its floor, after the dodge gate has had its say.
  const holdNote = ruleDisengage(input, RETREAT_ROOM_RADII)
  if (holdNote) return apply(holdNote)

  const band = threatBandFor(profile, me, foe)
  if (gapSq > band.ceilingMm * band.ceilingMm) {
    return settle("advance", aimAt(me, foe))
  }

  // Punish timing (FR-14): a recovering or broken foe is a window the cycle
  // does not get to miss, and it outranks giving ground — the doctrine's own
  // outer bound above still applies. ./controller-punish owns the read and the
  // move; the rule still gets to refuse it. Circle punishes through the rear
  // arc instead: a frontal press would trade its plan for another's (FR-14).
  const punish =
    profile.commit === "punish" ? punishMove(input, gapSq, memory) : null
  if (punish) {
    const refused = ruleRefuses(input, punish)
    if (!refused && takeCommit(rng, true)) {
      return settle("commit", pressIntent(me, foe), punish)
    }
  }

  const slot = (decisions - 1) % CYCLE
  const press = Math.min(CYCLE, Math.round(profile.aggression / 10))
  const strafe = Math.min(CYCLE - press, Math.round(profile.strafeBias / 10))

  // Giving ground (FR-2): below the doctrine's range floor the pair is too
  // close to fight from, so it backs off, and keeps backing off until the
  // preferred range is reached. Without that latch the verb fired at contact
  // distance and the fighter re-closed on the next window: the baseline's
  // 2,014 retreats against a 539 mm median were exactly that oscillation.
  const retreating = controller.verb === "retreat"
  const threshold = retreating ? band.preferredMm : band.floorMm
  if (gapSq < threshold * threshold) {
    const away = awayFrom(me, foe)
    // A body against a fence has nowhere to back off to (FR-21): retreating
    // into the wall is how a cornered fighter used to spend the whole fight
    // (Phase 10: a pinned tortoise ordered 462 retreats and landed nothing).
    // With its back to the fence it circles and takes its press slots instead.
    const room = retreatRoom(me, away, state.bounds)
    if (room >= me.radiusMm * RETREAT_ROOM_RADII) {
      return settle("retreat", away)
    }
    const waiting =
      profile.commit === "punish" && foe.attack?.phase === "startup"
    if (slot < press && !waiting) {
      const moveId = chooseMove(me, foe, kit, gapSq, PUNISH_RESERVE_STAMINA)
      const refused = ruleRefuses(input, moveId)
      if (moveId && !refused && takeCommit(rng, false)) {
        return settle("commit", pressIntent(me, foe), moveId)
      }
      if (refused) return withRule(circle(), refused)
    }
    return circle()
  }

  // Inside the band the cycle decides: press, circle, or close. Counter waits
  // out startup and only commits into recovery (FR-11).
  if (slot < press) {
    if (profile.commit === "punish" && foe.attack?.phase === "startup") {
      return circle()
    }
    const moveId = chooseMove(me, foe, kit, gapSq, PUNISH_RESERVE_STAMINA)
    const refused = ruleRefuses(input, moveId)
    if (moveId && !refused && takeCommit(rng, false)) {
      return settle("commit", pressIntent(me, foe), moveId)
    }
    // Nothing lands from here (FR-10, AC-9): if a ready move would land from
    // further out, give ground until the gap reaches that edge instead of
    // circling inside the blind spot. The order is re-decided every cadence,
    // so the walk stops as soon as the gap is on the edge; a cornered fighter
    // still circles, because backing into the fence is not a step away.
    if (!moveId) {
      const edge = landingEdgeMm(me, foe, kit, gapSq, PUNISH_RESERVE_STAMINA)
      if (edge !== null && gapSq < edge * edge) {
        const away = awayFrom(me, foe)
        const room = retreatRoom(me, away, state.bounds)
        if (room >= me.radiusMm * RETREAT_ROOM_RADII) {
          return settle("retreat", away)
        }
      }
    }
    return withRule(settle("advance", aimAt(me, foe)), refused)
  }
  if (slot < press + strafe) {
    return circle()
  }
  return settle("advance", aimAt(me, foe))
}
