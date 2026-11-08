/**
 * Step outcomes as the existing event vocabulary.
 *
 * Continuous Arena Battle FR-12. The playback and the cup already read one
 * `BattleEvent` log, so the continuous engine maps its own step reports onto
 * those kinds rather than inventing a second language: a melee hit is
 * `basic`, a shot arriving is `impact` (a dodge is the same beat with
 * `hit: false`), a fresh poise break is `stagger`, and a blow that empties a
 * pool is followed immediately by that side's `down` — the adjacency
 * `buildPlaybackScript` reads as the killing blow. `tick` is the step index
 * and `hpAfter` is the real HP, so a replay shows the same fight.
 *
 * Pure mapping: no clock, no random source, no DOM.
 */

import type { BattleEvent } from "../clock"
import { getMove } from "../moves"
import { POISE_BREAK_MS } from "./poise"
import type { FightState } from "./types"

/** The two sides' display names and contract keys, in fight order. */
export interface Sides {
  readonly names: readonly [string, string]
  /** The `finalHp` keys: exactly what `resolveBattle` would emit. */
  readonly keys: readonly [string, string]
}

/** Both sides' HP, keyed the way the contract keys `finalHp`. */
export function hpSnapshot(
  state: FightState,
  keys: readonly [string, string],
): Readonly<Record<string, number>> {
  return Object.freeze({
    [keys[0]]: state.fighters[0].hp,
    [keys[1]]: state.fighters[1].hp,
  })
}

/** The move's display name, or its id when the catalog has no row. */
function moveName(moveId: string): string {
  return getMove(moveId)?.displayName ?? moveId
}

/** One step's report, as the pieces the mapping reads. */
export interface StepReport {
  readonly state: FightState
  readonly strikes: readonly {
    readonly attackerKey: string
    readonly targetKey: string
    readonly moveId: string
    readonly damage: number
  }[]
  readonly shots: readonly {
    readonly ownerKey: string
    readonly targetKey: string
    readonly moveId: string
    readonly outcome: string
    readonly damage: number
  }[]
}

/**
 * One step's events, in the order the blows landed. `before` is the top of
 * the step, so a poise break opened now is told apart from one that was
 * already running; `downed` keeps a side's `down` from repeating when a
 * second blow lands on a pool that is already empty.
 */
export function stepEvents(
  report: StepReport,
  sides: Sides,
  before: FightState,
  downed: Set<number>,
): BattleEvent[] {
  const state = report.state
  const tick = state.step
  const hpAfter = hpSnapshot(state, sides.keys)
  const events: BattleEvent[] = []
  const sideOf = (key: string): 0 | 1 => (state.fighters[0].key === key ? 0 : 1)
  const land = (side: 0 | 1, target: 0 | 1): void => {
    if (state.fighters[target].hp > 0 || downed.has(target)) return
    downed.add(target)
    events.push({
      tick,
      kind: "down",
      actor: sides.names[target],
      actorKey: sides.keys[target],
      target: sides.names[side],
      hpAfter,
      line: `${sides.names[target]} goes down.`,
    })
  }
  for (const strike of report.strikes) {
    const side = sideOf(strike.attackerKey)
    const target = side === 0 ? 1 : 0
    events.push({
      tick,
      kind: "basic",
      actor: sides.names[side],
      actorKey: sides.keys[side],
      target: sides.names[target],
      moveId: strike.moveId,
      damage: strike.damage,
      hit: true,
      hpAfter,
      line: `${sides.names[side]} lands ${moveName(strike.moveId)}.`,
    })
    land(side, target)
  }
  for (const shot of report.shots) {
    const side = sideOf(shot.ownerKey)
    const target = side === 0 ? 1 : 0
    const hit = shot.outcome === "hit"
    events.push({
      tick,
      kind: "impact",
      actor: sides.names[side],
      actorKey: sides.keys[side],
      target: sides.names[target],
      moveId: shot.moveId,
      damage: shot.damage,
      hit,
      ...(hit ? {} : { missReason: "dodge" as const }),
      hpAfter,
      line: hit
        ? `${sides.names[side]}'s ${moveName(shot.moveId)} hits.`
        : `${sides.names[target]} slips ${moveName(shot.moveId)}.`,
    })
    if (hit) land(side, target)
  }
  for (const side of [0, 1] as const) {
    const broke =
      before.fighters[side].poiseBreakMs !== POISE_BREAK_MS &&
      state.fighters[side].poiseBreakMs === POISE_BREAK_MS
    if (!broke) continue
    events.push({
      tick,
      kind: "stagger",
      actor: sides.names[side],
      actorKey: sides.keys[side],
      hpAfter,
      line: `${sides.names[side]} reels — guard broken.`,
    })
  }
  return events
}
