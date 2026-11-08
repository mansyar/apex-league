/**
 * The continuous fight's state vocabulary: floor positions, velocity, facing,
 * and the arena fence, all fixed-point integers.
 *
 * Continuous Arena Battle FR-2: a fighter carries a 3-vector position in
 * millimetres with `y` pinned to 0, a velocity, and a facing direction. Time
 * is milliseconds and the fixed step is `STEP_MS`. This module is data and
 * types only — the kinematics live in ./movement and the stepper in ./step.
 */

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
 * One fighter's movement order for a step. It is a direction, not a speed:
 * the magnitude asks for a share of top speed (see ./movement), so the same
 * type orders a full advance, a half-speed approach, or standing still.
 */
export type MoveIntent = Dir2

/** Standing still and keeping the current facing. */
export const HOLD: MoveIntent = Object.freeze({ x: 0, z: 0 })

/** Looking down +z, the stance a config gets when it names no facing. */
export const FACING_POSITIVE_Z: Dir2 = Object.freeze({ x: 0, z: DIR_SCALE })

/** The floor rectangle the fight is fenced into, in millimetres. */
export interface ArenaBounds {
  readonly minX: number
  readonly maxX: number
  readonly minZ: number
  readonly maxZ: number
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
}
