/**
 * Tactics and temperament: the pure action-choice layer.
 *
 * The tactic says what an obedient fighter does; the temperament may
 * override it (`rush` closes from afar, `slow` hesitates once). Never a
 * damage modifier, never a roll — the seed is not consulted here.
 *
 * Best-special ranking (spec FR6): highest expected damage
 * (integer damage assuming a hit times accuracy / 100), then higher
 * power, then move id ascending. A ready special that would KO the
 * opponent overrides the ranking: the most cinematic finisher (highest
 * power, then move id) fires under either tactic
 * (battle-animation-overhaul spec FR2).
 */

import type { Temperament } from "../species"
import { typeFactor } from "./chart"
import type { ClockFighter, PlannedAction } from "./clock"
import { BASIC, CLOSE, HOLD } from "./clock"
import { strikeDamage } from "./damage"
import { BASIC_MOVE, getMove } from "./moves"

/** The two pre-battle tactics the trainer can set before a spar. */
export type Tactic = "balanced" | "specials"

export interface PolicyInput {
  readonly fighter: Readonly<ClockFighter>
  readonly opponent: Readonly<ClockFighter>
  /** The fighter's four equipped special move ids, in kit order. */
  readonly kit: readonly string[]
  readonly tactic: Tactic
  readonly temperament: Temperament
  /** How many actions this fighter has taken; 0 is the first. */
  readonly actionCount: number
}

/** A special ranked by the spec's expected-damage order. */
interface RankedSpecial {
  readonly moveId: string
  readonly power: number
  readonly accuracy: number
  readonly damage: number
  readonly expected: number
}

const rank = (a: RankedSpecial, b: RankedSpecial): number => {
  if (b.expected !== a.expected) return b.expected - a.expected
  if (b.power !== a.power) return b.power - a.power
  return a.moveId.localeCompare(b.moveId)
}

function damageOf(
  moveId: string,
  attacker: Readonly<ClockFighter>,
  defender: Readonly<ClockFighter>,
): {
  readonly damage: number
  readonly power: number
  readonly accuracy: number
} {
  const move = getMove(moveId)
  if (!move) throw new Error(`Unknown move: ${moveId}`)
  const type = typeFactor(attacker.element, defender.element)
  const damage = strikeDamage(
    move.power,
    attacker.stats.atk,
    defender.stats.def,
    type.num,
    type.den,
    true,
  )
  return { damage, power: move.power, accuracy: move.accuracy }
}

/** Ready equipped specials, ordered by the spec's best-special ranking. */
function rankedReady(input: PolicyInput): RankedSpecial[] {
  const list: RankedSpecial[] = []
  for (const moveId of input.kit) {
    if (moveId === BASIC_MOVE.id) continue
    const move = getMove(moveId)
    if (!move) throw new Error(`Unknown move: ${moveId}`)
    if ((input.fighter.cooldowns[moveId] ?? 0) > 0) continue
    const d = damageOf(moveId, input.fighter, input.opponent)
    list.push({
      moveId,
      power: d.power,
      accuracy: d.accuracy,
      damage: d.damage,
      expected: (d.damage * d.accuracy) / 100,
    })
  }
  list.sort(rank)
  return list
}

/** Qualifiers for Balanced: a super-effective shot or one that would KO. */
function balancedQualifiers(
  all: RankedSpecial[],
  input: PolicyInput,
): RankedSpecial[] {
  return all.filter((r) => {
    if (r.damage >= input.opponent.hp) return true
    const type = typeFactor(input.fighter.element, input.opponent.element)
    return type.num > type.den
  })
}

/**
 * What the fighter does. Temperament overrides run first; the tactic rules
 * follow. Pure — no seed, no rng, no side effects.
 */
export function chooseAction(input: PolicyInput): PlannedAction {
  const { fighter, tactic, temperament } = input

  if (temperament === "rush" && fighter.range === "far") return CLOSE
  if (temperament === "slow" && input.actionCount === 0) return HOLD

  const ready = rankedReady(input)

  // Finishing-move preference (battle-animation-overhaul spec FR2): any
  // ready special that would KO is a finisher — fire the most cinematic
  // one (highest power, then move id ascending) under either tactic.
  // With the current catalog this matches the expected-damage ranking,
  // but the contract is explicit so future kits cannot trade the KO
  // blow for a safer chip shot.
  const lethal = ready.filter((r) => r.damage >= input.opponent.hp)
  if (lethal.length > 0) {
    const finisher = [...lethal].sort(
      (a, b) => b.power - a.power || a.moveId.localeCompare(b.moveId),
    )[0]
    if (finisher) return { kind: "special", moveId: finisher.moveId }
  }

  if (tactic === "specials") {
    const best = ready[0]
    return best
      ? { kind: "special", moveId: best.moveId }
      : far(fighter)
        ? CLOSE
        : BASIC
  }

  const qualifying = balancedQualifiers(ready, input)
  const best = qualifying[0]
  if (best) return { kind: "special", moveId: best.moveId }
  return far(fighter) ? CLOSE : BASIC
}

function far(f: Readonly<ClockFighter>): boolean {
  return f.range === "far"
}
