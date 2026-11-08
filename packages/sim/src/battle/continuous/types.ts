/**
 * The continuous fight's state vocabulary: floor positions, velocity, facing,
 * and the arena fence, all fixed-point integers.
 *
 * Continuous Arena Battle FR-2: a fighter carries a 3-vector position in
 * millimetres with `y` pinned to 0, a velocity, and a facing direction. Time
 * is milliseconds and the fixed step is `STEP_MS`. This module is data and
 * types only — the kinematics live in ./movement and the stepper in ./step.
 */

import type { ProjectileState } from "./projectile"

/** The fixed step length in ms (FR-1). Every fight advances in whole steps. */
export const STEP_MS = 20

/** Thousandths of a unit direction: `DIR_SCALE` is one full unit. */
export const DIR_SCALE = 1000

/** A point on the arena floor, in millimetres. `y` is always 0 in this track. */
export interface Vec3 {
  readonly x: number
  readonly y: number
  readonly z: number
}

/** A planar direction in thousandths of a unit vector. */
export interface Dir2 {
  readonly x: number
  readonly z: number
}

/**
 * One fighter's movement order for a step: a direction, or a dodge.
 *
 * A plain `Dir2` is a direction, not a speed: the magnitude asks for a share
 * of top speed (see ./movement), so the same order covers a full advance, a
 * half-speed approach, or standing still. A `DodgeIntent` is a lateral burst
 * that costs stamina (FR-10) — the step charges it and refuses it when the
 * pool cannot pay, which is the only thing that tells a dodge from a strafe.
 */
export type MoveIntent = Dir2 | DodgeIntent

/**
 * A dodge burst: the direction to step in, paid for out of the stamina pool
 * at the seam that owns fighter state (./advance), never by the caller.
 */
export interface DodgeIntent {
  /** The direction the burst runs in, in thousandths of a unit vector. */
  readonly dodge: Dir2
}

/** Standing still and keeping the current facing. */
export const HOLD: Dir2 = Object.freeze({ x: 0, z: 0 })

/** Looking down +z, the stance a config gets when it names no facing. */
export const FACING_POSITIVE_Z: Dir2 = Object.freeze({ x: 0, z: DIR_SCALE })

/** The floor rectangle the fight is fenced into, in millimetres. */
export interface ArenaBounds {
  readonly minX: number
  readonly maxX: number
  readonly minZ: number
  readonly maxZ: number
}

/** Where a committed attack sits in its authored timing (FR-6). */
export type AttackPhase = "startup" | "active" | "recovery"

/**
 * One committed attack, as the fighter holds it. `elapsedMs` is the time
 * already spent in the current phase, so a step can carry the remainder
 * across a phase boundary instead of rounding every window to whole steps.
 */
export interface AttackState {
  /** Catalog move id, resolved against `FRAME_DATA`. */
  readonly moveId: string
  /** The phase the attack is in right now. */
  readonly phase: AttackPhase
  /** Time already spent in the current phase, in ms. */
  readonly elapsedMs: number
}

/** One fighter's continuous state. */
export interface FighterState {
  /** Stable side key (the fight's id, else the display name). */
  readonly key: string
  /** Body centre on the floor, in millimetres. */
  readonly pos: Vec3
  /** Velocity in thousandths of a millimetre per millisecond: 1000 = 1 m/s. */
  readonly vel: Vec3
  /** Where the fighter looks, as a planar direction. */
  readonly facing: Dir2
  /** The speed stat the movement tunables read. */
  readonly spd: number
  /** The committed attack, if any (FR-6); null once recovery has run out. */
  readonly attack?: AttackState | null
  /** Poise points left before a break (FR-9); 0 only while broken. */
  readonly poise: number
  /** Size of the poise pool, fixed at the opening. */
  readonly poiseMax: number
  /** Punish window still to serve, in ms; 0 when not broken (FR-9). */
  readonly poiseBreakMs: number
  /** Time left before the fighter can break again, in ms (FR-9). */
  readonly poiseGraceMs: number
  /** Stamina points left to spend (FR-10). */
  readonly stamina: number
  /** Size of the stamina pool, fixed at the opening. */
  readonly staminaMax: number
  /** Fight time banked toward the next stamina regeneration tick, in ms. */
  readonly staminaRegenMs: number
}

/** The whole fight at one instant: two sides in a fixed order. */
export interface FightState {
  /** Steps advanced since the opening; 0 before the first step. */
  readonly step: number
  /** Fight time in ms: always `step * STEP_MS`. */
  readonly elapsedMs: number
  /** The arena fence, copied from the config and never changed. */
  readonly bounds: ArenaBounds
  /** Side 0 and side 1, in the order the config named them. */
  readonly fighters: readonly [FighterState, FighterState]
  /** Shots still crossing the arena, in launch order (FR-8). */
  readonly projectiles: readonly ProjectileState[]
}
