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

/** A narrow lens is the only way a 0.08-world ray fills 8% of the frame. */
const READABILITY_LENS_FACTOR = 1.6

/** The shortest supported viewport (393 px) makes 32/393 the binding floor. */
const READABILITY_FLOOR = 0.082

/** Bounded three-quarter offsets; the smallest one that clears both bodies
 * wins so fighters stay as large as the bounds allow. */
const SEPARATION_OFFSETS = [
  0, 0.02, 0.04, 0.06, 0.08, 0.12, 0.18, 0.26, 0.4, 0.55,
] as const

/** Centre separation as a fraction of summed rendered half-widths. Wide,
 * short rigs (ray wings) cannot get a clear gap while holding the floor on
 * portrait, but this keeps the silhouettes from fully overlapping. */
const MIN_CENTER_SEPARATION = 0.38

interface BodySample {
  readonly depth: number
  readonly width: number
  /** Height/floor: the radius/FOV cap that keeps this body readable. */
  readonly readable: number
}

interface BodyCenter {
  readonly x: number
  readonly depth: number
  readonly half: number
}

interface SeparationSolve {
  readonly frame: TrackedFraming
  readonly centerGap: number
  readonly halfA: number
  readonly halfB: number
  readonly fraction: number
}

/**
 * Closest orbit distance and lens that keep both rendered bodies inside the
 * frustum, separated on screen, and readable. For a camera at `T + R·d`, a
 * point `P` has depth `R - (P-T)·d` and fixed right/up offsets, so the
 * footprint fit gives a closed-form tan/distance bound with no camera object.
 * At π/2 the pair aligns with the view axis and overlaps at any distance,
 * so a bounded azimuth-offset search picks the smallest useful three-quarter
 * angle instead.
 */
export function trackedActionFraming(
  aspect: number,
  a: ArenaFocus,
  b: ArenaFocus,
  pose: ActionFramingPose,
  heightA = 1,
  heightB = 1,
  look: ArenaFocus = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 },
  bodyRadiusA = 0,
  bodyRadiusB = 0,
): TrackedFraming {
  const safeAspect = aspect > 0 ? aspect : 1
  const ha = heightA > 0 && Number.isFinite(heightA) ? heightA : 1
  const hb = heightB > 0 && Number.isFinite(heightB) ? heightB : 1
  const ra = bodyRadiusA > 0 && Number.isFinite(bodyRadiusA) ? bodyRadiusA : 0
  const rb = bodyRadiusB > 0 && Number.isFinite(bodyRadiusB) ? bodyRadiusB : 0
  // A mixed cast needs the camera beyond the SMALLER rig, so aim at it.
  let aim = look
  let azimuth = pose.azimuth
  const smaller = Math.min(ha, hb)
  const larger = Math.max(ha, hb)
  const smallerIsA = ha <= hb
  if (smaller < larger * 0.9) {
    const small = smallerIsA ? a : b
    const big = smallerIsA ? b : a
    aim = { x: small.x, z: small.z }
    const dx = small.x - big.x
    const dz = small.z - big.z
    if (dx !== 0 || dz !== 0) azimuth = Math.atan2(dx, dz)
  }
  // Aim at the middle of the bodies people actually see.
  const targetY = Math.min(pose.targetY, smaller / 2)
  const sinEl = Math.sin(pose.elevation)
  const cosEl = Math.cos(pose.elevation)
  const dirY = sinEl
  const upY = cosEl
  const poseTan = Math.tan((pose.fov * Math.PI) / 360)
  const room = pose.maxRadius / pose.margin
  const preferredTan = Math.min(poseTan, READABILITY_LENS_FACTOR * smaller)
  const entries = [
    { p: a, h: ha, r: ra, small: smallerIsA },
    { p: b, h: hb, r: rb, small: !smallerIsA },
  ] as const

  const solve = (testAzimuth: number): SeparationSolve => {
    const sinAz = Math.sin(testAzimuth)
    const cosAz = Math.cos(testAzimuth)
    // d points target→camera; right/up are orthonormal.
    const dirX = cosEl * sinAz
    const dirZ = cosEl * cosAz
    const rightX = cosAz
    const rightZ = -sinAz
    const upX = -sinAz * sinEl
    const upZ = -cosAz * sinEl
    // Conservative horizontal half-span of the footprint square.
    const spreadX = Math.abs(rightX) + Math.abs(rightZ)
    const samples: BodySample[] = []
    for (const e of entries) {
      // Test actual footprint corners: the near one projects wider than a
      // centre ± radius linearisation suggests.
      for (const xOffset of [-e.r, e.r]) {
        for (const zOffset of [-e.r, e.r]) {
          for (const y of [0, e.h]) {
            const vx = e.p.x + xOffset - aim.x
            const vy = y - targetY
            const vz = e.p.z + zOffset - aim.z
            const lateral = vx * rightX + vz * rightZ
            const vertical = vx * upX + vy * upY + vz * upZ
            samples.push({
              depth: vx * dirX + vy * dirY + vz * dirZ,
              width: Math.max(
                Math.abs(lateral) / safeAspect,
                Math.abs(vertical),
              ),
              readable: e.h / (2 * READABILITY_FLOOR),
            })
          }
        }
      }
    }
    // Radius cap sets a tan floor; minimum dolly distance sets a ceiling.
    let tanMin = 0
    let tanMax = poseTan
    for (const s of samples) {
      if (room > s.depth) tanMin = Math.max(tanMin, s.width / (room - s.depth))
      if (pose.minRadius > s.depth) {
        tanMax = Math.min(tanMax, s.readable / (pose.minRadius - s.depth))
      }
    }
    // Containment wins when the bounds cross: no cropped fighters.
    const preferred = Math.max(tanMin, Math.min(tanMax, preferredTan))
    const evaluate = (tan: number): SeparationSolve => {
      let need = 0
      for (const s of samples) need = Math.max(need, s.depth + s.width / tan)
      const radius = Math.min(
        pose.maxRadius,
        Math.max(pose.minRadius, need * pose.margin),
      )
      const center = (e: (typeof entries)[number]): BodyCenter => {
        const vx = e.p.x - aim.x
        const vy = e.h / 2 - targetY
        const vz = e.p.z - aim.z
        const depth = radius - (vx * dirX + vy * dirY + vz * dirZ)
        const scale = Math.max(depth * tan * safeAspect, 1e-6)
        return {
          x: (vx * rightX + vz * rightZ) / scale,
          depth,
          half: (e.r * spreadX) / scale,
        }
      }
      const centerA = center(entries[0])
      const centerB = center(entries[1])
      return {
        frame: {
          targetX: aim.x,
          targetY,
          targetZ: aim.z,
          azimuth: testAzimuth,
          elevation: pose.elevation,
          fov: (2 * Math.atan(tan) * 180) / Math.PI,
          radius,
        },
        centerGap: Math.abs(centerA.x - centerB.x),
        halfA: centerA.half,
        halfB: centerB.half,
        fraction: Math.min(
          ha / Math.max(2 * centerA.depth * tan, 1e-6),
          hb / Math.max(2 * centerB.depth * tan, 1e-6),
        ),
      }
    }
    let result = evaluate(preferred)
    // The radius-binding sample can be the OTHER fighter, so the per-sample
    // ceiling is insufficient. Fraction decreases monotonically with tan.
    if (result.fraction < READABILITY_FLOOR && preferred > tanMin) {
      let low = tanMin
      let high = preferred
      for (let i = 0; i < 18; i++) {
        const mid = (low + high) / 2
        if (evaluate(mid).fraction >= READABILITY_FLOOR) low = mid
        else high = mid
      }
      result = evaluate(low)
    }
    return result
  }

  const initial = solve(azimuth)
  if (ra === 0 && rb === 0) return initial.frame
  const pairDx = b.x - a.x
  const pairDz = b.z - a.z
  const span = Math.hypot(pairDx, pairDz)
  if (span < 1e-6) return initial.frame
  // View-axis azimuth (zero screen gap). The pair is an AXIS, not a
  // direction: fold onto the nearer axis direction so mirrored orders and
  // mixed-cast outward looks keep their camera side.
  const axisAzimuth = Math.PI / 2 - Math.atan2(pairDz, pairDx)
  const rawDelta = Math.atan2(
    Math.sin(azimuth - axisAzimuth),
    Math.cos(azimuth - axisAzimuth),
  )
  let base = axisAzimuth
  let delta = rawDelta
  if (delta > Math.PI / 2) {
    base += Math.PI
    delta -= Math.PI
  } else if (delta <= -Math.PI / 2) {
    base += Math.PI
    delta += Math.PI
  }
  const side = delta < 0 ? -1 : 1
  let best = initial
  let bestScore =
    initial.centerGap / Math.max(initial.halfA + initial.halfB, 1e-6)
  for (const offset of SEPARATION_OFFSETS) {
    const testAzimuth =
      Math.abs(delta) >= offset ? azimuth : base + side * offset
    const candidate = solve(testAzimuth)
    const readable = candidate.fraction >= READABILITY_FLOOR
    const score =
      candidate.centerGap / Math.max(candidate.halfA + candidate.halfB, 1e-6)
    if (readable && score >= MIN_CENTER_SEPARATION) {
      best = candidate
      break
    }
    if (readable && score > bestScore) {
      best = candidate
      bestScore = score
    }
  }
  return best.frame
}
