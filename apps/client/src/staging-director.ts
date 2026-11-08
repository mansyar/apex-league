import type { PlaybackStep } from "@apex/sim"
import { clamp01 } from "./anim"
import type { DirectorContext, DirectorStep } from "./director"

type Mutable<T> = { -readonly [K in keyof T]: T[K] }

/** One frame of live battle context for the camera director (FR6). */
export interface DirectorFrame {
  readonly handler: (ctx: DirectorContext) => void
  /** The latest playback step, or null before the first beat. */
  readonly step: PlaybackStep | null
  /** Action-clock length for this kind of step (ms). */
  readonly span: number
  /** When the step was applied (wall ms). */
  readonly startedAt: number
  readonly now: number
  readonly actor: { readonly x: number; readonly y: number; readonly z: number }
  readonly target: {
    readonly x: number
    readonly y: number
    readonly z: number
  }
  readonly projectile: {
    readonly x: number
    readonly y: number
    readonly z: number
  } | null
}

/**
 * Build the director feed. The scratch step and context are allocated once
 * because this runs on every frame of the render loop; the mapped twins
 * strip readonly for the scratch only, so the public contract stays.
 */
export function createDirectorFeed(): (frame: DirectorFrame) => void {
  const step: Mutable<DirectorStep> = {
    kind: "idle",
    t: 0,
    tick: 0,
    reaction: undefined,
    damage: undefined,
    ko: undefined,
  }
  const ctx: Mutable<DirectorContext> = {
    step: null,
    actor: { x: 0, y: 0, z: 0 },
    target: { x: 0, y: 0, z: 0 },
    projectile: null,
  }

  return (frame) => {
    const latest = frame.step
    if (latest === null) {
      ctx.step = null
    } else {
      step.kind = latest.kind
      step.t = clamp01((frame.now - frame.startedAt) / Math.max(1, frame.span))
      step.tick = latest.tick
      step.reaction = latest.reaction
      step.damage = latest.damage
      step.ko = latest.ko
      ctx.step = step
    }
    ctx.actor = frame.actor
    ctx.target = frame.target
    ctx.projectile = frame.projectile
    frame.handler(ctx)
  }
}
