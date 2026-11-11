/**
 * Positional strike damage: the catalog's integer formula with an integer
 * positional and counter term folded in before the floor.
 *
 * Continuous Arena Battle FR-4 and FR-6. A flank or rear hit multiplies by
 * `num / den` — never a float — and a blow that lands on a recovering victim
 * adds the counter term. Both terms are integers, so the result is exact and
 * deterministic on every platform. A front, non-counter hit is exactly
 * `strikeDamage` in ../damage.
 *
 * Phase 5 folded the old 2x blow weight into `MoveDef.power` (FR-2), so this
 * function applies no weight of its own: the catalog's power is the whole
 * attack term, and the frozen legacy clock reads the same `strikeDamage`.
 */

import type { Element } from "../../creature"
import { incomingTypeFactor, type TypeFactor } from "../chart"
import { strikeDamage } from "../damage"

/** An integer multiplier `num / den`. */
export interface Ratio {
  readonly num: number
  readonly den: number
}

/** No bonus: a front hit that is not a counter. */
export const NEUTRAL_RATIO: Ratio = Object.freeze({ num: 1, den: 1 })

/** A hit landed on the victim's flank: +25%. */
export const FLANK_RATIO: Ratio = Object.freeze({ num: 5, den: 4 })

/** A hit landed on the victim's rear: +50%. */
export const REAR_RATIO: Ratio = Object.freeze({ num: 3, den: 2 })

/** A counter hit on a recovering victim: +25%. */
export const COUNTER_RATIO: Ratio = Object.freeze({ num: 5, den: 4 })

/** Where the attacker stood relative to the victim's facing (FR-4). */
export type HitPosition = "front" | "flank" | "rear"

/** The combat stats a strike reads; `spd` lives on the fighter itself. */
export interface StrikeStats {
  readonly atk: number
  readonly def: number
  /** Catalog element; absent for the typeless basic strike. */
  readonly element?: Element | undefined
  /** Secondary type affinity; read on the side taking the blow (FR-4). */
  readonly affinity?: Element | null | undefined
}

/** The profile a fight gets when it names no stats: typeless 1/1. */
export const NEUTRAL_STATS: StrikeStats = Object.freeze({ atk: 1, def: 1 })

/**
 * The attacker's type factor against one victim; typeless is neutral. The
 * victim's secondary affinity is read on the incoming side (FR-4).
 */
export function typeAgainst(
  attacker: StrikeStats,
  victim: StrikeStats,
): TypeFactor {
  if (!attacker.element || !victim.element) return { num: 1, den: 1 }
  return incomingTypeFactor(
    attacker.element,
    victim.element,
    victim.affinity ?? null,
  )
}

/** The multiplier one hit position carries. */
export function positionRatio(position: HitPosition): Ratio {
  if (position === "flank") return FLANK_RATIO
  if (position === "rear") return REAR_RATIO
  return NEUTRAL_RATIO
}

/** Everything one landed blow needs: the catalog stats and where it landed. */
export interface PositionalDamage {
  readonly power: number
  readonly atk: number
  readonly def: number
  /** The attacker's type factor against this victim. */
  readonly type: TypeFactor
  readonly position: HitPosition
  /** True when the victim was in recovery as the blow landed (FR-6). */
  readonly counter: boolean
}

/**
 * Damage for one landed blow. The blow weight and the positional and counter
 * terms multiply into the numerator and denominator the existing formula
 * already takes, so every hit still floors to an integer of at least 1.
 *
 * A bonus is never a no-op: on a chip hit the floor can swallow +25% (1 → 1),
 * so a positional or counter bonus keeps at least one point over the same
 * blow with no bonus. That is what makes AC-4's "a flank hit deals strictly
 * more than a front hit" hold at every stat line, not just the generous ones.
 */
export function positionalDamage(input: PositionalDamage): number {
  const position = positionRatio(input.position)
  const counter = input.counter ? COUNTER_RATIO : NEUTRAL_RATIO
  const damage = strikeDamage(
    input.power,
    input.atk,
    input.def,
    input.type.num * position.num * counter.num,
    input.type.den * position.den * counter.den,
    true,
  )
  if (input.position === "front" && !input.counter) return damage
  const plain = strikeDamage(
    input.power,
    input.atk,
    input.def,
    input.type.num,
    input.type.den,
    true,
  )
  return Math.max(plain + 1, damage)
}
