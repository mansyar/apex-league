/**
 * Poise (Continuous Arena Battle FR-9, AC-9): a landed blow removes the
 * move's authored points, an empty meter breaks the fighter open for a punish
 * window measured in milliseconds, and the window expires into a grace period
 * that keeps a freshly recovered fighter safe.
 *
 * The pure tests pin the meter arithmetic and the clocks; the fight tests pin
 * the same rules through `createFight`, so a break cancels what the fighter
 * was doing and refuses its next commit.
 */

import { describe, expect, test } from "bun:test"
import {
  advancePoise,
  applyPoiseDamage,
  canBreak,
  DEFAULT_POISE_MAX,
  isBroken,
  openingPoise,
  POISE_BREAK_MS,
  POISE_GRACE_MS,
} from "./poise"
import { openingStamina } from "./stamina"
import { createFight, type Fight, type FighterInit } from "./step"
import {
  type ArenaBounds,
  type AttackState,
  type Dir2,
  type FighterState,
  HOLD,
  type MoveIntent,
  STEP_MS,
} from "./types"

const EAST: Dir2 = { x: 1000, z: 0 }
const WEST: Dir2 = { x: -1000, z: 0 }
const BOTH_HOLD: readonly [MoveIntent, MoveIntent] = [HOLD, HOLD]

const BOUNDS: ArenaBounds = {
  minX: -4000,
  maxX: 4000,
  minZ: -3000,
  maxZ: 3000,
}

/** A bare fighter at rest, with both meters opened at their defaults. */
function fighter(overrides: Partial<FighterState> = {}): FighterState {
  return {
    key: "home",
    pos: { x: 0, y: 0, z: 0 },
    vel: { x: 0, y: 0, z: 0 },
    facing: EAST,
    spd: 10,
    ...openingPoise(),
    ...openingStamina(),
    ...overrides,
  }
}

/** One side of a fight, with a poise pool of its own. */
function side(
  key: string,
  x: number,
  facing: Dir2,
  poiseMax: number,
): FighterInit {
  return {
    key,
    spd: 10,
    at: { x, z: 0 },
    facing,
    stats: { atk: 30, def: 20 },
    poiseMax,
  }
}

/** Two fighters 420 mm apart, each facing the other: `basic` is in reach. */
function duel(poiseMax: number): Fight {
  return createFight({
    seed: 20261108,
    bounds: BOUNDS,
    fighters: [
      side("home", -210, EAST, poiseMax),
      side("away", 210, WEST, poiseMax),
    ],
  })
}

/** Advance `steps` times with both sides standing still. */
function hold(fight: Fight, steps: number): void {
  for (let i = 0; i < steps; i++) fight.advance(BOTH_HOLD)
}

describe("poise — the opening pool", () => {
  test("a fighter opens with a full meter and no clocks running", () => {
    expect(openingPoise(12)).toEqual({
      poise: 12,
      poiseMax: 12,
      poiseBreakMs: 0,
      poiseGraceMs: 0,
    })
    expect(openingPoise().poiseMax).toBe(DEFAULT_POISE_MAX)
  })

  test("a pool must be a positive whole number of points", () => {
    expect(() => openingPoise(0)).toThrow(/positive/)
    expect(() => openingPoise(-4)).toThrow(/positive/)
    expect(() => openingPoise(4.5)).toThrow(/integer/)
  })
})

describe("poise — depletion (FR-9)", () => {
  test("a landed blow removes its authored points", () => {
    const hit = applyPoiseDamage(fighter({ poise: 10, poiseMax: 10 }), 3)
    expect(hit.poise).toBe(7)
    expect(isBroken(hit)).toBe(false)
  })

  test("the meter never runs below zero", () => {
    const hit = applyPoiseDamage(fighter({ poise: 2, poiseMax: 10 }), 9)
    expect(hit.poise).toBe(0)
    expect(isBroken(hit)).toBe(true)
  })

  test("zero damage leaves the fighter untouched", () => {
    const calm = fighter({ poise: 6, poiseMax: 10 })
    expect(applyPoiseDamage(calm, 0)).toBe(calm)
  })

  test("a fractional blow is refused, so the meter stays whole", () => {
    expect(() => applyPoiseDamage(fighter(), 1.5)).toThrow(/integer/)
  })
})

describe("poise — the break window (FR-9, AC-9)", () => {
  test("an empty meter breaks the fighter and opens the window", () => {
    const broken = applyPoiseDamage(fighter({ poise: 2, poiseMax: 8 }), 2)
    expect(broken.poise).toBe(0)
    expect(broken.poiseBreakMs).toBe(POISE_BREAK_MS)
    expect(broken.poiseGraceMs).toBe(0)
    expect(isBroken(broken)).toBe(true)
    expect(canBreak(broken)).toBe(false)
  })

  test("the break cancels the attack the fighter was holding", () => {
    const attack: AttackState = {
      moveId: "basic",
      phase: "active",
      elapsedMs: 0,
    }
    const broken = applyPoiseDamage(fighter({ poise: 1, attack }), 1)
    expect(broken.attack).toBeNull()
  })

  test("a broken fighter absorbs further blows instead of re-locking", () => {
    const broken = applyPoiseDamage(fighter({ poise: 1, poiseMax: 4 }), 1)
    const again = applyPoiseDamage(broken, 9)
    expect(again).toBe(broken)
    expect(again.poiseBreakMs).toBe(POISE_BREAK_MS)
  })

  test("the window counts down in milliseconds, not in actions", () => {
    const broken = applyPoiseDamage(fighter({ poise: 1, poiseMax: 4 }), 1)
    const afterOneStep = advancePoise(broken)
    expect(afterOneStep.poiseBreakMs).toBe(POISE_BREAK_MS - STEP_MS)
    expect(isBroken(afterOneStep)).toBe(true)
  })

  test("the window expires, refills the meter, and starts the grace", () => {
    const steps = POISE_BREAK_MS / STEP_MS
    expect(Number.isInteger(steps)).toBe(true)
    let state = applyPoiseDamage(fighter({ poise: 1, poiseMax: 4 }), 1)
    for (let i = 0; i < steps - 1; i++) state = advancePoise(state)
    expect(isBroken(state)).toBe(true)
    state = advancePoise(state)
    expect(isBroken(state)).toBe(false)
    expect(state.poise).toBe(4)
    expect(state.poiseGraceMs).toBe(POISE_GRACE_MS)
  })
})

describe("poise — the grace period (FR-9)", () => {
  /** A fighter that has just served a break: full meter, grace running. */
  function recovered(): FighterState {
    let state = applyPoiseDamage(fighter({ poise: 1, poiseMax: 4 }), 1)
    for (let i = 0; i < POISE_BREAK_MS / STEP_MS; i++) {
      state = advancePoise(state)
    }
    return state
  }

  test("a blow inside grace cannot break the fighter", () => {
    const state = recovered()
    expect(canBreak(state)).toBe(false)
    const hit = applyPoiseDamage(state, 4)
    expect(isBroken(hit)).toBe(false)
    expect(hit.poise).toBe(1)
  })

  test("grace expires, and the next blow breaks again", () => {
    let state = recovered()
    for (let i = 0; i < POISE_GRACE_MS / STEP_MS; i++) {
      state = advancePoise(state)
    }
    expect(state.poiseGraceMs).toBe(0)
    expect(canBreak(state)).toBe(true)
    const hit = applyPoiseDamage(state, 4)
    expect(isBroken(hit)).toBe(true)
    expect(hit.poise).toBe(0)
  })

  test("the grace is a duration, not a count of actions", () => {
    expect(POISE_GRACE_MS).toBeGreaterThan(POISE_BREAK_MS)
    expect(POISE_GRACE_MS % STEP_MS).toBe(0)
  })
})

describe("poise — the fight (FR-9, AC-9)", () => {
  test("a trade empties both meters and cancels both active frames", () => {
    const fight = duel(4)
    expect(fight.commit(0, "basic")).toBe(true)
    expect(fight.commit(1, "basic")).toBe(true)
    // basic opens its active window on the fourth step; two blows (2 points
    // each) empty a 4-point pool.
    hold(fight, 5)
    for (const one of fight.state.fighters) {
      expect(isBroken(one)).toBe(true)
      expect(one.poise).toBe(0)
      expect(one.poiseBreakMs).toBe(POISE_BREAK_MS)
      expect(one.attack).toBeNull()
    }
    expect(fight.commit(0, "basic")).toBe(false)
    expect(fight.commit(1, "basic")).toBe(false)
  })

  test("the punish window expires and the victim can commit again", () => {
    const fight = duel(4)
    fight.commit(0, "basic")
    hold(fight, 5)
    hold(fight, POISE_BREAK_MS / STEP_MS)
    const victim = fight.state.fighters[1]
    expect(isBroken(victim)).toBe(false)
    expect(victim.poise).toBe(4)
    expect(victim.poiseGraceMs).toBe(POISE_GRACE_MS)
    expect(fight.commit(1, "spark")).toBe(true)
  })

  test("the meters are part of the replay identity (NFR-1)", () => {
    function replay(): number[] {
      const fight = duel(4)
      fight.commit(0, "basic")
      const hashes: number[] = []
      for (let i = 0; i < 40; i++) hashes.push(fight.advance(BOTH_HOLD).hash)
      return hashes
    }
    expect(replay()).toEqual(replay())
  })
})
