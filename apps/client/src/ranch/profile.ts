/**
 * Ranch-side adapter over the shared choreography table (FR-2). It turns an
 * archetype + life stage into the one amplitude and one tempo multiplier the
 * pose writers use. No profile values and no stage ladder live here: both
 * are read from choreo.ts / stage-motion.ts / scene-logic/stage.ts, so the
 * arena and the ranch cannot drift apart.
 *
 * Pure and stateless: factors are recomputed from the live rig identity on
 * every call, so a swap, a ceremony's mid-flight rebuild, a paused tab or a
 * crowded field can never strand a stale factor (FR-5).
 */
import type { LifeStage } from "@apex/sim"
import type { BodyProfile } from "../choreo"
import { profileFor } from "../choreo"
import { stageScale } from "../scene-logic/stage"
import { composeStageProfile } from "../stage-motion"

/** How far a calm frame moves a factor back toward the neutral 1 (FR-4). */
const CALM_DAMP = 0.4
/** Bounds a presentation factor can never leave. */
const MIN_FACTOR = 0.2
const MAX_FACTOR = 2

/**
 * The eight relative weights averaged into the amplitude factor. `swayAmp`
 * is deliberately excluded: it is an absolute world-unit offset, not a
 * multiplier, and averaging it into a relative factor would corrupt every
 * pose that consumes the factor.
 */
const AMPLITUDE_KEYS = [
  "gaitAmp",
  "breathAmp",
  "hurtMult",
  "staggerMult",
  "windupMult",
  "recoilMult",
  "strikeMult",
  "leanPitch",
] as const satisfies ReadonlyArray<keyof BodyProfile>

/** One frame's presentation multipliers for a rig. */
export interface RanchMotionFactors {
  /** Finite, positive pose-amplitude multiplier. */
  readonly amplitude: number
  /** Finite, positive pose-clock tempo multiplier. */
  readonly tempo: number
}

/** The authored baseline: full pose, no damping. */
export const NEUTRAL_MOTION_FACTORS: RanchMotionFactors = Object.freeze({
  amplitude: 1,
  tempo: 1,
})

/** Damp toward neutral, then bound to a finite positive interval. */
function settle(raw: number, reducedMotion: boolean): number {
  const value = reducedMotion ? 1 + (raw - 1) * CALM_DAMP : raw
  if (!Number.isFinite(value)) return 1
  return Math.min(MAX_FACTOR, Math.max(MIN_FACTOR, value))
}

/**
 * Derive the ranch's amplitude and tempo from the shared body profile and
 * the life stage. The composed profile already carries the stage factor on
 * its amplitudes; tempo takes it once more on top of the geometric mean of
 * the three authored frequencies (which stage never scales).
 */
export function ranchMotionFactors(
  archetypeId: string,
  stage?: LifeStage,
  reducedMotion = false,
): RanchMotionFactors {
  const base = profileFor(archetypeId)
  const composed = composeStageProfile(archetypeId, stage)
  const stageFactor = stage === undefined ? 1 : stageScale(stage)
  let sum = 0
  for (const key of AMPLITUDE_KEYS) sum += composed[key]
  const rawAmplitude = sum / AMPLITUDE_KEYS.length
  const rawTempo =
    stageFactor * Math.cbrt(base.gaitFreq * base.breathFreq * base.swayFreq)
  return Object.freeze({
    amplitude: settle(rawAmplitude, reducedMotion),
    tempo: settle(rawTempo, reducedMotion),
  })
}
