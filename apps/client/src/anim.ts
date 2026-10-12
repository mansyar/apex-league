/**
 * Animation primitive layer (battle-animation-overhaul FR4): pure,
 * testable math that both the arena and the ranch can choreograph with.
 * No THREE dependency — plain numbers and objects — so the functions
 * stay framework-free and the tests stay instant. Derived variation is
 * seeded, never random: identical inputs replay bit-identically.
 */

/** A plain 3-vector. */
export interface Vec3 {
  x: number
  y: number
  z: number
}

/** Clamp to [0, 1]. */
export function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t
}

/** Quadratic ease-out — the arena's existing `easeOut`. */
export function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t)
}

/** Cubic ease-out. */
export function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

/** Cubic ease-in-out. */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}

/**
 * Ease-out with a deliberate overshoot that settles — for attack
 * uncoils and landing impacts that read as weight, not slides.
 */
export function easeOutBack(t: number): number {
  const c1 = 1.70158
  const c3 = c1 + 1
  const x = t - 1
  return 1 + c3 * x ** 3 + c1 * x ** 2
}

/** Which third of a step a normalized time falls in. */
export type PhaseName = "windup" | "contact" | "recovery"

export interface PhasePoint {
  readonly phase: PhaseName
  /** Progress 0..1 within the phase. */
  readonly local: number
}

/**
 * Map a normalized step time onto its phase boundaries (FR3 contract).
 * `t` outside [0, 1] clamps to the step's ends.
 */
export function phaseAt(
  t: number,
  phases: { windup: number; contact: number; recovery: number },
): PhasePoint {
  const c = clamp01(t)
  const windupEnd = phases.windup
  const contactEnd = phases.windup + phases.contact
  if (c < windupEnd) {
    return { phase: "windup", local: windupEnd === 0 ? 1 : c / windupEnd }
  }
  if (c < contactEnd) {
    return {
      phase: "contact",
      local:
        contactEnd === windupEnd
          ? 1
          : (c - windupEnd) / (contactEnd - windupEnd),
    }
  }
  return {
    phase: "recovery",
    local:
      c >= 1 || phases.recovery === 0 ? 1 : (c - contactEnd) / phases.recovery,
  }
}

/** One scalar keyframe on a normalized [0, 1] timeline. */
export interface Keyframe {
  readonly t: number
  readonly value: number
}

/**
 * Sample a sorted keyframe track at normalized time `t` (clamped to the
 * track's ends). Linear interpolation — callers ease before sampling.
 */
export function sampleTrack(track: readonly Keyframe[], t: number): number {
  const c = clamp01(t)
  const first = track[0]
  const last = track.at(-1)
  if (!first || !last) return 0
  if (c <= first.t) return first.value
  if (c >= last.t) return last.value
  for (let i = 1; i < track.length; i++) {
    const hi = track[i]
    const lo = track[i - 1]
    if (hi && lo && c <= hi.t) {
      const span = hi.t - lo.t
      const f = span === 0 ? 1 : (c - lo.t) / span
      return lo.value + (hi.value - lo.value) * f
    }
  }
  return last.value
}

/** One vector keyframe on a normalized [0, 1] timeline. */
export interface VecKeyframe {
  readonly t: number
  readonly value: Vec3
}

/** Per-axis `sampleTrack`. */
export function sampleVecTrack(track: readonly VecKeyframe[], t: number): Vec3 {
  const c = clamp01(t)
  const first = track[0]
  const last = track.at(-1)
  if (!first || !last) return { x: 0, y: 0, z: 0 }
  if (c <= first.t) return { ...first.value }
  if (c >= last.t) return { ...last.value }
  for (let i = 1; i < track.length; i++) {
    const hi = track[i]
    const lo = track[i - 1]
    if (hi && lo && c <= hi.t) {
      const span = hi.t - lo.t
      const f = span === 0 ? 1 : (c - lo.t) / span
      return {
        x: lo.value.x + (hi.value.x - lo.value.x) * f,
        y: lo.value.y + (hi.value.y - lo.value.y) * f,
        z: lo.value.z + (hi.value.z - lo.value.z) * f,
      }
    }
  }
  return { ...last.value }
}

/** A full body pose: where the part sits, how it turns, how big it is. */
export interface Pose {
  readonly position: Vec3
  /** Euler radians — additive layering, order decided by the composer. */
  readonly rotation: Vec3
  readonly scale: number
}

/** An additive layer over a pose: partial axes add, scale multiplies. */
export interface PoseDelta {
  readonly position?: Partial<Vec3>
  readonly rotation?: Partial<Vec3>
  readonly scale?: number
}

/**
 * Compose a base pose with additive layer deltas (FR4): position and
 * rotation add per defined axis, scale multiplies. Layers apply in
 * order, so later layers sit on top of earlier ones.
 */
export function composePose(
  base: Pose,
  ...deltas: ReadonlyArray<PoseDelta>
): Pose {
  const position = { ...base.position }
  const rotation = { ...base.rotation }
  let scale = base.scale
  for (const delta of deltas) {
    if (delta.position) {
      if (delta.position.x !== undefined) position.x += delta.position.x
      if (delta.position.y !== undefined) position.y += delta.position.y
      if (delta.position.z !== undefined) position.z += delta.position.z
    }
    if (delta.rotation) {
      if (delta.rotation.x !== undefined) rotation.x += delta.rotation.x
      if (delta.rotation.y !== undefined) rotation.y += delta.rotation.y
      if (delta.rotation.z !== undefined) rotation.z += delta.rotation.z
    }
    if (delta.scale !== undefined) scale *= delta.scale
  }
  return { position, rotation, scale }
}

/** FNV-1a over a string's UTF-16 code units — the sim's tie-order hash. */
export function hashString(s: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    hash ^= s.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/**
 * Deterministic per-instance variation (FR4): same seed + key always
 * yields the same value in [-spread, +spread]; spread 0 is exactly 0.
 * Choreography uses this so two fighters of the same species never
 * animate in perfect lockstep without breaking replay determinism.
 */
export function jitter(seed: number, key: string, spread: number): number {
  if (spread === 0) return 0
  // xor the numeric seed into the hashed key — order-stable mixing.
  const h = (hashString(key) ^ Math.imul(seed >>> 0, 0x9e3779b1)) >>> 0
  return ((h / 0xffffffff) * 2 - 1) * spread
}
