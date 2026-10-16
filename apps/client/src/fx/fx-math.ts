import { easeOut } from "../anim"
import { PROJECTILE_ARC } from "../move-fx"

/**
 * Pure effect math (frame-rate independent formulas): the curves the
 * flash, projectile, burst, and decal steps evaluate every frame. No
 * three.js objects in or out — numbers only, so the goldens in
 * `fx-math.test.ts` pin the feel without a renderer.
 */

/**
 * Partway back from white by accumulated flash age: 1 at spawn (full
 * white), 0 once the flash has fully decayed.
 */
export function flashMix(age: number, ms: number): number {
  return 1 - easeOut(Math.min(1, age / ms))
}

/**
 * Arc lift over the flight line at `travel` (0..1) for an element's arc
 * factor (defaults to 1).
 */
export function shotArc(travel: number, arc: number | undefined): number {
  return Math.sin(travel * Math.PI) * PROJECTILE_ARC * (arc ?? 1)
}

/** Trail segment lag behind the shot along the same flight line. */
export function trailLag(travel: number, index: number): number {
  return Math.max(0, travel - (index + 1) * 0.09)
}

/** Water streams ripple with a slight side-to-side wave across the lane. */
export function wobbleZ(elapsed: number, wobble: number): number {
  return Math.sin(elapsed * 0.02) * wobble
}

/** The breathing pulse around unit scale for pulsing shots. */
export function pulseScale(elapsed: number, pulse: number): number {
  return 1 + pulse * Math.sin(elapsed * 0.045)
}

/**
 * One burst fragment's initial state. `j1`..`j4` are randoms in [0, 1)
 * supplied by the caller so the shape stays deterministic under test.
 */
export function burstVelocity(opts: {
  index: number
  puffs: number
  ring: boolean
  j1: number
  j2: number
  j3: number
  j4: number
}): { vx: number; vy: number; vz: number; spin: number } {
  const angle = (opts.index / opts.puffs) * Math.PI * 2 + opts.j1 * 0.8
  const speed = (opts.ring ? 1.1 : 1.4) + opts.j2 * 1.2
  return {
    vx: Math.cos(angle) * speed,
    vy: opts.ring ? 0.15 + opts.j3 * 0.25 : 0.9 + opts.j3 * 1.1,
    vz: Math.sin(angle) * speed * (opts.ring ? 1 : 0.6),
    spin: (opts.j4 - 0.5) * 0.02,
  }
}

/** Lateral sine drift on a burst fragment (units this frame). */
export function swayDrift(
  elapsed: number,
  phase: number,
  sway: number,
  dt: number,
): number {
  return Math.sin(elapsed * 0.004 + phase) * sway * dt
}

/** Decal pop-in scale over its life (quick ease to full, then holds). */
export function decalPop(k: number): number {
  return easeOut(Math.min(1, k * 5))
}

/** Linear fade of an additive material's opacity toward transparent. */
export function fadeOver(base: number, k: number): number {
  return base * (1 - k)
}

/** Burst fragment scale: shrinks away but never vanishes fully. */
export function burstParticleScale(k: number): number {
  return Math.max(0.05, 1 - k)
}
