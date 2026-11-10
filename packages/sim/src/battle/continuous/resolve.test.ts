/**
 * The continuous resolver's contract: the endings the spec names (FR-12,
 * AC-12) and the `BattleResult` shape the cup and the arena already consume.
 *
 * Every test drives the public entry point or a pure judge, so what is pinned
 * is what the game sees: a KO, a double KO, and the cap's ranking order.
 */

import { describe, expect, test } from "bun:test"
import type { BattleEvent } from "../clock"
import type { BattleSide } from "../resolver"
import {
  ARENA_BOUNDS,
  downEnding,
  FIGHT_CAP_MS,
  pointsWinner,
  resolveContinuous,
} from "./resolve"
import { createFight } from "./step"
import type { FightState } from "./types"

/** A side with every field filled, so a test only names what it changes. */
function side(over: Partial<BattleSide> = {}): BattleSide {
  return {
    name: "Ember",
    id: "ember",
    element: "fire",
    stats: { hp: 80, atk: 10, def: 8, spd: 10 },
    kit: ["spark", "flare_dart"],
    tactic: "balanced",
    temperament: "rush",
    ...over,
  }
}

/** A live state to judge: both sides at rest, a metre either side of centre. */
function state(): FightState {
  return createFight({
    seed: 7,
    bounds: ARENA_BOUNDS,
    fighters: [
      { key: "a", spd: 10, at: { x: -1000, z: 0 }, hp: 100 },
      { key: "b", spd: 10, at: { x: 1000, z: 0 }, hp: 100 },
    ],
  }).state
}

/** The same state with both pools forced, for the judge's arithmetic. */
function judged(hp: [number, number], hpMax: [number, number]): FightState {
  const open = state()
  return {
    ...open,
    fighters: [
      { ...open.fighters[0], hp: hp[0], hpMax: hpMax[0] },
      { ...open.fighters[1], hp: hp[1], hpMax: hpMax[1] },
    ],
  }
}

/** One key's HP, or a failure: the map is open-ended, the key is not. */
function hpOf(hp: Readonly<Record<string, number>>, key: string): number {
  const value = hp[key]
  if (value === undefined) throw new Error(`no hp for ${key}`)
  return value
}

/** The last beat of a log, or a failure: a fight always logs an ending. */
function lastEvent(events: readonly BattleEvent[]): BattleEvent {
  const event = events[events.length - 1]
  if (!event) throw new Error("the fight logged no events")
  return event
}

describe("resolveContinuous — the fight's endings", () => {
  test("a KO names the survivor and leaves the loser at zero HP", () => {
    const strong = side({ name: "Ember", id: "ember" })
    const frail = side({
      name: "Reed",
      id: "reed",
      element: "plant",
      stats: { hp: 1, atk: 1, def: 1, spd: 1 },
    })
    const result = resolveContinuous(strong, frail, 22)
    expect(result.reason).toBe("ko")
    expect(result.winner).toBe("Ember")
    expect(Object.keys(result.finalHp).sort()).toEqual(["ember", "reed"])
    expect(hpOf(result.finalHp, "reed")).toBe(0)
    expect(hpOf(result.finalHp, "ember")).toBeGreaterThan(0)
  })

  test("the down beat carries the real HP, not a placeholder", () => {
    const strong = side({ name: "Ember", id: "ember" })
    const frail = side({
      name: "Reed",
      id: "reed",
      stats: { hp: 1, atk: 1, def: 1, spd: 1 },
    })
    const result = resolveContinuous(strong, frail, 22)
    const down = result.events.find(
      (event) => event.kind === "down" && event.actor === "Reed",
    )
    if (!down) throw new Error("the fight logged no down beat")
    expect(hpOf(down.hpAfter, "reed")).toBe(0)
    expect(hpOf(down.hpAfter, "ember")).toBeGreaterThan(0)
    expect(hpOf(result.finalHp, "reed")).toBe(0)
  })

  test("a mirror keeps two sides in the result (FR-12)", () => {
    // Both sides answer to the same key, so the fight's own key for side 1 is
    // suffixed. `finalHp` and the log are filed under those keys, not under
    // the two identical contract keys, so nothing collapses.
    const mirror = side({ name: "Ember", id: "ember", kit: ["basic"] })
    const result = resolveContinuous(mirror, mirror, 3)
    expect(Object.keys(result.finalHp).sort()).toEqual(["ember", "ember#1"])
    const keys = new Set(result.events.map((event) => event.actorKey))
    expect(keys.has("ember")).toBe(true)
    expect(keys.has("ember#1")).toBe(true)
  })

  test("the same sides and seed replay byte for byte, log included", () => {
    const first = resolveContinuous(side(), side({ id: "reed" }), 9)
    const second = resolveContinuous(side(), side({ id: "reed" }), 9)
    expect(JSON.stringify(second)).toBe(JSON.stringify(first))
  })

  test("the cap is a duration, and a stalemate reaches it", () => {
    // A symmetric pair with a pool far larger than a cap-length fight can
    // spend: neither side can fall, so the clock decides.
    // spd 1 is the slowest legal speed: recovery must stay positive.
    const still = { hp: 1000, atk: 1, def: 1, spd: 1 }
    const result = resolveContinuous(
      side({ name: "Ember", id: "ember", stats: still, kit: [] }),
      side({ name: "Reed", id: "reed", stats: still, kit: [] }),
      4,
    )
    expect(result.reason).toBe("time")
    expect(lastEvent(result.events).kind).toBe("time")
    expect(hpOf(result.finalHp, "ember")).toBeGreaterThan(0)
    expect(hpOf(result.finalHp, "ember")).toBe(hpOf(result.finalHp, "reed"))
    expect(FIGHT_CAP_MS).toBe(40000)
  })

  test("an even seed breaks a dead heat to side 0, an odd seed to side 1", () => {
    const still = { hp: 1000, atk: 1, def: 1, spd: 1 }
    const even = resolveContinuous(
      side({ name: "Ember", id: "ember", stats: still, kit: [] }),
      side({ name: "Reed", id: "reed", stats: still, kit: [] }),
      4,
    )
    const odd = resolveContinuous(
      side({ name: "Ember", id: "ember", stats: still, kit: [] }),
      side({ name: "Reed", id: "reed", stats: still, kit: [] }),
      5,
    )
    expect(even.winner).toBe("Ember")
    expect(odd.winner).toBe("Reed")
  })
})

describe("resolveContinuous — the double KO (FR-12, AC-12)", () => {
  /** A side that shoots, one blow from down. */
  function gunner(): BattleSide {
    return side({
      name: "Ember",
      id: "ember",
      stats: { hp: 1, atk: 10, def: 1, spd: 1 },
      kit: ["spark"],
      tactic: "specials",
      doctrine: "press",
    })
  }

  test("a killing blow from each side in the same step is a double KO", () => {
    // Both sides are one blow from down, so whichever lands first ends it. A
    // double KO can only come from both blows resolving on the same step (the
    // doc claim at the top of resolve.ts). Mirror the two sides so their
    // decisions coincide and both sparks land on the same tick; the doctrine
    // change made the old asymmetric gunner/swinger pair land a step apart.
    const mirror = { ...gunner(), name: "Reed", id: "reed" }
    const found = resolveContinuous(gunner(), mirror, 1)
    expect(found.reason).toBe("double_ko")
    expect(found.winner).toBeNull()
    expect(Object.values(found.finalHp).every((hp) => hp === 0)).toBe(true)
    // Both sides go down on the same step: two down beats, one tick.
    const downs = found.events.filter((event) => event.kind === "down")
    expect(downs).toHaveLength(2)
    const tick = downs[0]?.tick
    expect(downs[1]?.tick).toBe(tick)
    // The same tick carries the blow that killed each owner.
    const landed = found.events.filter(
      (event) => event.tick === tick && event.hit === true,
    )
    expect(landed.some((event) => event.actorKey === "ember")).toBe(true)
    expect(landed.some((event) => event.actorKey === "reed")).toBe(true)
  })
})

describe("downEnding — one step, judged as a whole", () => {
  test("no pool at zero leaves the fight live", () => {
    expect(downEnding(state())).toBeNull()
  })

  test("one pool at zero is a KO for the other side", () => {
    expect(downEnding(judged([0, 40], [100, 100]))).toEqual({
      side: 1,
      reason: "ko",
    })
    expect(downEnding(judged([40, 0], [100, 100]))).toEqual({
      side: 0,
      reason: "ko",
    })
  })

  test("both pools at zero in one step is a double KO", () => {
    expect(downEnding(judged([0, 0], [100, 100]))).toEqual({
      side: null,
      reason: "double_ko",
    })
  })
})

describe("pointsWinner — HP percentage, then poise dealt, then seed", () => {
  test("the higher HP percentage wins, not the bigger pool", () => {
    // 50/100 is 50%, 30/50 is 60%: the smaller pool is ahead.
    expect(pointsWinner(judged([50, 30], [100, 50]), [0, 0], 4)).toBe(1)
    expect(pointsWinner(judged([30, 50], [50, 100]), [0, 0], 4)).toBe(0)
  })

  test("equal percentages fall through to poise damage dealt", () => {
    const level = judged([50, 25], [100, 50])
    expect(pointsWinner(level, [3, 1], 4)).toBe(0)
    expect(pointsWinner(level, [1, 3], 4)).toBe(1)
  })

  test("equal poise falls through to the seed", () => {
    const level = judged([50, 25], [100, 50])
    expect(pointsWinner(level, [2, 2], 4)).toBe(0)
    expect(pointsWinner(level, [2, 2], 5)).toBe(1)
  })
})
