import { ARENA_FRAMING, BASE_FOV } from "../camera/presets"

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
 *
 * This now drives only the WIDE ESTABLISHING composition. The live action
 * camera tracks the fighters and derives its distance from their positions
 * (see `trackedActionFraming`), so the old "back off + widen" compensation
 * would only shrink the fighters it is meant to make readable.
 */
export interface ArenaFramingAdjustment {
  /** Multiplier on the establishing framing radius (>= 1). */
  radiusMult: number
  /** Added vertical FOV in degrees (>= 0). */
  fovAdd: number
}

/** Viewport aspect at or above which the establishing framing is untouched. */
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

/** The wide shot's distance and lens for a viewport. */
export function establishingFraming(aspect: number): {
  radius: number
  fov: number
} {
  const adjust = arenaFramingAdjust(aspect)
  return {
    radius: ARENA_FRAMING.radius * adjust.radiusMult,
    fov: BASE_FOV + adjust.fovAdd,
  }
}

/** A fighter's ground position in world units. */
export interface ArenaFocus {
  readonly x: number
  readonly z: number
}

/** The camera angles and lens an action shot uses; the distance is derived. */
export interface ActionFramingPose {
  readonly azimuth: number
  readonly elevation: number
  readonly targetY: number
  readonly fov: number
  readonly margin: number
  readonly minRadius: number
  readonly maxRadius: number
}

/** A resolved orbit pose for an action shot. */
export interface TrackedFraming {
  readonly targetX: number
  readonly targetY: number
  readonly targetZ: number
  readonly azimuth: number
  readonly elevation: number
  readonly fov: number
  readonly radius: number
}

/** Lens factor tying vertical FOV to the smaller rendered fighter. A narrow
 * lens magnifies both fighters; it is the only way a 0.08-world ray can still
 * fill 8% of the frame while its opponent remains visible. */
const READABILITY_LENS_FACTOR = 1.6

/**
 * Closest orbit distance and lens that keep both fighters fully inside the
 * frustum, with the smaller rendered body large enough to read at rest.
 *
 * For a camera at `T + R·d` looking at `T`, a point `P` has depth
 * `R - (P-T)·d`; its right/up offsets do not depend on `R`. Requiring
 * `|x| <= depth·tan(fov/2)·aspect` and `|y| <= depth·tan(fov/2)` therefore
 * gives a closed-form lower bound on `R` — no search, no per-frame camera
 * object. A telephoto lens is chosen from the smaller rig height so the
 * rendered body (not the sim cylinder) clears the size floor; if a spread-out
 * legal pair needs more width, the lens widens until the bound fits the cap.
 */
export function trackedActionFraming(
  aspect: number,
  a: ArenaFocus,
  b: ArenaFocus,
  pose: ActionFramingPose,
  heightA = 1,
  heightB = 1,
  look: ArenaFocus = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 },
): TrackedFraming {
  const safeAspect = aspect > 0 ? aspect : 1
  const ha = heightA > 0 && Number.isFinite(heightA) ? heightA : 1
  const hb = heightB > 0 && Number.isFinite(heightB) ? heightB : 1
  // A mixed cast needs the camera beyond the SMALLER rig, otherwise that
  // fighter sits behind the taller one's dolly distance and never fills the
  // frame. Bias the aim to the smaller fighter and look outward past it.
  let aim = look
  let azimuth = pose.azimuth
  const smaller = Math.min(ha, hb)
  const larger = Math.max(ha, hb)
  if (smaller < larger * 0.9) {
    const small = ha <= hb ? a : b
    const big = ha <= hb ? b : a
    aim = { x: small.x, z: small.z }
    const dx = small.x - big.x
    const dz = small.z - big.z
    if (dx !== 0 || dz !== 0) azimuth = Math.atan2(dx, dz)
  }
  // Aim at the middle of the bodies people actually see, not a fixed height
  // borrowed from a tall archetype's collision cylinder.
  const targetY = Math.min(pose.targetY, smaller / 2)
  const sinAz = Math.sin(azimuth)
  const cosAz = Math.cos(azimuth)
  const sinEl = Math.sin(pose.elevation)
  const cosEl = Math.cos(pose.elevation)
  // d points from the target to the camera; right/up are orthonormal.
  const dirX = cosEl * sinAz
  const dirY = sinEl
  const dirZ = cosEl * cosAz
  const rightX = cosAz
  const rightZ = -sinAz
  const upX = -sinAz * sinEl
  const upY = cosEl
  const upZ = -cosAz * sinEl

  const samples: Array<{ depth: number; width: number }> = []
  for (const [p, h] of [
    [a, ha],
    [b, hb],
  ] as const) {
    for (const y of [0, h]) {
      const vx = p.x - aim.x
      const vy = y - targetY
      const vz = p.z - aim.z
      samples.push({
        depth: vx * dirX + vy * dirY + vz * dirZ,
        width: Math.max(
          Math.abs(vx * rightX + vz * rightZ) / safeAspect,
          Math.abs(vx * upX + vy * upY + vz * upZ),
        ),
      })
    }
  }
  const poseTan = Math.tan((pose.fov * Math.PI) / 360)
  const readableTan = Math.min(poseTan, READABILITY_LENS_FACTOR * smaller)
  const room = pose.maxRadius / pose.margin
  let depth = -Infinity
  let width = 0
  for (const s of samples) {
    depth = Math.max(depth, s.depth)
    width = Math.max(width, s.width)
  }
  // Widen only when containment cannot fit the telephoto shot under the cap.
  const fitTan = room > depth ? width / (room - depth) : poseTan
  const tan = Math.min(poseTan, Math.max(readableTan, fitTan))
  let need = 0
  for (const s of samples) need = Math.max(need, s.depth + s.width / tan)
  const radius = Math.min(
    pose.maxRadius,
    Math.max(pose.minRadius, need * pose.margin),
  )
  return {
    targetX: aim.x,
    targetY,
    targetZ: aim.z,
    azimuth,
    elevation: pose.elevation,
    fov: (2 * Math.atan(tan) * 180) / Math.PI,
    radius,
  }
}
