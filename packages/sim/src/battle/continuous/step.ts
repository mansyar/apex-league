/**
 * The fixed-step fight: one state, advanced in steps.
 *
 * Continuous Arena Battle FR-1. The step loop draws nothing: every value is
 * integer arithmetic over the state, so the same sides and the same intents
 * replay the same fight byte for byte. The fight is therefore seed-free — the
 * seed decides nothing here and is not consumed by `createFight`; the only
 * place a seed decides anything is the capped-fight tiebreak in ./resolve,
 * which reads it from the caller. The per-step pipeline lives in ./advance,
 * the movement in ./movement, and the hash is a stable FNV-1a over the
 * quantized state — the same pattern as keyHash in battle/clock/engine.ts.
 */

import { BODY_RADIUS_MM } from "../frames"
import { type StepContext, type StepResult, stepFight } from "./advance"
import { DEFAULT_BODY_HEIGHT_MM } from "./contact"
import { isStunned, openingHitstun } from "./impulse"
import { isBroken, openingPoise } from "./poise"
import { openingStamina, spendAttack } from "./stamina"
import {
  ATTACK_PHASES,
  canCommit,
  commitAttack,
  NEUTRAL_STATS,
  type StrikeStats,
} from "./strike"
import {
  type ArenaBounds,
  type Dir2,
  FACING_POSITIVE_Z,
  type FighterState,
  type FightState,
  type MoveIntent,
} from "./types"

export type { StepResult } from "./advance"

/**
 * The hit-point pool a side gets when its init names none (tunable). A fight
 * only ends when a pool reaches zero (FR-12), so the default is a whole
 * fight's worth rather than a placeholder.
 */
export const DEFAULT_HP = 100

/** One side's opening order. */
export interface FighterInit {
  /** Stable side key, unique within the fight. */
  readonly key: string
  /** The speed stat the movement tunables read. */
  readonly spd: number
  /** Starting body centre on the floor, in millimetres. */
  readonly at: Readonly<{ x: number; z: number }>
  /** Opening facing; defaults to looking down +z. */
  readonly facing?: Dir2
  /** Body radius in mm; defaults to `BODY_RADIUS_MM` (FR-17). */
  readonly radiusMm?: number
  /** Body height in mm; defaults to `DEFAULT_BODY_HEIGHT_MM` (FR-17). */
  readonly heightMm?: number
  /** Combat stats a strike reads; defaults to typeless 1/1 (FR-4). */
  readonly stats?: StrikeStats
  /** Hit points at the opening; defaults to `DEFAULT_HP` (FR-12). */
  readonly hp?: number
  /** Poise pool size; defaults to `DEFAULT_POISE_MAX` (FR-9). */
  readonly poiseMax?: number
  /** Stamina pool size; defaults to `DEFAULT_STAMINA_MAX` (FR-10). */
  readonly staminaMax?: number
}

/** Everything a fight needs to open. */
export interface FightConfig {
  /**
   * The fight's seed, validated for the caller's contract. The engine is
   * seed-free: nothing in the step loop draws from it, and `createFight` only
   * checks that it is an integer. The capped-fight tiebreak in ./resolve reads
   * the seed its own caller passed, not this field.
   */
  readonly seed: number
  readonly bounds: ArenaBounds
  readonly fighters: readonly [FighterInit, FighterInit]
}

/** A running fight: one state, advanced in fixed steps. */
export interface Fight {
  readonly state: FightState
  advance(intents: readonly [MoveIntent, MoveIntent]): StepResult
  /**
   * Commit to a move; false when locked (FR-6), broken (FR-9), stunned
   * (FR-23), or short on stamina (FR-10).
   */
  commit(side: 0 | 1, moveId: string): boolean
}

/**
 * A stable hash of the whole state, in a fixed field order: side 0 before
 * side 1, position before velocity before facing. Integers are folded in as
 * unsigned 32-bit words, so a negative coordinate still hashes stably.
 */
export function stateHash(state: FightState): number {
  let hash = 2166136261
  const mix = (value: number): void => {
    hash ^= value >>> 0
    hash = Math.imul(hash, 16777619)
  }
  mix(state.step)
  mix(state.elapsedMs)
  mix(state.bounds.minX)
  mix(state.bounds.maxX)
  mix(state.bounds.minZ)
  mix(state.bounds.maxZ)
  for (const fighter of state.fighters) {
    for (let i = 0; i < fighter.key.length; i++) {
      mix(fighter.key.charCodeAt(i))
    }
    mix(fighter.pos.x)
    mix(fighter.pos.y)
    mix(fighter.pos.z)
    mix(fighter.vel.x)
    mix(fighter.vel.y)
    mix(fighter.vel.z)
    mix(fighter.facing.x)
    mix(fighter.facing.z)
    mix(fighter.radiusMm)
    mix(fighter.heightMm)
    mix(fighter.spd)
    mix(fighter.hp)
    mix(fighter.hpMax)
    mix(fighter.poise)
    mix(fighter.poiseMax)
    mix(fighter.poiseBreakMs)
    mix(fighter.poiseGraceMs)
    mix(fighter.stamina)
    mix(fighter.staminaMax)
    mix(fighter.staminaRegenMs)
    mix(fighter.hitstunMs)
    const attack = fighter.attack
    mix(attack ? 1 : 0)
    if (attack) {
      for (let i = 0; i < attack.moveId.length; i++) {
        mix(attack.moveId.charCodeAt(i))
      }
      mix(ATTACK_PHASES.indexOf(attack.phase))
      mix(attack.elapsedMs)
      mix(attack.landed ? 1 : 0)
    }
  }
  mix(state.projectiles.length)
  for (const shot of state.projectiles) {
    mix(shot.id)
    for (let i = 0; i < shot.ownerKey.length; i++) {
      mix(shot.ownerKey.charCodeAt(i))
    }
    for (let i = 0; i < shot.moveId.length; i++) {
      mix(shot.moveId.charCodeAt(i))
    }
    mix(shot.origin.x)
    mix(shot.origin.y)
    mix(shot.origin.z)
    mix(shot.dir.x)
    mix(shot.dir.z)
    mix(shot.speedMmPerMs)
    mix(shot.travelledMm)
    mix(shot.pos.x)
    mix(shot.pos.y)
    mix(shot.pos.z)
  }
  return hash >>> 0
}

/** Determinism starts with integer inputs, so the factory refuses the rest. */
function requireInteger(value: number, label: string): void {
  if (!Number.isInteger(value)) {
    throw new Error(`${label} must be an integer: ${value}`)
  }
}

/** Strike stats must be whole and positive, or the damage floor lies. */
function requireStats(stats: StrikeStats, key: string): void {
  requireInteger(stats.atk, `${key} atk`)
  requireInteger(stats.def, `${key} def`)
  if (stats.atk <= 0) throw new Error(`${key} needs a positive atk`)
  if (stats.def <= 0) throw new Error(`${key} needs a positive def`)
}

/** Build one side at rest, inside the fence and facing the way it was told. */
function openFighter(init: FighterInit, bounds: ArenaBounds): FighterState {
  requireInteger(init.spd, `${init.key} spd`)
  requireInteger(init.at.x, `${init.key} start x`)
  requireInteger(init.at.z, `${init.key} start z`)
  if (init.spd < 0) throw new Error(`${init.key} cannot have a negative spd`)
  if (init.at.x < bounds.minX || init.at.x > bounds.maxX) {
    throw new Error(`${init.key} starts outside the arena on x`)
  }
  if (init.at.z < bounds.minZ || init.at.z > bounds.maxZ) {
    throw new Error(`${init.key} starts outside the arena on z`)
  }
  const facing = init.facing ?? FACING_POSITIVE_Z
  requireInteger(facing.x, `${init.key} facing x`)
  requireInteger(facing.z, `${init.key} facing z`)
  if (facing.x === 0 && facing.z === 0) {
    throw new Error(`${init.key} needs a facing direction`)
  }
  requireStats(init.stats ?? NEUTRAL_STATS, init.key)
  const hpMax = init.hp ?? DEFAULT_HP
  requireInteger(hpMax, `${init.key} hp`)
  if (hpMax <= 0) throw new Error(`${init.key} needs a positive hp`)
  const radiusMm = init.radiusMm ?? BODY_RADIUS_MM
  const heightMm = init.heightMm ?? DEFAULT_BODY_HEIGHT_MM
  requireInteger(radiusMm, `${init.key} radius`)
  requireInteger(heightMm, `${init.key} height`)
  if (radiusMm <= 0) throw new Error(`${init.key} needs a positive radius`)
  if (heightMm <= 0) throw new Error(`${init.key} needs a positive height`)
  return {
    key: init.key,
    pos: { x: init.at.x, y: 0, z: init.at.z },
    vel: { x: 0, y: 0, z: 0 },
    facing,
    radiusMm,
    heightMm,
    spd: init.spd,
    hp: hpMax,
    hpMax,
    ...openingPoise(init.poiseMax),
    ...openingStamina(init.staminaMax),
    ...openingHitstun(),
  }
}

/** Open a fight at rest: both sides inside the fence, nothing moving. */
export function createFight(config: FightConfig): Fight {
  const bounds = config.bounds
  requireInteger(config.seed, "seed")
  requireInteger(bounds.minX, "bounds.minX")
  requireInteger(bounds.maxX, "bounds.maxX")
  requireInteger(bounds.minZ, "bounds.minZ")
  requireInteger(bounds.maxZ, "bounds.maxZ")
  if (bounds.minX >= bounds.maxX) {
    throw new Error("Arena needs minX below maxX")
  }
  if (bounds.minZ >= bounds.maxZ) {
    throw new Error("Arena needs minZ below maxZ")
  }
  const [home, away] = config.fighters
  const fighters: readonly [FighterState, FighterState] = [
    openFighter(home, bounds),
    openFighter(away, bounds),
  ]
  if (fighters[0].key === fighters[1].key) {
    throw new Error(`Two sides cannot share the key ${fighters[0].key}`)
  }
  const stats: readonly [StrikeStats, StrikeStats] = [
    home.stats ?? NEUTRAL_STATS,
    away.stats ?? NEUTRAL_STATS,
  ]
  const context: StepContext = { bounds, stats }
  let state: FightState = {
    step: 0,
    elapsedMs: 0,
    bounds,
    fighters,
    projectiles: [],
  }
  return {
    get state() {
      return state
    },
    advance(intents) {
      const outcome = stepFight(state, intents, context)
      state = outcome.state
      return {
        state,
        hash: stateHash(state),
        strikes: outcome.strikes,
        shots: outcome.shots,
        launched: outcome.launched,
        whiffs: outcome.whiffs,
        dodges: outcome.dodges,
        pinned: outcome.pinned,
      }
    },
    commit(side, moveId) {
      const fighter = state.fighters[side]
      if (isBroken(fighter) || isStunned(fighter) || !canCommit(fighter)) {
        return false
      }
      const paid = spendAttack(fighter, moveId)
      if (!paid) return false
      const committed = commitAttack(paid, moveId)
      if (committed === paid) return false
      const fighters: readonly [FighterState, FighterState] =
        side === 0
          ? [committed, state.fighters[1]]
          : [state.fighters[0], committed]
      state = { ...state, fighters }
      return true
    },
  }
}
