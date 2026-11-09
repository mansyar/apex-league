/**
 * Contact geometry (Continuous Arena Battle FR-17, FR-18, FR-19, AC-17,
 * AC-18, AC-19): body volumes, height bands, swept segments, body separation,
 * and the bounded lock-on turn.
 */

import { describe, expect, test } from "bun:test"
import {
  type Body,
  bandOverlapsBody,
  bodyOf,
  DEFAULT_BODY_HEIGHT_MM,
  faceOpponent,
  integerSqrt,
  reachesBody,
  segmentGapSq,
  segmentHitsBody,
  separateBodies,
  TURN_ACTIVE_UNITS_PER_STEP,
  TURN_HITSTUN_UNITS_PER_STEP,
  TURN_RECOVERY_UNITS_PER_STEP,
  TURN_STARTUP_UNITS_PER_STEP,
  TURN_UNITS_PER_STEP,
  turnBudget,
  turnToward,
} from "./contact"
import { createFight, type FighterInit } from "./step"
import { hitPosition } from "./strike"
import type { ArenaBounds, Dir2, Vec3 } from "./types"

const BOUNDS: ArenaBounds = {
  minX: -4000,
  maxX: 4000,
  minZ: -3000,
  maxZ: 3000,
}

const EAST: Dir2 = { x: 1000, z: 0 }
const WEST: Dir2 = { x: -1000, z: 0 }

function at(x: number, z = 0): Vec3 {
  return { x, y: 0, z }
}

function body(x: number, z = 0, radiusMm = 220, heightMm = 900): Body {
  return { pos: at(x, z), radiusMm, heightMm }
}

function side(
  key: string,
  x: number,
  facing: Dir2,
  extra: Partial<FighterInit> = {},
): FighterInit {
  return {
    key,
    spd: 10,
    at: { x, z: 0 },
    facing,
    stats: { atk: 30, def: 20 },
    ...extra,
  }
}

function duel(extra: Partial<FighterInit> = {}) {
  return createFight({
    seed: 20261108,
    bounds: BOUNDS,
    fighters: [side("home", -210, WEST, extra), side("away", 210, WEST)],
  })
}

describe("body volume — height bands (FR-17, AC-17)", () => {
  test("a tall body is hit by a high band", () => {
    expect(bandOverlapsBody({ fromMm: 700, toMm: 1500 }, 1500)).toBe(true)
    expect(bandOverlapsBody({ fromMm: 700, toMm: 1500 }, 1250)).toBe(true)
  })

  test("a short body is missed by a band above its height", () => {
    expect(bandOverlapsBody({ fromMm: 700, toMm: 1500 }, 650)).toBe(false)
    expect(bandOverlapsBody({ fromMm: 700, toMm: 1500 }, 700)).toBe(false)
  })

  test("a standing body always overlaps a floor-level band", () => {
    expect(bandOverlapsBody({ fromMm: 0, toMm: 600 }, 1500)).toBe(true)
    expect(bandOverlapsBody({ fromMm: 0, toMm: 600 }, 200)).toBe(true)
  })

  test("a band starting above the head never connects", () => {
    expect(bandOverlapsBody({ fromMm: 900, toMm: 1200 }, 899)).toBe(false)
  })
})

describe("body volume — reach is edge to edge (FR-18)", () => {
  test("two radii come off the gap", () => {
    expect(reachesBody(body(0), body(860), 420)).toBe(true)
    expect(reachesBody(body(0), body(861), 420)).toBe(false)
    expect(reachesBody(body(0, 0, 100), body(620, 0, 100), 420)).toBe(true)
  })

  test("a blow cannot reach a body it is not touching", () => {
    expect(reachesBody(body(0), body(1000), 420)).toBe(false)
  })
})

describe("swept segments — projectiles cannot tunnel (FR-19, AC-19)", () => {
  test("a point on the segment is at zero distance", () => {
    expect(segmentGapSq(at(0), at(480), at(240))).toBe(0)
  })

  test("perpendicular distance is the cross product, squared", () => {
    expect(segmentGapSq(at(0), at(480), at(240, 300))).toBe(300 * 300)
  })

  test("a point beyond the end measures from the end", () => {
    expect(segmentGapSq(at(0), at(480), at(600))).toBe(120 * 120)
  })

  test("a sweep through the body hits even when both samples are outside", () => {
    const target = body(350, 0, 100)
    expect(
      segmentHitsBody(at(240), at(480), target, { fromMm: 0, toMm: 600 }),
    ).toBe(true)
    // The same two samples, tested as points, would both miss.
    expect(segmentGapSq(at(240), at(240), target.pos)).toBeGreaterThan(
      100 * 100,
    )
    expect(segmentGapSq(at(480), at(480), target.pos)).toBeGreaterThan(
      100 * 100,
    )
  })

  test("a sweep that passes wide misses", () => {
    const target = body(350, 300)
    expect(
      segmentHitsBody(at(240), at(480), target, { fromMm: 0, toMm: 600 }),
    ).toBe(false)
  })

  test("a sweep under a band that starts above the body misses", () => {
    const short = body(350, 0, 100, 600)
    expect(
      segmentHitsBody(at(240), at(480), short, { fromMm: 700, toMm: 1500 }),
    ).toBe(false)
    expect(
      segmentHitsBody(at(240), at(480), short, { fromMm: 150, toMm: 1100 }),
    ).toBe(true)
  })
})

describe("body separation — a clinch keeps a gap (FR-17)", () => {
  function pair(homeX: number, awayX: number, radiusMm = 220) {
    return [
      { ...duel().state.fighters[0], pos: at(homeX), radiusMm },
      { ...duel().state.fighters[1], pos: at(awayX), radiusMm },
    ] as const
  }

  test("overlapping centres push apart to the sum of the radii", () => {
    const [home, away] = separateBodies(pair(0, 100), BOUNDS)
    const gap = away.pos.x - home.pos.x
    expect(integerSqrt(gap * gap)).toBe(440)
    expect(home.pos.x).toBeLessThan(0)
    expect(away.pos.x).toBeGreaterThan(100)
  })

  test("a shared centre splits deterministically on x", () => {
    const [home, away] = separateBodies(pair(0, 0), BOUNDS)
    expect(home.pos.x).toBe(-220)
    expect(away.pos.x).toBe(220)
    const again = separateBodies(pair(0, 0), BOUNDS)
    expect(again[0].pos).toEqual(home.pos)
    expect(again[1].pos).toEqual(away.pos)
  })

  test("separated bodies are left alone and do not oscillate", () => {
    const clear = pair(0, 440)
    const once = separateBodies(clear, BOUNDS)
    expect(once[0].pos).toEqual(clear[0].pos)
    expect(once[1].pos).toEqual(clear[1].pos)
    expect(separateBodies(once, BOUNDS)).toBe(once)
  })

  test("a cornered body gives ground only as far as the wall allows", () => {
    const corner: ArenaBounds = {
      minX: -4000,
      maxX: 0,
      minZ: -3000,
      maxZ: 3000,
    }
    const [home, away] = separateBodies(pair(0, 0), corner)
    expect(home.pos.x).toBeGreaterThanOrEqual(corner.minX)
    expect(away.pos.x).toBe(0)
  })
})

describe("facing — limited by what the body is doing (FR-11, AC-11)", () => {
  const fighter = (
    phase: "startup" | "active" | "recovery" | null,
    hitstunMs = 0,
  ) => {
    const base = duel().state.fighters[0]
    return {
      ...base,
      hitstunMs,
      attack: phase
        ? { moveId: "basic", phase, elapsedMs: 0, landed: false }
        : null,
    }
  }

  test("each state has its own turn budget", () => {
    expect(turnBudget(fighter(null))).toBe(TURN_UNITS_PER_STEP)
    expect(turnBudget(fighter("startup"))).toBe(TURN_STARTUP_UNITS_PER_STEP)
    expect(turnBudget(fighter("active"))).toBe(TURN_ACTIVE_UNITS_PER_STEP)
    expect(turnBudget(fighter("recovery"))).toBe(TURN_RECOVERY_UNITS_PER_STEP)
    expect(turnBudget(fighter(null, 20))).toBe(TURN_HITSTUN_UNITS_PER_STEP)
    expect(TURN_ACTIVE_UNITS_PER_STEP).toBe(0)
    expect(TURN_HITSTUN_UNITS_PER_STEP).toBe(0)
    expect(TURN_STARTUP_UNITS_PER_STEP).toBeGreaterThan(0)
    expect(TURN_STARTUP_UNITS_PER_STEP).toBeLessThan(TURN_UNITS_PER_STEP)
    expect(TURN_RECOVERY_UNITS_PER_STEP).toBe(TURN_STARTUP_UNITS_PER_STEP)
  })

  test("an active swing cannot pivot, and neither can hitstun", () => {
    for (const state of [fighter("active"), fighter(null, 20)]) {
      const previous = [state, state] as const
      const moved = [
        { ...state, pos: at(0) },
        { ...state, pos: at(0, 500) },
      ] as const
      const [turned] = faceOpponent(moved, previous)
      expect(turned.facing).toEqual(state.facing)
    }
  })

  test("startup and recovery turn less than a free body", () => {
    const free = fighter(null)
    const startup = fighter("startup")
    const moved = [
      { ...free, pos: at(0) },
      { ...free, pos: at(0, 500) },
    ] as const
    const previous = [free, free] as const
    const [freeTurned] = faceOpponent(moved, previous)
    const [startupTurned] = faceOpponent(
      [{ ...startup, pos: at(0) }, moved[1]] as const,
      [startup, startup] as const,
    )
    expect(freeTurned.facing).not.toEqual(free.facing)
    expect(startupTurned.facing).not.toEqual(startup.facing)
    expect(startupTurned.facing).not.toEqual(freeTurned.facing)
    expect(Math.abs(startupTurned.facing.z)).toBeLessThan(
      Math.abs(freeTurned.facing.z),
    )
  })
})

describe("facing — a bounded lock-on turn (FR-4, T2.3)", () => {
  test("the turn rate is one exported tunable", () => {
    expect(TURN_UNITS_PER_STEP).toBeGreaterThan(0)
    expect(TURN_UNITS_PER_STEP).toBeLessThan(1000)
  })

  test("a facing turns toward a point by one step at a time", () => {
    const turned = turnToward(EAST, at(0), at(0, 1000))
    expect(turned.x).toBeGreaterThan(0)
    expect(turned.z).toBeGreaterThan(0)
    expect(turned.z).toBeLessThan(200)
  })

  test("a target inside one step is snapped to exactly", () => {
    expect(turnToward(EAST, at(0), at(1000, 20))).toEqual({ x: 1000, z: 20 })
  })

  test("a stationary fighter ends up facing its opponent", () => {
    const fight = duel()
    let state = fight.state
    // Starting back-to-front, the guard has to turn a full half circle at the
    // bounded rate (~2 s at 50 units per step), then snap onto the opponent.
    for (let step = 0; step < 120; step++) {
      state = fight.advance([
        { x: 0, z: 0 },
        { x: 0, z: 0 },
      ]).state
    }
    expect(state.fighters[0].facing).toEqual(EAST)
  })

  test("a fast circler can still be hit in the flank", () => {
    const fight = createFight({
      seed: 20261108,
      bounds: BOUNDS,
      fighters: [side("home", 0, EAST), side("away", 0, EAST)],
    })
    const circling = [
      { ...fight.state.fighters[0], pos: at(0) },
      { ...fight.state.fighters[1], pos: at(0, 420) },
    ] as const
    const [turned] = faceOpponent(circling, circling)
    // The victim faces east; a body at 90° is only turned toward, not tracked.
    expect(hitPosition(turned.facing, turned.pos, at(0, 420))).toBe("flank")
  })

  test("a strafe no longer turns the body away from the foe", () => {
    const fight = createFight({
      seed: 20261108,
      bounds: BOUNDS,
      fighters: [side("home", -210, EAST), side("away", 210, WEST)],
    })
    // The order moves the body north; the guard stays on the opponent east.
    const state = fight.advance([
      { x: 0, z: 1000 },
      { x: 0, z: 0 },
    ]).state
    expect(state.fighters[0].pos.z).toBeGreaterThan(0)
    expect(state.fighters[0].facing.x).toBe(1000)
    expect(Math.abs(state.fighters[0].facing.z)).toBeLessThan(50)
  })

  test("the default body height is the middle of the roster", () => {
    expect(DEFAULT_BODY_HEIGHT_MM).toBe(900)
    expect(bodyOf(duel().state.fighters[0]).heightMm).toBe(
      DEFAULT_BODY_HEIGHT_MM,
    )
  })
})
