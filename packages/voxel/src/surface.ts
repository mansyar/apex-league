/**
 * Surface language: anatomical zones and seeded dappling.
 *
 * Pure functions only. The archetype builders own the geometry and decide
 * which part is torso and which is leg; this module turns a voxel position
 * plus that role into a surface-class id, and turns an element hue into the
 * ordered ramp those ids index.
 *
 * The ramp is derived from the exact hsl inputs the builders already use, so
 * the `lateral` step reproduces the previous flat colour bit for bit. Only the
 * zone classes add anything new, which keeps class-less parts and the gilded
 * variant on their existing colours.
 */
import { hslToRgb } from "./color"
import type { Vec3 } from "./sdf"
import type { Palette } from "./vertex-color"

/**
 * Mixed into the dappling seed so the noise never consumes the shared DNA
 * stream. The gilded roll and the base lightness must stay identical for a
 * given seed.
 */
export const SURFACE_SALT = 0x9e3779b9

/**
 * Surface-class ids. `lateral` is 0 on purpose: it is the plain body colour,
 * so every build that declares no classifier keeps rendering as before.
 */
export const SURFACE_CLASS = {
  lateral: 0,
  dorsal: 1,
  belly: 2,
  limb: 3,
  sock: 4,
} as const

/** The ramp from darkest to lightest; dappling steps along this order. */
export const SURFACE_ORDER: readonly number[] = [
  SURFACE_CLASS.sock,
  SURFACE_CLASS.dorsal,
  SURFACE_CLASS.limb,
  SURFACE_CLASS.lateral,
  SURFACE_CLASS.belly,
]

/** Hue that "toward cool" points at. */
const COOL_HUE = 240

/**
 * Rotate `hue` by `degrees` along the shorter arc toward cool. Used for every
 * shadow step, so a shadow always cools rather than jumping hue direction.
 */
export function shadowHue(hue: number, degrees: number): number {
  const delta = ((COOL_HUE - hue + 540) % 360) - 180
  const step = Math.sign(delta) * Math.min(degrees, Math.abs(delta))
  return (((hue + step) % 360) + 360) % 360
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value))

export interface SurfacePaletteInput {
  /** Element hue in degrees, already resolved (gilded swaps to gold). */
  hue: number
  sat: number
  light: number
}

/**
 * Builds the ordered surface ramp for one creature.
 *
 * `lateral` is the previous flat body colour and `limb` is the previous flat
 * leg colour (`lateral × 0.7`), so a creature that gains no zone classes
 * renders byte-identically. The new steps sit around that pair.
 *
 * Shadow steps lose saturation as they darken. Darkening a saturated element
 * hue while keeping saturation turns a coat into a costume: an orange drake
 * shadowed at full saturation reads crimson, not "the same animal, less lit".
 * The belly goes the other way, desaturating as it lightens toward the cream
 * an underside actually reads as.
 */
export function creaturePalette(input: SurfacePaletteInput): Palette {
  const { hue, sat, light } = input
  const step = (h: number, s: number, l: number): [number, number, number] =>
    hslToRgb(h, clamp01(s), clamp01(l))

  const lateral = step(hue, sat, light)
  const ramp: [number, number, number][] = []
  ramp[SURFACE_CLASS.lateral] = lateral
  ramp[SURFACE_CLASS.dorsal] = step(shadowHue(hue, 16), sat * 0.5, light - 0.19)
  ramp[SURFACE_CLASS.belly] = step(hue, sat * 0.35, light + 0.16)
  ramp[SURFACE_CLASS.limb] = [
    lateral[0] * 0.7,
    lateral[1] * 0.7,
    lateral[2] * 0.7,
  ]
  ramp[SURFACE_CLASS.sock] = step(shadowHue(hue, 22), sat * 0.5, light - 0.22)
  return ramp
}

/** Deterministic 3D hash in [0, 1). */
function hash3(x: number, y: number, z: number, seed: number): number {
  let h =
    seed ^
    Math.imul(x | 0, 0x27d4eb2d) ^
    Math.imul(y | 0, 0x165667b1) ^
    Math.imul(z | 0, 0x9e3779b1)
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

const smooth = (t: number): number => t * t * (3 - 2 * t)
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

/** Trilinearly interpolated value noise, one octave. */
function valueNoise(x: number, y: number, z: number, seed: number): number {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const z0 = Math.floor(z)
  const fx = smooth(x - x0)
  const fy = smooth(y - y0)
  const fz = smooth(z - z0)

  const c = (dx: number, dy: number, dz: number): number =>
    hash3(x0 + dx, y0 + dy, z0 + dz, seed)

  const x00 = lerp(c(0, 0, 0), c(1, 0, 0), fx)
  const x10 = lerp(c(0, 1, 0), c(1, 1, 0), fx)
  const x01 = lerp(c(0, 0, 1), c(1, 0, 1), fx)
  const x11 = lerp(c(0, 1, 1), c(1, 1, 1), fx)

  return lerp(lerp(x00, x10, fy), lerp(x01, x11, fy), fz)
}

/**
 * Two-octave low-frequency dappling in [0, 1).
 *
 * Periods are 5 and 2.5 voxels: large enough to read as markings at arena
 * distance, small enough not to paint one half of the body a different tone.
 */
export function dappleNoise(
  x: number,
  y: number,
  z: number,
  seed: number,
): number {
  const coarse = valueNoise(x / 5, y / 5, z / 5, seed)
  const fine = valueNoise(x / 2.5, y / 2.5, z / 2.5, seed ^ 0x5bd1e995)
  return 0.65 * coarse + 0.35 * fine
}

/**
 * Steps a flank voxel one place darker on the ramp.
 *
 * Dappling is deliberately one-sided for `lateral`: stepping it up reaches the
 * belly tone, and at arena distance thirty percent pale speckle across the
 * flank stops reading as hide and starts reading as torn or eroded. Dark
 * mottling on the coat is a marking; light mottling on the coat is damage.
 */
function dappled(base: number, p: Vec3, seed: number): number {
  const index = SURFACE_ORDER.indexOf(base)
  const n = dappleNoise(p.x, p.y, p.z, seed ^ SURFACE_SALT)
  const darkens = base === SURFACE_CLASS.lateral || base === SURFACE_CLASS.limb
  const offset = darkens && n < 0.3 ? -1 : 0
  const next = Math.min(SURFACE_ORDER.length - 1, Math.max(0, index + offset))
  return SURFACE_ORDER[next] ?? base
}

export type SurfaceRole = "torso" | "leg"

export interface SurfaceBounds {
  /** Lowest y the torso occupies. */
  torsoBottom: number
  /** Highest y the torso occupies. */
  torsoTop: number
  /** Leg voxels at or below this y are sock. */
  sockTop: number
}

/** Share of torso height that reads as belly, measured up from the bottom. */
const BELLY_SHARE = 0.18
/** Share of torso height that reads as dorsal, measured down from the top. */
const DORSAL_SHARE = 0.18

/** Salt for the boundary wobble, kept apart from the dappling noise. */
const EDGE_SALT = 0x2545f491

/**
 * Mixes a band with its neighbouring step. A band that is one flat colour
 * reads as paint laid over the animal, so part of it drifts back toward the
 * flank tone and the boundary stops being the only thing that varies.
 */
function mottled(
  base: number,
  neighbour: number,
  p: Vec3,
  seed: number,
  share: number,
): number {
  const n = dappleNoise(p.x, p.y, p.z, seed ^ SURFACE_SALT)
  return n < share ? neighbour : base
}

/**
 * Classifies one voxel. Bands are absolute in grid space, so the classifier
 * stays a pure function of position and the archetype's proportions.
 *
 * Band edges only wobble, by up to ~1.5 voxels of low-frequency noise. An
 * earlier version also dithered the edge per voxel; up close it read as a soft
 * transition, but at arena distance a frayed boundary between a light belly and
 * a dark flank reads as damage, so the edge stays a single clean line that
 * merely wanders.
 */
export function surfaceClass(
  role: SurfaceRole,
  p: Vec3,
  seed: number,
  bounds: SurfaceBounds,
): number {
  const wobble = (dappleNoise(p.x, 0, p.z, seed ^ EDGE_SALT) - 0.5) * 3
  const y = p.y + wobble

  if (role === "leg") {
    if (y <= bounds.sockTop) return SURFACE_CLASS.sock
    return dappled(SURFACE_CLASS.limb, p, seed)
  }

  const height = Math.max(1, bounds.torsoTop - bounds.torsoBottom)
  const bellyEdge = bounds.torsoBottom + height * BELLY_SHARE
  const dorsalEdge = bounds.torsoTop - height * DORSAL_SHARE

  if (y <= bellyEdge) {
    return mottled(SURFACE_CLASS.belly, SURFACE_CLASS.lateral, p, seed, 0.25)
  }
  if (y >= dorsalEdge) {
    return mottled(SURFACE_CLASS.dorsal, SURFACE_CLASS.lateral, p, seed, 0.25)
  }

  return dappled(SURFACE_CLASS.lateral, p, seed)
}
