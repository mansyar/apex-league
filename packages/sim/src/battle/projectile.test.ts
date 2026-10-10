import { describe, expect, test } from "bun:test"
import type { CreatureStats, Element } from "../creature"

// Phase D: projectiles, accuracy, and dodge on the Phase C stepper. A far
// special launches on the acting tick and impacts as the first step of the
// next tick; a point-blank special resolves on the acting tick. Accuracy and
// dodge are seeded rolls; standing targets never roll a dodge.

import {
  type BattleEvent,
  type BattleFighter,
  CLOSE,
  type Clock,
  type ClockFighter,
  createClock,
  createClockFighter,
  createTieOrder,
  HOLD,
  type PlannedAction,
} from "./clock"

function stats(spd: number, atk = 10, def = 10, hp = 40): CreatureStats {
  return { hp, atk, def, spd }
}

function snap(name: string, element: Element, s: CreatureStats): BattleFighter {
  return { name, element, stats: s }
}

function clockOf(a: BattleFighter, b: BattleFighter, seed: number): Clock {
  return createClock(
    [createClockFighter(a), createClockFighter(b)],
    createTieOrder(seed, [a, b]),
    seed,
  )
}

function special(moveId: string): PlannedAction {
  return { kind: "special", moveId }
}

function kinds(events: readonly BattleEvent[]): readonly string[] {
  return events.map((e) => e.kind)
}

type PlanFn_ = (f: ClockFighter) => PlannedAction

describe("projectiles", () => {
  test("a far special launches on the acting tick and impacts first next tick", () => {
    // Fire beats plant, so Blaze Bolt (12 power) from ATK 10 into DEF 10
    // deals 24 and takes Reed from 40 to 16.
    const boltPlans: PlanFn_ = (f) =>
      f.range === "far" && (f.cooldowns.blaze_bolt ?? 0) === 0
        ? special("blaze_bolt")
        : HOLD
    const clock = clockOf(
      snap("Bolt", "fire", stats(12)),
      snap("Reed", "plant", stats(5, 10, 10, 40)),
      7,
    )

    const r1 = clock.advance(boltPlans)
    expect(kinds(r1.events)).toEqual(["launch"])
    expect(r1.events[0]?.actor).toBe("Bolt")
    expect(r1.events[0]?.moveId).toBe("blaze_bolt")
    expect(r1.events[0]?.line).toBe("Bolt launches Blaze Bolt.")
    expect(r1.events[0]?.hpAfter).toEqual({ Bolt: 40, Reed: 40 })

    const r2 = clock.advance(boltPlans)
    expect(r2.events[0]?.kind).toBe("impact")
    expect(r2.events[0]?.tick).toBe(2)
    expect(r2.events[0]?.actor).toBe("Bolt")
    expect(r2.events[0]?.target).toBe("Reed")
    expect(r2.events[0]?.hit).toBe(true)
    expect(r2.events[0]?.damage).toBe(24)
    expect(r2.events[0]?.line).toBe("Blaze Bolt hits Reed for 24.")
    expect(r2.events[0]?.hpAfter).toEqual({ Bolt: 40, Reed: 16 })
    // The impact ran before gauges and actions: Bolt is cooling down and
    // holds; Reed (SPD 5) never reaches the gauge.
    expect(kinds(r2.events)).toEqual(["impact", "hold"])
  })

  test("a point-blank special resolves on the acting tick with accuracy only", () => {
    // Reed (plant, ox kit) closes tick 1 and fires Seed Shot tick 2: plant
    // is 0.5x into fire, so 6 power from ATK 8 into DEF 10 is 2 damage; no
    // launch event and no travel.
    const reedPlans: PlanFn_ = (f) =>
      f.range === "far" ? CLOSE : special("seed_shot")
    const clock = clockOf(
      snap("Reed", "plant", stats(12, 8)),
      snap("Bolt", "fire", stats(5, 10, 10, 40)),
      3,
    )
    const plan: PlanFn_ = (f) => (f.name === "Reed" ? reedPlans(f) : HOLD)
    clock.advance(plan)
    const r2 = clock.advance(plan)
    expect(kinds(r2.events)).toEqual(["impact"])
    expect(r2.events[0]?.actor).toBe("Reed")
    expect(r2.events[0]?.target).toBe("Bolt")
    expect(r2.events[0]?.moveId).toBe("seed_shot")
    expect(r2.events[0]?.hit).toBe(true)
    expect(r2.events[0]?.damage).toBe(2)
    expect(r2.events[0]?.line).toBe("Seed Shot hits Bolt for 2.")
    expect(r2.events[0]?.hpAfter).toEqual({ Reed: 40, Bolt: 38 })
  })

  test("an accuracy miss leaves HP untouched and consumes no dodge roll", () => {
    // Seed 4 draws d1 = 92, and Cinder Shot has accuracy 85: the shot
    // misses on accuracy. A dodge roll would belong only to a moving
    // target, so the standing Reed is untouched and no roll is spent.
    const boltPlans: PlanFn_ = (f) =>
      f.range === "far" && (f.cooldowns.cinder_shot ?? 0) === 0
        ? special("cinder_shot")
        : HOLD
    const clock = clockOf(
      snap("Bolt", "fire", stats(12)),
      snap("Reed", "fire", stats(5, 10, 10, 40)),
      4,
    )
    clock.advance(boltPlans)
    const r2 = clock.advance(boltPlans)
    expect(r2.events[0]?.kind).toBe("impact")
    expect(r2.events[0]?.hit).toBe(false)
    expect(r2.events[0]?.missReason).toBe("accuracy")
    expect(r2.events[0]?.damage).toBe(0)
    expect(r2.events[0]?.line).toBe("Cinder Shot misses Reed.")
    expect(r2.events[0]?.hpAfter).toEqual({ Bolt: 40, Reed: 40 })
  })
})

describe("dodge against a moving target", () => {
  // Both fighters are ready on tick 1 and the seed puts Bolt first: he
  // launches, Reed closes the same tick, and the shot is in flight while
  // Reed moved. Reed's SPD 12 dodge is min(70, 20 + 12 * 3) = 56.
  const boltPlans: PlanFn_ = (f) =>
    f.range === "far" && (f.cooldowns.blaze_bolt ?? 0) === 0
      ? special("blaze_bolt")
      : HOLD
  const reedClosing: PlanFn_ = (f) => (f.range === "far" ? CLOSE : HOLD)
  const planPair: PlanFn_ = (f) =>
    f.name === "Bolt" ? boltPlans(f) : reedClosing(f)

  test("the accurate shot is dodged when the dodge roll wins (seed 22)", () => {
    // Seed 22 draws d1 = 62 (accuracy hit) and d2 = 23 (under 56): the
    // accurate shot becomes a dodge miss and Reed's HP is untouched.
    const clock = clockOf(
      snap("Bolt", "fire", stats(12)),
      snap("Reed", "plant", stats(12, 10, 10, 40)),
      22,
    )
    const r1 = clock.advance(planPair)
    expect(kinds(r1.events)).toEqual(["launch", "close"])
    expect(r1.events[1]?.line).toBe("Reed closes in.")
    const r2 = clock.advance(planPair)
    expect(r2.events[0]?.kind).toBe("impact")
    expect(r2.events[0]?.hit).toBe(false)
    expect(r2.events[0]?.missReason).toBe("dodge")
    expect(r2.events[0]?.damage).toBe(0)
    expect(r2.events[0]?.line).toBe("Reed slips in. Blaze Bolt misses.")
    expect(r2.events[0]?.hpAfter).toEqual({ Bolt: 40, Reed: 40 })
    // The shot resolved once; no second impact lingers behind it.
    expect(kinds(r2.events)).toEqual(["impact", "hold", "hold"])
  })

  test("the hit lands when the dodge roll fails (seed 5)", () => {
    // Seed 5 draws d1 = 68 (accuracy hit) and d2 = 77 (over 56): the shot
    // lands for 24 fire-into-plant.
    const clock = clockOf(
      snap("Bolt", "fire", stats(12)),
      snap("Reed", "plant", stats(12, 10, 10, 40)),
      5,
    )
    const r1 = clock.advance(planPair)
    expect(kinds(r1.events)).toEqual(["launch", "close"])
    const r2 = clock.advance(planPair)
    expect(r2.events[0]?.kind).toBe("impact")
    expect(r2.events[0]?.hit).toBe(true)
    expect(r2.events[0]?.missReason).toBeUndefined()
    expect(r2.events[0]?.damage).toBe(24)
    expect(r2.events[0]?.line).toBe("Blaze Bolt hits Reed for 24.")
    expect(r2.events[0]?.hpAfter).toEqual({ Bolt: 40, Reed: 16 })
  })

  test("standing still never consumes a dodge roll", () => {
    // Seed 1 draws d1 = 62 (accuracy hit) and d2 = 0. Reed holds, so the
    // engine must not draw a dodge roll at all: a wrongly drawn 0 would
    // dodge the shot, and this test pins that it does not.
    const plan: PlanFn_ = (f) => (f.name === "Bolt" ? boltPlans(f) : HOLD)
    const clock = clockOf(
      snap("Bolt", "fire", stats(12)),
      snap("Reed", "plant", stats(12, 10, 10, 40)),
      1,
    )
    const r1 = clock.advance(plan)
    expect(kinds(r1.events)).toEqual(["launch", "hold"])
    const r2 = clock.advance(plan)
    expect(kinds(r2.events)).toEqual(["impact", "hold", "hold"])
    expect(r2.events[0]?.hit).toBe(true)
    expect(r2.events[0]?.damage).toBe(24)
    expect(r2.events[0]?.hpAfter).toEqual({ Bolt: 40, Reed: 16 })
  })
})

describe("shots in flight at the end", () => {
  test("a shot in flight when the fight ends is discarded", () => {
    // Bolt's ATK 20 Blaze Bolt deals 48 fire-into-plant and downs the 40-HP
    // Reed at the tick-2 impact step, before Reed's launched Bramble Dart
    // resolves. The still-flying shot never appears as an impact, and the
    // fight-over tick runs no actions.
    const boltPlans: PlanFn_ = (f) =>
      f.range === "far" && (f.cooldowns.blaze_bolt ?? 0) === 0
        ? special("blaze_bolt")
        : HOLD
    const reedPlans: PlanFn_ = (f) =>
      f.range === "far" && (f.cooldowns.bramble_dart ?? 0) === 0
        ? special("bramble_dart")
        : HOLD
    const plan: PlanFn_ = (f) =>
      f.name === "Bolt" ? boltPlans(f) : reedPlans(f)
    const clock = clockOf(
      snap("Bolt", "fire", stats(12, 20, 10, 40)),
      snap("Reed", "plant", stats(12, 10, 10, 40)),
      22,
    )
    const r1 = clock.advance(plan)
    expect(kinds(r1.events)).toEqual(["launch", "launch"])
    expect(r1.events[0]?.moveId).toBe("blaze_bolt")
    expect(r1.events[1]?.moveId).toBe("bramble_dart")
    const r2 = clock.advance(plan)
    // Only the first-launch impact and the down event appear.
    expect(kinds(r2.events)).toEqual(["impact", "down"])
    expect(r2.events[0]?.damage).toBe(48)
    expect(r2.events[0]?.hpAfter).toEqual({ Bolt: 40, Reed: -8 })
    expect(r2.events[1]?.line).toBe("Reed is down!")
    // After the down, no pending shot fires and only a live fighter acts.
    const r3 = clock.advance(() => HOLD)
    expect(kinds(r3.events)).toEqual(["hold"])
  })
})
