/**
 * Camera framing constants, moved verbatim out of `orbit-camera.ts`.
 */

/** Base vertical FOV; narrow viewports widen the lens on top of this
 * (see arenaFramingAdjust). */
export const BASE_FOV = 45

/**
 * Broadcast camera framing the ranch orbit hands over to during a fight:
 * a fixed side-elevated wide shot that keeps the painted arena
 * (`ARENA_BOUNDS` at the presentation scale, ±3.2 on X, ±2.4 on Z) in
 * frame with margin. 2026-10-11: widened after live feedback — no fighter
 * leaves the camera's view.
 */
export const ARENA_FRAMING = {
  azimuth: 0.12,
  elevation: 0.55,
  radius: 12.5,
  targetY: 0.9,
} as const
