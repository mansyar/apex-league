/**
 * Scene logic - wind sway: per-prop-class base amplitudes, a slow gust
 * envelope, and the composed sway angle. Sway is applied by the scene as a
 * runtime transform, so the determinism gate sees nothing. Split out of
 * scene-logic.ts (ranch_decomposition); behavior unchanged.
 */
/**
 * Base sway amplitude (radians) per prop id, by class: tufts flutter most,
 * bushes medium, trees least; rocks and the food pile are anchored and
 * never move. Unknown ids fail closed to 0 so a new registry prop can't
 * accidentally start dancing before it is tuned.
 */
const WIND_BASE_AMPS: Record<string, number> = {
  tuft: 0.09,
  bush: 0.045,
  broadleafTree: 0.018,
  rock: 0,
  foodPile: 0,
}

export function windBaseAmp(propId: string): number {
  return WIND_BASE_AMPS[propId] ?? 0
}

/**
 * Gust envelope: two incommensurate slow waves (periods in the tens of
 * seconds) mixed with a faster ripple, remapped into [0.4, 1.2]. Sum of
 * sinusoids is smooth by construction — calm moments and stronger gusts
 * alternate, never storm force, with no discontinuities to pop the eye.
 *
 * Pure function of time; the same `t` always yields the same breeze.
 */
export function gustEnvelope(t: number): number {
  const waveA = Math.sin(t * ((2 * Math.PI) / 37))
  const waveB = Math.sin(t * ((2 * Math.PI) / 53) + 1.7)
  const ripple = Math.sin(t * ((2 * Math.PI) / 23) + 4.1)
  const mix = (waveA + 0.5 * waveB + 0.3 * ripple) / 1.8 // [-1, 1]
  return 0.8 + 0.4 * mix // [0.4, 1.2]
}

/** Season flutter cadence: slow enough to read as breeze, fast enough to notice. */
const WIND_OMEGA = 1.9

/**
 * Total sway angle (radians) for a prop at time `t`: base amplitude × gust
 * envelope × a phase-offset flutter. Reduced motion flattens every prop to
 * exactly 0 — the same gate the mood bounce already honors.
 */
export function swayAngle(
  baseAmp: number,
  phase: number,
  t: number,
  reducedMotion: boolean,
): number {
  if (reducedMotion || baseAmp === 0) return 0
  return baseAmp * gustEnvelope(t) * Math.sin(t * WIND_OMEGA + phase)
}
