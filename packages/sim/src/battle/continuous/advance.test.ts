/**
 * The dodge price at the seam that owns fighter state (Continuous Arena Battle
 * FR-10): a dodge order pays `DODGE_STAMINA_COST` before it bursts, an order
 * the pool cannot cover is refused into a hold, and a refusal costs nothing and
 * wedges nothing. The pipeline lives in ./advance and is driven here through a
 * real fight, so the charge is observed the way a runner sees it.
 */

import { describe, expect, test } from "bun:test"
import type { DodgeReport } from "./advance"
import { DODGE_STAMINA_COST } from "./stamina"
import { createFight, type FightConfig, type FighterInit } from "./step"
import { type ArenaBounds, HOLD, type MoveIntent } from "./types"

const BOUNDS: ArenaBounds = {
  minX: -4000,
  maxX: 4000,
  minZ: -3000,
  maxZ: 3000,
}

function side(key: string, x: number, z = 0, spd = 10): FighterInit {
  return { key, spd, at: { x, z } }
}

function config(fighters: readonly [FighterInit, FighterInit]): FightConfig {
  return { seed: 20261108, bounds: BOUNDS, fighters }
}

/** A burst straight across the arena: +z, so x must not drift. */
const SIDESTEP: MoveIntent = { dodge: { x: 0, z: 1000 } }

const ORDERS: readonly [MoveIntent, MoveIntent] = [SIDESTEP, HOLD]

/** The home side dodges every step for `steps`; both sides' reports come back. */
function drive(steps: number): { hashes: number[]; dodges: DodgeReport[] } {
  const fight = createFight(config([side("home", -2000), side("away", 2000)]))
  const hashes: number[] = []
  const dodges: DodgeReport[] = []
  for (let i = 0; i < steps; i++) {
    const result = fight.advance(ORDERS)
    hashes.push(result.hash)
    dodges.push(...result.dodges)
  }
  return { hashes, dodges }
}

describe("advance — the dodge price (FR-10)", () => {
  test("a dodge pays its price and moves the body sideways", () => {
    const fight = createFight(config([side("home", -2000), side("away", 2000)]))
    const before = fight.state.fighters[0]
    const result = fight.advance(ORDERS)
    const after = result.state.fighters[0]
    expect(after.stamina).toBe(before.stamina - DODGE_STAMINA_COST)
    expect(result.dodges).toEqual([{ key: "home", paid: true }])
    expect(after.pos.z).toBeGreaterThan(before.pos.z)
    expect(after.pos.x).toBe(before.pos.x)
  })

  test("an empty pool refuses the dodge, and the body holds", () => {
    const poor: FighterInit = { ...side("home", -2000), staminaMax: 4 }
    const fight = createFight(config([poor, side("away", 2000)]))
    const before = fight.state.fighters[0]
    const result = fight.advance(ORDERS)
    const after = result.state.fighters[0]
    // Refused, so the price was never taken and nothing slid.
    expect(after.stamina).toBe(before.stamina)
    expect(after.staminaRegenMs).toBe(0)
    expect(result.dodges).toEqual([{ key: "home", paid: false }])
    expect(after.pos).toEqual(before.pos)
    expect(after.vel).toEqual(before.vel)
  })

  test("a refusal costs nothing and leaves the fighter free to act", () => {
    const poor: FighterInit = { ...side("home", -2000), staminaMax: 4 }
    const fight = createFight(config([poor, side("away", 2000)]))
    fight.advance(ORDERS)
    const held = fight.state.fighters[0]
    expect(held.stamina).toBe(4)
    // Not wedged: it can still commit, and a plain intent still moves it.
    expect(fight.commit(0, "basic")).toBe(true)
    const moved = fight.advance([{ x: 1000, z: 0 }, HOLD]).state.fighters[0]
    expect(moved.pos.x).toBeGreaterThan(held.pos.x)
  })

  test("a fight that dodges past its pool still hashes identically", () => {
    // Thirty steps of dodging outrun a full pool, so both the paid and the
    // refused path are on the record.
    const first = drive(30)
    const second = drive(30)
    expect(second.hashes).toEqual(first.hashes)
    expect(second.dodges).toEqual(first.dodges)
    expect(first.dodges.some((dodge) => dodge.paid)).toBe(true)
    expect(first.dodges.some((dodge) => !dodge.paid)).toBe(true)
  })
})
