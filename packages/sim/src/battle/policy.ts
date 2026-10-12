/**
 * Tactics and temperament: the pure action-choice layer.
 *
 * The tactic says what an obedient fighter does; the temperament may
 * override it (`rush` closes from afar, `slow` hesitates once). Never a
 * damage modifier, never a roll — the seed is not consulted here.
 *
 * Best-special ranking (spec FR6): each tactic ranks the ready kit by its
 * OWN objective, the way Pokémon's Strong AI (most damage, then the KO) and
 * Basic AI (don't spend an action on a move with no effect) differ by what
 * they value rather than by whether they act. Both tactics read the same
 * "is firing worth this action window" bar — `kitSustained` against the free
 * Strike — so the bar cannot be the difference between them, only the choice
 * of move is.
 *
 * - `balanced` ranks by expected damage: integer damage assuming a hit times
 *   accuracy / 100, then higher power, then move id ascending.
 * - `specials` ranks by sustained damage: that expected value divided by the
 *   number of actions the cooldown blocks (`1 + cooldown`), then falls back to
 *   the balanced order to break ties.
 *
 * A ready special that would KO the opponent overrides both rankings: the most
 * cinematic finisher (highest power, then move id) fires under either tactic
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

/** A special scored under both of the tactics' objectives. */
interface RankedSpecial {
  readonly moveId: string
  readonly power: number
  readonly accuracy: number
  readonly damage: number
  readonly expected: number
  /** Actions its cooldown blocks; the divisor of the sustained score. */
  readonly cooldown: number
  /** `expected / (1 + cooldown)` — what the move pays every window. */
  readonly sustained: number
}

/** Ties inside either ranking fall back to the balanced order, so a pair of
 * moves that score the same always resolves identically. */
const rankExpected = (a: RankedSpecial, b: RankedSpecial): number => {
  if (b.expected !== a.expected) return b.expected - a.expected
  if (b.power !== a.power) return b.power - a.power
  return a.moveId.localeCompare(b.moveId)
}

const rankSustained = (a: RankedSpecial, b: RankedSpecial): number =>
  b.sustained !== a.sustained ? b.sustained - a.sustained : rankExpected(a, b)

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

/** Ready equipped specials, ordered by the tactic's own objective. */
function rankedReady(input: PolicyInput): RankedSpecial[] {
  const list: RankedSpecial[] = []
  for (const moveId of input.kit) {
    if (moveId === BASIC_MOVE.id) continue
    const move = getMove(moveId)
    if (!move) throw new Error(`Unknown move: ${moveId}`)
    if ((input.fighter.cooldowns[moveId] ?? 0) > 0) continue
    const d = damageOf(moveId, input.fighter, input.opponent)
    const expected = (d.damage * d.accuracy) / 100
    list.push({
      moveId,
      power: d.power,
      accuracy: d.accuracy,
      damage: d.damage,
      expected,
      cooldown: move.cooldown,
      sustained: expected / (1 + move.cooldown),
    })
  }
  list.sort(input.tactic === "specials" ? rankSustained : rankExpected)
  return list
}

/** Qualifiers for Balanced: a super-effective shot, one that would KO, or —
 * FR6 — anything at all once the equipped kit sustains more damage per window
 * than the free Strike. */
function balancedQualifiers(
  all: RankedSpecial[],
  input: PolicyInput,
  worthFiring: boolean,
): RankedSpecial[] {
  return all.filter((r) => {
    if (r.damage >= input.opponent.hp) return true
    const type = typeFactor(input.fighter.element, input.opponent.element)
    if (type.num > type.den) return true
    // A NEUTRAL matchup can never satisfy the two rules above: the type chart
    // is inert between two creatures of the same element, and no kit special
    // KOs a full-HP target on the opening window. Without this clause
    // "Balanced" can never fire a special in a mirror, which made it lose
    // every mirror on the seed batch (see the track's probe-before.md).
    return worthFiring
  })
}

/**
 * The equipped kit's sustained output per action window: each special's
 * expected damage divided by the number of actions its cooldown blocks
 * (`1 + cooldown`), summed over the whole kit.
 *
 * The unit has to be the kit, not the best single move. The clock steps
 * cooldowns and *then* applies a freshly used move's full cooldown, so a
 * cooldown-1 special blocks exactly its next action — two of them alternate
 * and the pair keeps firing every window. Compared move against move, neither
 * beats the Strike; summed, the pair clearly does. That per-move comparison
 * is what previously concluded the innate basic out-sustained the catalog.
 */
function kitSustained(input: PolicyInput): number {
  let total = 0
  for (const moveId of input.kit) {
    if (moveId === BASIC_MOVE.id) continue
    const move = getMove(moveId)
    if (!move) throw new Error(`Unknown move: ${moveId}`)
    const d = damageOf(moveId, input.fighter, input.opponent)
    total += (d.damage * d.accuracy) / 100 / (1 + move.cooldown)
  }
  return total
}

/** The innate Strike's sustained output: no element, always accurate, never
 * cooling. The bar an equipped kit has to clear to be worth an action. */
function strikeSustained(input: PolicyInput): number {
  return strikeDamage(
    BASIC_MOVE.power,
    input.fighter.stats.atk,
    input.opponent.stats.def,
    1,
    1,
    true,
  )
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

  // FR6: one bar, read the same way by both tactics — is the equipped kit
  // worth more of this fighter's action windows than free Striking?
  const worthFiring = kitSustained(input) >= strikeSustained(input)

  if (tactic === "specials") {
    const best = ready[0]
    return best && worthFiring
      ? { kind: "special", moveId: best.moveId }
      : far(fighter)
        ? CLOSE
        : BASIC
  }

  const qualifying = balancedQualifiers(ready, input, worthFiring)
  const best = qualifying[0]
  if (best) return { kind: "special", moveId: best.moveId }
  return far(fighter) ? CLOSE : BASIC
}

function far(f: Readonly<ClockFighter>): boolean {
  return f.range === "far"
}
