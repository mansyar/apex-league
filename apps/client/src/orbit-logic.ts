/**
 * Pure orbit/gesture arithmetic for the ranch camera.
 *
 * Extracted from `orbit-camera.ts` following the `scene-logic.ts` /
 * `steps/pure.ts` precedent: the adapter keeps listeners, three.js objects
 * and the arena/director logic, while every number the orbit pose depends on
 * is computed here so it can be tested without a DOM (F2).
 */

/** Spherical pose of the orbit camera around its aim point. */
export interface Orbit {
  /** Yaw around the aim point, in radians. Unbounded — you can circle. */
  azimuth: number
  /** Pitch above the horizon, in radians. Clamped to ELEVATION_BOUNDS. */
  elevation: number
  /** Distance from the aim point. Clamped to ORBIT_BOUNDS. */
  radius: number
}

/** The `{x, y, z}` shape the pose math reads and writes — satisfied by
 * `THREE.Vector3`, so a camera position can be filled in place. */
export interface Point3 {
  x: number
  y: number
  z: number
}

/** Which regime the camera is in. The player owns the camera on the ranch;
 * the arena director owns it during a fight. */
export type CameraMode = "ranch" | "arena"

/** Hard distance limits, held across drag, wheel and pinch so no gesture can
 * put the camera inside the creature or into the fog. */
export const ORBIT_BOUNDS = { MIN_RADIUS: 2.5, MAX_RADIUS: 14 } as const

/** Pitch limits: a hair above the ground plane to just short of overhead. */
export const ELEVATION_BOUNDS = { MIN: 0.05, MAX: 1.45 } as const

/** Radians of orbit per pixel of drag. */
export const DRAG_SENSITIVITY = 0.005

/** Fraction of the current radius added per wheel notch. */
export const ZOOM_STEP = 0.1

/** The three gesture phases the canvas can be in, from the count of active
 * pointers. A third finger does not change the mode. */
export type PointerPhase = "idle" | "drag" | "pinch"

const clamp = (value: number, lo: number, hi: number): number =>
  Math.min(Math.max(value, lo), hi)

/**
 * Apply a drag delta to the orbit. Azimuth is unbounded; elevation clamps.
 * Returns a new orbit — the input is never mutated.
 */
export function dragOrbit(orbit: Orbit, dx: number, dy: number): Orbit {
  return {
    azimuth: orbit.azimuth - dx * DRAG_SENSITIVITY,
    elevation: clamp(
      orbit.elevation + dy * DRAG_SENSITIVITY,
      ELEVATION_BOUNDS.MIN,
      ELEVATION_BOUNDS.MAX,
    ),
    radius: orbit.radius,
  }
}

/**
 * Apply a wheel notch: scrolling away backs the camera off, scrolling toward
 * brings it in (a zero delta is a no-op). Radius only, clamped to
 * ORBIT_BOUNDS.
 */
export function zoomOrbit(orbit: Orbit, deltaY: number): Orbit {
  return {
    azimuth: orbit.azimuth,
    elevation: orbit.elevation,
    radius: clamp(
      orbit.radius * (1 + Math.sign(deltaY) * ZOOM_STEP),
      ORBIT_BOUNDS.MIN_RADIUS,
      ORBIT_BOUNDS.MAX_RADIUS,
    ),
  }
}

/**
 * Apply a two-finger pinch. `spreadRatio` is the current pointer distance
 * divided by the previous one, so spreading the fingers (ratio > 1) moves the
 * camera closer — the same sense a trackpad pinch produces, and the inverse of
 * the wheel's "scroll away to back off". Radius only, clamped to
 * ORBIT_BOUNDS.
 */
export function pinchOrbit(orbit: Orbit, spreadRatio: number): Orbit {
  return {
    azimuth: orbit.azimuth,
    elevation: orbit.elevation,
    radius: clamp(
      orbit.radius / spreadRatio,
      ORBIT_BOUNDS.MIN_RADIUS,
      ORBIT_BOUNDS.MAX_RADIUS,
    ),
  }
}

/**
 * Write the camera position the orbit implies into `out` and return it, so a
 * frame can reuse a hoisted vector instead of allocating (the spherical
 * formula `orbit-camera.ts` used to inline). Neither `target` nor `orbit` is
 * touched.
 */
export function orbitPosition(
  target: Point3,
  orbit: Orbit,
  out: Point3,
): Point3 {
  const horizontal = orbit.radius * Math.cos(orbit.elevation)
  out.x = target.x + horizontal * Math.sin(orbit.azimuth)
  out.y = target.y + orbit.radius * Math.sin(orbit.elevation)
  out.z = target.z + horizontal * Math.cos(orbit.azimuth)
  return out
}

/** The gesture phase for a number of pointers down on the canvas. */
export function pointerMode(activePointers: number): PointerPhase {
  if (activePointers >= 2) return "pinch"
  return activePointers === 1 ? "drag" : "idle"
}

/** Whether orbit input is accepted at all in this mode (decision 2: the
 * arena belongs to the camera director). */
export function acceptsOrbit(mode: CameraMode): boolean {
  return mode === "ranch"
}
