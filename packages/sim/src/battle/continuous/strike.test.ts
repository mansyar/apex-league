/**
 * Strikes in space (Continuous Arena Battle FR-4, AC-4): Euclidean reach, a
 * front arc that a strike aimed away fails, and the front/flank/rear
 * classification the positional bonus reads.
 */

import { describe, expect, test } from "bun:test"
import {
  createFight,
  type Fight,
  type FighterInit,
  type StepResult,
  stateHash,
} from "./step"
import {
  FLANK_COS,
  FRONT_ARC_COS,
  hitPosition,
  inFrontArc,
  withinReach,
} from "./strike"
import {
  type ArenaBounds,
  type Dir2,
  HOLD,
  type MoveIntent,
  type Vec3,
} from "./types"

const EAST: Dir2 = { x: 1000, z: 0 }
const WEST: Dir2 = { x: -1000, z: 0 }
const NORTH: Dir2 = { x: 0, z: 1000 }

function at(x: number, z = 0): Vec3 {
  return { x, y: 0, z }
}

describe("strike reach — Euclidean, integer", () => {
  test("a target exactly at reach is inside it", () => {
    expect(withinReach(at(0), at(420), 420)).toBe(true)
    expect(withinReach(at(0), at(421), 420)).toBe(false)
  })

  test("reach is planar distance, not per axis", () => {
    // 252-336-420 is a 3-4-5 triangle: exactly 420 mm, on both axes at once.
    expect(withinReach(at(0), at(252, 336), 420)).toBe(true)
    expect(withinReach(at(0), at(253, 336), 420)).toBe(false)
  })

  test("a target behind the attacker is still in reach", () => {
    expect(withinReach(at(0), at(-420), 420)).toBe(true)
  })
})

describe("strike facing — the front arc (AC-4)", () => {
  test("a target ahead is inside the arc", () => {
    expect(inFrontArc(EAST, at(0), at(420))).toBe(true)
  })

  test("a target behind is outside the arc", () => {
    expect(inFrontArc(EAST, at(0), at(-420))).toBe(false)
  })

  test("facing is what decides, not the axis", () => {
    expect(inFrontArc(WEST, at(0), at(-420))).toBe(true)
    expect(inFrontArc(WEST, at(0), at(420))).toBe(false)
  })

  test("a target exactly to the side is on the 180° boundary", () => {
    expect(inFrontArc(EAST, at(0), at(0, 420))).toBe(true)
    expect(inFrontArc(EAST, at(0), at(0, -420))).toBe(true)
  })

  test("overlapping bodies count as in front", () => {
    expect(inFrontArc(EAST, at(0), at(0))).toBe(true)
  })

  test("the arc is one tunable cosine pair", () => {
    expect(FRONT_ARC_COS).toEqual({ num: 0, den: 1 })
  })
})

describe("strike position — front, flank, rear", () => {
  test("a blow from the victim's facing side is front", () => {
    expect(hitPosition(EAST, at(0), at(420))).toBe("front")
    expect(hitPosition(NORTH, at(0), at(0, 420))).toBe("front")
  })

  test("a blow from directly behind the victim is rear", () => {
    expect(hitPosition(EAST, at(0), at(-420))).toBe("rear")
  })

  test("a blow from the victim's side is flank", () => {
    expect(hitPosition(EAST, at(0), at(0, 420))).toBe("flank")
    expect(hitPosition(EAST, at(0), at(0, -420))).toBe("flank")
  })

  test("the flank sectors are one tunable cosine pair", () => {
    expect(FLANK_COS).toEqual({ num: 1, den: 2 })
  })

  test("a shared centre has no flank", () => {
    expect(hitPosition(EAST, at(0), at(0))).toBe("front")
  })
})

const BOUNDS: ArenaBounds = {
  minX: -4000,
  maxX: 4000,
  minZ: -3000,
  maxZ: 3000,
}

const BOTH_HOLD: readonly [MoveIntent, MoveIntent] = [HOLD, HOLD]

function side(key: string, x: number, facing: Dir2): FighterInit {
  return { key, spd: 10, at: { x, z: 0 }, facing, stats: { atk: 30, def: 20 } }
}

/** Two fighters `distance` mm apart, each facing the other. */
function duel(distance = 420): Fight {
  const half = distance / 2
  return createFight({
    seed: 20261108,
    bounds: BOUNDS,
    fighters: [side("home", -half, EAST), side("away", half, WEST)],
  })
}

/** Advance `steps` times holding still and return the last step's outcome. */
function run(fight: Fight, steps: number): StepResult {
  let last = fight.advance(BOTH_HOLD)
  for (let i = 1; i < steps; i++) last = fight.advance(BOTH_HOLD)
  return last
}

describe("attack lifecycle — commitment (FR-6)", () => {
  test("a strike lands when its active window opens", () => {
    const fight = duel()
    expect(fight.commit(0, "basic")).toBe(true)
    const opening = run(fight, 1)
    expect(fight.state.fighters[0].attack?.phase).toBe("startup")
    expect(opening.strikes).toHaveLength(0)
    // basic: 80 ms startup, so the fourth 20 ms step opens the active window.
    const fourth = run(fight, 3)
    expect(fight.state.fighters[0].attack?.phase).toBe("active")
    expect(fourth.strikes).toHaveLength(1)
    const strike = fourth.strikes[0]
    expect(strike?.attackerKey).toBe("home")
    expect(strike?.targetKey).toBe("away")
    expect(strike?.moveId).toBe("basic")
    expect(strike?.damage).toBeGreaterThan(0)
    expect(strike?.position).toBe("front")
    expect(strike?.counter).toBe(false)
  })

  test("a startup commit can be replaced, an active one cannot", () => {
    const fight = duel()
    fight.commit(0, "basic")
    run(fight, 1)
    expect(fight.commit(0, "spark")).toBe(true)
    expect(fight.state.fighters[0].attack?.moveId).toBe("spark")
    // spark: 130 ms startup, so the seventh 20 ms step opens the active window.
    run(fight, 7)
    expect(fight.state.fighters[0].attack?.phase).toBe("active")
    expect(fight.commit(0, "basic")).toBe(false)
    expect(fight.state.fighters[0].attack?.moveId).toBe("spark")
  })

  test("an unknown move is refused at commit", () => {
    const fight = duel()
    expect(() => fight.commit(0, "nope")).toThrow(/Unknown move/)
  })
})

describe("attack lifecycle — interruption and counters (FR-6, AC-6)", () => {
  test("a hit during startup cancels the attack", () => {
    const fight = duel()
    expect(fight.commit(1, "tectonic_slam")).toBe(true)
    fight.commit(0, "basic")
    const fourth = run(fight, 4)
    expect(fourth.strikes).toHaveLength(1)
    expect(fourth.strikes[0]?.targetKey).toBe("away")
    expect(fourth.strikes[0]?.interrupted).toBe(true)
    expect(fight.state.fighters[1].attack).toBeNull()
  })

  test("a hit during recovery is a counter", () => {
    function recoveryHit(victimCommits: boolean): number {
      const fight = duel()
      if (victimCommits) fight.commit(1, "basic")
      // Seven steps: basic's 80 ms startup and 60 ms active are done, so the
      // victim is in recovery and cannot interrupt the attacker's startup.
      run(fight, 7)
      fight.commit(0, "basic")
      const fourth = run(fight, 4)
      expect(fourth.strikes).toHaveLength(1)
      const strike = fourth.strikes[0]
      expect(strike?.counter).toBe(victimCommits)
      expect(strike?.interrupted).toBe(false)
      return strike?.damage ?? 0
    }
    expect(recoveryHit(true)).toBeGreaterThan(recoveryHit(false))
  })
})

describe("strikes in the step — reach and facing (FR-4, AC-4)", () => {
  test("a strike out of reach does not land", () => {
    const fight = duel(500)
    fight.commit(0, "basic")
    expect(run(fight, 4).strikes).toHaveLength(0)
  })

  test("a strike aimed away does not land", () => {
    const fight = createFight({
      seed: 20261108,
      bounds: BOUNDS,
      fighters: [side("home", -210, WEST), side("away", 210, WEST)],
    })
    fight.commit(0, "basic")
    // The target is 420 mm away, inside reach, but the attacker looks west.
    expect(run(fight, 4).strikes).toHaveLength(0)
  })
})

describe("trades — overlapping active frames (FR-7, AC-7)", () => {
  test("both active frames land in the same step", () => {
    const fight = duel()
    fight.commit(0, "basic")
    fight.commit(1, "basic")
    const fourth = run(fight, 4)
    expect(fourth.strikes).toHaveLength(2)
    const home = fourth.strikes.find((s) => s.attackerKey === "home")
    const away = fourth.strikes.find((s) => s.attackerKey === "away")
    expect(home?.damage).toBeGreaterThan(0)
    expect(away?.damage).toBeGreaterThan(0)
    expect(home?.interrupted).toBe(false)
    expect(away?.interrupted).toBe(false)
    // Neither blow cancelled the other side's already-active frame.
    expect(fight.state.fighters[0].attack?.phase).toBe("active")
    expect(fight.state.fighters[1].attack?.phase).toBe("active")
  })
})

describe("the step — determinism with attacks (NFR-1)", () => {
  test("the attack phase is part of the state hash", () => {
    const idle = duel()
    const armed = duel()
    expect(stateHash(armed.state)).toBe(stateHash(idle.state))
    armed.commit(0, "basic")
    expect(stateHash(armed.state)).not.toBe(stateHash(idle.state))
  })

  test("identical fights replay identical strikes and hashes", () => {
    function replay(): { hashes: number[]; strikes: string[] } {
      const fight = duel()
      fight.commit(0, "basic")
      fight.commit(1, "basic")
      const hashes: number[] = []
      const strikes: string[] = []
      for (let i = 0; i < 30; i++) {
        const outcome = fight.advance(BOTH_HOLD)
        hashes.push(outcome.hash)
        for (const strike of outcome.strikes) {
          strikes.push(
            `${strike.attackerKey}:${strike.moveId}:${strike.damage}`,
          )
        }
      }
      return { hashes, strikes }
    }
    const first = replay()
    expect(replay()).toEqual(first)
    expect(first.strikes.length).toBeGreaterThan(0)
  })
})
