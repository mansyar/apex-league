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
}

/** Everything a fight needs to open. */
export interface FightConfig {
  readonly seed: number
  readonly bounds: ArenaBounds
  readonly fighters: readonly [FighterInit, FighterInit]
}

/** What one advance produced: the next state and its hash. */
export interface StepResult {
  readonly state: FightState
  readonly hash: number
}

/** A running fight: one RNG stream, one state, advanced in fixed steps. */
export interface Fight {
  readonly state: FightState
  advance(intents: readonly [MoveIntent, MoveIntent]): StepResult
}

/**
 * What one step needs beyond the state: the fence it is played inside and
 * the fight's single seeded stream (FR-1). Movement draws nothing from the
 * stream yet; the strike and dodge phases will, on this same one.
 */
export interface StepContext {
  readonly bounds: ArenaBounds
  readonly rng: Rng
}

/**
 * Advance one fixed step. Both sides move from the same pre-step state, so
 * neither sees the other's move until the next step.
 */
export function stepFight(
  state: FightState,
  intents: readonly [MoveIntent, MoveIntent],
  context: StepContext,
): FightState {
  const bounds = context.bounds
  const fighters: readonly [FighterState, FighterState] = [
    moveFighter(state.fighters[0], intents[0], bounds),
    moveFighter(state.fighters[1], intents[1], bounds),
  ]
  return {
    step: state.step + 1,
    elapsedMs: state.elapsedMs + STEP_MS,
    bounds,
    fighters,
  }
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
  }
  return hash >>> 0
}

/** Determinism starts with integer inputs, so the factory refuses the rest. */
function requireInteger(value: number, label: string): void {
  if (!Number.isInteger(value)) {
    throw new Error(`${label} must be an integer: ${value}`)
  }
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
  const context: StepContext = { bounds, rng }
  let state: FightState = { step: 0, elapsedMs: 0, bounds, fighters }
  return {
    get state() {
      return state
    },
    advance(intents) {
      state = stepFight(state, intents, context)
      return { state, hash: stateHash(state) }
    },
  }
}
