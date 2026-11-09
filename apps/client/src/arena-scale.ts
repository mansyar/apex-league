/**
 * Presentation-only scale: the one place sim millimetres become world
 * units. The sim is untouched; this module only maps its numbers onto the
 * stage.
 *
 * Why 0.0008:
 *
 * - The arena is `ARENA_BOUNDS` (±4,000 × ±3,000 mm), so its half-extents
 *   become 3.2 × 2.4 world units and its half-diagonal is 4.0. The barrier
 *   torus sits at radius 8.6, leaving 4.6 units of show-floor run-off.
 * - A body's diameter is `2 * radiusMm * MM_TO_WORLD`: a tortoise (r 300)
 *   is 0.48 units wide, a heron (r 180) is 0.288. At the measured median
 *   engagement of 926 mm (0.741 units) two 220 mm-radius bodies (0.352 wide
 *   each) leave a 0.389-unit gap — 1.1 body widths, never overlapping.
 * - The camera's existing broadcast framing (radius 12.5, aspect
 *   compensation) keeps the whole 6.4 × 4.8 arena in frame at desktop and
 *   phone widths, so the stage shot does not need to move.
 *
 * The scale is a rendering choice, not simulation arithmetic: the sim keeps
 * integer millimetres and its own fence.
 */

// The sim's own numbers, imported from their source rather than copied. The
// package barrel does not re-export them, and this phase may not edit
// `packages/sim`, so the deep import is the only way to keep one source of
// truth for the bounds and the body table.
import { ARENA_BOUNDS } from "../../../packages/sim/src/battle/continuous/resolve"
import {
  type BodyProfile,
  bodyProfileFor,
} from "../../../packages/sim/src/species"

/** World units per simulated millimetre. */
export const MM_TO_WORLD = 0.0008

/** A sim x coordinate in world units. */
export const simX = (mm: number): number => mm * MM_TO_WORLD

/** A sim z coordinate in world units. */
export const simZ = (mm: number): number => mm * MM_TO_WORLD

/** Half the arena's painted width, in world units. */
export const ARENA_HALF_X = simX(ARENA_BOUNDS.maxX)

/** Half the arena's painted depth, in world units. */
export const ARENA_HALF_Z = simZ(ARENA_BOUNDS.maxZ)

/** The sim's authored body volume for an archetype. */
export function bodyProfileOf(archetypeId: string | undefined): BodyProfile {
  return bodyProfileFor(archetypeId)
}

/** The width a body should occupy on stage, in world units. */
export function bodyWorldDiameter(archetypeId: string | undefined): number {
  return 2 * bodyProfileOf(archetypeId).radiusMm * MM_TO_WORLD
}

/**
 * Holder scale that fits a built rig's widest ground span to its simulated
 * diameter. The 0.001 floor guards degenerate bounds.
 */
export function bodyScaleFor(
  archetypeId: string | undefined,
  measuredSpan: number,
): number {
  return bodyWorldDiameter(archetypeId) / Math.max(measuredSpan, 0.001)
}
