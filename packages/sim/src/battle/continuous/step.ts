/**
 * The fixed-step stepper: one 20 ms advance of the continuous fight.
 *
 * Continuous Arena Battle FR-1. A fight owns exactly one seeded RNG stream,
 * created in the factory and threaded through every step, so the same seed
 * and the same intents replay the same fight. The step is integer arithmetic
 * on the state in ./types, the movement lives in ./movement, and the hash is
 * a stable FNV-1a over the quantized state — the same pattern as keyHash in
 * battle/clock/engine.ts.
 */

import { makeRng, type Rng } from "../../rng"
import { moveFighter } from "./movement"
import {
  launchProjectile,
  type ProjectileState,
  resolveProjectiles,
  type ShotReport,
} from "./projectile"
import {
  ATTACK_PHASES,
  advanceFighterAttack,
  commitAttack,
  NEUTRAL_STATS,
  resolveStrikes,
  type StrikeReport,
  type StrikeStats,
} from "./strike"
import {
  type ArenaBounds,
  type Dir2,
  FACING_POSITIVE_Z,
  type FighterState,
  type FightState,
  type MoveIntent,
  STEP_MS,
} from "./types"

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
  /** Combat stats a strike reads; defaults to typeless 1/1 (FR-4). */
  readonly stats?: StrikeStats
}

/** Everything a fight needs to open. */
export interface FightConfig {
  readonly seed: number
  readonly bounds: ArenaBounds
  readonly fighters: readonly [FighterInit, FighterInit]
}

/** What one advance produced: the next state and every blow that landed. */
export interface StepOutcome {
  readonly state: FightState
  readonly strikes: readonly StrikeReport[]
  /** Shots that resolved this step, hit or dodged (FR-8). */
  readonly shots: readonly ShotReport[]
}

/** What one advance produced: the next state, its hash, and what landed. */
export interface StepResult extends StepOutcome {
  readonly hash: number
}

/** A running fight: one RNG stream, one state, advanced in fixed steps. */
export interface Fight {
  readonly state: FightState
  advance(intents: readonly [MoveIntent, MoveIntent]): StepResult
  /**
   * Order one side to commit to a move. Returns false when the fighter is
   * locked in an active or recovery window (FR-6).
   */
  commit(side: 0 | 1, moveId: string): boolean
}

/**
 * What one step needs beyond the state: the fence it is played inside, the
 * fight's single seeded stream (FR-1), and both sides' strike stats.
 */
export interface StepContext {
  readonly bounds: ArenaBounds
  readonly rng: Rng
  /** Both sides' strike stats, in fighter order. */
  readonly stats: readonly [StrikeStats, StrikeStats]
}

/**
 * Advance one fixed step. Both sides move from the same pre-step state, so
 * neither sees the other's move until the next step, and both strike tests
 * read that same snapshot so overlapping active frames trade (FR-7).
 */
export function stepFight(
  state: FightState,
  intents: readonly [MoveIntent, MoveIntent],
  context: StepContext,
): StepOutcome {
  const bounds = context.bounds
  const before = state.fighters
  const advanced: readonly [FighterState, FighterState] = [
    advanceFighterAttack(before[0]),
    advanceFighterAttack(before[1]),
  ]
  const struck = resolveStrikes(before, advanced, context.stats)
  const flight = resolveProjectiles(
    state.projectiles,
    before,
    struck.fighters,
    context.stats,
  )
  const launched = launchShots(state.step, before, advanced)
  const fighters: readonly [FighterState, FighterState] = [
    movedFighter(before[0], intents[0], flight.fighters[0], bounds),
    movedFighter(before[1], intents[1], flight.fighters[1], bounds),
  ]
  return {
    state: {
      step: state.step + 1,
      elapsedMs: state.elapsedMs + STEP_MS,
      bounds,
      fighters,
      projectiles: [...flight.projectiles, ...launched],
    },
    strikes: struck.strikes,
    shots: flight.shots,
  }
}

/**
 * Launch one shot for each side whose active window just opened (FR-8). A
 * melee move launches nothing, and a window that is already active fired on
 * the step it opened, so one committed move fires exactly once. The shot's id
 * is the launching step and side, which is unique because a side opens at
 * most one window per step.
 */
function launchShots(
  step: number,
  before: readonly [FighterState, FighterState],
  after: readonly [FighterState, FighterState],
): ProjectileState[] {
  const shots: ProjectileState[] = []
  for (const side of [0, 1] as const) {
    const attack = after[side].attack
    if (attack?.phase !== "active") continue
    if (before[side].attack?.phase === "active") continue
    const shot = launchProjectile(
      step * 2 + side,
      before[side],
      before[side === 0 ? 1 : 0],
      attack.moveId,
    )
    if (shot) shots.push(shot)
  }
  return shots
}

/**
 * Move one fighter and keep the attack the strike phase left it holding.
 * `moveFighter` owns the kinematics and knows nothing about attacks, so the
 * attack state is reattached here rather than duplicated there.
 */
function movedFighter(
  before: FighterState,
  intent: MoveIntent,
  after: FighterState,
  bounds: ArenaBounds,
): FighterState {
  const moved = moveFighter(before, intent, bounds)
  return after.attack === undefined ? moved : { ...moved, attack: after.attack }
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
    mix(fighter.spd)
    const attack = fighter.attack
    mix(attack ? 1 : 0)
    if (attack) {
      for (let i = 0; i < attack.moveId.length; i++) {
        mix(attack.moveId.charCodeAt(i))
      }
      mix(ATTACK_PHASES.indexOf(attack.phase))
      mix(attack.elapsedMs)
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
  return {
    key: init.key,
    pos: { x: init.at.x, y: 0, z: init.at.z },
    vel: { x: 0, y: 0, z: 0 },
    facing,
    spd: init.spd,
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
  const rng = makeRng(config.seed >>> 0)
  const stats: readonly [StrikeStats, StrikeStats] = [
    home.stats ?? NEUTRAL_STATS,
    away.stats ?? NEUTRAL_STATS,
  ]
  const context: StepContext = { bounds, rng, stats }
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
      }
    },
    commit(side, moveId) {
      const fighter = state.fighters[side]
      const committed = commitAttack(fighter, moveId)
      if (committed === fighter) return false
      const fighters: readonly [FighterState, FighterState] =
        side === 0
          ? [committed, state.fighters[1]]
          : [state.fighters[0], committed]
      state = { ...state, fighters }
      return true
    },
  }
}
