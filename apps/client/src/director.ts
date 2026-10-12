import type { PlaybackStep } from "@apex/sim"
import { PLAYBACK_PHASES } from "@apex/sim"

/**
 * Camera director core (FR6, spec) — the decision logic for the
 * cinematic arena camera, kept pure so the shot grammar is unit-testable.
 * The scene owns the actual THREE.Camera; this module only ever answers
 * "where should the camera be looking right now".
 *
 * The shot grammar mirrors the choreography registries: one table row
 * per playback step kind, plus a few timing rules (melee punch-ins,
 * projectile tracking, the KO orbit). Angles alternate by tick parity —
 * the same deterministic convention the stage uses for its attack
 * lanes — so replays frame identically.
 */

/** Minimum melee damage that earns a punch-in (tier-3+ blows). */
export const BIG_PUNCH_DAMAGE = 8

/** Subtle framing angle applied to every beat, holding its side for a
 * 4-beat window so the camera never flip-flops (motion comfort). */
export const AZIMUTH_SWING = 0.1

/** The KO orbit's total sweep (radians) across the down step. */
export const KO_ORBIT_SWEEP = 0.4

export interface FocusPoint {
  readonly x: number
  readonly y: number
  readonly z: number
}

/** The slice of a playback step the director reasons about. */
export interface DirectorStep {
  readonly kind: PlaybackStep["kind"]
  /** Normalized 0..1 progress through the step. */
  readonly t: number
  /** Parity source for deterministic side choices. */
  readonly tick: number
  readonly reaction?: "glance" | "stagger" | "knockback" | "down"
  readonly damage?: number
  readonly ko?: boolean
}

/** Everything the director knows about the present moment. */
export interface DirectorContext {
  /** Current playback step, or null between beats. */
  readonly step: DirectorStep | null
  readonly actor: FocusPoint
  readonly target: FocusPoint
  /** Live projectile position while a shot is in flight. */
  readonly projectile: FocusPoint | null
}

/** One camera instruction; the scene eases (or cuts) toward it. */
export interface CameraIntent {
  readonly look: FocusPoint
  /** Multiplier over the broadcast arena radius. */
  readonly radiusMult: number
  /** Offset added to the broadcast azimuth (radians). */
  readonly azimuthDelta: number
  /** Offset added to the broadcast elevation (radians). */
  readonly elevationDelta: number
  /** Snap immediately (hard cut) instead of easing. */
  readonly cut: boolean
}

type Look = "pair" | "victim" | "thrower"

interface ShotSpec {
  readonly radiusMult: number
  readonly look: Look
  readonly cut: boolean
}

/** The shot table: one row per playback step kind. */
const SHOTS: Record<PlaybackStep["kind"], ShotSpec> = {
  approach: { radiusMult: 1, look: "pair", cut: false },
  idle: { radiusMult: 0.95, look: "pair", cut: false },
  melee: { radiusMult: 0.82, look: "pair", cut: false },
  projectile: { radiusMult: 0.9, look: "thrower", cut: false },
  impact: { radiusMult: 0.72, look: "victim", cut: false },
  stagger: { radiusMult: 0.75, look: "victim", cut: false },
  knockback: { radiusMult: 1.08, look: "pair", cut: false },
  down: { radiusMult: 0.8, look: "victim", cut: false },
  judge: { radiusMult: 1.15, look: "pair", cut: true },
}

const punchWindow = (): { from: number; to: number } => {
  const phases = PLAYBACK_PHASES.melee
  return { from: phases.windup, to: phases.windup + phases.contact }
}

const mid = (a: FocusPoint, b: FocusPoint): FocusPoint => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
  z: (a.z + b.z) / 2,
})

const lift = (p: FocusPoint, dy: number): FocusPoint => ({
  x: p.x,
  y: p.y + dy,
  z: p.z,
})

const toward = (from: FocusPoint, to: FocusPoint, k: number): FocusPoint => ({
  x: from.x + (to.x - from.x) * k,
  y: from.y + (to.y - from.y) * k,
  z: from.z + (to.z - from.z) * k,
})

/** Resolve the camera intent for this instant. Pure and deterministic. */
export function nextShot(ctx: DirectorContext): CameraIntent {
  // The swing holds its side across a 4-tick window: flip-flopping the
  // angle every beat pans the camera constantly and reads as dizzying.
  const side =
    ctx.step === null || Math.floor(ctx.step.tick / 4) % 2 === 0 ? 1 : -1
  const spec = ctx.step === null ? SHOTS.approach : SHOTS[ctx.step.kind]
  const actor = ctx.actor
  const victim = ctx.target
  const pairMid = lift(mid(actor, victim), 0.6)
  let look: FocusPoint = pairMid
  if (spec.look === "victim") look = lift(victim, 0.7)
  if (spec.look === "thrower") look = lift(actor, 0.8)
  let radiusMult = spec.radiusMult
  let azimuthDelta = side * AZIMUTH_SWING
  const cut = spec.cut
  let elevationDelta = 0

  const step = ctx.step
  if (step !== null) {
    if (step.kind === "melee") {
      // Punch in on heavy or big contacts, inside the strike window.
      const heavy =
        step.reaction === "stagger" ||
        step.reaction === "knockback" ||
        step.reaction === "down"
      const big = (step.damage ?? 0) >= BIG_PUNCH_DAMAGE
      const win = punchWindow()
      if ((heavy || big) && step.t >= win.from && step.t <= win.to) {
        radiusMult = 0.7
        look = toward(pairMid, lift(victim, 0.7), 0.65)
      }
    }
    if (step.kind === "projectile") {
      // Track the shot in flight; before release, eye the thrower.
      look = ctx.projectile ? { ...ctx.projectile } : lift(actor, 0.8)
    }
    if (step.kind === "down" && step.ko) {
      // The signature KO orbit: a slow deterministic sweep around the
      // fallen fighter while the verdict builds.
      azimuthDelta = side * KO_ORBIT_SWEEP * step.t
      radiusMult = 0.85
      elevationDelta = 0.08 * step.t
    }
  }

  return { look, radiusMult, azimuthDelta, elevationDelta, cut }
}
