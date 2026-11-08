/**
 * Hit reactions (Continuous Arena Battle FR-22, FR-23, AC-22, AC-23): a landed
 * blow adds velocity along the blow, resisted by the victim's mass, and costs
 * the victim a window of hitstun. Mass comes from body volume, so the same
 * blow throws a light body further than a heavy one; the fence clamps the
 * slide and reports the body pinned; hitstun ignores the victim's order and
 * refuses its commits, never stacks, and lasts longer after a poise break.
 */

import { describe, expect, test } from "bun:test"
import {
  advanceHitstun,
  BREAK_HITSTUN_MS,
  HITSTUN_MS,
  isStunned,
  knockbackVelocity,
  massOf,
  openingHitstun,
  reactToBlow,
} from "./impulse"
import { moveStunned } from "./movement"
import { openingPoise } from "./poise"
import { openingStamina } from "./stamina"
import {
  createFight,
  type Fight,
  type FightConfig,
  type FighterInit,
  stateHash,
} from "./step"
import {
  type ArenaBounds,
  type Dir2,
  FACING_POSITIVE_Z,
  type FighterState,
  type FightState,
  HOLD,
  STEP_MS,
} from "./types"

const BOUNDS: ArenaBounds = {
  minX: -4000,
  maxX: 4000,
  minZ: -3000,
  maxZ: 3000,
}

/** A smaller floor for the fence test: 900 mm to the +x wall. */
const WALL_BOUNDS: ArenaBounds = {
  minX: -2000,
  maxX: 900,
  minZ: -3000,
  maxZ: 3000,
}

const EAST: Dir2 = { x: 1000, z: 0 }
const WEST: Dir2 = { x: -1000, z: 0 }

const HOLD_BOTH = [HOLD, HOLD] as const
const RETREAT: readonly [Dir2, Dir2] = [HOLD, WEST]

/** A bare fighter at rest, with both meters opened at their defaults. */
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
    ...openingHitstun(),
    ...overrides,
  }
}

/** Total planar slide a body takes from `start` over `steps` stunned steps. */
function slide(start: FighterState, steps: number): number {
  let body = start
  for (let i = 0; i < steps; i++) body = moveStunned(body, BOUNDS).fighter
  return body.pos.x - start.pos.x
}

function side(key: string, x: number, facing: Dir2): FighterInit {
  return {
    key,
    spd: 10,
    at: { x, z: 0 },
    facing,
    stats: { atk: 30, def: 20 },
  }
}

function duel(victim: Partial<FighterInit> = {}): Fight {
  return createFight({
    seed: 20261108,
    bounds: BOUNDS,
    fighters: [
      side("home", -430, EAST),
      { ...side("away", 430, WEST), ...victim },
    ],
  })
}

/** Advance until the home side's committed blow lands; returns that step. */
function land(fight: Fight): ReturnType<Fight["advance"]> {
  let result = fight.advance(HOLD_BOTH)
  let guard = 0
  while (result.strikes.length === 0 && guard < 8) {
    result = fight.advance(HOLD_BOTH)
    guard++
  }
  expect(result.strikes).toHaveLength(1)
  return result
}

/** The hitstun a victim is left with on the step a basic blow lands. */
function hitstunAfterBlow(victim: Partial<FighterInit> = {}): number {
  const fight = duel(victim)
  fight.commit(0, "basic")
  land(fight)
  return fight.state.fighters[1].hitstunMs
}

describe("hit reactions — mass from body volume (FR-22)", () => {
  test("mass follows the body and never reaches zero", () => {
    expect(massOf(220, 900)).toBe(43560)
    expect(massOf(300, 1200)).toBeGreaterThan(massOf(220, 900))
    expect(massOf(180, 650)).toBeLessThan(massOf(220, 900))
    expect(massOf(1, 1)).toBe(1)
  })

  test("the same blow slides a heavy body less than a light one", () => {
    const heavy = reactToBlow(
      fighter({ radiusMm: 260, heightMm: 1250 }),
      EAST,
      2,
      false,
    )
    const light = reactToBlow(
      fighter({ radiusMm: 180, heightMm: 650 }),
      EAST,
      2,
      false,
    )
    const heavySlide = slide(heavy, 5)
    const lightSlide = slide(light, 5)
    expect(heavySlide).toBeGreaterThan(0)
    expect(heavySlide).toBeLessThan(100)
    expect(lightSlide).toBeGreaterThan(100)
    expect(lightSlide).toBeGreaterThan(heavySlide)
  })

  test("the push follows the blow line and is inverse to mass", () => {
    expect(knockbackVelocity(EAST, 4, 43560)).toEqual({ x: 4000, z: 0 })
    expect(knockbackVelocity(EAST, 8, 43560)).toEqual({ x: 8000, z: 0 })
    expect(knockbackVelocity(EAST, 4, 87120).x).toBe(2000)
    expect(knockbackVelocity(WEST, 4, 43560)).toEqual({ x: -4000, z: 0 })
    expect(knockbackVelocity(EAST, 0, 43560)).toEqual({ x: 0, z: 0 })
  })
})

describe("hit reactions — hitstun (FR-23)", () => {
  test("a second blow does not stack the window", () => {
    const first = reactToBlow(fighter(), EAST, 2, false)
    expect(first.hitstunMs).toBe(HITSTUN_MS)
    const served = moveStunned(first, BOUNDS).fighter
    expect(served.hitstunMs).toBe(HITSTUN_MS - STEP_MS)
    const second = reactToBlow(served, EAST, 2, false)
    expect(second.hitstunMs).toBe(HITSTUN_MS)
    expect(second.hitstunMs).toBeLessThan(HITSTUN_MS * 2)
  })

  test("a break suspends the victim longer than a plain hit", () => {
    const struck = reactToBlow(fighter(), EAST, 2, false)
    const broken = reactToBlow(fighter(), EAST, 2, true)
    expect(broken.hitstunMs).toBe(BREAK_HITSTUN_MS)
    expect(broken.hitstunMs).toBeGreaterThan(struck.hitstunMs)
  })

  test("the timer runs out and stays at zero", () => {
    let body = reactToBlow(fighter(), EAST, 2, false)
    for (let i = 0; i < HITSTUN_MS / STEP_MS; i++) {
      body = moveStunned(body, BOUNDS).fighter
    }
    expect(body.hitstunMs).toBe(0)
    expect(isStunned(body)).toBe(false)
    expect(advanceHitstun(body)).toBe(body)
  })
})

describe("hit reactions — the fence (FR-22, AC-22)", () => {
  test("a body knocked into the fence stops at it and is reported pinned", () => {
    const atWall = fighter({ pos: { x: BOUNDS.maxX - 40, y: 0, z: 0 } })
    let body = reactToBlow(atWall, EAST, 9, false)
    const pins: number[] = []
    const xs: number[] = []
    for (let i = 0; i < 5; i++) {
      const stunned = moveStunned(body, BOUNDS)
      body = stunned.fighter
      if (stunned.pinned.x !== 0) pins.push(stunned.pinned.x)
      xs.push(body.pos.x)
    }
    expect(Math.max(...xs)).toBe(BOUNDS.maxX)
    expect(pins.length).toBeGreaterThan(0)
    expect(pins.every((pin) => pin === 1)).toBe(true)
    expect(body.pos.x).toBe(BOUNDS.maxX)
    expect(body.vel.x).toBe(0)
  })

  test("a cornered fighter's pinned step is on the outcome", () => {
    const fight = createFight({
      seed: 20261108,
      bounds: WALL_BOUNDS,
      fighters: [side("home", 200, EAST), side("away", 870, WEST)],
    } satisfies FightConfig)
    fight.commit(0, "basic")
    const landed = land(fight)
    expect(landed.pinned).toContainEqual({ key: "away", x: 1, z: 0 })
    const xs = [fight.state.fighters[1].pos.x]
    for (let i = 0; i < 4; i++) {
      fight.advance(RETREAT)
      xs.push(fight.state.fighters[1].pos.x)
    }
    expect(Math.max(...xs)).toBe(WALL_BOUNDS.maxX)
    expect(fight.state.fighters[1].pos.x).toBe(WALL_BOUNDS.maxX)
  })
})

describe("hit reactions — a landed blow in a fight (AC-22, AC-23)", () => {
  test("the victim is carried away along the blow", () => {
    const fight = duel()
    fight.commit(0, "basic")
    const before = fight.state.fighters[1].pos.x
    const landed = land(fight)
    const struck = fight.state.fighters[1]
    expect(isStunned(struck)).toBe(true)
    expect(struck.pos.x).toBeGreaterThan(before)
    for (let i = 0; i < 3; i++) fight.advance(RETREAT)
    expect(fight.state.fighters[1].pos.x).toBeGreaterThan(struck.pos.x)
    expect(landed.strikes[0]?.targetKey).toBe("away")
  })

  test("a stunned victim ignores its order, cannot commit, then resumes", () => {
    const fight = duel()
    fight.commit(0, "basic")
    land(fight)
    const struck = fight.state.fighters[1].pos.x
    expect(fight.commit(1, "basic")).toBe(false)
    for (let i = 0; i < (HITSTUN_MS - STEP_MS) / STEP_MS; i++) {
      fight.advance(RETREAT)
      expect(fight.state.fighters[1].pos.x).toBeGreaterThanOrEqual(struck)
    }
    expect(fight.state.fighters[1].hitstunMs).toBe(0)
    const held = fight.state.fighters[1].pos.x
    const resumed = fight.advance(RETREAT).state.fighters[1]
    expect(resumed.pos.x).toBeLessThan(held)
  })

  test("a broken fighter is suspended longer than a merely struck one", () => {
    const struck = hitstunAfterBlow()
    const broken = hitstunAfterBlow({ poiseMax: 2 })
    expect(struck).toBe(HITSTUN_MS - STEP_MS)
    expect(broken).toBe(BREAK_HITSTUN_MS - STEP_MS)
    expect(broken).toBeGreaterThan(struck)
  })

  test("a shot knocks the victim along the line it flew", () => {
    const fight = duel()
    expect(fight.commit(0, "spark")).toBe(true)
    let result = fight.advance(HOLD_BOTH)
    let guard = 0
    while (result.shots.length === 0 && guard < 20) {
      result = fight.advance(HOLD_BOTH)
      guard++
    }
    expect(result.shots).toHaveLength(1)
    expect(result.shots[0]?.outcome).toBe("hit")
    expect(result.shots[0]?.dir).toEqual(EAST)
    expect(isStunned(fight.state.fighters[1])).toBe(true)
  })
})

describe("hit reactions — determinism (FR-1)", () => {
  test("hitstun is part of the state hash", () => {
    const fight = duel()
    const changed: FightState = {
      ...fight.state,
      fighters: [
        { ...fight.state.fighters[0], hitstunMs: HITSTUN_MS },
        fight.state.fighters[1],
      ],
    }
    expect(stateHash(changed)).not.toBe(stateHash(fight.state))
  })

  test("the same blows replay to the same hashes", () => {
    const replay = (): number[] => {
      const fight = duel()
      fight.commit(0, "basic")
      const hashes: number[] = []
      for (let i = 0; i < 12; i++) hashes.push(fight.advance(RETREAT).hash)
      return hashes
    }
    expect(replay()).toEqual(replay())
  })
})
