/**
 * The conditional rule: one coach's note laid over the doctrine.
 *
 * Battle Balance FR-13 and AC-13. A doctrine owns the plan — the range band,
 * the strafe, the dodge policy, the commit rhythm. A rule does not replace any
 * of that: it pre-empts **one** decision in a stated situation and hands the
 * plan straight back on the next cadence. Equipping none is the default and
 * changes nothing; exactly one id can be carried, so two rules can never stack
 * into a second controller.
 *
 * The seams live in ./controller: `ruleDodge` sits before the doctrine's own
 * reactions (a dodge rule has to be able to answer a wind-up before the rear
 * arc does), `ruleDisengage` sits after the dodge gate (no rule may suppress
 * the doctrine's answer to a blow about to land), and `ruleRefuses` filters the
 * move the doctrine was about to commit. Everything here is a pure read of the
 * fight and the controller state: integer arithmetic, no clock, no roll.
 */

import { getFrameData } from "../frames"
import { getMove } from "../moves"
import { bodyOf, reachesBody } from "./contact"
import type { ControllerDecision, DecisionInput } from "./controller"
import { awayFrom, retreatRoom, strafeIntent } from "./controller-aim"
import { DODGE_COOLDOWN_MS } from "./controller-dodge"
import { isBroken } from "./poise"
import { DODGE_STAMINA_COST } from "./stamina"
import type { FighterState, MoveIntent } from "./types"

/** The four notes a side may carry, in reading order. */
export type RuleId = "save_heavy" | "read_tell" | "keep_back" | "never_trade"

/** The rule ids in a fixed order, frozen like the doctrine table. */
export const RULE_IDS: readonly RuleId[] = Object.freeze([
  "save_heavy",
  "read_tell",
  "keep_back",
  "never_trade",
])

/** One rule as the coach wrote it: what it watches and what it changes. */
export interface RuleDef {
  readonly id: RuleId
  /** The short name the HUD and the coach's sheet use. */
  readonly label: string
  /** The situation that arms the rule, in one line. */
  readonly trigger: string
  /** The one decision it changes, in one line. */
  readonly action: string
}

/** The frozen rule table (FR-13, NFR-6): legible without any other document. */
export const RULES: Readonly<Record<RuleId, RuleDef>> = Object.freeze({
  save_heavy: Object.freeze({
    id: "save_heavy",
    label: "Save the heavy",
    trigger: "the doctrine reaches for a special while the foe is still up",
    action: "hold the heavy until the foe breaks or is nearly down",
  }),
  read_tell: Object.freeze({
    id: "read_tell",
    label: "Read the tell",
    trigger: "the foe winds up a strike whose reach covers this body",
    action: "commit to a dodge burst clear of the swing",
  }),
  keep_back: Object.freeze({
    id: "keep_back",
    label: "Keep something back",
    trigger: "the pool falls under its floor and the foe is not nearly down",
    action: "give ground or circle until the pool refills",
  }),
  never_trade: Object.freeze({
    id: "never_trade",
    label: "Never trade",
    trigger: "the foe is winding up a move that reaches this body",
    action: "refuse the commit and keep the feet moving",
  }),
})

/** The rule labels, keyed like the table (the HUD's read). */
export const RULE_LABELS: Readonly<Record<RuleId, string>> = Object.freeze({
  save_heavy: RULES.save_heavy.label,
  read_tell: RULES.read_tell.label,
  keep_back: RULES.keep_back.label,
  never_trade: RULES.never_trade.label,
})

/**
 * The pool share under which "keep something back" disengages, in percent
 * (tunable, FR-13): the spec's own example is 30% stamina.
 */
export const KEEP_BACK_FLOOR_PERCENT = 30

/**
 * The hit-point share at or under which a foe counts as a finisher, in percent
 * (tunable, FR-13): the last quarter of its pool is the window where saving
 * the heavy or holding back costs the fight instead of buying it.
 */
export const FINISHER_HP_PERCENT = 25

/** The one decision a rule takes instead of the doctrine's own. */
export interface RuleOrder {
  readonly id: RuleId
  /** The verb the rule orders: a burst, or a free walk. */
  readonly verb: "dodge" | "retreat" | "strafe"
  /** The movement order that expresses it. */
  readonly intent: MoveIntent
  /** Stamina the step charges for the order, in points; absent for a walk. */
  readonly dodgeCost?: number
  /** Fight time the ordered dodge may next fire; absent on a free walk. */
  readonly dodgeReadyMs?: number
}

/** True when the foe is in the last quarter of its pool (a finisher window). */
function finisher(foe: FighterState): boolean {
  return foe.hp * 100 <= foe.hpMax * FINISHER_HP_PERCENT
}

/** True when the foe is winding up a move whose authored reach covers this body. */
function tellReaches(foe: FighterState, me: FighterState): boolean {
  const attack = foe.attack
  if (attack?.phase !== "startup") return false
  const row = getFrameData(attack.moveId)
  return row !== undefined && reachesBody(bodyOf(foe), bodyOf(me), row.reachMm)
}

/** The two bodies a decision reads, from the side it orders. */
function bodies(input: DecisionInput): {
  me: FighterState
  foe: FighterState
} {
  const { state, side } = input
  return {
    me: state.fighters[side],
    foe: state.fighters[side === 0 ? 1 : 0],
  }
}

/**
 * "Read the tell" (FR-13): a strike winding up inside its reach is answered
 * with a dodge burst aimed clear of it, on the same cooldown and in the same
 * direction the doctrine's own gate uses. It is ordered even when the pool
 * cannot pay, so the step reports the refusal exactly like any other dodge;
 * the cooldown then keeps the note to one order per burst window.
 */
export function ruleDodge(input: DecisionInput): RuleOrder | null {
  if (input.rule !== "read_tell") return null
  if (input.state.elapsedMs < input.controller.dodgeReadyMs) return null
  const { me, foe } = bodies(input)
  if (!tellReaches(foe, me)) return null
  return {
    id: "read_tell",
    verb: "dodge",
    intent: { dodge: awayFrom(me, foe) },
    dodgeCost: DODGE_STAMINA_COST,
    dodgeReadyMs: input.state.elapsedMs + DODGE_COOLDOWN_MS,
  }
}

/**
 * "Keep something back" (FR-13): under the pool floor the note gives ground —
 * or circles when the fence is at its back — and does nothing else until the
 * pool refills. Both orders are free walks, so a body with no stamina can
 * always take one: the note cannot deadlock waiting for a resource it refuses
 * to spend.
 */
export function ruleDisengage(
  input: DecisionInput,
  retreatRadii: number,
): RuleOrder | null {
  if (input.rule !== "keep_back") return null
  const { me, foe } = bodies(input)
  if (me.stamina * 100 >= me.staminaMax * KEEP_BACK_FLOOR_PERCENT) return null
  if (finisher(foe)) return null
  const away = awayFrom(me, foe)
  const room = retreatRoom(me, away, input.state.bounds)
  if (room >= me.radiusMm * retreatRadii) {
    return { id: "keep_back", verb: "retreat", intent: away }
  }
  const sign: 1 | -1 = input.side === 0 ? 1 : -1
  return {
    id: "keep_back",
    verb: "strafe",
    intent: strafeIntent(me, foe, sign, input.profile.seeksRear),
  }
}

/**
 * The commit filter (FR-13): the rule that refuses the move the doctrine was
 * about to throw, or null when the commit stands.
 *
 * "Save the heavy" holds a special while the foe is neither broken nor nearly
 * down; `chooseMove` already picks the heaviest affordable special, so the
 * veto is exactly the heavy. "Never trade" refuses any commit into a wind-up
 * whose reach covers this body — the trade a punish doctrine avoids by
 * circling, and every other doctrine now avoids on this note.
 */
export function ruleRefuses(
  input: DecisionInput,
  moveId: string | null,
): RuleId | null {
  const rule = input.rule
  if (!rule || !moveId) return null
  const { me, foe } = bodies(input)
  if (rule === "never_trade") return tellReaches(foe, me) ? rule : null
  if (rule !== "save_heavy") return null
  const move = getMove(moveId)
  if (!move || move.melee) return null
  return !isBroken(foe) && !finisher(foe) ? rule : null
}

/** Stamp a decision with the rule that acted, or return it untouched. */
export function withRule(
  decision: ControllerDecision,
  rule: RuleId | null,
): ControllerDecision {
  return rule ? { ...decision, rule } : decision
}
