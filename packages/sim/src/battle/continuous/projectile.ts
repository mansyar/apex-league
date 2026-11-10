/**
 * Shots in flight: a projectile is a body that takes real time to cross real
 * distance and sweeps the space between steps.
 *
 * Continuous Arena Battle FR-8, FR-19. A ranged move launches one shot as its
 * active window opens, from the shooter's body centre toward the victim's body
 * centre at that instant. The shot then travels along that fixed line at the
 * move's authored `speedMmPerMs`, so the same shot fired from far lands later
 * than one fired from near (AC-8) with no clock.
 *
 * Every step the shot sweeps a segment from last step's position to this
 * step's, and the segment is tested against the victim's body volume: inside
 * the radius at a height the move reaches is a hit, outside is a miss, and a
 * fast shot cannot tunnel through a body between two sampled positions
 * (FR-19). The victim's lateral movement is what dodges, never a random roll;
 * the roll is asked a different question — did the shot land where it was
 * aimed (FR-21) — and the two are reported apart, `dodged` and `missed`.
 *
 * Every value is an integer: the line is a thousandth-scaled direction,
 * progress is whole millimetres accumulated from the launch, and the segment
 * test is a squared distance with integer division. The position is rebuilt
 * from the cumulative distance rather than stepped by a rounded delta, so the
 * scaling remainder never drifts.
 */

import type { Rng } from "../../rng"
import { BODY_RADIUS_MM, getFrameData } from "../frames"
import { getMove } from "../moves"
import {
  type Body,
  bodyOf,
  divRound,
  segmentHitsBody,
  shotDirection,
} from "./contact"
import { type HitPosition, positionalDamage } from "./damage"
import { rollHits, spreadDamage } from "./roll"
import { hitPosition, type StrikeStats, typeAgainst } from "./strike"
import {
  DIR_SCALE,
  type Dir2,
  type FighterState,
  STEP_MS,
  type Vec3,
} from "./types"

export { shotDirection }

/**
 * The nominal clearance a body needs to slip a shot, in mm: one body radius
 * off the line. The controller reads it to notice an incoming shot; the
 * resolution itself uses the swept body test (FR-19).
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
export type ShotOutcome = "hit" | "dodged" | "missed"

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
  /** The line the shot flew, which is the line it knocks back along (FR-22). */
  readonly dir: Dir2
}

/** The shots still in flight after a step, plus the ones that resolved. */
export interface ProjectileResolution {
  readonly projectiles: readonly ProjectileState[]
  readonly fighters: readonly [FighterState, FighterState]
  readonly shots: readonly ShotReport[]
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
 * True once the shot has travelled past the body's far surface along its
 * line, so the step's swept segment can no longer reach it. This is the miss
 * condition: the body stepped off the line and the shot is spent (FR-19).
 */
export function passedBody(shot: ProjectileState, victim: Body): boolean {
  const dx = victim.pos.x - shot.origin.x
  const dz = victim.pos.z - shot.origin.z
  const alongScaled = shot.dir.x * dx + shot.dir.z * dz
  return (
    shot.travelledMm * DIR_SCALE > alongScaled + victim.radiusMm * DIR_SCALE
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
 * Advance every shot one step and resolve the ones whose swept segment
 * crossed the victim's body at a height the move reaches. Positions come from
 * the top-of-step snapshot `before`, and the victim's attack phase from
 * `after`, so a shot resolves against the same snapshot a melee strike does.
 * A shot that clears the body and has travelled past it is a dodge; every hit
 * takes the shared positional damage path (FR-4, FR-8).
 */
export function resolveProjectiles(
  projectiles: readonly ProjectileState[],
  before: readonly [FighterState, FighterState],
  after: readonly [FighterState, FighterState],
  stats: readonly [StrikeStats, StrikeStats],
  rng: Rng,
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
    const move = getMove(shot.moveId)
    const row = getFrameData(shot.moveId)
    if (!move || !row) throw new Error(`Unknown move: ${shot.moveId}`)
    const body = bodyOf(target)
    const hit = segmentHitsBody(inFlight.pos, shot.pos, body, row.band)
    if (!hit && !passedBody(shot, body)) {
      flight.push(shot)
      continue
    }
    const position = hitPosition(target.facing, target.pos, before[owner].pos)
    if (!hit) {
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
        dir: shot.dir,
      })
      continue
    }
    const victimAttack = after[victim].attack
    const counter = victimAttack?.phase === "recovery"
    const interrupted = victimAttack?.phase === "startup"
    // The shot reached the body; whether it was aimed true is the roll (FR-21).
    if (!rollHits(move.accuracy, rng)) {
      shots.push({
        ownerKey: shot.ownerKey,
        targetKey: target.key,
        moveId: shot.moveId,
        outcome: "missed",
        damage: 0,
        poiseDamage: 0,
        position,
        counter: false,
        interrupted: false,
        dir: shot.dir,
      })
      continue
    }
    const damage = spreadDamage(
      positionalDamage({
        power: move.power,
        atk: stats[owner].atk,
        def: stats[victim].def,
        type: typeAgainst(stats[owner], stats[victim]),
        position,
        counter,
      }),
      rng,
    )
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
      dir: shot.dir,
    })
  }
  return { projectiles: flight, fighters: [home, away], shots }
}
