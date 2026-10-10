import { describe, expect, test } from "bun:test"
import type { CreatureStats, Element } from "../creature"

// Phase C: the action clock with scripted actions. Tactics, projectiles, and
// the resolver come in later phases; this file pins gauges, order, range, and
// the basic strike.

import type { BattleFighter } from "./clock"
import {
  BASIC,
  CLOSE,
  createClock,
  createClockFighter,
  createTieOrder,
  HOLD,
} from "./clock"

function stats(
  spd: number,
  atk?: number,
  def?: number,
  hp?: number,
): CreatureStats {
  return { hp: hp ?? 40, atk: atk ?? 11, def: def ?? 10, spd }
}

function snap(name: string, element: Element, s: CreatureStats): BattleFighter {
  return { name, element, stats: s }
}

function pair(
  aSpd: number,
  bSpd: number,
  aMod: Partial<CreatureStats> = {},
  bMod: Partial<CreatureStats> = {},
): [BattleFighter, BattleFighter] {
  const a = snap("Bolt", "fire", stats(aSpd, aMod.atk, aMod.def, aMod.hp))
  const b = snap("Reed", "plant", stats(bSpd, bMod.atk, bMod.def, bMod.hp))
  return [a, b]
}

function clockOf(snaps: readonly BattleFighter[], seed: number) {
  return createClock(
    snaps.map((s) => createClockFighter(s)),
    createTieOrder(seed, snaps),
  )
}

function firstFighter(clock: ReturnType<typeof createClock>) {
  const f = clock.fighters[0]
  if (!f) throw new Error("clock has no fighters")
  return f
}

describe("action clock gauges", () => {
  test("gauges start at 0, act at gauge 12 or more, and carry the leftover", () => {
    // SPD 7: tick 1 gauge 7 (no act), tick 2 gauge 14 (act, 2 left),
    // tick 3 gauge 9 (no act), tick 4 gauge 16 (act).
    const clock = clockOf(pair(7, 6), 7)
    const actTicks: number[] = []
    for (let i = 0; i < 4; i++) {
      const r = clock.advance(() => HOLD)
      if (r.events.some((e) => e.kind === "hold" && e.actor === "Bolt"))
        actTicks.push(clock.tick)
    }
    expect(actTicks).toEqual([2, 4])
  })

  test("SPD 12 acts every tick and SPD 6 acts every other tick", () => {
    const fast = clockOf(pair(12, 1), 5)
    const fastHolds: number[] = []
    for (let i = 0; i < 3; i++) {
      const r = fast.advance(() => HOLD)
      if (r.events.some((e) => e.kind === "hold")) fastHolds.push(fast.tick)
    }
    expect(fastHolds).toEqual([1, 2, 3])

    const slow = clockOf(pair(6, 1), 5)
    const slowHolds: number[] = []
    for (let i = 0; i < 4; i++) {
      const r = slow.advance(() => HOLD)
      if (r.events.some((e) => e.kind === "hold" && e.actor === "Bolt"))
        slowHolds.push(slow.tick)
    }
    expect(slowHolds).toEqual([2, 4])
  })

  test("same-tick order is highest SPD first; equal SPD is stable for a seed", () => {
    // Tick 2 is the first tick both fighters are ready (8 + 8 >= 12 once the
    // faster one left no leftover on tick 1), so it sorts Bolt (spd 12) first.
    const clock = clockOf(pair(12, 8), 11)
    clock.advance(() => HOLD)
    const second = clock.advance(() => HOLD)
    expect(second.events.map((e) => e.actor)).toEqual(["Bolt", "Reed"])

    const [tieA, tieB] = pair(12, 12)
    const order = createTieOrder(23, [tieA, tieB])
    expect(order).toEqual(createTieOrder(23, [tieA, tieB]))
    expect([...order].sort()).toEqual(["Bolt", "Reed"])
    const tieClock = createClock(
      [tieA, tieB].map((s) => createClockFighter(s)),
      order,
    )
    const first = tieClock.advance(() => HOLD)
    const secondTie = tieClock.advance(() => HOLD)
    expect(first.events.map((e) => e.actor)).toEqual([...order])
    expect(secondTie.events.map((e) => e.actor)).toEqual([...order])
  })
})

describe("range and the basic strike", () => {
  test("both fighters start far", () => {
    const clock = clockOf(pair(12, 12), 5)
    expect(firstFighter(clock).range).toBe("far")
    expect(clock.fighters[1]?.range).toBe("far")
  })

  test("close is the only range change and spends the action", () => {
    const clock = clockOf(pair(12, 6), 5)
    const r = clock.advance(() => CLOSE)
    expect(r.events.length).toBe(1)
    const ev = r.events[0]
    if (!ev) throw new Error("close event missing")
    expect(ev.kind).toBe("close")
    expect(ev.actor).toBe("Bolt")
    expect(ev.line).toBe("Bolt closes in.")
    expect(firstFighter(clock).range).toBe("near")
    expect(firstFighter(clock).gauge).toBe(0)
  })

  test("closing while already near throws", () => {
    const clock = clockOf(pair(12, 6), 5)
    clock.advance(() => CLOSE)
    expect(() => clock.advance(() => CLOSE)).toThrow(/near/)
  })

  test("a basic from far is rejected", () => {
    const clock = clockOf(pair(12, 12), 5)
    expect(() => clock.advance(() => BASIC)).toThrow(/near/)
    expect(firstFighter(clock).range).toBe("far")
  })

  test("a basic at near always hits for formula damage", () => {
    const clock = clockOf(pair(12, 6), 5)
    clock.advance(() => CLOSE)
    const r = clock.advance((f) => (f.name === "Bolt" ? BASIC : HOLD))
    const ev = r.events.find((e) => e.kind === "basic")
    if (!ev) throw new Error("basic event missing")
    expect(ev.actor).toBe("Bolt")
    expect(ev.target).toBe("Reed")
    // max(1, floor(4 * 11 * 1 / (10 * 1))) = 4
    expect(ev.damage).toBe(4)
    expect(ev.hit).toBe(true)
    expect(ev.line).toBe("Bolt strikes Reed for 4.")
    expect(ev.hpAfter).toEqual({ Bolt: 40, Reed: 36 })
    expect(clock.fighters[1]?.hp).toBe(36)
  })
})

describe("downed fighters", () => {
  test("a fighter at 0 HP never acts, including one downed earlier in the same tick", () => {
    // Reed (hp 8, spd 12) is first in the tie order and holds; Bolt (atk 20)
    // closes on tick 1, drives Reed to 0 on tick 2, and Reed's later basic
    // never runs.
    const clock = clockOf(pair(12, 12, { atk: 20 }, { hp: 8 }), 9)
    clock.advance((f) => (f.name === "Bolt" ? CLOSE : HOLD))
    const r = clock.advance((f) => (f.name === "Bolt" ? BASIC : HOLD))
    const basics = r.events.filter((e) => e.kind === "basic")
    expect(basics.map((e) => e.actor)).toEqual(["Bolt"])
    const down = r.events.find((e) => e.kind === "down")
    if (!down) throw new Error("down event missing")
    expect(down.actor).toBe("Reed")
    expect(down.line).toBe("Reed is down!")
    expect(down.hpAfter).toEqual({ Bolt: 40, Reed: 0 })
    expect(clock.fighters[1]?.hp).toBe(0)
  })
})
