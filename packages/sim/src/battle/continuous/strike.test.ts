/**
 * Strikes in space (Continuous Arena Battle FR-4, FR-17, FR-18, AC-4,
 * AC-17, AC-18): edge-to-edge reach over real body volumes, a front arc that a
 * strike aimed away fails, the front/flank/rear classification the positional
 * bonus reads, and one blow per swing.
 */

import { describe, expect, test } from "bun:test"
import { getFrameData } from "../frames"
import { type Body, bodyOf, reachesBody } from "./contact"
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
  recoveryMsFor,
  resolveStrikes,
  type StrikeStats,
  typeAgainst,
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

/** A body at `x`, one radius wide by default. */
function body(x: number, radiusMm = 220, heightMm = 900): Body {
  return { pos: at(x), radiusMm, heightMm }
}

describe("strike reach — surface to surface, integer (FR-18)", () => {
  test("two default bodies touch when their centres are two radii plus reach apart", () => {
    expect(reachesBody(body(0), body(860), 420)).toBe(true)
    expect(reachesBody(body(0), body(861), 420)).toBe(false)
  })

  test("a smaller body shortens the gap the blow has to cross", () => {
    expect(reachesBody(body(0, 100), body(620, 100), 420)).toBe(true)
    expect(reachesBody(body(0, 100), body(621, 100), 420)).toBe(false)
  })

  test("reach is planar distance, not per axis", () => {
    // 516-688-860 is a 3-4-5 triangle scaled by 172: exactly two radii + reach.
    expect(reachesBody(body(0), { ...body(0), pos: at(516, 688) }, 420)).toBe(
      true,
    )
    expect(reachesBody(body(0), { ...body(0), pos: at(517, 688) }, 420)).toBe(
      false,
    )
  })

  test("a target behind the attacker is still in reach", () => {
    expect(reachesBody(body(0), body(-860), 420)).toBe(true)
  })

  test("a body's own radius counts, not the factory default", () => {
    const big = body(0, 300)
    expect(reachesBody(big, body(1020, 300), 420)).toBe(true)
    expect(reachesBody(big, body(1021, 300), 420)).toBe(false)
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

/** The away side backs off; the home side holds. */
const BACK_OFF: readonly [MoveIntent, MoveIntent] = [HOLD, { x: 1000, z: 0 }]

/** The away side walks in; the home side holds. */
const CLOSE: readonly [MoveIntent, MoveIntent] = [HOLD, { x: -1000, z: 0 }]

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
    // basic: 160 ms startup, so the eighth 20 ms step opens the active window.
    const eighth = run(fight, 7)
    expect(fight.state.fighters[0].attack?.phase).toBe("active")
    expect(eighth.strikes).toHaveLength(1)
    const strike = eighth.strikes[0]
    expect(strike?.attackerKey).toBe("home")
    expect(strike?.targetKey).toBe("away")
    expect(strike?.moveId).toBe("basic")
    expect(strike?.damage).toBeGreaterThan(0)
    expect(strike?.position).toBe("front")
    expect(strike?.counter).toBe(false)
  })

  test("one swing lands one blow across its whole active window", () => {
    const fight = duel()
    fight.commit(0, "basic")
    // basic: 160 ms startup, so the eighth step opens a 120 ms active window.
    const eighth = run(fight, 8)
    expect(eighth.strikes).toHaveLength(1)
    // The window stays open at the top of five more steps and closes on the
    // sixth: six chances to land, and `AttackState.landed` takes them all. A
    // longer active window must still be exactly one blow per swing.
    let extra = 0
    for (let step = 0; step < 5; step++) {
      extra += fight.advance(BOTH_HOLD).strikes.length
      expect(fight.state.fighters[0].attack?.phase).toBe("active")
    }
    expect(fight.state.fighters[0].attack?.landed).toBe(true)
    extra += fight.advance(BOTH_HOLD).strikes.length
    expect(extra).toBe(0)
    expect(fight.state.fighters[0].attack?.phase).toBe("recovery")
  })

  test("a startup commit can be replaced, an active one cannot", () => {
    const fight = duel()
    fight.commit(0, "basic")
    run(fight, 1)
    expect(fight.commit(0, "spark")).toBe(true)
    expect(fight.state.fighters[0].attack?.moveId).toBe("spark")
    // spark: 260 ms startup, so the thirteenth 20 ms step opens the active window.
    run(fight, 13)
    expect(fight.state.fighters[0].attack?.phase).toBe("active")
    expect(fight.commit(0, "basic")).toBe(false)
    expect(fight.state.fighters[0].attack?.moveId).toBe("spark")
  })

  test("an unknown move is refused at commit", () => {
    const fight = duel()
    expect(() => fight.commit(0, "nope")).toThrow(/Unknown move/)
  })
})

describe("recovery — scaled inversely by spd (FR-5)", () => {
  test("a faster fighter recovers faster than the reference", () => {
    const basic = getFrameData("basic")
    if (!basic) throw new Error("basic is missing")
    // basic authors 606 ms of recovery (the Phase 8 authored scale); the
    // reference speed is 10.
    expect(recoveryMsFor(basic, 5)).toBe(1212)
    expect(recoveryMsFor(basic, 10)).toBe(606)
    expect(recoveryMsFor(basic, 20)).toBe(303)
  })

  test("a non-positive speed or a zero-length result is rejected", () => {
    const basic = getFrameData("basic")
    if (!basic) throw new Error("basic is missing")
    expect(() => recoveryMsFor(basic, 0)).toThrow(/positive spd/)
    expect(() => recoveryMsFor(basic, -5)).toThrow(/positive spd/)
    // 500 * 10 / 8000 truncates to zero: that would be a free attack.
    expect(() => recoveryMsFor(basic, 8000)).toThrow(/zero or below/)
  })

  test("the difference is measurable in a fight, not just arithmetic", () => {
    function stepsToRecover(spd: number): number {
      const fight = createFight({
        seed: 20261108,
        bounds: BOUNDS,
        fighters: [
          { ...side("home", -210, EAST), spd },
          side("away", 210, WEST),
        ],
      })
      fight.commit(0, "basic")
      let steps = 0
      while (fight.state.fighters[0].attack !== null && steps < 100) {
        fight.advance(BOTH_HOLD)
        steps++
      }
      return steps
    }
    expect(stepsToRecover(20)).toBeLessThan(stepsToRecover(10))
  })
})

describe("attack lifecycle — interruption and counters (FR-6, AC-6)", () => {
  test("a hit during startup cancels the attack", () => {
    const fight = duel()
    expect(fight.commit(1, "tectonic_slam")).toBe(true)
    fight.commit(0, "basic")
    const eighth = run(fight, 8)
    expect(eighth.strikes).toHaveLength(1)
    expect(eighth.strikes[0]?.targetKey).toBe("away")
    expect(eighth.strikes[0]?.interrupted).toBe(true)
    expect(fight.state.fighters[1].attack).toBeNull()
  })

  test("a blow on the victim's final startup step interrupts (AC-6)", () => {
    // The victim faces away and the turn rate is too slow to swing it round in
    // eight steps, so its own blow cannot land on the step its window opens:
    // the attacker's blow lands alone and cancels the swing.
    const fight = createFight({
      seed: 20261108,
      bounds: BOUNDS,
      fighters: [side("home", -210, EAST), side("away", 210, EAST)],
    })
    fight.commit(1, "basic")
    // basic's 160 ms startup is steps one to eight: the eighth step ends it,
    // and the attacker's blow lands inside that same step, so the victim was
    // still winding up at the top of it.
    fight.commit(0, "basic")
    const eighth = run(fight, 8)
    const blow = eighth.strikes.find((s) => s.attackerKey === "home")
    expect(blow?.targetKey).toBe("away")
    expect(blow?.interrupted).toBe(true)
    expect(blow?.counter).toBe(false)
    expect(fight.state.fighters[1].attack).toBeNull()
  })

  test("a hit during recovery is a counter", () => {
    function recoveryHit(victimCommits: boolean): number {
      const fight = duel()
      if (victimCommits) fight.commit(1, "basic")
      // Fourteen steps: basic's 160 ms startup and 120 ms active are done, so
      // the victim is in recovery and cannot interrupt the attacker's startup.
      // Step fourteen is the one that clears the hitstun the victim's blow
      // left on the attacker (FR-23), which would otherwise refuse the commit.
      run(fight, 14)
      fight.commit(0, "basic")
      const eighth = run(fight, 8)
      expect(eighth.strikes).toHaveLength(1)
      const strike = eighth.strikes[0]
      expect(strike?.counter).toBe(victimCommits)
      expect(strike?.interrupted).toBe(false)
      return strike?.damage ?? 0
    }
    expect(recoveryHit(true)).toBeGreaterThan(recoveryHit(false))
  })
})

describe("strikes in the step — reach and facing (FR-4, FR-18, AC-4)", () => {
  test("a strike out of reach does not land", () => {
    const fight = duel(900)
    fight.commit(0, "basic")
    expect(run(fight, 8).strikes).toHaveLength(0)
  })

  test("a strike aimed away does not land", () => {
    const fight = createFight({
      seed: 20261108,
      bounds: BOUNDS,
      fighters: [side("home", -210, WEST), side("away", 210, WEST)],
    })
    fight.commit(0, "basic")
    // The target is 420 mm away, inside reach, but the attacker looks west.
    expect(run(fight, 8).strikes).toHaveLength(0)
  })

  test("the same swing lands when the victim stands still (AC-18)", () => {
    const fight = duel(860)
    fight.commit(0, "basic")
    expect(run(fight, 8).strikes).toHaveLength(1)
  })

  test("a victim who steps out of reach turns the swing into a whiff (AC-18)", () => {
    const fight = duel(860)
    fight.commit(0, "basic")
    let whiffs = 0
    let strikes = 0
    for (let step = 0; step < 21; step++) {
      const result = fight.advance(BACK_OFF)
      whiffs += result.whiffs.length
      strikes += result.strikes.length
    }
    expect(strikes).toBe(0)
    expect(whiffs).toBe(1)
    expect(fight.state.fighters[0].attack?.phase).toBe("recovery")
  })

  test("a landed swing reports no whiff", () => {
    const fight = duel(860)
    fight.commit(0, "basic")
    let whiffs = 0
    for (let step = 0; step < 21; step++)
      whiffs += fight.advance(BOTH_HOLD).whiffs.length
    expect(whiffs).toBe(0)
  })

  test("the final active step is still a strike test (FR-18)", () => {
    // basic's window is [160, 280) ms — the eighth step ends startup and steps
    // nine to fourteen are active — and step fourteen is the one a post-advance
    // gate never tested: the phase has already flipped to recovery when the step
    // ends. A victim that walks in from outside reach can therefore land no
    // later than step fourteen; if the gate read the post-advance phase instead
    // of the snapshot, the latest possible landing would be step thirteen.
    let latest = -1
    for (let gap = 880; gap < 1600; gap += 10) {
      const fight = duel(gap)
      fight.commit(0, "basic")
      for (let step = 1; step <= 24; step++) {
        if (fight.advance(CLOSE).strikes.length > 0) {
          latest = Math.max(latest, step)
          break
        }
      }
    }
    expect(latest).toBe(14)
  })
})

describe("the range miss — inside the inner edge (FR-2, FR-5, AC-2)", () => {
  // A fixed RNG: every accuracy roll passes and no spread is subtracted, so a
  // miss here can only come from the geometry.
  const SURE = { next: () => 0, int: () => 0, cursor: () => 0 }
  const STATS: readonly [StrikeStats, StrikeStats] = [
    { atk: 30, def: 20 },
    { atk: 30, def: 20 },
  ]

  /** The home side's basic swing, live, against a body `gap` mm away. */
  function swing(gap: number): ReturnType<typeof resolveStrikes> {
    const fight = duel()
    const [home, away] = fight.state.fighters
    const attack = {
      moveId: "basic",
      phase: "active" as const,
      elapsedMs: 0,
      landed: false,
    }
    const attacker = { ...home, pos: at(0), facing: EAST, attack }
    const target = { ...away, pos: at(gap), facing: WEST }
    return resolveStrikes([attacker, target], [attacker, target], STATS, SURE)
  }

  test("a blow lands at the inner edge of the move", () => {
    // The innate strike authors no minimum, so its inner edge is the contact
    // floor: two radii, 440 mm.
    const result = swing(440)
    expect(result.strikes).toHaveLength(1)
    expect(result.misses).toHaveLength(0)
  })

  test("one millimetre inside it reports a range miss, not an accuracy miss", () => {
    const result = swing(439)
    expect(result.strikes).toHaveLength(0)
    expect(result.misses).toHaveLength(1)
    expect(result.misses[0]?.reason).toBe("range")
  })
})

describe("trades — overlapping active frames (FR-7, AC-7)", () => {
  test("both active frames land in the same step", () => {
    const fight = duel()
    fight.commit(0, "basic")
    fight.commit(1, "basic")
    const eighth = run(fight, 8)
    expect(eighth.strikes).toHaveLength(2)
    const home = eighth.strikes.find((s) => s.attackerKey === "home")
    const away = eighth.strikes.find((s) => s.attackerKey === "away")
    expect(home?.damage).toBeGreaterThan(0)
    expect(away?.damage).toBeGreaterThan(0)
    // Step eight opens both windows and ends both startups, so each blow
    // lands on the other side's final startup step. Both blows register and
    // both swings trade, so neither is cancelled (FR-6, FR-7, AC-7).
    expect(home?.interrupted).toBe(true)
    expect(away?.interrupted).toBe(true)
    expect(fight.state.fighters[0].attack?.phase).toBe("active")
    expect(fight.state.fighters[1].attack?.phase).toBe("active")
    expect(fight.state.fighters[0].attack?.landed).toBe(true)
    expect(fight.state.fighters[1].attack?.landed).toBe(true)
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

  test("the body volume is part of the state hash", () => {
    const plain = duel()
    const tall = createFight({
      seed: 20261108,
      bounds: BOUNDS,
      fighters: [
        { ...side("home", -210, EAST), heightMm: 1300 },
        side("away", 210, WEST),
      ],
    })
    expect(stateHash(tall.state)).not.toBe(stateHash(plain.state))
  })

  test("the facing the lock-on turn produces is in the state hash", () => {
    const fight = duel()
    run(fight, 5)
    const turned = fight.state.fighters[0]
    expect(stateHash(fight.state)).not.toBe(
      stateHash({
        ...fight.state,
        fighters: [
          { ...turned, facing: { x: turned.facing.z, z: -turned.facing.x } },
          fight.state.fighters[1],
        ],
      }),
    )
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

describe("body volumes reach the step (FR-17)", () => {
  test("the factory seeds a default body and keeps an authored one", () => {
    const fight = duel()
    const [home, away] = fight.state.fighters
    expect(bodyOf(home)).toEqual({
      pos: home.pos,
      radiusMm: 220,
      heightMm: 900,
    })
    expect(bodyOf(away).radiusMm).toBe(220)
    const custom = createFight({
      seed: 20261108,
      bounds: BOUNDS,
      fighters: [
        { ...side("home", -210, EAST), radiusMm: 300, heightMm: 1200 },
        side("away", 210, WEST),
      ],
    })
    expect(custom.state.fighters[0].radiusMm).toBe(300)
    expect(custom.state.fighters[0].heightMm).toBe(1200)
  })

  test("a wider body shortens the gap its blow has to cross", () => {
    const wide = createFight({
      seed: 20261108,
      bounds: BOUNDS,
      fighters: [
        { ...side("home", -430, EAST), radiusMm: 300 },
        { ...side("away", 430, WEST), radiusMm: 300 },
      ],
    })
    wide.commit(0, "basic")
    // 860 mm of centres: two 300 mm radii leave 260 mm, inside 420 mm reach.
    expect(run(wide, 8).strikes).toHaveLength(1)
  })
})

describe("type identity — the secondary element (FR-4, FR-8, T4.1)", () => {
  test("a secondary that resists the incoming type collapses the pair to neutral", () => {
    // Fire beats plant; a water secondary resists fire, so the hit is neutral.
    expect(
      typeAgainst(
        { atk: 30, def: 20, element: "fire" },
        { atk: 30, def: 20, element: "plant", affinity: "water" },
      ),
    ).toEqual({ num: 1, den: 1 })
  })

  test("a secondary that does not resist leaves the weakness intact", () => {
    expect(
      typeAgainst(
        { atk: 30, def: 20, element: "fire" },
        { atk: 30, def: 20, element: "plant", affinity: "wind" },
      ),
    ).toEqual({ num: 3, den: 2 })
  })
})
