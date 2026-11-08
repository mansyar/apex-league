/**
 * Stamina (Continuous Arena Battle FR-10, AC-10): a commit costs its authored
 * price (with a floor on the innate strike), a commit the pool cannot cover is
 * refused observably, a dodge costs a fixed price, and the pool refills only
 * while the fighter is not committed.
 *
 * The pure tests pin the arithmetic; the fight tests pin the same rules
 * through `createFight`, where a refused commit leaves no attack behind and a
 * walked fighter never pays for its steps.
 */

import { describe, expect, test } from "bun:test"
import { getFrameData } from "../frames"
import { openingPoise } from "./poise"
import {
  attackCost,
  canAfford,
  DEFAULT_STAMINA_MAX,
  DODGE_STAMINA_COST,
  MIN_ATTACK_STAMINA_COST,
  openingStamina,
  regenerateStamina,
  STAMINA_REGEN_INTERVAL_MS,
  STAMINA_REGEN_PER_INTERVAL,
  spendAttack,
  spendDodge,
  spendStamina,
} from "./stamina"
import { createFight, type Fight, type FighterInit } from "./step"
import {
  type ArenaBounds,
  type AttackState,
  type Dir2,
  type FighterState,
  type MoveIntent,
  STEP_MS,
} from "./types"

const EAST: Dir2 = { x: 1000, z: 0 }
const WEST: Dir2 = { x: -1000, z: 0 }

const BOUNDS: ArenaBounds = {
  minX: -4000,
  maxX: 4000,
  minZ: -3000,
  maxZ: 3000,
}

const ADVANCE: readonly [MoveIntent, MoveIntent] = [
  { x: 1000, z: 0 },
  { x: -1000, z: 0 },
]

const HOLDING: readonly [MoveIntent, MoveIntent] = [
  { x: 0, z: 0 },
  { x: 0, z: 0 },
]

/** A bare fighter at rest, with both meters opened at their defaults. */
function fighter(overrides: Partial<FighterState> = {}): FighterState {
  return {
    key: "home",
    pos: { x: 0, y: 0, z: 0 },
    vel: { x: 0, y: 0, z: 0 },
    facing: EAST,
    radiusMm: 220,
    heightMm: 900,
    spd: 10,
    hp: 100,
    hpMax: 100,
    ...openingPoise(),
    ...openingStamina(),
    hitstunMs: 0,
    ...overrides,
  }
}

/** A committed attack, so the fighter counts as paying for it. */
const COMMITTED: AttackState = {
  moveId: "basic",
  phase: "startup",
  elapsedMs: 0,
  landed: false,
}

/** One side of a fight, with a stamina pool of its own. */
function side(
  key: string,
  x: number,
  facing: Dir2,
  staminaMax: number,
): FighterInit {
  return {
    key,
    spd: 10,
    at: { x, z: 0 },
    facing,
    stats: { atk: 30, def: 20 },
    staminaMax,
  }
}

/** Two fighters 420 mm apart, each facing the other: `basic` is in reach. */
function duel(staminaMax: number): Fight {
  return createFight({
    seed: 20261108,
    bounds: BOUNDS,
    fighters: [
      side("home", -210, EAST, staminaMax),
      side("away", 210, WEST, staminaMax),
    ],
  })
}

/** Advance `steps` times with the given orders. */
function run(
  fight: Fight,
  steps: number,
  orders: readonly [MoveIntent, MoveIntent],
): void {
  for (let i = 0; i < steps; i++) fight.advance(orders)
}

describe("stamina — the opening pool", () => {
  test("a fighter opens with a full pool and nothing banked", () => {
    expect(openingStamina(30)).toEqual({
      stamina: 30,
      staminaMax: 30,
      staminaRegenMs: 0,
    })
    expect(openingStamina().staminaMax).toBe(DEFAULT_STAMINA_MAX)
  })

  test("a pool must be a positive whole number of points", () => {
    expect(() => openingStamina(0)).toThrow(/positive/)
    expect(() => openingStamina(-1)).toThrow(/positive/)
    expect(() => openingStamina(2.5)).toThrow(/integer/)
  })
})

describe("stamina — paying for a commit (FR-10, AC-10)", () => {
  test("a move costs its authored weight, with a floor on the basic", () => {
    // The basic authors 2, below the floor; the slam authors its full 10.
    expect(getFrameData("basic")?.staminaCost).toBe(2)
    expect(attackCost("basic")).toBe(MIN_ATTACK_STAMINA_COST)
    expect(attackCost("tectonic_slam")).toBe(10)
    expect(() => attackCost("nope")).toThrow(/Unknown move/)
  })

  test("sustained output is at most one basic per 1.5 s (FR-4)", () => {
    const secondsPerBasic =
      (STAMINA_REGEN_INTERVAL_MS / STAMINA_REGEN_PER_INTERVAL) *
      attackCost("basic")
    expect(secondsPerBasic).toBeGreaterThanOrEqual(1500)
  })

  test("spending returns a paid fighter and leaves the old one alone", () => {
    const before = fighter({ stamina: 10, staminaMax: 10 })
    const paid = spendAttack(before, "basic")
    expect(paid?.stamina).toBe(7)
    expect(before.stamina).toBe(10)
  })

  test("a commit the pool cannot cover is refused, observably", () => {
    const poor = fighter({ stamina: 1, staminaMax: 10 })
    expect(canAfford(poor, attackCost("basic"))).toBe(false)
    expect(spendAttack(poor, "basic")).toBeNull()
    expect(spendStamina(poor, 2)).toBeNull()
  })

  test("an exact price is payable", () => {
    const exact = fighter({ stamina: 3, staminaMax: 10 })
    expect(spendAttack(exact, "basic")?.stamina).toBe(0)
  })

  test("a fractional or negative price is refused", () => {
    const rich = fighter()
    expect(() => spendStamina(rich, 1.5)).toThrow(/integer/)
    expect(() => spendStamina(rich, -1)).toThrow(/negative/)
  })
})

describe("stamina — dodging (FR-10)", () => {
  test("a dodge costs its fixed price", () => {
    const paid = spendDodge(fighter({ stamina: 20, staminaMax: 20 }))
    expect(paid?.stamina).toBe(20 - DODGE_STAMINA_COST)
  })

  test("a dodge the pool cannot cover is refused", () => {
    const poor = fighter({ stamina: DODGE_STAMINA_COST - 1 })
    expect(spendDodge(poor)).toBeNull()
  })
})

describe("stamina — regeneration (FR-10)", () => {
  test("a free fighter regains points every interval", () => {
    let state = fighter({ stamina: 0, staminaMax: 20 })
    const steps = STAMINA_REGEN_INTERVAL_MS / STEP_MS
    for (let i = 0; i < steps; i++) state = regenerateStamina(state)
    expect(state.stamina).toBe(STAMINA_REGEN_PER_INTERVAL)
    expect(state.staminaRegenMs).toBe(0)
  })

  test("a partial interval banks its time instead of rounding up", () => {
    const once = regenerateStamina(fighter({ stamina: 0, staminaMax: 20 }))
    expect(once.stamina).toBe(0)
    expect(once.staminaRegenMs).toBe(STEP_MS)
  })

  test("a committed fighter regenerates nothing", () => {
    const busy = fighter({ stamina: 0, attack: COMMITTED })
    expect(regenerateStamina(busy)).toBe(busy)
  })

  test("a full pool holds its bank at zero", () => {
    const full = fighter({ stamina: 20, staminaMax: 20, staminaRegenMs: 60 })
    const after = regenerateStamina(full)
    expect(after.stamina).toBe(20)
    expect(after.staminaRegenMs).toBe(0)
  })

  test("the pool never overfills", () => {
    let state = fighter({ stamina: 19, staminaMax: 20 })
    for (let i = 0; i < STAMINA_REGEN_INTERVAL_MS / STEP_MS; i++)
      state = regenerateStamina(state)
    expect(state.stamina).toBe(20)
  })
})

describe("stamina — the fight (FR-10, AC-10)", () => {
  test("a spent pool refuses the next commit, then pays once it refills", () => {
    const fight = duel(3)
    expect(fight.commit(0, "basic")).toBe(true)
    expect(fight.state.fighters[0].stamina).toBe(0)
    // basic is 80 + 60 + 250 ms: twenty steps, during which nothing refills.
    run(fight, 20, HOLDING)
    expect(fight.state.fighters[0].attack).toBeNull()
    expect(fight.state.fighters[0].stamina).toBe(0)
    expect(fight.commit(0, "basic")).toBe(false)
    expect(fight.state.fighters[0].attack).toBeNull()
    // One point per 500 ms: 90 steps refill the three-point pool.
    run(fight, 90, HOLDING)
    expect(fight.state.fighters[0].stamina).toBe(3)
    expect(fight.commit(0, "basic")).toBe(true)
    expect(fight.state.fighters[0].stamina).toBe(0)
  })

  test("a refused commit does not wedge the fighter: it can still move", () => {
    const fight = duel(3)
    fight.commit(0, "basic")
    run(fight, 20, HOLDING)
    const before = fight.state.fighters[0].pos.x
    expect(fight.commit(0, "basic")).toBe(false)
    fight.advance(ADVANCE)
    expect(fight.state.fighters[0].pos.x).toBeGreaterThan(before)
    expect(fight.state.fighters[0].attack).toBeNull()
  })

  test("regeneration pauses while the fighter holds an attack", () => {
    const fight = duel(10)
    fight.commit(0, "basic")
    run(fight, 3, HOLDING)
    expect(fight.state.fighters[0].stamina).toBe(7)
    expect(fight.state.fighters[0].staminaRegenMs).toBe(0)
  })

  test("movement is free: walking never spends stamina", () => {
    const fight = duel(10)
    run(fight, 100, ADVANCE)
    expect(fight.state.fighters[0].stamina).toBe(10)
    expect(fight.state.fighters[0].staminaRegenMs).toBe(0)
  })

  test("the pool is part of the replay identity (NFR-1)", () => {
    function replay(): number[] {
      const fight = duel(10)
      fight.commit(0, "basic")
      const hashes: number[] = []
      for (let i = 0; i < 40; i++) hashes.push(fight.advance(HOLDING).hash)
      return hashes
    }
    expect(replay()).toEqual(replay())
  })
})
