/**
 * Camera framing constants, moved verbatim out of `orbit-camera.ts`.
 */

/** Base vertical FOV; the wide establishing shot widens the lens on narrow
 * viewports (see arenaFramingAdjust). Tracked action framing keeps this FOV
 * and changes distance instead, so fighters stay legible on phones. */
export const BASE_FOV = 45

/**
 * Wide establishing composition: the arena-only shot that contains every
 * painted corner (`ARENA_BOUNDS` at the presentation scale, ±3.2 on X,
 * ±2.4 on Z) with margin. Used for the stable reduced-motion broadcast.
 */
export const ARENA_FRAMING = {
  azimuth: 0.12,
  elevation: 0.55,
  radius: 12.5,
  targetY: 0.9,
} as const

/**
 * Tracked action composition. The camera looks down the arena's long axis
 * (azimuth ≈ π/2), so two fighters at the authored rest lane separate in
 * depth instead of width — that is what keeps each one above 8% of a
 * portrait viewport's height. The rig derives the radius from the live pair
 * positions: `margin` is the frustum safety factor, `minRadius`/`maxRadius`
 * bound the dolly. `trackedActionFraming` also sets the lens from the smaller
 * *rendered* rig height so even the flattest species clears 8% / 32 px; the
 * wide shot and scale normalization are unchanged.
 */
export const ACTION_FRAMING = {
  azimuth: Math.PI / 2,
  elevation: 0,
  targetY: 0.85,
  margin: 1.1,
  minRadius: 1.4,
  maxRadius: 60,
} as const
