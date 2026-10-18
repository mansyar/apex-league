/**
 * Scene logic - the evolution ceremony: walk to center, glow, swell, settle.
 * Split out of scene-logic.ts (ranch_decomposition); behavior unchanged.
 */
import { BABY_SCALE, JUVENILE_SCALE } from "./stage"
import { strideStep } from "./walk"
// ---------------------------------------------------------------------------
// Evolution ceremony
// ---------------------------------------------------------------------------

// The growth moment (evolution track, 2026-10-11): the creature walks to
// the ranch center, glows while it swells, and the scene swaps the baby rig
// for the juvenile rig at the pulse's peak. Position-driven like the feed
// ceremony — a paused tab or a long frame can never skip the swap; the
// machine simply continues and converges. Reduced motion skips straight to
// the swap where the creature stands (spec R5).

export type EvolutionPhase = "idle" | "walk" | "glow" | "settle"

export interface EvolutionDrive {
  x: number
  z: number
  yaw: number
  phase: EvolutionPhase
  /** Holder scale to apply this frame. */
  scale: number
  /** Emissive pulse intensity 0..1 for the glow. */
  glow: number
  /** True exactly once, on the frame the mesh swap should happen. */
  swap: boolean
  /** True while the creature pivots in place (legs stay still). */
  pivoting: boolean
  /** True while the machine owns the creature. */
  active: boolean
}

/** Glow swell time and settle time, in seconds (wall-pace, dt-clamped). */
const GLOW_TIME = 1.4
const SETTLE_TIME = 0.6
/** How far above the baby scale the swell peaks before the swap. */
const SWELL = 0.18
/** Settle overshoot above the juvenile scale. */
const OVERSHOOT = 0.08

export interface EvolutionMachine {
  /** Begin from the creature's current pose: only the yaw and the motion
   * preference are needed (advance reads the live position). Reduced
   * motion swaps in place. The scale journey is parametrized so a
   * champion ceremony (juvenile → champion) can start at the juvenile
   * scale and settle grander; the defaults keep the classic baby →
   * juvenile journey. */
  begin(
    fromYaw: number,
    reducedMotion: boolean,
    scales?: { fromScale?: number; toScale?: number },
  ): void
  /** Advance one clamped-dt step from (x, z). */
  advance(x: number, z: number, dt: number): EvolutionDrive
}

export function createEvolutionCeremony(): EvolutionMachine {
  let phase: EvolutionPhase = "idle"
  let yaw = 0
  let elapsed = 0
  let swapPending = false
  let fromScale = BABY_SCALE
  let toScale = JUVENILE_SCALE

  const begin = (
    fromYaw: number,
    reducedMotion: boolean,
    scales?: { fromScale?: number; toScale?: number },
  ): void => {
    yaw = fromYaw
    elapsed = 0
    fromScale = scales?.fromScale ?? BABY_SCALE
    toScale = scales?.toScale ?? JUVENILE_SCALE
    if (reducedMotion) {
      // Instant variant: swap where you stand — no travel, no glow.
      swapPending = true
      phase = "settle"
      elapsed = SETTLE_TIME
      return
    }
    phase = "walk"
  }

  const advance = (x: number, z: number, dt: number): EvolutionDrive => {
    const step = Math.min(Math.max(dt, 0), 0.1)
    if (phase === "walk") {
      const s = strideStep(x, z, yaw, 0, 0, step)
      yaw = s.yaw
      if (s.arrived) {
        phase = "glow"
        elapsed = 0
      }
      return {
        x: s.x,
        z: s.z,
        yaw,
        phase: "walk",
        scale: fromScale,
        glow: 0,
        swap: false,
        pivoting: s.pivoting,
        active: true,
      }
    }
    if (phase === "glow") {
      elapsed += step
      const k = Math.min(1, elapsed / GLOW_TIME)
      if (k >= 1) {
        phase = "settle"
        elapsed = 0
        swapPending = true
      }
      return {
        x,
        z,
        yaw,
        phase: "glow",
        scale: fromScale + SWELL * k,
        glow: k * (0.6 + 0.4 * Math.sin(elapsed * 7)),
        swap: false,
        pivoting: false,
        active: true,
      }
    }
    if (phase === "settle") {
      elapsed += step
      const k = Math.min(1, elapsed / SETTLE_TIME)
      const swap = swapPending
      swapPending = false
      if (k >= 1) phase = "idle"
      return {
        x,
        z,
        yaw,
        phase: "settle",
        scale: toScale + OVERSHOOT * (1 - k),
        glow: (1 - k) * 0.4,
        swap,
        pivoting: false,
        active: true,
      }
    }
    return {
      x,
      z,
      yaw,
      phase: "idle",
      scale: toScale,
      glow: 0,
      swap: false,
      pivoting: false,
      active: false,
    }
  }

  return { begin, advance }
}
