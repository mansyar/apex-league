/**
 * Scene logic - broadcast arena framing compensation for narrow viewports.
 * Split out of scene-logic.ts (ranch_decomposition); behavior unchanged.
 */
/**
 * Broadcast arena framing compensation for narrow viewports (F6,
 * responsive_foundation_20261013). The fixed broadcast shot was tuned on
 * a wide desktop window; on portrait phones the horizontal field of view
 * shrinks with the aspect and crops the stage corners out of frame.
 *
 * Compensation backs the camera off (radius multiplier) and widens the
 * lens (added vertical FOV) as the aspect narrows past the 1.2
 * reference, with hard caps so a phone gets a usable shot rather than an
 * absurd telescope pull. Landscape keeps the framing untouched.
 */
export interface ArenaFramingAdjustment {
  /** Multiplier on the broadcast framing radius (>= 1). */
  radiusMult: number
  /** Added vertical FOV in degrees (>= 0). */
  fovAdd: number
}

/** Viewport aspect at or above which the broadcast framing is untouched. */
const ARENA_ASPECT_FLOOR = 1.2
/** Cap on the radius pull-back multiplier. */
const ARENA_RADIUS_MULT_CAP = 1.5
/** Cap on the added vertical FOV, in degrees. */
const ARENA_FOV_ADD_CAP = 12
/** How aggressively the radius pulls back per unit of missing aspect
 * (exponent on the ratio; sub-1 so wide-ish tablets barely move). */
const ARENA_RADIUS_EXPONENT = 0.6
/** Added vertical FOV degrees per unit of missing aspect. */
const ARENA_FOV_SLOPE = 10

export function arenaFramingAdjust(aspect: number): ArenaFramingAdjustment {
  const safe = aspect > 0 ? aspect : ARENA_ASPECT_FLOOR
  const ratio = ARENA_ASPECT_FLOOR / safe
  if (ratio <= 1) return { radiusMult: 1, fovAdd: 0 }
  const radiusMult = Math.min(
    ARENA_RADIUS_MULT_CAP,
    ratio ** ARENA_RADIUS_EXPONENT,
  )
  const fovAdd = Math.min(ARENA_FOV_ADD_CAP, (ratio - 1) * ARENA_FOV_SLOPE)
  return { radiusMult, fovAdd }
}
