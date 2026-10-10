/**
 * Playback script: turns the resolver's ordered `BattleEvent` log into the
 * staged animation script an arena renderer plays back. Pure mapping — the
 * renderer animates, but no outcome can change: every step carries the same
 * actor, damage, HP, and announcer line as the event it came from.
 *
 * Durations ("beats") are per-step-kind constants, so a fast-forward can
 * simply scale them. A `launch` fires and its letter arrives at the later
 * `impact` step, mirroring the clock's travel semantics.
 */

import type { BattleEvent, BattleEventKind } from "./clock"
import { getMove } from "./moves"

/** How each beat maps to the arena: what the fighters visibly do. */
export type PlaybackStepKind =
  /** `close`: the actor runs in and both fighters end near. */
  | "approach"
  /** `hold`: the actor hesitates. */
  | "idle"
  /** `basic`: the actor lunges at its target with the typeless strike. */
  | "melee"
  /** `launch`: the actor fires a special projectile toward its target. */
  | "projectile"
  /** `impact`: the shot arrives — hit, dodge, or fizzle. */
  | "impact"
  /** `down`: a fighter hits the floor. */
  | "down"
  /** `time` / `draw`: the judge call that decides the fight. */
  | "judge"

/** Relative step durations so pacing can scale without touching the script. */
export const PLAYBACK_BEATS: Readonly<Record<PlaybackStepKind, number>> =
  Object.freeze({
    approach: 3,
    idle: 2,
    melee: 3,
    projectile: 2,
    impact: 2,
    down: 3,
    judge: 3,
  })

/** One replayable beat of the fight: the event plus its configured length. */
export interface PlaybackStep {
  readonly tick: number
  readonly kind: PlaybackStepKind
  readonly actor: string
  readonly target?: string
  readonly moveId?: string
  /** Resolved from the catalog for tinting; `undefined` for the basic strike. */
  readonly element?: string
  readonly damage?: number
  readonly hit?: boolean
  readonly missReason?: "accuracy" | "dodge"
  readonly hpAfter: Readonly<Record<string, number>>
  readonly line: string
  readonly beats: number
}

/** The clock's `basic` event name inside the script kind vocabulary. */
type StepTable = Readonly<Record<BattleEventKind, PlaybackStep["kind"]>>

const KINDS: StepTable = Object.freeze({
  close: "approach",
  hold: "idle",
  basic: "melee",
  down: "down",
  launch: "projectile",
  impact: "impact",
  time: "judge",
  draw: "judge",
})

/** Map the resolver's ordered event log to its replayable script. */
export function buildPlaybackScript(
  events: readonly BattleEvent[],
): readonly PlaybackStep[] {
  return events.map((event) => {
    const kind = KINDS[event.kind]
    const move = event.moveId ? getMove(event.moveId) : undefined
    if (!kind) {
      throw new Error(`Unknown battle event kind: ${String(event.kind)}`)
    }
    return {
      tick: event.tick,
      kind,
      actor: event.actor,
      target: event.target,
      moveId: event.moveId,
      element: move?.element,
      damage: event.damage,
      hit: event.hit,
      missReason: event.missReason,
      hpAfter: event.hpAfter,
      line: event.line,
      beats: PLAYBACK_BEATS[kind],
    }
  })
}
