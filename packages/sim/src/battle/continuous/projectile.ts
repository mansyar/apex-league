/**
 * Shots in flight: a projectile is a body that takes real time to cross real
 * distance.
 *
 * Continuous Arena Battle FR-8. A ranged move launches one shot as its active
 * window opens, from the shooter's body centre toward the victim's body centre
 * at that instant. The shot then travels along that fixed line at the move's
 * authored `speedMmPerMs`, so the same shot fired from far lands later than
 * one fired from near (AC-8) with no clock and no roll.
 *
 * Every value is an integer: the line is a thousandth-scaled direction,
 * progress is whole millimetres accumulated from the launch, and arrival and
 * dodge are comparisons on a dot and a cross product. The position is rebuilt
 * from the cumulative distance rather than stepped by a rounded delta, so the
 * scaling remainder never drifts.
 *
 * A shot resolves when it has reached the victim's line position or passed it.
 * The victim's perpendicular offset from the line then decides the outcome:
 * inside {@link DODGE_CLEARANCE_MM} the shot hits, and a body that moved
 * laterally further than that dodges it. Damage is the same positional path a
 * melee strike uses (./damage), so a shot and a blow agree.
 */

import { BODY_RADIUS_MM, getFrameData } from "../frames"
import { getMove } from "../moves"
import { type HitPosition, positionalDamage } from "./damage"
import { hitPosition, type StrikeStats, typeAgainst } from "./strike"
import {
  DIR_SCALE,
  type Dir2,
  type FighterState,
  STEP_MS,
  type Vec3,
} from "./types"

/**
 * How far off the line a body stands before a shot is judged to miss, in mm.
 * A body is one radius wide, so standing further out than that is out of the
 * shot's path — the dodge is lateral motion, never a random roll (FR-8).
 */
export const DODGE_CLEARANCE_MM = BODY_RADIUS_MM

/** One shot in flight. */
export interface ProjectileState {
  /** Unique within a fight: the launching step and side, `step * 2 + side`. */
  readonly id: number
  /** The key of the side that fired it. */
  readonly ownerKey: string
  /** Catalog move id, resolved against `FRAME_DATA` on arrival. */
  readonly moveId: string
  /** The shooter's body centre at launch, in mm: the start of the line. */
  readonly origin: Vec3
  /** The fixed line of travel, as a thousandth-scaled unit direction. */
  readonly dir: Dir2
  /** Authored travel speed, in mm/ms. */
  readonly speedMmPerMs: number
  /** Whole millimetres travelled since launch. */
  readonly travelledMm: number
  /** Where the shot is now, in mm: `origin` plus `travelledMm` along the line. */
  readonly pos: Vec3
}

/** What a shot did when it resolved. */
export type ShotOutcome = "hit" | "dodged"

/** One resolved shot, as the step reports it. */
export interface ShotReport {
  readonly ownerKey: string
  readonly targetKey: string
  readonly moveId: string
  readonly outcome: ShotOutcome
  /** Damage dealt; 0 on a dodge. */
  readonly damage: number
  /** Poise removed from the victim by this shot; 0 on a dodge (FR-9). */
  readonly poiseDamage: number
  /** Where the shooter stood relative to the victim's facing (FR-4). */
  readonly position: HitPosition
  /** True when the victim was in recovery as the shot landed (FR-6). */
  readonly counter: boolean
  /** True when the shot cancelled the victim's startup (FR-6). */
  readonly interrupted: boolean
}

/** The shots still in flight after a step, plus the ones that resolved. */
export interface ProjectileResolution {
  readonly projectiles: readonly ProjectileState[]
  readonly fighters: readonly [FighterState, FighterState]
  readonly shots: readonly ShotReport[]
}

/** Integer square root, floored: Newton's method on whole numbers only. */
function integerSqrt(value: number): number {
  let guess = value
  let next = Math.floor((guess + 1) / 2)
  while (next < guess) {
    guess = next
    next = Math.floor((guess + Math.floor(value / guess)) / 2)
  }
  return guess
}

/** Integer division rounding halves away from zero, so mirrored aims match. */
function divRound(value: number, divisor: number): number {
  const half = Math.floor(divisor / 2)
  const rounded = Math.floor((Math.abs(value) + half) / divisor)
  return value < 0 ? -rounded : rounded
}

/**
 * The thousandth-scaled unit direction from `from` to `to`. Two points that
 * share a centre have no direction, so the line stays still and the shot is
 * judged on the spot.
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

/** The point `travelledMm` along a line, in whole millimetres. */
export function pointAt(origin: Vec3, dir: Dir2, travelledMm: number): Vec3 {
  return {
    x: origin.x + divRound(dir.x * travelledMm, DIR_SCALE),
    y: 0,
    z: origin.z + divRound(dir.z * travelledMm, DIR_SCALE),
  }
}

/**
 * Launch one shot from the shooter's body centre toward the victim's centre.
 * Aiming at the body rather than along the facing keeps a stationary shooter
 * honest and makes lateral movement — not a lucky facing — the way to dodge
 * (FR-8). A melee move launches nothing and returns null.
 */
export function launchProjectile(
  id: number,
  shooter: FighterState,
  target: FighterState,
  moveId: string,
): ProjectileState | null {
  const move = getMove(moveId)
  const row = getFrameData(moveId)
  if (!move || !row) throw new Error(`Unknown move: ${moveId}`)
  if (move.melee) return null
  const origin: Vec3 = { x: shooter.pos.x, y: 0, z: shooter.pos.z }
  return {
    id,
    ownerKey: shooter.key,
    moveId,
    origin,
    dir: shotDirection(origin, target.pos),
    speedMmPerMs: row.speedMmPerMs,
    travelledMm: 0,
    pos: origin,
  }
}

/**
 * Advance one shot a step: whole millimetres of authored speed, with the
 * position rebuilt from the cumulative distance so no rounding accumulates.
 */
export function advanceProjectile(shot: ProjectileState): ProjectileState {
  const travelledMm = shot.travelledMm + shot.speedMmPerMs * STEP_MS
  return {
    ...shot,
    travelledMm,
    pos: pointAt(shot.origin, shot.dir, travelledMm),
  }
}

/**
 * How far off the shot's line a body stands, in whole millimetres: the
 * magnitude of the integer cross product, scaled back down. No trigonometry.
 */
export function perpendicularOffsetMm(shot: ProjectileState, at: Vec3): number {
  const dx = at.x - shot.origin.x
  const dz = at.z - shot.origin.z
  const cross = shot.dir.x * dz - shot.dir.z * dx
  return Math.floor(Math.abs(cross) / DIR_SCALE)
}

/**
 * True when the shot has reached the body's line position or passed it. The
 * body radius is the last stretch of travel that still counts as reaching the
 * victim, so one long step cannot tunnel straight past a body it should hit.
 */
export function hasArrived(shot: ProjectileState, victim: Vec3): boolean {
  const dx = victim.x - shot.origin.x
  const dz = victim.z - shot.origin.z
  const alongScaled = shot.dir.x * dx + shot.dir.z * dz
  return (
    shot.travelledMm * DIR_SCALE >= alongScaled - BODY_RADIUS_MM * DIR_SCALE
  )
}

/**
 * Which side fired a shot. The key is the only thing a projectile carries, so
 * the fight is the authority on which side that key belongs to.
 */
function sideOf(
  fighters: readonly [FighterState, FighterState],
  key: string,
): 0 | 1 {
  if (fighters[0].key === key) return 0
  if (fighters[1].key === key) return 1
  throw new Error(`Shot has no owner: ${key}`)
}

/**
 * Advance every shot one step and resolve the ones that arrived. Positions
 * come from the top-of-step snapshot `before`, and the victim's attack phase
 * from `after`, so a shot resolves against the same snapshot a melee strike
 * does. A body further off the line than {@link DODGE_CLEARANCE_MM} dodges;
 * everything else takes the shared positional damage path (FR-4, FR-8).
 */
export function resolveProjectiles(
  projectiles: readonly ProjectileState[],
  before: readonly [FighterState, FighterState],
  after: readonly [FighterState, FighterState],
  stats: readonly [StrikeStats, StrikeStats],
): ProjectileResolution {
  const shots: ShotReport[] = []
  const flight: ProjectileState[] = []
  let home = after[0]
  let away = after[1]
  for (const inFlight of projectiles) {
    const shot = advanceProjectile(inFlight)
    const owner = sideOf(before, shot.ownerKey)
    const victim = owner === 0 ? 1 : 0
    const target = before[victim]
    if (!hasArrived(shot, target.pos)) {
      flight.push(shot)
      continue
    }
    const move = getMove(shot.moveId)
    const row = getFrameData(shot.moveId)
    if (!move || !row) throw new Error(`Unknown move: ${shot.moveId}`)
    const position = hitPosition(target.facing, target.pos, before[owner].pos)
    if (perpendicularOffsetMm(shot, target.pos) > DODGE_CLEARANCE_MM) {
      shots.push({
        ownerKey: shot.ownerKey,
        targetKey: target.key,
        moveId: shot.moveId,
        outcome: "dodged",
        damage: 0,
        poiseDamage: 0,
        position,
        counter: false,
        interrupted: false,
      })
      continue
    }
    const victimAttack = after[victim].attack
    const counter = victimAttack?.phase === "recovery"
    const interrupted = victimAttack?.phase === "startup"
    const damage = positionalDamage({
      power: move.power,
      atk: stats[owner].atk,
      def: stats[victim].def,
      type: typeAgainst(stats[owner], stats[victim]),
      position,
      counter,
    })
    if (interrupted) {
      const disarmed = { ...after[victim], attack: null }
      if (victim === 0) home = disarmed
      else away = disarmed
    }
    shots.push({
      ownerKey: shot.ownerKey,
      targetKey: target.key,
      moveId: shot.moveId,
      outcome: "hit",
      damage,
      poiseDamage: row.poiseDamage,
      position,
      counter,
      interrupted,
    })
  }
  return { projectiles: flight, fighters: [home, away], shots }
}
