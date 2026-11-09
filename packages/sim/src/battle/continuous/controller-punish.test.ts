/**
 * Punish timing and the stamina reserve (FR-14, AC-14).
 *
 * A window is a recovery or a poise break. The commitment is timed for it: a
 * move whose startup plus travel would land after the window closes is not a
 * punish, however hard it hits. The pool keeps one minimum-price blow back
 * while the foe is one hit from breaking, and only then.
 */

import { describe, expect, test } from "bun:test"
import { decide } from "./controller"
import type { PatternMemory } from "./controller-memory"
import { DOCTRINES, profileForDoctrine } from "./controller-profile"
import {
  PUNISH_RESERVE_STAMINA,
  punishMove,
  punishWindow,
  whiffStep,
  windowMs,
} from "./controller-punish"
import { createController } from "./controller-state"
import { createFight } from "./step"
import type { FighterState, FightState } from "./types"

const BOUNDS = { minX: -4000, maxX: 4000, minZ: -3000, maxZ: 3000 }
const KIT = ["spark", "blaze_bolt"]
const EMPTY: PatternMemory = { dodgeSign: 0, openingMove: null, untilMs: 0 }

function arena(gap = 1500) {
  const fight = createFight({
    seed: 13,
    bounds: BOUNDS,
    fighters: [
      { key: "home", spd: 10, at: { x: 0, z: 0 } },
      { key: "away", spd: 10, at: { x: -gap, z: 0 } },
    ],
  })
  return {
    fight,
    me: fight.state.fighters[0],
    foe: fight.state.fighters[1],
  }
}

function withFoe(state: FightState, foe: FighterState): FightState {
  return { ...state, fighters: [state.fighters[0], foe] }
}

function recovering(
  foe: FighterState,
  moveId: string,
  elapsedMs: number,
): FighterState {
  return {
    ...foe,
    attack: { moveId, phase: "recovery", elapsedMs, landed: true },
  }
}

describe("the punish window", () => {
  test("a recovery or a poise break is open; a walk is not", () => {
    const { foe } = arena()
    expect(punishWindow(foe)).toBe(false)
    expect(punishWindow(recovering(foe, "basic", 0))).toBe(true)
    expect(punishWindow({ ...foe, poiseBreakMs: 600 })).toBe(true)
  })

  test("the window is what is left of the recovery, or the break", () => {
    const { foe } = arena()
    expect(windowMs(foe)).toBe(0)
    // blaze_bolt recovers for 1,234 ms at spd 10.
    expect(windowMs(recovering(foe, "blaze_bolt", 900))).toBe(334)
    expect(windowMs({ ...foe, poiseBreakMs: 600 })).toBe(600)
  })

  test("a move that lands after the window is not a punish", () => {
    const { fight, foe } = arena()
    const input = (state: FightState) => ({
      state,
      side: 0 as const,
      controller: createController(),
      profile: profileForDoctrine(DOCTRINES.counter, "obedient"),
      kit: KIT,
    })
    // 70 ms of window: blaze_bolt's 560 ms startup does not fit.
    expect(
      punishMove(
        input(withFoe(fight.state, recovering(foe, "blaze_bolt", 950))),
        1500 * 1500,
        EMPTY,
      ),
    ).toBeNull()
    // 1,020 ms of window: it does.
    expect(
      punishMove(
        input(withFoe(fight.state, recovering(foe, "blaze_bolt", 0))),
        1500 * 1500,
        EMPTY,
      ),
    ).toBe("blaze_bolt")
  })
})

describe("the stamina reserve (AC-14)", () => {
  const press = profileForDoctrine(DOCTRINES.press, "obedient")

  function order(stamina: number, poise: number, breakMs = 0) {
    const { fight, me, foe } = arena(1100)
    const state: FightState = {
      ...fight.state,
      fighters: [
        { ...me, stamina },
        { ...foe, poise, poiseBreakMs: breakMs },
      ],
    }
    return decide({
      state,
      side: 0,
      controller: createController(),
      profile: press,
      kit: ["spark"],
    })
  }

  test("the pool is not spent while the foe is one blow from breaking", () => {
    // spark costs 8; 10 - 8 = 2 leaves less than the 6-point reserve.
    const held = order(10, 4)
    expect(held.verb).toBe("advance")
    expect(held.commit).toBeNull()
    expect(PUNISH_RESERVE_STAMINA).toBe(6)
  })

  test("the same pool commits when no break is near", () => {
    const free = order(10, 20)
    expect(free.verb).toBe("commit")
    expect(free.commit).toBe("spark")
  })

  test("a window already open is spent into, not hoarded for", () => {
    const open = order(10, 0, 600)
    expect(open.verb).toBe("commit")
    expect(open.commit).toBe("spark")
  })

  test("a pool that can cover the reserve still commits", () => {
    const rich = order(20, 4)
    expect(rich.commit).toBe("spark")
  })
})

describe("stepping out of a whiff", () => {
  test("a swing a walk can clear is left; one that cannot is not", () => {
    const { me, foe } = arena(860)
    const swing: FighterState = {
      ...foe,
      attack: {
        moveId: "basic",
        phase: "startup",
        elapsedMs: 0,
        landed: false,
      },
    }
    expect(whiffStep(me, swing, 860 * 860)).not.toBeNull()
    // Out of the strike's reach already: no order needed.
    const far = arena(2000)
    const farSwing: FighterState = {
      ...far.foe,
      attack: {
        moveId: "basic",
        phase: "startup",
        elapsedMs: 0,
        landed: false,
      },
    }
    expect(whiffStep(far.me, farSwing, 2000 * 2000)).toBeNull()
  })
})
