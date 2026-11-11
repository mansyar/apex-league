/**
 * Step outcomes as the existing event vocabulary.
 *
 * Continuous Arena Battle FR-12, FR-13. The playback and the cup already read
 * one `BattleEvent` log, so the continuous engine maps its own step reports
 * onto those kinds rather than inventing a second language: a melee hit is
 * `basic`, a swing that swept its window and touched nothing is the same beat
 * with `hit: false`, a shot arriving is `impact` (a dodge is the same beat
 * with `hit: false`), a shot leaving the hand is `launch`, a fresh poise break
 * is `stagger`, and a blow that empties a pool is followed immediately by that
 * side's `down` — the adjacency `buildPlaybackScript` reads as the killing
 * blow. `tick` is the step index and `hpAfter` is the real HP, so a replay
 * shows the same fight.
 *
 * Movement needs beats too, or a replay shows two bodies teleporting between
 * blows: every decision window (120 ms) each side that is not mid-attack gets
 * an approach beat when it closed the gap and an idle beat when it did not.
 * That keeps the log dense enough to show footwork without emitting a beat on
 * all 2000 steps.
 *
 * Pure mapping: no clock, no random source, no DOM.
 */

import type { BattleEvent } from "../clock"
import { getMove } from "../moves"
import { DECISION_STEPS } from "./controller"
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
  /** Shots whose active window opened this step (FR-8). */
  readonly launched: readonly {
    readonly ownerKey: string
    readonly moveId: string
  }[]
  /** Melee swings that resolved without landing (FR-18, FR-21, FR-5). */
  readonly whiffs: readonly {
    readonly attackerKey: string
    readonly moveId: string
    /**
     * `reach` swept and touched nothing; `range` stood inside the inner edge;
     * `accuracy` connected and rolled out.
     */
    readonly reason: "reach" | "range" | "accuracy"
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
  const gapSq = (snapshot: FightState, side: 0 | 1): number => {
    const me = snapshot.fighters[side].pos
    const foe = snapshot.fighters[side === 0 ? 1 : 0].pos
    const dx = me.x - foe.x
    const dz = me.z - foe.z
    return dx * dx + dz * dz
  }
  if (state.step % DECISION_STEPS === 0) {
    for (const side of [0, 1] as const) {
      if (state.fighters[side].attack) continue
      const closed = gapSq(state, side) < gapSq(before, side)
      events.push({
        tick,
        kind: closed ? "close" : "hold",
        actor: sides.names[side],
        actorKey: sides.keys[side],
        hpAfter,
        line: closed
          ? `${sides.names[side]} closes the gap.`
          : `${sides.names[side]} holds.`,
      })
    }
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
    // A shot loosed from inside the move's inner edge passes the body and is
    // spent (FR-3). The log has no word for a shot that passed — the stream's
    // miss reasons are `accuracy` and `dodge` only (NFR-4) — so it reports no
    // impact rather than mislabelling a range miss as either.
    if (shot.outcome === "range") continue
    const side = sideOf(shot.ownerKey)
    const target = side === 0 ? 1 : 0
    const hit = shot.outcome === "hit"
    // Two different questions, two different words: a shot the victim moved
    // out of was `dodged`; a shot that reached the body but was not aimed true
    // was `missed` (FR-21).
    const missReason = hit
      ? null
      : shot.outcome === "missed"
        ? "accuracy"
        : "dodge"
    events.push({
      tick,
      kind: "impact",
      actor: sides.names[side],
      actorKey: sides.keys[side],
      target: sides.names[target],
      moveId: shot.moveId,
      damage: shot.damage,
      hit,
      ...(missReason ? { missReason } : {}),
      hpAfter,
      line: hit
        ? `${sides.names[side]}'s ${moveName(shot.moveId)} hits.`
        : missReason === "accuracy"
          ? `${sides.names[side]}'s ${moveName(shot.moveId)} goes wide.`
          : `${sides.names[target]} slips ${moveName(shot.moveId)}.`,
    })
    if (hit) land(side, target)
  }
  for (const launch of report.launched) {
    const side = sideOf(launch.ownerKey)
    events.push({
      tick,
      kind: "launch",
      actor: sides.names[side],
      actorKey: sides.keys[side],
      moveId: launch.moveId,
      hpAfter,
      line: `${sides.names[side]} looses ${moveName(launch.moveId)}.`,
    })
  }
  for (const whiff of report.whiffs) {
    const side = sideOf(whiff.attackerKey)
    const target = side === 0 ? 1 : 0
    events.push({
      tick,
      kind: "basic",
      actor: sides.names[side],
      actorKey: sides.keys[side],
      target: sides.names[target],
      moveId: whiff.moveId,
      hit: false,
      // A rolled miss names itself; a swing that touched nothing is told apart
      // by the line, which is the vocabulary the stream already had (FR-18).
      ...(whiff.reason === "accuracy"
        ? { missReason: "accuracy" as const }
        : {}),
      hpAfter,
      line:
        whiff.reason === "accuracy"
          ? `${sides.names[side]}'s ${moveName(whiff.moveId)} goes wide.`
          : whiff.reason === "range"
            ? `${sides.names[side]}'s ${moveName(whiff.moveId)} is too close.`
            : `${sides.names[side]}'s ${moveName(whiff.moveId)} swings wide.`,
    })
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
