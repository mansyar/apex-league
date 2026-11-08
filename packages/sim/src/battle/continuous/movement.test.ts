/**
 * Continuous movement (Continuous Arena Battle FR-3): acceleration and
 * deceleration toward an intent, top speed from `spd`, lateral strafing, and
 * a fence that clamps without oscillating.
 */

import { describe, expect, test } from "bun:test"
import {
  ACCEL_MILLI_MM_PER_MS_PER_STEP,
  accelerate,
  DECEL_MILLI_MM_PER_MS_PER_STEP,
  facingFor,
  integrate,
  moveFighter,
  SPEED_BASE_MILLI_MM_PER_MS,
  SPEED_GAIN_MILLI_MM_PER_MS,
  targetVelocity,
  topSpeed,
} from "./movement"
import { openingPoise } from "./poise"
import { openingStamina } from "./stamina"
import {
  type ArenaBounds,
  FACING_POSITIVE_Z,
  type FighterState,
  HOLD,
  type MoveIntent,
  type Vec3,
} from "./types"

const BOUNDS: ArenaBounds = {
  minX: -4000,
  maxX: 4000,
  minZ: -3000,
  maxZ: 3000,
}

const ADVANCE: MoveIntent = { x: 1000, z: 0 }

function fighter(overrides: Partial<FighterState> = {}): FighterState {
  return {
    key: "home",
    pos: { x: 0, y: 0, z: 0 },
    vel: { x: 0, y: 0, z: 0 },
    facing: FACING_POSITIVE_Z,
    radiusMm: 220,
    heightMm: 900,
    spd: 10,
    hp: 100,
    hpMax: 100,
    ...openingPoise(),
    ...openingStamina(),
    ...overrides,
  }
}

describe("continuous movement — speed from spd", () => {
  test("top speed is the base plus the per-spd gain", () => {
    expect(topSpeed(0)).toBe(SPEED_BASE_MILLI_MM_PER_MS)
    expect(topSpeed(10)).toBe(
      SPEED_BASE_MILLI_MM_PER_MS + SPEED_GAIN_MILLI_MM_PER_MS * 10,
    )
    expect(topSpeed(16)).toBeGreaterThan(topSpeed(8))
  })

  test("an intent scales the target velocity by its magnitude", () => {
    expect(targetVelocity(10, ADVANCE)).toEqual({ x: 1000, z: 0 })
    expect(targetVelocity(10, { x: 500, z: 0 })).toEqual({ x: 500, z: 0 })
    expect(targetVelocity(10, HOLD)).toEqual({ x: 0, z: 0 })
  })

  test("a diagonal intent is no faster than an axis intent", () => {
    const diagonal = targetVelocity(10, { x: 707, z: 707 })
    const axis = targetVelocity(10, ADVANCE)
    expect(diagonal.x).toBeLessThan(axis.x)
    expect(diagonal).toEqual({ x: 707, z: 707 })
  })
})

describe("continuous movement — acceleration", () => {
  test("velocity ramps toward the intent at the accel rate", () => {
    let vel: Vec3 = { x: 0, y: 0, z: 0 }
    const ramp: number[] = []
    for (let i = 0; i < 4; i++) {
      vel = accelerate(vel, 10, ADVANCE)
      ramp.push(vel.x)
    }
    expect(ramp[0]).toBe(ACCEL_MILLI_MM_PER_MS_PER_STEP)
    expect(ramp).toEqual([400, 800, 1000, 1000])
  })

  test("velocity sheds at the decel rate when the intent is dropped", () => {
    let vel: Vec3 = { x: 1000, y: 0, z: 0 }
    const shed: number[] = []
    for (let i = 0; i < 3; i++) {
      vel = accelerate(vel, 10, HOLD)
      shed.push(vel.x)
    }
    expect(shed[0]).toBe(1000 - DECEL_MILLI_MM_PER_MS_PER_STEP)
    expect(shed).toEqual([400, 0, 0])
  })

  test("a reversal turns through zero at the decel rate", () => {
    let vel: Vec3 = { x: 1000, y: 0, z: 0 }
    const turn: number[] = []
    for (let i = 0; i < 4; i++) {
      vel = accelerate(vel, 10, { x: -1000, z: 0 })
      turn.push(vel.x)
    }
    expect(turn).toEqual([400, -200, -600, -1000])
  })

  test("a ramped fighter settles at its top speed", () => {
    let vel: Vec3 = { x: 0, y: 0, z: 0 }
    for (let i = 0; i < 20; i++) vel = accelerate(vel, 10, ADVANCE)
    expect(vel.x).toBe(topSpeed(10))
    expect(vel.y).toBe(0)
    expect(vel.z).toBe(0)
  })
})

describe("continuous movement — strafing and the fence", () => {
  test("a lateral intent moves only on z", () => {
    const after = moveFighter(fighter(), { x: 0, z: 1000 }, BOUNDS)
    expect(after.pos.x).toBe(0)
    expect(after.pos.z).toBeGreaterThan(0)
  })

  test("a diagonal intent moves on both axes", () => {
    const after = moveFighter(fighter(), { x: 1000, z: 707 }, BOUNDS)
    expect(after.pos.x).toBeGreaterThan(0)
    expect(after.pos.z).toBeGreaterThan(0)
  })

  test("the fence clamps the position and zeroes the axis", () => {
    const atWall = fighter({
      pos: { x: BOUNDS.maxX, y: 0, z: 0 },
      vel: { x: 1000, y: 0, z: 0 },
    })
    const after = moveFighter(atWall, ADVANCE, BOUNDS)
    expect(after.pos.x).toBe(BOUNDS.maxX)
    expect(after.vel.x).toBe(0)
  })

  test("a fighter pinned at the fence does not oscillate", () => {
    let state = fighter({ pos: { x: BOUNDS.maxX, y: 0, z: 0 } })
    const xs: number[] = []
    for (let i = 0; i < 20; i++) {
      state = moveFighter(state, ADVANCE, BOUNDS)
      xs.push(state.pos.x)
    }
    expect(new Set(xs)).toEqual(new Set([BOUNDS.maxX]))
  })

  test("only the clamped axis is stopped", () => {
    const corner = fighter({
      pos: { x: BOUNDS.maxX, y: 0, z: 0 },
      vel: { x: 1000, y: 0, z: 400 },
    })
    const after = moveFighter(corner, { x: 1000, z: 1000 }, BOUNDS)
    expect(after.pos.x).toBe(BOUNDS.maxX)
    expect(after.vel.x).toBe(0)
    expect(after.pos.z).toBeGreaterThan(0)
  })

  test("the floor stays at y = 0", () => {
    const moved = integrate(
      { x: 0, y: 0, z: 0 },
      { x: 5000, y: 999, z: -5000 },
      BOUNDS,
    )
    expect(moved.pos.y).toBe(0)
    expect(moved.vel.y).toBe(0)
  })
})

describe("continuous movement — facing", () => {
  test("facing follows an axis intent", () => {
    expect(facingFor(ADVANCE, FACING_POSITIVE_Z)).toEqual({ x: 1000, z: 0 })
    expect(facingFor({ x: 0, z: -1000 }, FACING_POSITIVE_Z)).toEqual({
      x: 0,
      z: -1000,
    })
  })

  test("a diagonal intent faces the diagonal", () => {
    expect(facingFor({ x: 707, z: 707 }, FACING_POSITIVE_Z)).toEqual({
      x: 707,
      z: 707,
    })
  })

  test("a near-axis intent snaps to the axis", () => {
    expect(facingFor({ x: 1000, z: 200 }, FACING_POSITIVE_Z)).toEqual({
      x: 1000,
      z: 0,
    })
  })

  test("a held fighter keeps its facing", () => {
    expect(facingFor(HOLD, { x: 0, z: -1000 })).toEqual({ x: 0, z: -1000 })
  })
})
