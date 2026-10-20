/**
 * The resolver: turns two sides, a seed, and at most 40 ticks into a
 * `BattleResult` with a winner (or draw), an end reason, final HP, and the
 * full ordered event log a later arena track can play back.
 *
 * Endings (spec FR8): exactly one fighter at 0 HP is a `ko`; both in the
 * same impact step is a `double_ko`; at the 40-tick safety cap the higher
 * remaining HP% wins, then higher SPD, then the battle seed (`time`). The
 * resolver never mutates its inputs.
 */

import type { CreatureStats, Element } from "../creature"
import type { Temperament } from "../species"
import {
  type BattleEvent,
  type ClockFighter,
  createClock,
  createClockFighter,
  createTieOrder,
  fighterKey,
  type PlanFn,
} from "./clock"
import { chooseAction, type Tactic } from "./policy"

export type BattleReason = "ko" | "double_ko" | "time"

export interface BattleSide {
  readonly name: string
  /**
   * Stable side key (the exhibition uses "owned"/"rival") carried into
   * hp snapshots and tie order; keeps a mirror match unambiguous.
   */
  readonly id?: string
  readonly element: Element
  readonly stats: CreatureStats
  /** The fighter's four equipped special move ids, in kit order. */
  readonly kit: readonly string[]
  readonly tactic: Tactic
  readonly temperament: Temperament
  /**
   * The form this side fights in, for display only (FR-9). The resolver
   * never reads it: stats, kit, seed, and outcome are identical whether or
   * not it is present. Rivals derive it from their seeded stats; bosses and
   * pre-v19 sides carry `legacy`; the player's side carries the earned
   * branch.
   */
  readonly branch?: string
}

/** The verdict of one exhibition: winner name or null for a draw. */
export interface BattleResult {
  readonly winner: string | null
  readonly reason: BattleReason
  readonly finalHp: Readonly<Record<string, number>>
  readonly events: readonly BattleEvent[]
}

/**
 * The safety cap: a runaway brake, not a normal ending.
 *
 * element_chart_20261016 doubled the HP scale, so battles need roughly twice
 * the ticks to reach the same relative attrition; the cap doubled with it
 * (40 → 80) to preserve the old stall dynamics instead of manufacturing
 * artificial time-outs.
 */
export const MAX_TICKS = 80

function planFor(
  sides: readonly Readonly<BattleSide>[],
  actions: Map<string, number>,
): PlanFn {
  return (fighter, opponent) => {
    const key = fighterKey(fighter)
    const side = sides.find((s) => fighterKey(s) === key)
    if (!side) throw new Error(`No side keyed ${key}`)
    const action = chooseAction({
      fighter,
      opponent,
      kit: side.kit,
      tactic: side.tactic,
      temperament: side.temperament,
      actionCount: actions.get(key) ?? 0,
    })
    actions.set(key, (actions.get(key) ?? 0) + 1)
    return action
  }
}

export function resolveBattle(
  a: Readonly<BattleSide>,
  b: Readonly<BattleSide>,
  seed: number,
): BattleResult {
  const sides: readonly Readonly<BattleSide>[] = [a, b]
  const initial = sides.map((s) => createClockFighter(s))
  const tieOrder = createTieOrder(seed, initial)
  const clock = createClock(initial, tieOrder, seed)
  const actions = new Map<string, number>()
  const events: BattleEvent[] = []
  let winner: string | null = null
  let reason: BattleReason = "ko"

  for (let current = 1; current <= MAX_TICKS; current++) {
    const tick = clock.advance(planFor(sides, actions))
    events.push(...tick.events)
    const downed = clock.fighters.filter((f) => f.hp <= 0)
    if (downed.length === 1) {
      winner = clock.fighters.find((f) => f.hp > 0)?.name ?? null
      reason = "ko"
      break
    }
    if (downed.length === 2) {
      winner = null
      reason = "double_ko"
      break
    }
  }

  if (winner === null && reason === "ko") {
    // Safety cap: rank by remaining HP percent, then SPD, then seed.
    const fighters = clock.fighters
    const first = fighters[0]
    const second = fighters[1]
    if (!first || !second) throw new Error("The battle needs two fighters")
    const percent = (f: Readonly<ClockFighter>): number =>
      (f.hp / f.stats.hp) * 100
    let ranked: readonly Readonly<ClockFighter>[]
    if (percent(first) !== percent(second)) {
      ranked =
        percent(first) > percent(second) ? [first, second] : [second, first]
    } else if (first.stats.spd !== second.stats.spd) {
      ranked =
        first.stats.spd > second.stats.spd ? [first, second] : [second, first]
    } else {
      ranked = seed % 2 === 0 ? [first, second] : [second, first]
    }
    const top = ranked[0]
    if (!top) throw new Error("The ranked fighters are empty")
    winner = top.name
    reason = "time"
    events.push({
      tick: clock.tick,
      kind: "time",
      actor: top.name,
      hpAfter: Object.freeze(
        Object.fromEntries(fighters.map((f) => [fighterKey(f), f.hp])),
      ),
      line: `Time's up. ${top.name} is still standing.`,
    })
  }

  if (reason === "double_ko") {
    const finalSnapshot = Object.freeze(
      Object.fromEntries(clock.fighters.map((f) => [fighterKey(f), f.hp])),
    )
    events.push({
      tick: clock.tick,
      kind: "draw",
      actor: "",
      hpAfter: finalSnapshot,
      line: "Both fighters are down. The spar is a draw.",
    })
  }

  const finalHp = Object.freeze(
    Object.fromEntries(clock.fighters.map((f) => [fighterKey(f), f.hp])),
  )
  return { winner, reason, finalHp, events }
}
