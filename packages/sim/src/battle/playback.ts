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
  /**
   * `stagger`: the actor reels from a heavy blow — its next window was
   * consumed recovering. The full choreography lands with the enriched
   * playback contract (Phase 1); for now it reads as a held beat.
   */
  | "stagger"
  /**
   * `knockback`: a heavy blow separates both fighters — both ranges go
   * far and the next engagement starts with a fresh approach.
   */
  | "knockback"
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
    stagger: 2,
    knockback: 2,
    projectile: 2,
    impact: 2,
    down: 3,
    judge: 3,
  })

/**
 * Normalized phase boundaries within a step (battle-animation-overhaul
 * FR3): where the windup ends and the primary contact/arrival beat lands,
 * as fractions of the step's total duration. Each row sums to 1. The
 * melee row bakes in the arena's staging constants so choreography and
 * script agree by construction.
 */
export interface PlaybackPhases {
  /** Fraction of the step spent coiling / aiming before the action. */
  readonly windup: number
  /** Fraction spent on the action itself — travel, strike, arrival. */
  readonly contact: number
  /** Fraction spent recovering back to stance. */
  readonly recovery: number
}

/** What the victim visibly does to a landed blow (FR3). */
export type ReactionKind = "glance" | "stagger" | "knockback" | "down"

export const PLAYBACK_PHASES: Readonly<
  Record<PlaybackStepKind, PlaybackPhases>
> = Object.freeze({
  approach: { windup: 0.15, contact: 0.7, recovery: 0.15 },
  idle: { windup: 0.3, contact: 0.4, recovery: 0.3 },
  melee: { windup: 0.26, contact: 0.2, recovery: 0.54 },
  stagger: { windup: 0.1, contact: 0.4, recovery: 0.5 },
  knockback: { windup: 0.1, contact: 0.3, recovery: 0.6 },
  projectile: { windup: 0.5, contact: 0.25, recovery: 0.25 },
  impact: { windup: 0.2, contact: 0.3, recovery: 0.5 },
  down: { windup: 0.2, contact: 0.35, recovery: 0.45 },
  judge: { windup: 0.25, contact: 0.5, recovery: 0.25 },
})

/** One replayable beat of the fight: the event plus its configured length. */
export interface PlaybackStep {
  readonly tick: number
  readonly kind: PlaybackStepKind
  readonly actor: string
  /**
   * The actor's stable side key when the sim supplied one — mirror-match
   * safe actor mapping for the client stage.
   */
  readonly actorKey?: string
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
  /** Normalized windup/contact/recovery timing for choreography (FR3). */
  readonly phases: PlaybackPhases
  /**
   * What the victim does to this landed blow (FR3): only set on melee
   * and impact steps that hit. A killing blow reads as `down`.
   */
  readonly reaction?: ReactionKind
  /**
   * Which way the target slipped a shot (FR3), only on dodged impacts —
   * derived from tick parity so it matches the arena's lane weave.
   */
  readonly dodgeDirection?: "left" | "right"
  /**
   * True on a down step that ends the fight (FR3) — the KO signature
   * moment fires here. Double KOs flag both terminal down steps.
   */
  readonly ko?: boolean
}

/** The clock's `basic` event name inside the script kind vocabulary. */
type StepTable = Readonly<Record<BattleEventKind, PlaybackStep["kind"]>>

const KINDS: StepTable = Object.freeze({
  close: "approach",
  hold: "idle",
  basic: "melee",
  stagger: "stagger",
  knockback: "knockback",
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
  return events.map((event, i) => {
    const kind = KINDS[event.kind]
    const move = event.moveId ? getMove(event.moveId) : undefined
    if (!kind) {
      throw new Error(`Unknown battle event kind: ${String(event.kind)}`)
    }
    const lands = (kind === "melee" || kind === "impact") && event.hit === true
    // A killing blow's `down` event always immediately follows the
    // damage event in the same tick — adjacency is the signature.
    const next = events[i + 1]
    const downed =
      lands &&
      next !== undefined &&
      next.tick === event.tick &&
      next.kind === "down" &&
      next.actor === event.target
    // A down step is the KO state iff nothing but other downs / judge
    // calls follow it — covers single KO (last event) and double KO.
    const terminal =
      kind === "down" &&
      events
        .slice(i + 1)
        .every(
          (e) => e.kind === "down" || e.kind === "time" || e.kind === "draw",
        )
    return {
      tick: event.tick,
      kind,
      actor: event.actor,
      actorKey: event.actorKey,
      target: event.target,
      moveId: event.moveId,
      element: move?.element,
      damage: event.damage,
      hit: event.hit,
      missReason: event.missReason,
      hpAfter: event.hpAfter,
      line: event.line,
      beats: PLAYBACK_BEATS[kind],
      phases: PLAYBACK_PHASES[kind],
      reaction: lands
        ? (event.reaction ?? (downed ? "down" : "glance"))
        : undefined,
      dodgeDirection:
        event.missReason === "dodge"
          ? event.tick % 2 === 0
            ? "left"
            : "right"
          : undefined,
      ko: kind === "down" ? terminal : undefined,
    }
  })
}
