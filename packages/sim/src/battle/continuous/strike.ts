/**
 * Strikes in space: reach and the facing arcs a blow is judged against.
 *
 * Continuous Arena Battle FR-4. Reach is a squared Euclidean comparison and
 * facing is an integer dot product, so a strike resolves from the two
 * positions and the two facings with no trigonometry, no clock, and no
 * random source. The attack lifecycle and trade rule live in the same module.
 */

import type { Element } from "../../creature"
import { type TypeFactor, typeFactor } from "../chart"
import { type FrameData, getFrameData } from "../frames"
import { getMove } from "../moves"
import { type HitPosition, positionalDamage, type Ratio } from "./damage"
import {
  type AttackPhase,
  type AttackState,
  type Dir2,
  type FighterState,
  STEP_MS,
  type Vec3,
} from "./types"

/**
 * The front arc a strike must aim within, as the cosine of its half-width.
 * `0 / 1` is 90°, a 180° total arc: generous on purpose, so a strike only
 * misses when it is aimed clearly away from the target (AC-4). Tighten the
 * pair to narrow the arc; the comparison never needs trigonometry.
 */
export const FRONT_ARC_COS: Ratio = Object.freeze({ num: 0, den: 1 })

/**
 * The front and rear sectors used to place a hit, as the cosine of their
 * half-width. `1 / 2` is 60°, so a blow from within 60° of the victim's
 * facing is front, one from within 60° of its back is rear, and the two 60°
 * bands between are the flanks (FR-4).
 */
export const FLANK_COS: Ratio = Object.freeze({ num: 1, den: 2 })

/** True when the target's centre is inside the attacker's planar reach. */
export function withinReach(
  attacker: Vec3,
  target: Vec3,
  reachMm: number,
): boolean {
  const dx = target.x - attacker.x
  const dz = target.z - attacker.z
  return dx * dx + dz * dz <= reachMm * reachMm
}

/**
 * True when `dot / (|a| |b|)` is at least `cos.num / cos.den`. Squared on
 * both sides, so the whole comparison stays in integers.
 */
function cosineAtLeast(
  dot: number,
  aSq: number,
  bSq: number,
  cos: Ratio,
): boolean {
  return dot * dot * cos.den * cos.den >= aSq * bSq * cos.num * cos.num
}

/**
 * True when the target lies inside the attacker's front arc (AC-4). Bodies
 * that share a centre count as in front: there is no direction to aim away
 * from. The boundary counts as inside, so a 180° arc covers the whole
 * half-plane including the perpendicular.
 */
export function inFrontArc(facing: Dir2, from: Vec3, to: Vec3): boolean {
  const dx = to.x - from.x
  const dz = to.z - from.z
  if (dx === 0 && dz === 0) return true
  const dot = facing.x * dx + facing.z * dz
  if (dot < 0) return false
  return cosineAtLeast(
    dot,
    facing.x * facing.x + facing.z * facing.z,
    dx * dx + dz * dz,
    FRONT_ARC_COS,
  )
}

/**
 * Where the attacker stood relative to the victim's facing: inside the front
 * sector, inside the rear sector, or in one of the flank bands between. The
 * shared centre has no flank, so it reads as front.
 */
export function hitPosition(
  victimFacing: Dir2,
  victim: Vec3,
  attacker: Vec3,
): HitPosition {
  const dx = attacker.x - victim.x
  const dz = attacker.z - victim.z
  if (dx === 0 && dz === 0) return "front"
  const dot = victimFacing.x * dx + victimFacing.z * dz
  const facingSq =
    victimFacing.x * victimFacing.x + victimFacing.z * victimFacing.z
  if (!cosineAtLeast(dot, facingSq, dx * dx + dz * dz, FLANK_COS)) {
    return "flank"
  }
  return dot >= 0 ? "front" : "rear"
}

/** The authored phases in the order an attack walks them. */
export const ATTACK_PHASES: readonly AttackPhase[] = Object.freeze([
  "startup",
  "active",
  "recovery",
])

/** How long one phase lasts, in ms, straight from the authored row. */
export function phaseDuration(row: FrameData, phase: AttackPhase): number {
  if (phase === "startup") return row.startupMs
  if (phase === "active") return row.activeMs
  return row.recoveryMs
}

/**
 * Advance one committed attack by a step, carrying the remainder across a
 * phase boundary so a 130 ms startup is 130 ms of fight time rather than
 * seven rounded steps. Returns null once recovery has run out.
 */
export function advanceAttack(
  attack: AttackState,
  row: FrameData,
): AttackState | null {
  let phase = attack.phase
  let elapsedMs = attack.elapsedMs + STEP_MS
  for (;;) {
    const duration = phaseDuration(row, phase)
    if (elapsedMs < duration) {
      return { moveId: attack.moveId, phase, elapsedMs }
    }
    if (phase === "recovery") return null
    elapsedMs -= duration
    phase = phase === "startup" ? "active" : "recovery"
  }
}

/** Advance the attack a fighter holds, if any, leaving the rest untouched. */
export function advanceFighterAttack(fighter: FighterState): FighterState {
  const attack = fighter.attack
  if (!attack) return fighter
  const row = getFrameData(attack.moveId)
  if (!row) throw new Error(`Unknown move: ${attack.moveId}`)
  return { ...fighter, attack: advanceAttack(attack, row) }
}

/**
 * True when the fighter may commit: it holds no attack, or it is still in
 * startup — the one window that can be cancelled (FR-6). Active and recovery
 * are locked, so a committed attack cannot be taken back once startup ends.
 */
export function canCommit(fighter: FighterState): boolean {
  return !fighter.attack || fighter.attack.phase === "startup"
}

/**
 * Start an attack. A commit during startup replaces the current one; a
 * commit during active or recovery is refused and the fighter comes back
 * unchanged, so the caller can tell by identity.
 */
export function commitAttack(
  fighter: FighterState,
  moveId: string,
): FighterState {
  if (!canCommit(fighter)) return fighter
  if (!getMove(moveId) || !getFrameData(moveId)) {
    throw new Error(`Unknown move: ${moveId}`)
  }
  return { ...fighter, attack: { moveId, phase: "startup", elapsedMs: 0 } }
}

/** The combat stats a strike reads; `spd` lives on the fighter itself. */
export interface StrikeStats {
  readonly atk: number
  readonly def: number
  /** Catalog element; absent for the typeless basic strike. */
  readonly element?: Element | undefined
}

/** The profile a fight gets when it names no stats: typeless 1/1. */
export const NEUTRAL_STATS: StrikeStats = Object.freeze({ atk: 1, def: 1 })

/** The attacker's type factor against one victim; typeless is neutral. */
export function typeAgainst(
  attacker: StrikeStats,
  victim: StrikeStats,
): TypeFactor {
  if (!attacker.element || !victim.element) return { num: 1, den: 1 }
  return typeFactor(attacker.element, victim.element)
}

/** One landed blow, as the step reports it. */
export interface StrikeReport {
  readonly attackerKey: string
  readonly targetKey: string
  readonly moveId: string
  readonly damage: number
  readonly position: HitPosition
  /** True when the victim was in recovery: the blow was a counter (FR-6). */
  readonly counter: boolean
  /** True when the blow cancelled the victim's startup (FR-6). */
  readonly interrupted: boolean
}

/** The fighters after resolution, plus every blow that landed. */
export interface StrikeResolution {
  readonly fighters: readonly [FighterState, FighterState]
  readonly strikes: readonly StrikeReport[]
}

/**
 * Resolve both sides' active frames against the same pre-step snapshot.
 * `before` is the state at the top of the step and `after` carries the
 * advanced attack phases; every hit test reads `before`, so two overlapping
 * active frames trade in one step (FR-7) and neither can cancel the other's
 * already-active frame. Only a victim's startup can be cancelled.
 *
 * This is the melee path: a ranged move's active window fires a projectile
 * instead of landing on the spot (FR-8), so it never resolves here.
 */
export function resolveStrikes(
  before: readonly [FighterState, FighterState],
  after: readonly [FighterState, FighterState],
  stats: readonly [StrikeStats, StrikeStats],
): StrikeResolution {
  const strikes: StrikeReport[] = []
  let home = after[0]
  let away = after[1]
  for (const side of [0, 1] as const) {
    const attack = after[side].attack
    if (attack?.phase !== "active") continue
    const row = getFrameData(attack.moveId)
    const move = getMove(attack.moveId)
    if (!row || !move) throw new Error(`Unknown move: ${attack.moveId}`)
    if (!move.melee) continue
    const other = side === 0 ? 1 : 0
    const attacker = before[side]
    const victim = before[other]
    if (!withinReach(attacker.pos, victim.pos, row.reachMm)) continue
    if (!inFrontArc(attacker.facing, attacker.pos, victim.pos)) continue
    const victimAttack = after[other].attack
    const counter = victimAttack?.phase === "recovery"
    const interrupted = victimAttack?.phase === "startup"
    const position = hitPosition(victim.facing, victim.pos, attacker.pos)
    const damage = positionalDamage({
      power: move.power,
      atk: stats[side].atk,
      def: stats[other].def,
      type: typeAgainst(stats[side], stats[other]),
      position,
      counter,
    })
    if (interrupted) {
      const disarmed = { ...after[other], attack: null }
      if (other === 0) home = disarmed
      else away = disarmed
    }
    strikes.push({
      attackerKey: attacker.key,
      targetKey: victim.key,
      moveId: attack.moveId,
      damage,
      position,
      counter,
      interrupted,
    })
  }
  return { fighters: [home, away], strikes }
}
