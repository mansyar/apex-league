/**
 * The fixed-step stepper (Continuous Arena Battle FR-1, AC-1, AC-2, AC-3):
 * 20 ms steps, a replayable hash stream, positions that never leave the
 * floor, and an engagement that actually moves.
 */

import { describe, expect, test } from "bun:test"
import {
  createFight,
  type FightConfig,
  type FighterInit,
  stateHash,
} from "./step"
import {
  type ArenaBounds,
  FACING_POSITIVE_Z,
  type FightState,
  HOLD,
  type MoveIntent,
  STEP_MS,
} from "./types"

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

function side(key: string, spd: number, x: number, z = 0): FighterInit {
  return { key, spd, at: { x, z } }
}

function config(
  overrides: {
    seed?: number
    bounds?: ArenaBounds
    fighters?: readonly [FighterInit, FighterInit]
  } = {},
): FightConfig {
  return {
    seed: overrides.seed ?? 20261108,
    bounds: overrides.bounds ?? BOUNDS,
    fighters: overrides.fighters ?? [
      side("home", 12, -2000),
      side("away", 10, 2000),
    ],
  }
}

/** A scripted exchange: close in, then break and circle, over and over. */
function script(step: number): readonly [MoveIntent, MoveIntent] {
  const closing = step % 40 < 20
  const home: MoveIntent = closing ? { x: 1000, z: 707 } : { x: 0, z: -1000 }
  const away: MoveIntent = closing ? { x: -1000, z: -707 } : { x: -1000, z: 0 }
  return [home, away]
}

type Script = (step: number) => readonly [MoveIntent, MoveIntent]

function runScript(
  cfg: FightConfig,
  orders: Script,
  steps = 150,
): { hashes: number[]; state: FightState } {
  const fight = createFight(cfg)
  const hashes: number[] = []
  for (let i = 0; i < steps; i++) {
    hashes.push(fight.advance(orders(i)).hash)
  }
  return { hashes, state: fight.state }
}

describe("continuous stepper — fixed 20 ms steps", () => {
  test("the step is 20 ms", () => {
    expect(STEP_MS).toBe(20)
  })

  test("a fight opens at rest, in place, on the floor", () => {
    const state = createFight(config()).state
    expect(state.step).toBe(0)
    expect(state.elapsedMs).toBe(0)
    expect(state.fighters[0].pos).toEqual({ x: -2000, y: 0, z: 0 })
    expect(state.fighters[1].pos).toEqual({ x: 2000, y: 0, z: 0 })
    expect(state.fighters[0].vel).toEqual({ x: 0, y: 0, z: 0 })
    expect(state.fighters[0].facing).toEqual(FACING_POSITIVE_Z)
  })

  test("a step advances one step and one step of time", () => {
    const fight = createFight(config())
    const { state } = fight.advance(ADVANCE)
    expect(state.step).toBe(1)
    expect(state.elapsedMs).toBe(STEP_MS)
    expect(state.fighters[0].pos.x).toBeGreaterThan(-2000)
    expect(state.fighters[1].pos.x).toBeLessThan(2000)
  })

  test("a held fighter keeps its position and its velocity", () => {
    const fight = createFight(config())
    for (let i = 0; i < 20; i++) fight.advance([HOLD, HOLD])
    expect(fight.state.fighters[0].pos).toEqual({ x: -2000, y: 0, z: 0 })
    expect(fight.state.fighters[0].vel).toEqual({ x: 0, y: 0, z: 0 })
    expect(fight.state.elapsedMs).toBe(20 * STEP_MS)
  })
})

describe("continuous stepper — determinism (AC-1)", () => {
  test("the same seed and the same intents replay the same hashes", () => {
    const first = runScript(config(), script)
    const second = runScript(config(), script)
    expect(second.hashes).toEqual(first.hashes)
    expect(second.state).toEqual(first.state)
  })

  test("a different intent sequence walks a different fight", () => {
    const straight = runScript(config(), () => ADVANCE)
    const circling = runScript(config(), script)
    expect(circling.hashes).not.toEqual(straight.hashes)
  })

  test("the hash is a 32-bit word", () => {
    const fight = createFight(config())
    const { hash } = fight.advance(ADVANCE)
    expect(hash >>> 0).toBe(hash)
  })
})

describe("continuous stepper — the hash covers the state", () => {
  test("swapping the two sides changes the hash", () => {
    const straight = createFight(config())
    const swapped = createFight(
      config({
        fighters: [side("away", 10, 2000), side("home", 12, -2000)],
      }),
    )
    expect(stateHash(swapped.state)).not.toBe(stateHash(straight.state))
  })

  test("changing one stat changes the hash", () => {
    const normal = createFight(config())
    const quicker = createFight(
      config({ fighters: [side("home", 13, -2000), side("away", 10, 2000)] }),
    )
    expect(stateHash(quicker.state)).not.toBe(stateHash(normal.state))
  })

  test("the same state hashes the same every time", () => {
    const fight = createFight(config())
    const { hash } = fight.advance(ADVANCE)
    expect(stateHash(fight.state)).toBe(hash)
  })
})

describe("continuous stepper — positions stay on the floor (AC-2)", () => {
  test("every sampled position keeps y at 0 and every component whole", () => {
    const fight = createFight(config())
    for (let i = 0; i < 200; i++) {
      const { state } = fight.advance(script(i))
      for (const one of state.fighters) {
        expect(one.pos.y).toBe(0)
        expect(Number.isInteger(one.pos.x)).toBe(true)
        expect(Number.isInteger(one.pos.z)).toBe(true)
        expect(one.pos.x).toBeGreaterThanOrEqual(BOUNDS.minX)
        expect(one.pos.x).toBeLessThanOrEqual(BOUNDS.maxX)
        expect(one.pos.z).toBeGreaterThanOrEqual(BOUNDS.minZ)
        expect(one.pos.z).toBeLessThanOrEqual(BOUNDS.maxZ)
      }
    }
  })
})

describe("continuous stepper — an engagement moves (AC-3)", () => {
  test("a scripted exchange visits many distinct positions", () => {
    const fight = createFight(config())
    const home = new Set<string>()
    const away = new Set<string>()
    const homeZ = new Set<number>()
    for (let i = 0; i < 120; i++) {
      const { state } = fight.advance(script(i))
      home.add(`${state.fighters[0].pos.x},${state.fighters[0].pos.z}`)
      away.add(`${state.fighters[1].pos.x},${state.fighters[1].pos.z}`)
      homeZ.add(state.fighters[0].pos.z)
    }
    expect(home.size).toBeGreaterThan(10)
    expect(away.size).toBeGreaterThan(10)
    expect(homeZ.size).toBeGreaterThan(1)
  })
})

describe("continuous stepper — the factory refuses bad input", () => {
  test("non-integer input is refused", () => {
    expect(() => createFight(config({ seed: 1.5 }))).toThrow(/integer/)
    expect(() =>
      createFight(config({ bounds: { ...BOUNDS, maxX: 4000.5 } })),
    ).toThrow(/integer/)
    expect(() =>
      createFight(
        config({
          fighters: [side("home", 12, -2000.5), side("away", 10, 2000)],
        }),
      ),
    ).toThrow(/integer/)
  })

  test("an inverted or empty arena is refused", () => {
    expect(() =>
      createFight(config({ bounds: { minX: 0, maxX: 0, minZ: -1, maxZ: 1 } })),
    ).toThrow(/minX/)
    expect(() =>
      createFight(config({ bounds: { minX: -1, maxX: 1, minZ: 2, maxZ: 2 } })),
    ).toThrow(/minZ/)
  })

  test("a start outside the fence is refused", () => {
    expect(() =>
      createFight(
        config({ fighters: [side("home", 12, -9000), side("away", 10, 2000)] }),
      ),
    ).toThrow(/outside/)
  })

  test("two sides cannot share a key", () => {
    expect(() =>
      createFight(
        config({ fighters: [side("same", 12, -2000), side("same", 10, 2000)] }),
      ),
    ).toThrow(/share the key/)
  })

  test("a zero facing is refused", () => {
    expect(() =>
      createFight(
        config({
          fighters: [
            { key: "home", spd: 12, at: { x: -2000, z: 0 }, facing: HOLD },
            side("away", 10, 2000),
          ],
        }),
      ),
    ).toThrow(/facing/)
  })
})
