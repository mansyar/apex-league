/**
 * Contact geometry: bodies have volume, blows sweep through space.
 *
 * Continuous Arena Battle FR-17, FR-18, FR-19. A fighter is not a point: it
 * has a radius and a height, and a blow or a shot only lands when the space it
 * sweeps overlaps that body. Reach is measured surface to surface, an arc is a
 * cosine test, and a projectile is a segment from last step's position to this
 * step's — so a fast shot cannot tunnel through a body between steps.
 *
 * Everything is integer: squared distances, cross products, and integer
 * division for the closest-point projection. No trigonometry, no floats, no
 * random source.
 */

import { BODY_RADIUS_MM, type HeightBand } from "../frames"
import {
  type ArenaBounds,
  DIR_SCALE,
  type Dir2,
  type FighterState,
  type Vec3,
} from "./types"

/** A body's footprint and height, in millimetres. */
export interface Body {
  readonly pos: Vec3
  /** Half the body's width: the closest its centre may come to another's. */
  readonly radiusMm: number
  /** How tall the body stands from the floor, in mm. */
  readonly heightMm: number
}

/**
 * The height a fighter gets when its init names none, in mm (tunable). The
 * roster's archetypes stand between 650 and 1200 mm, so this is the middle of
 * the field rather than a placeholder.
 */
export const DEFAULT_BODY_HEIGHT_MM = 900

/**
 * How far a fighter may turn toward its opponent in one step, in thousandths
 * of a unit direction (tunable). Facing is a lock-on: it follows the foe, not
 * the movement order, so strafing no longer turns a body's back to the fight.
 * The budget keeps the turn finite, so circling a close opponent can still
 * earn a flank (FR-4).
 */
export const TURN_UNITS_PER_STEP = 50

/** A body's opening volume, seeded from the species and form. */
export function openingBody(
  radiusMm: number = BODY_RADIUS_MM,
  heightMm: number = DEFAULT_BODY_HEIGHT_MM,
): Readonly<{ radiusMm: number; heightMm: number }> {
  return Object.freeze({ radiusMm, heightMm })
}

/** The volume a fighter's state carries. */
export function bodyOf(fighter: FighterState): Body {
  return {
    pos: fighter.pos,
    radiusMm: fighter.radiusMm,
    heightMm: fighter.heightMm,
  }
}

/** Integer square root, floored: Newton's method on whole numbers only. */
export function integerSqrt(value: number): number {
  let guess = value
  let next = Math.floor((guess + 1) / 2)
  while (next < guess) {
    guess = next
    next = Math.floor((guess + Math.floor(value / guess)) / 2)
  }
  return guess
}

/** Integer division rounding halves away from zero, so mirrored aims match. */
export function divRound(value: number, divisor: number): number {
  const half = Math.floor(divisor / 2)
  const rounded = Math.floor((Math.abs(value) + half) / divisor)
  return value < 0 ? -rounded : rounded
}

/**
 * The thousandth-scaled unit direction from `from` to `to`. Two points that
 * share a centre have no direction, so the line stays still.
 */
export function shotDirection(from: Vec3, to: Vec3): Dir2 {
  const dx = to.x - from.x
  const dz = to.z - from.z
  const length = integerSqrt(dx * dx + dz * dz)
  if (length === 0) return { x: 0, z: 0 }
  return {
    x: divRound(dx * DIR_SCALE, length),
    z: divRound(dz * DIR_SCALE, length),
  }
}

/** Squared planar centre-to-centre distance. */
export function centreGapSq(a: Vec3, b: Vec3): number {
  const dx = b.x - a.x
  const dz = b.z - a.z
  return dx * dx + dz * dz
}

/**
 * True when a move's height band overlaps a body standing on the floor: the
 * body occupies `0..heightMm`, so the band must start below the head and end
 * above the feet (FR-17).
 */
export function bandOverlapsBody(band: HeightBand, heightMm: number): boolean {
  return band.fromMm < heightMm && band.toMm > 0
}

/**
 * True when the target's body is inside the attacker's reach, measured edge
 * to edge: both radii come off the gap, so two bodies touching are at zero
 * and a blow only has to cross the space between them (FR-18).
 */
export function reachesBody(
  attacker: Body,
  target: Body,
  reachMm: number,
): boolean {
  const reach = reachMm + attacker.radiusMm + target.radiusMm
  return centreGapSq(attacker.pos, target.pos) <= reach * reach
}

/**
 * Squared planar distance from `point` to the segment `from`→`to`, floored to
 * whole mm². The projection is integer division, so the closest point is
 * within a millimetre of the real one and the comparison stays exact.
 */
export function segmentGapSq(from: Vec3, to: Vec3, point: Vec3): number {
  const abx = to.x - from.x
  const abz = to.z - from.z
  const apx = point.x - from.x
  const apz = point.z - from.z
  const lengthSq = abx * abx + abz * abz
  if (lengthSq === 0) return apx * apx + apz * apz
  const along = apx * abx + apz * abz
  if (along <= 0) return apx * apx + apz * apz
  if (along >= lengthSq) {
    const dx = point.x - to.x
    const dz = point.z - to.z
    return dx * dx + dz * dz
  }
  return apx * apx + apz * apz - Math.floor((along * along) / lengthSq)
}

/**
 * True when the segment a shot just swept crosses the target's body at a
 * height the move can reach (FR-19). A body that stepped out of the line, or
 * that stands entirely above or below the band, is missed.
 */
export function segmentHitsBody(
  from: Vec3,
  to: Vec3,
  target: Body,
  band: HeightBand,
): boolean {
  if (!bandOverlapsBody(band, target.heightMm)) return false
  return segmentGapSq(from, to, target.pos) <= target.radiusMm * target.radiusMm
}

/** A point clamped back inside the fence. */
function clampPos(pos: Vec3, bounds: ArenaBounds): Vec3 {
  return {
    x: Math.min(bounds.maxX, Math.max(bounds.minX, pos.x)),
    y: 0,
    z: Math.min(bounds.maxZ, Math.max(bounds.minZ, pos.z)),
  }
}

/**
 * Push two overlapping bodies apart along the line between their centres, half
 * each, so a clinch keeps a real gap (FR-17). Sharing a centre has no line to
 * push along, so the pair splits on x — deterministic, and the next step has a
 * direction to work with. Positions are clamped to the fence, so a cornered
 * body gives ground only as far as the wall allows.
 */
export function separateBodies(
  fighters: readonly [FighterState, FighterState],
  bounds: ArenaBounds,
): readonly [FighterState, FighterState] {
  const [home, away] = fighters
  const dx = away.pos.x - home.pos.x
  const dz = away.pos.z - home.pos.z
  const gapSq = dx * dx + dz * dz
  const minGap = home.radiusMm + away.radiusMm
  if (gapSq >= minGap * minGap) return fighters
  const gap = integerSqrt(gapSq)
  const overlap = minGap - gap
  if (gap === 0) {
    const half = Math.ceil(overlap / 2)
    return [
      {
        ...home,
        pos: clampPos({ ...home.pos, x: home.pos.x - half }, bounds),
      },
      {
        ...away,
        pos: clampPos({ ...away.pos, x: away.pos.x + half }, bounds),
      },
    ]
  }
  const half = Math.ceil(overlap / 2)
  const shiftX = divRound(dx * half, gap)
  const shiftZ = divRound(dz * half, gap)
  return [
    {
      ...home,
      pos: clampPos(
        { ...home.pos, x: home.pos.x - shiftX, z: home.pos.z - shiftZ },
        bounds,
      ),
    },
    {
      ...away,
      pos: clampPos(
        { ...away.pos, x: away.pos.x + shiftX, z: away.pos.z + shiftZ },
        bounds,
      ),
    },
  ]
}

/** One small rotation step of a facing vector, renormalized to `DIR_SCALE`. */
function spin(facing: Dir2, sign: 1 | -1): Dir2 {
  const step = sign * TURN_UNITS_PER_STEP
  const x = facing.x - divRound(step * facing.z, DIR_SCALE)
  const z = facing.z + divRound(step * facing.x, DIR_SCALE)
  const length = integerSqrt(x * x + z * z)
  if (length === 0) return facing
  return {
    x: divRound(x * DIR_SCALE, length),
    z: divRound(z * DIR_SCALE, length),
  }
}

/**
 * Turn a facing toward a point by at most {@link TURN_UNITS_PER_STEP}. The
 * sign comes from the integer cross product, and a target within one step is
 * snapped to exactly, so a lock-on converges instead of jittering. A target
 * directly behind has no cross product to read, so the body turns the same way
 * every time until it has a side to prefer.
 */
export function turnToward(facing: Dir2, from: Vec3, to: Vec3): Dir2 {
  const desired = shotDirection(from, to)
  if (desired.x === 0 && desired.z === 0) return facing
  const dot = facing.x * desired.x + facing.z * desired.z
  const cross = facing.x * desired.z - facing.z * desired.x
  if (cross === 0) return dot > 0 ? desired : spin(facing, 1)
  // Only snap when the target is ahead and inside one step: near the opposite
  // direction the sine is small too, and snapping there would spin a body
  // round instantly (the flank would become unreachable).
  if (dot > 0 && Math.abs(cross) <= TURN_UNITS_PER_STEP * DIR_SCALE) {
    return desired
  }
  return spin(facing, cross > 0 ? 1 : -1)
}

/**
 * Lock both facings onto the opponent (FR-4, audit finding 1). Facing is
 * turned from the top-of-step direction, never from the movement order, so a
 * strafe moves the body without turning its guard away.
 */
export function faceOpponent(
  fighters: readonly [FighterState, FighterState],
  previous: readonly [FighterState, FighterState],
): readonly [FighterState, FighterState] {
  const face = (side: 0 | 1): FighterState => {
    const other = side === 0 ? 1 : 0
    const facing = turnToward(
      previous[side].facing,
      fighters[side].pos,
      fighters[other].pos,
    )
    return facing === previous[side].facing
      ? fighters[side]
      : { ...fighters[side], facing }
  }
  return [face(0), face(1)]
}
