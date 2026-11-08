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
 * swing cannot be twitched away and a refused commit cannot be spammed. One
 * `ControllerProfile` table keyed off `Temperament` serves rivals and bosses
 * alike, and nothing rolls: a profile's shares partition a fixed ten-decision
 * cycle, so the rhythm comes from the table, not from a random source.
 */

import type { Temperament } from "../../species"
import { getFrameData } from "../frames"
import { BASIC_MOVE, getMove } from "../moves"
import { isBroken } from "./poise"
import {
  DODGE_CLEARANCE_MM,
  type ProjectileState,
  perpendicularOffsetMm,
  shotDirection,
} from "./projectile"
import { canAfford, DODGE_STAMINA_COST, spendDodge } from "./stamina"
import {
  type FighterState,
  type FightState,
  HOLD,
  type MoveIntent,
  STEP_MS,
  type Vec3,
} from "./types"

/** How often the controller re-decides, in ms (tunable, whole steps). */
export const DECISION_MS = 120

/** The same cadence counted in fixed steps: a decision every six of them. */
export const DECISION_STEPS = DECISION_MS / STEP_MS

/** Half-width of the range band a fighter tries to hold, in mm (tunable). */
export const RANGE_BAND_MM = 400

/** Decisions in one tactical cycle; a profile's shares partition it. */
const CYCLE = 10

/** The six things a fighter can want (FR-11). */
export type ControllerVerb =
  | "advance"
  | "retreat"
  | "strafe"
  | "hold"
  | "commit"
  | "dodge"

/** One archetype's tuning, read by rivals and bosses alike. */
export interface ControllerProfile {
  /** Share of each cycle spent pressing the attack, in percent. */
  readonly aggression: number
  /** Centre of the range band the fighter holds, in mm. */
  readonly preferredRangeMm: number
  /** Share of each cycle spent circling, in percent. */
  readonly strafeBias: number
  /** Distance at which an inbound shot is worth dodging, in mm. */
  readonly dodgeThresholdMm: number
}

/** The tuning table's shape: exactly one profile per temperament. */
export type ProfileTable = Readonly<Record<Temperament, ControllerProfile>>

/** One frozen row, in field order: aggression, range, strafe, dodge. */
function profile(
  aggression: number,
  preferredRangeMm: number,
  strafeBias: number,
  dodgeThresholdMm: number,
): ControllerProfile {
  return Object.freeze({
    aggression,
    preferredRangeMm,
    strafeBias,
    dodgeThresholdMm,
  })
}

/**
 * One table for the whole roster: `rush` closes and presses, `slow` hangs
 * back and circles, and `obedient` — the neutral default — sits between them.
 * The record type makes a missing temperament a compile error, not a silent
 * fallback, and no species gets a row of its own.
 */
export const CONTROLLER_PROFILES: ProfileTable = Object.freeze({
  rush: profile(80, 1400, 15, 2600),
  slow: profile(40, 2600, 45, 3400),
  obedient: profile(60, 2000, 30, 3000),
})

/** The profile for one temperament. */
export function profileFor(temperament: Temperament): ControllerProfile {
  return CONTROLLER_PROFILES[temperament]
}

/**
 * The controller's own state: its clock and the intent it is holding.
 * Everything else it needs comes from the fight.
 */
export interface ControllerState {
  /** Decisions taken since the opening; the cadence AC-11 observes. */
  readonly decisions: number
  /** The intent held between decisions; the fight moves under it. */
  readonly intent: MoveIntent
  /** The verb that intent expresses. */
  readonly verb: ControllerVerb
}

/**
 * Open a controller held still. It decides on its first step, so the opening
 * beat of a fight is a choice rather than a default.
 */
export function createController(): ControllerState {
  return { decisions: 0, intent: HOLD, verb: "hold" }
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
  ): ControllerDecision => {
    const next: ControllerState = { decisions, intent, verb }
    return { state: next, verb, intent, commit, dodgeCost }
  }

  // Commitment lock (FR-6): startup, active, and recovery all own the
  // fighter. Re-deciding here is what would let it kite mid-swing.
  if (me.attack) return settle(controller.verb, controller.intent)
  if (isBroken(me)) return settle(controller.verb, controller.intent)

  // A shot on this body's line is the one thing worth interrupting for. The
  // gate is the price `spendDodge` charges, so gate and pool cannot drift.
  const shot = incomingShot(state, side, profile.dodgeThresholdMm)
  if (shot && spendDodge(me) !== null) {
    const intent = dodgeIntent(shot, me, sign)
    return settle("dodge", intent, null, DODGE_STAMINA_COST)
  }

  const gapSq = planarGapSq(me.pos, foe.pos)
  const preferred = profile.preferredRangeMm
  const outer = preferred + RANGE_BAND_MM
  const inner = Math.max(0, preferred - RANGE_BAND_MM)
  if (gapSq > outer * outer) return settle("advance", aimAt(me, foe))
  if (gapSq < inner * inner) return settle("retreat", awayFrom(me, foe))

  // Inside the band the cycle decides: press, circle, or close.
  const slot = (decisions - 1) % CYCLE
  const press = Math.min(CYCLE, Math.round(profile.aggression / 10))
  const strafe = Math.min(CYCLE - press, Math.round(profile.strafeBias / 10))
  if (slot < press) {
    const moveId = chooseMove(me, kit, gapSq)
    if (moveId) return settle("commit", pressIntent(me, foe), moveId)
    return settle("advance", aimAt(me, foe))
  }
  if (slot < press + strafe) {
    return settle("strafe", strafeIntent(me, foe, sign))
  }
  return settle("advance", aimAt(me, foe))
}

/** Squared planar distance: every range test is a comparison, never a root. */
function planarGapSq(a: Vec3, b: Vec3): number {
  const dx = b.x - a.x
  const dz = b.z - a.z
  return dx * dx + dz * dz
}

/** The unit direction to the foe: the arena's one integer unit vector. */
function aimAt(me: FighterState, foe: FighterState): MoveIntent {
  return shotDirection(me.pos, foe.pos)
}

/** The unit direction away from the foe; bodies that share a centre hold. */
function awayFrom(me: FighterState, foe: FighterState): MoveIntent {
  const dir = shotDirection(me.pos, foe.pos)
  if (dir.x === 0 && dir.z === 0) return HOLD
  return { x: -dir.x, z: -dir.z }
}

/** The perpendicular of the approach: circling without closing. */
function strafeIntent(
  me: FighterState,
  foe: FighterState,
  sign: 1 | -1,
): MoveIntent {
  const dir = shotDirection(me.pos, foe.pos)
  if (dir.x === 0 && dir.z === 0) return HOLD
  return { x: -dir.z * sign, z: dir.x * sign }
}

/** A half-speed step at the foe: plant and keep the facing on the target. */
function pressIntent(me: FighterState, foe: FighterState): MoveIntent {
  const dir = shotDirection(me.pos, foe.pos)
  return { x: Math.trunc(dir.x / 2), z: Math.trunc(dir.z / 2) }
}

/**
 * The shot about to arrive on this body's line, or null: one further out than
 * `thresholdMm` is still travelling, and one already clearing the body misses.
 */
function incomingShot(
  state: FightState,
  side: 0 | 1,
  thresholdMm: number,
): ProjectileState | null {
  const me = state.fighters[side]
  const foeKey = state.fighters[side === 0 ? 1 : 0].key
  const thresholdSq = thresholdMm * thresholdMm
  let nearest: ProjectileState | null = null
  let nearestSq = Number.POSITIVE_INFINITY
  for (const shot of state.projectiles) {
    if (shot.ownerKey !== foeKey) continue
    const gapSq = planarGapSq(shot.pos, me.pos)
    if (gapSq > thresholdSq || gapSq >= nearestSq) continue
    if (perpendicularOffsetMm(shot, me.pos) > DODGE_CLEARANCE_MM) continue
    nearest = shot
    nearestSq = gapSq
  }
  return nearest
}

/**
 * Step off the shot's line: one cadence of perpendicular burst, on the side
 * the body already leans toward. A shot with no direction has no line to
 * leave, so the fighter holds.
 */
function dodgeIntent(
  shot: ProjectileState,
  me: FighterState,
  fallback: 1 | -1,
): MoveIntent {
  if (shot.dir.x === 0 && shot.dir.z === 0) return HOLD
  const dx = me.pos.x - shot.origin.x
  const dz = me.pos.z - shot.origin.z
  const cross = shot.dir.x * dz - shot.dir.z * dx
  let sign = fallback
  if (cross > 0) sign = 1
  else if (cross < 0) sign = -1
  return { dodge: { x: -shot.dir.z * sign, z: shot.dir.x * sign } }
}

/**
 * The move to commit: the heaviest affordable one whose authored reach covers
 * the gap, the innate strike as the contact fallback, ties broken on move id.
 * Null when nothing reaches, and the fighter should keep closing.
 */
function chooseMove(
  me: FighterState,
  kit: readonly string[],
  gapSq: number,
): string | null {
  let bestId: string | null = null
  let bestPower = -1
  for (const moveId of [...kit, BASIC_MOVE.id]) {
    const move = getMove(moveId)
    const row = getFrameData(moveId)
    if (!move || !row) continue
    if (row.reachMm * row.reachMm < gapSq) continue
    if (!canAfford(me, row.staminaCost)) continue
    const better = move.power > bestPower
    const tie = move.power === bestPower && bestId !== null && moveId < bestId
    if (!better && !tie) continue
    bestId = moveId
    bestPower = move.power
  }
  return bestId
}
