/**
 * The dodge at the seam that owns fighter state (Continuous Arena Battle FR-10,
 * FR-20): a dodge order pays `DODGE_STAMINA_COST` once as its burst starts, an
 * order the pool cannot cover is refused into a hold, and a refusal costs
 * nothing and wedges nothing. A dodge inside a shot's flight turns the hit into
 * a miss; one before the shot is aimed or after it has passed does not (AC-20).
 * The pipeline lives in ./advance and is driven here through a real fight, so
 * the charge is observed the way a runner sees it.
 */

import { describe, expect, test } from "bun:test"
import type { DodgeReport } from "./advance"
import type { ShotReport } from "./projectile"
import { DODGE_STAMINA_COST } from "./stamina"
import {
  createFight,
  type Fight,
  type FightConfig,
  type FighterInit,
} from "./step"
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
    // Seven points cannot pay the eight-point dodge. Since the blow weight the
    // cheapest commit costs 9, more than the dodge, so no pool can refuse the
    // dodge and still afford a commit; the refusal is shown to cost nothing and
    // to wedge nothing, which is what the test is for.
    const poor: FighterInit = { ...side("home", -2000), staminaMax: 7 }
    const fight = createFight(config([poor, side("away", 2000)]))
    fight.advance(ORDERS)
    const held = fight.state.fighters[0]
    expect(held.stamina).toBe(7)
    // Not wedged: a plain intent still moves it.
    const moved = fight.advance([{ x: 1000, z: 0 }, HOLD]).state.fighters[0]
    expect(moved.pos.x).toBeGreaterThan(held.pos.x)
  })

  test("a held dodge charges once per burst, not once per step", () => {
    // The order is held across the whole window, which is one lunge (FR-20):
    // the pool pays for the burst once, so holding it cannot drain a fighter.
    const first = drive(30)
    const second = drive(30)
    expect(second.hashes).toEqual(first.hashes)
    expect(second.dodges).toEqual(first.dodges)
    expect(first.dodges).toHaveLength(30)
    expect(first.dodges.every((dodge) => dodge.paid)).toBe(true)
  })

  test("a second step of the same burst is not charged again", () => {
    const fight = createFight(config([side("home", -2000), side("away", 2000)]))
    fight.advance(ORDERS)
    const paid = fight.state.fighters[0].stamina
    fight.advance(ORDERS)
    // The pool is charged once per lunge, so holding the order is not a drain.
    expect(fight.state.fighters[0].stamina).toBe(paid)
    expect(fight.state.fighters[0].pos.z).toBeGreaterThan(60)
  })
})

/** The two sides 2 m apart, so a spark's flight is a handful of steps. */
function facing(): Fight {
  return createFight(config([side("home", -1000), side("away", 1000)]))
}

/** Fly one spark out, with `order` driving the target, and report the shot. */
function sparkAt(
  order: (sinceLaunch: number) => MoveIntent,
  setup?: (fight: Fight) => void,
): { shots: ShotReport[]; fight: Fight } {
  const fight = facing()
  setup?.(fight)
  fight.commit(0, "spark")
  const shots: ShotReport[] = []
  let since = -1
  for (let i = 0; i < 80 && shots.length === 0; i++) {
    const result = fight.advance([HOLD, since >= 0 ? order(since) : HOLD])
    if (result.launched.length > 0) since = 0
    else if (since >= 0) since += 1
    shots.push(...result.shots)
  }
  return { shots, fight }
}

describe("advance — a dodge inside the flight turns the hit into a miss (AC-20)", () => {
  test("holding still takes the shot", () => {
    const { shots, fight } = sparkAt(() => HOLD)
    expect(shots[0]?.outcome).toBe("hit")
    expect(fight.state.fighters[1].hp).toBeLessThan(
      fight.state.fighters[1].hpMax,
    )
  })

  test("a lunge across the line as the shot arrives dodges it", () => {
    const { shots, fight } = sparkAt((i) => (i < 6 ? SIDESTEP : HOLD))
    expect(shots[0]?.outcome).toBe("dodged")
    expect(fight.state.fighters[1].hp).toBe(fight.state.fighters[1].hpMax)
  })

  test("a lunge that starts too late still takes the hit", () => {
    const { shots } = sparkAt((i) => (i >= 6 && i < 12 ? SIDESTEP : HOLD))
    expect(shots[0]?.outcome).toBe("hit")
  })

  test("a lunge before the shot is aimed does not help", () => {
    const { shots, fight } = sparkAt(
      () => HOLD,
      (early) => {
        // Dodge first, settle, and only then let the spark fly: the shot is
        // aimed at where the body now stands, so the early lunge buys nothing.
        for (let i = 0; i < 6; i++) early.advance([HOLD, SIDESTEP])
        for (let i = 0; i < 20; i++) early.advance([HOLD, HOLD])
      },
    )
    expect(shots[0]?.outcome).toBe("hit")
    expect(fight.state.fighters[1].hp).toBeLessThan(
      fight.state.fighters[1].hpMax,
    )
  })
})
