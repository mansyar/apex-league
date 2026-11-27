import { ARENA_FRAMING, BASE_FOV } from "../camera/presets"

/**
 * Arena framing: aspect compensation for the wide establishing shot, plus
 * the tracked action solve. The wide shot backs off as the aspect narrows;
 * the action camera derives its dolly from the live pair.
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
const READABILITY_LENS_FACTOR = 2.4

/** The shortest supported viewport (393 px) makes 32/393 the binding floor. */
const READABILITY_FLOOR = 0.082

/** Bounded three-quarter offsets; the smallest one that clears both bodies
 * wins so fighters stay as large as the bounds allow. */
const SEPARATION_OFFSETS = [
  0, 0.02, 0.04, 0.06, 0.08, 0.12, 0.18, 0.26, 0.4, 0.55,
] as const

/** Animated headroom (world units): live bodies rise above their rest boxes
 * (windup rise, gait, breath). Containment samples reach head plus pad;
 * readability still uses the rest height. 0.2 covers the lunge-beat
 * headroom seen on the portrait matrix with margin. */
const ANIM_HEIGHT_PAD = 0.2

/** Ground-plane pad for strikes. Zero: lunges already reach the solver
 * through the live focus positions. */
const ANIM_RADIUS_PAD = 0

/** Centre-separation target as a fraction of summed half-widths. A target,
 * not a guarantee: wide short rigs cannot reach it on portrait while
 * holding the floor, so the solver falls back to the most separated
 * readable candidate. */
const TARGET_CENTER_SEPARATION = 0.38

/** Fallback floor for that unreachable-target case. Never traded away:
 * containment and the readability floor always win over separation. */
const MIN_DISTINCT_SEPARATION = 0.1

interface BodySample {
  readonly depth: number
  readonly width: number
  /** Radius/FOV cap that keeps this body readable. */
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
 * Closest orbit distance and lens that keep both bodies inside the
 * frustum, separated, and readable. The footprint fit gives a closed-form
 * tan/distance bound; a bounded azimuth-offset search picks the smallest
 * useful three-quarter angle when the pair aligns with the view axis.
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
  // Mixed casts aim at the SMALLER rig.
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
  // Aim mid-pair (padded envelope), so the pullback stays balanced.
  const targetY = Math.min(
    pose.targetY,
    Math.max(smaller + ANIM_HEIGHT_PAD / 2, (larger + ANIM_HEIGHT_PAD) / 2),
  )
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
    // d is target→camera; right/up are orthonormal.
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
      // Containment reaches head plus pad; readability uses rest height.
      const top = e.h + ANIM_HEIGHT_PAD
      const rad = e.r + ANIM_RADIUS_PAD
      // Near footprint corners project widest.
      for (const xOffset of [-rad, rad]) {
        for (const zOffset of [-rad, rad]) {
          for (const y of [0, top]) {
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
    // Radius cap floors tan; minimum dolly distance ceilings it.
    let tanMin = 0
    let tanMax = poseTan
    for (const s of samples) {
      if (room > s.depth) tanMin = Math.max(tanMin, s.width / (room - s.depth))
      if (pose.minRadius > s.depth) {
        tanMax = Math.min(tanMax, s.readable / (pose.minRadius - s.depth))
      }
    }
    // Containment wins when the bounds cross.
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
    // The binding sample can be the OTHER fighter; fraction falls with tan.
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
  // View-axis azimuth (zero screen gap). Fold onto the nearer axis
  // direction so mirrors keep their camera side.
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
  let bestGap = initial.centerGap
  for (const offset of SEPARATION_OFFSETS) {
    const testAzimuth =
      Math.abs(delta) >= offset ? azimuth : base + side * offset
    const candidate = solve(testAzimuth)
    const readable = candidate.fraction >= READABILITY_FLOOR
    const score =
      candidate.centerGap / Math.max(candidate.halfA + candidate.halfB, 1e-6)
    if (readable && score >= TARGET_CENTER_SEPARATION) {
      best = candidate
      bestScore = score
      break
    }
    // Fallback: largest readable, distinct gap. Floor never yields.
    if (
      readable &&
      score >= MIN_DISTINCT_SEPARATION &&
      candidate.centerGap > bestGap
    ) {
      best = candidate
      bestScore = score
      bestGap = candidate.centerGap
    }
  }
  // Coincident pairs keep the containment-safe initial solve.
  if (bestScore < MIN_DISTINCT_SEPARATION) return initial.frame
  return best.frame
}
