/**
 * Per-move cooldowns in live fight time (FR-19, AC-16).
 *
 * The catalog's `cooldown` field is a tier; `COOLDOWN_MS` turns it into
 * milliseconds. The timer is charged at commit, ticks by one 20 ms step,
 * clamps at zero, and is held per move id on `FighterState`. It is separate
 * from recovery and from stamina: a ready move still has to be affordable and
 * committable, and the innate strike is never gated at all.
 */

import { describe, expect, test } from "bun:test"
import { COOLDOWN_MS, cooldownMsFor } from "../moves"
import { chooseMove } from "./controller-moves"
import {
  cooldownRemaining,
  isCooldownReady,
  tickCooldowns,
} from "./cooldown"
import { ARENA_BOUNDS } from "./resolve"
import { createFight, stateHash } from "./step"
import { HOLD, STEP_MS } from "./types"

/** Two fighters a metre either side of centre, so neither can reach. */
function fightOf() {
  return createFight({
    seed: 1,
    bounds: ARENA_BOUNDS,
    fighters: [
      { key: "a", spd: 10, at: { x: -1000, z: 0 }, hp: 100 },
      { key: "b", spd: 10, at: { x: 1000, z: 0 }, hp: 100 },
    ],
  })
}

function advance(fight: ReturnType<typeof fightOf>, steps: number): void {
  for (let i = 0; i < steps; i += 1) fight.advance([HOLD, HOLD])
}

/** Steps until the move is ready again; the timer starts at commit. */
function stepsUntilReady(
  fight: ReturnType<typeof fightOf>,
  moveId: string,
): number {
  let steps = 0
  while (!isCooldownReady(fight.state.fighters[0], moveId)) {
    fight.advance([HOLD, HOLD])
    steps += 1
  }
  return steps
}

describe("the authored cooldown table", () => {
  test("is one frozen table of whole 20 ms steps", () => {
    expect(COOLDOWN_MS).toEqual({ 0: 0, 1: 1200, 2: 2000, 3: 2400 })
    for (const ms of Object.values(COOLDOWN_MS)) {
      expect(ms % STEP_MS).toBe(0)
    }
    expect(cooldownMsFor("basic")).toBe(0)
    expect(cooldownMsFor("spark")).toBe(1200)
    expect(cooldownMsFor("cinder_shot")).toBe(2000)
    expect(cooldownMsFor("pyre_lance")).toBe(2400)
  })
})

describe("a committed special is gated by its timer", () => {
  test("cannot fire twice before the timer expires", () => {
    const fight = fightOf()
    expect(fight.commit(0, "spark")).toBe(true)
    expect(cooldownRemaining(fight.state.fighters[0], "spark")).toBe(1200)

    // Spark's own attack is 980 ms; 1,000 ms leaves 200 ms on the timer.
    advance(fight, 50)
    expect(fight.state.fighters[0].attack).toBeNull()
    expect(cooldownRemaining(fight.state.fighters[0], "spark")).toBe(200)
    expect(fight.commit(0, "spark")).toBe(false)

    advance(fight, 10)
    expect(isCooldownReady(fight.state.fighters[0], "spark")).toBe(true)
    expect(fight.commit(0, "spark")).toBe(true)
  })

  test("a light is ready again sooner than a heavy", () => {
    const light = fightOf()
    expect(light.commit(0, "spark")).toBe(true)
    const lightSteps = stepsUntilReady(light, "spark")

    const heavy = fightOf()
    expect(heavy.commit(0, "pyre_lance")).toBe(true)
    const heavySteps = stepsUntilReady(heavy, "pyre_lance")

    expect(lightSteps).toBe(60)
    expect(heavySteps).toBe(120)
    expect(lightSteps).toBeLessThan(heavySteps)
  })

  test("the basic strike is never blocked and carries no timer", () => {
    const fight = fightOf()
    expect(fight.commit(0, "basic")).toBe(true)
    expect(fight.state.fighters[0].cooldowns).toEqual({})
    advance(fight, 50)
    expect(fight.commit(0, "basic")).toBe(true)
    expect(cooldownRemaining(fight.state.fighters[0], "basic")).toBe(0)
  })

  test("a move on cooldown is not chosen", () => {
    const fight = fightOf()
    const me = { ...fight.state.fighters[0], cooldowns: {} }
    const foe = fight.state.fighters[1]
    expect(chooseMove(me, foe, ["spark"], 0, 0, false)).toBe("spark")
    const spent = { ...me, cooldowns: { spark: 1200 } }
    expect(chooseMove(spent, foe, ["spark"], 0, 0, false)).toBeNull()
  })
})

describe("the cooldown rides the state hash", () => {
  test("a running timer changes the hash; a different remaining value does too", () => {
    const fight = fightOf()
    const idle = fight.state
    const running = {
      ...idle,
      fighters: [
        { ...idle.fighters[0], cooldowns: { spark: 1200 } },
        idle.fighters[1],
      ] as const,
    }
    const later = {
      ...idle,
      fighters: [
        { ...idle.fighters[0], cooldowns: { spark: 200 } },
        idle.fighters[1],
      ] as const,
    }
    expect(stateHash(running)).not.toBe(stateHash(idle))
    expect(stateHash(running)).not.toBe(stateHash(later))
  })

  test("ticking clamps at zero and drops expired entries", () => {
    const fight = fightOf()
    const running = {
      ...fight.state.fighters[0],
      cooldowns: { spark: STEP_MS },
    }
    expect(tickCooldowns(running).cooldowns).toEqual({})
    const ready = { ...running, cooldowns: {} }
    expect(tickCooldowns(ready)).toBe(ready)
  })
})
