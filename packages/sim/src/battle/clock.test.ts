import { describe, expect, test } from "bun:test"
import type { CreatureStats, Element } from "../creature"

// Phase C: the action clock with scripted actions. Tactics, projectiles, and
// the resolver come in later phases; this file pins gauges, order, range, and
// the basic strike.

import type { BattleEvent, BattleFighter, PlanFn, PlannedAction } from "./clock"
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
    seed,
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
      23,
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

/**
 * Stagger on heavy blows (battle-animation-overhaul spec FR2): a single
 * hit dealing >= 35% of the victim's max HP - or a super-effective hit
 * that also clears 15% - staggers the victim; its next action window is
 * consumed recovering.
 * A downing blow never staggers, and an already-staggered victim does
 * not stack a second lock. Cooldowns count actions, and a staggered
 * window is not an action, so they do not step during it.
 */
describe("stagger on heavy blows", () => {
  /** A plan driven by per-fighter action queues, HOLD as the fallback. */
  function scripted(queues: Readonly<Record<string, PlannedAction[]>>): PlanFn {
    return (fighter) => {
      const queue = queues[fighter.name]
      const action = queue?.shift()
      return action ?? HOLD
    }
  }

  /** All events collected across a driven fight, in order. */
  function drive(
    clock: ReturnType<typeof createClock>,
    plan: PlanFn,
    ticks = 12,
  ): BattleEvent[] {
    const all: BattleEvent[] = []
    for (let i = 0; i < ticks; i++) all.push(...clock.advance(plan).events)
    return all
  }

  test("a super-effective special staggers: the next window is consumed", () => {
    // Bolt (fire) spd 13 acts from t1; Reed (plant) spd 5 is ready at t3.
    // t1 close, t2 point-blank Spark: super-effective, 13 of 40 HP (32%).
    // Reed's t3 window must be the stagger, not an action.
    const clock = clockOf(
      [
        snap("Bolt", "fire", stats(13, 11, 10, 40)),
        snap("Reed", "plant", stats(5, 11, 10, 40)),
      ],
      7,
    )
    const events = drive(
      clock,
      scripted({ Bolt: [CLOSE, { kind: "special", moveId: "spark" }] }),
      3,
    )
    const stagger = events.find((e) => e.kind === "stagger")
    if (!stagger) throw new Error("no stagger event")
    expect(stagger.actor).toBe("Reed")
    expect(stagger.tick).toBe(3)
    expect(stagger.line).toBe("Reed reels from the blow.")
    // The window was spent: no basic/hold/special from Reed at t3.
    expect(
      events.some(
        (e) =>
          e.actor === "Reed" &&
          e.tick === 3 &&
          (e.kind === "basic" || e.kind === "hold" || e.kind === "launch"),
      ),
    ).toBe(false)
    // The gauge was consumed: 15 ready − 12 = 3 left over.
    expect(clock.fighters[1]?.gauge).toBe(3)
    expect(clock.fighters[1]?.staggered).toBe(false)
  })

  test("a light neutral basic does not stagger", () => {
    // Default atk 11 vs def 10: a basic deals 4 of 40 (10%) - under the 35%
    // and the typeless basic is never super-effective. Reed acts normally.
    const clock = clockOf(pair(13, 5), 7)
    const events = drive(clock, scripted({ Bolt: [CLOSE, BASIC] }), 4)
    expect(events.some((e) => e.kind === "stagger")).toBe(false)
    // Reed's t3 window is a normal (scripted hold) action.
    expect(events.some((e) => e.kind === "hold" && e.actor === "Reed")).toBe(
      true,
    )
  })

  test("a big neutral hit staggers on the damage fraction alone", () => {
    // atk 36: basic deals floor(4*36/10) = 14 of 40 (35%) — exactly at
    // the heavy fraction while type-neutral. The victim must still lose
    // its next window.
    const clock = clockOf(
      [
        snap("Bolt", "fire", stats(13, 36, 10, 40)),
        snap("Reed", "plant", stats(5, 11, 10, 40)),
      ],
      7,
    )
    const events = drive(clock, scripted({ Bolt: [CLOSE, BASIC] }), 4)
    const stagger = events.find((e) => e.kind === "stagger")
    if (!stagger) throw new Error("no stagger event")
    expect(stagger.actor).toBe("Reed")
    expect(stagger.tick).toBe(3)
  })

  test("a light super-effective chip does not stagger", () => {
    // atk 4: Spark deals floor(6*4*2/10) = 4 of 40 (10%) — under the
    // 15% super-effective floor, so no stagger even though the type
    // chart favors the blow.
    const clock = clockOf(
      [
        snap("Bolt", "fire", stats(13, 4, 10, 40)),
        snap("Reed", "plant", stats(5, 11, 10, 40)),
      ],
      7,
    )
    const events = drive(
      clock,
      scripted({ Bolt: [CLOSE, { kind: "special", moveId: "spark" }] }),
      4,
    )
    expect(events.some((e) => e.kind === "stagger" && e.actor === "Reed")).toBe(
      false,
    )
  })

  test("a downing blow never staggers", () => {
    // Reed hp 12: Spark's 13 damage downs it outright — a down event, no
    // stagger for the fallen fighter.
    const clock = clockOf(
      [
        snap("Bolt", "fire", stats(13, 11, 10, 40)),
        snap("Reed", "plant", stats(5, 11, 10, 12)),
      ],
      7,
    )
    const events = drive(
      clock,
      scripted({ Bolt: [CLOSE, { kind: "special", moveId: "spark" }] }),
      4,
    )
    expect(events.some((e) => e.kind === "down" && e.actor === "Reed")).toBe(
      true,
    )
    expect(events.some((e) => e.kind === "stagger")).toBe(false)
  })

  test("an already-staggered victim does not stack a second lock", () => {
    // atk 36: the basic deals floor(4*36/10) = 14 (35%) — heavy, and two
    // of them (40 HP victim) stay non-lethal. The blows are spaced past
    // the grace window (triggers t2 and t5) so each is allowed to lock:
    // t2 basic staggers AND knocks both apart; t3 Reed staggers through
    // its window; t3 Bolt re-closes (mutual separation), t5 his second
    // heavy basic re-sets the flag — Reed still loses exactly ONE window
    // per stagger (t3, t5), never two from a single blow.
    const clock = clockOf(
      [
        snap("Bolt", "fire", stats(13, 36, 10, 40)),
        snap("Reed", "plant", stats(5, 11, 10, 40)),
      ],
      7,
    )
    const events = drive(
      clock,
      scripted({ Bolt: [CLOSE, BASIC, HOLD, CLOSE, BASIC] }),
      8,
    )
    const staggers = events.filter((e) => e.kind === "stagger")
    expect(staggers.map((e) => e.tick)).toEqual([3, 5])
    // Recovered: Reed acts normally again after the last lock.
    expect(events.some((e) => e.kind === "hold" && e.actor === "Reed")).toBe(
      true,
    )
  })

  test("cooldowns do not step during a staggered window", () => {
    // Reed spd 12 acts at t1 (launching a light seed_shot — 3 resisted
    // damage, too small to stagger Bolt) putting Spark on a 1-action
    // cooldown; t2 Bolt's point-blank Spark staggers Reed and Reed's
    // own t2 window is the stagger — Spark's cooldown must still read 1
    // (not stepped), then step on Reed's t3 action.
    const clock = clockOf(
      [
        snap("Bolt", "fire", stats(13, 11, 10, 40)),
        snap("Reed", "plant", stats(12, 11, 10, 40)),
      ],
      7,
    )
    const plan = scripted({
      Bolt: [CLOSE, { kind: "special", moveId: "spark" }],
      Reed: [{ kind: "special", moveId: "seed_shot" }, HOLD],
    })
    clock.advance(plan) // t1: Bolt closes; Reed launches seed_shot
    clock.advance(plan) // t2: shot lands (3); Bolt staggers Reed; Reed's window is the stagger
    const staggered = clock.fighters[1]
    if (!staggered) throw new Error("no Reed")
    expect(staggered.cooldowns.seed_shot).toBe(1)
    clock.advance(plan) // t3: Reed acts again — the cooldown steps
    expect(clock.fighters[1]?.cooldowns.seed_shot).toBe(0)
  })

  test("a recovered fighter is immune to re-staggering for 3 ticks", () => {
    // Bolt spd 13 acts every tick; Reed spd 5 hp 40. Two sparks from far
    // land at t2 and t4 — both heavy (SE 6 of 40 = 15%, at the floor).
    // The t2 blow staggers (Reed's window consumed at t3), but the t4
    // blow lands inside the 3-tick grace measured from the t2 trigger,
    // so Reed keeps acting: exactly one stagger event, and Reed plans
    // real actions again afterward.
    const clock = clockOf(
      [
        snap("Bolt", "fire", stats(13, 5, 10, 40)),
        snap("Reed", "plant", stats(5, 11, 10, 40)),
      ],
      7,
    )
    const events = drive(
      clock,
      scripted({
        Bolt: [
          { kind: "special", moveId: "spark" },
          HOLD,
          { kind: "special", moveId: "spark" },
        ],
      }),
      5,
    )
    const staggers = events.filter((e) => e.kind === "stagger")
    expect(staggers.map((e) => e.tick)).toEqual([3])
    // Reed is acting normally again after the single lock.
    const holds = events.filter((e) => e.kind === "hold" && e.actor === "Reed")
    expect(holds.length).toBeGreaterThan(0)
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

/**
 * Range-shifting knockback (battle-animation-overhaul spec FR2): a heavy
 * blow (same trigger as the stagger) against a NEAR victim knocks both
 * fighters apart — victim and attacker both go far, so re-engaging costs
 * each side a closing action (tempo). A heavy hit on an already-far
 * victim (projectiles at range) is a no-op: no event, no shift. Ranges
 * stay symmetric in every path.
 */
describe("range-shifting knockback", () => {
  function scripted(queues: Readonly<Record<string, PlannedAction[]>>): PlanFn {
    return (fighter) => {
      const queue = queues[fighter.name]
      const action = queue?.shift()
      return action ?? HOLD
    }
  }

  function drive(
    clock: ReturnType<typeof createClock>,
    plan: PlanFn,
    ticks = 12,
  ): BattleEvent[] {
    const all: BattleEvent[] = []
    for (let i = 0; i < ticks; i++) all.push(...clock.advance(plan).events)
    return all
  }

  test("a heavy melee blow knocks both fighters apart", () => {
    // Bolt atk 36: the basic deals 14 of 40 (35%) — heavy. t1 close,
    // t2 heavy basic at near: both ranges must read far and a knockback
    // event names the victim.
    const clock = clockOf(
      [
        snap("Bolt", "fire", stats(13, 36, 10, 40)),
        snap("Reed", "plant", stats(5, 11, 10, 40)),
      ],
      7,
    )
    const events = drive(clock, scripted({ Bolt: [CLOSE, BASIC] }), 2)
    const knockback = events.find((e) => e.kind === "knockback")
    if (!knockback) throw new Error("no knockback event")
    expect(knockback.actor).toBe("Reed")
    expect(knockback.tick).toBe(2)
    expect(knockback.line).toBe("Reed is knocked back.")
    expect(clock.fighters[0]?.range).toBe("far")
    expect(clock.fighters[1]?.range).toBe("far")
  })

  test("re-engaging costs both sides a closing action", () => {
    // After the t2 knockback, Reed staggers through t3 (a staggered
    // window plans nothing, so Reed's queue starts fresh), then must
    // spend its t5 window closing (Bolt idles). Only at t8, both near
    // again, can Reed's basic land — the tempo cost is real.
    const clock = clockOf(
      [
        snap("Bolt", "fire", stats(13, 36, 10, 40)),
        snap("Reed", "plant", stats(5, 11, 10, 40)),
      ],
      7,
    )
    const events = drive(
      clock,
      scripted({ Bolt: [CLOSE, BASIC], Reed: [CLOSE, BASIC] }),
      8,
    )
    const close = events.find((e) => e.kind === "close" && e.actor === "Reed")
    if (!close) throw new Error("Reed never closed")
    expect(close.tick).toBe(5)
    expect(clock.fighters[0]?.range).toBe("near")
    expect(clock.fighters[1]?.range).toBe("near")
    const strike = events.find((e) => e.kind === "basic" && e.actor === "Reed")
    if (!strike) throw new Error("Reed never struck")
    expect(strike.tick).toBe(8)
  })

  test("a heavy hit on an already-far victim is a no-op", () => {
    // Bolt (atk 20) looses Blaze Bolt from far; it lands for 48 — far
    // past the heavy threshold — but Reed was never near, so there is
    // nothing to shift: no knockback event, both stay far. (The stagger
    // still fires — range is irrelevant to reeling.)
    const clock = clockOf(
      [
        snap("Bolt", "fire", stats(13, 20, 10, 40)),
        snap("Reed", "plant", stats(5, 11, 10, 40)),
      ],
      7,
    )
    const events = drive(
      clock,
      scripted({ Bolt: [{ kind: "special", moveId: "blaze_bolt" }] }),
      2,
    )
    expect(events.some((e) => e.kind === "knockback")).toBe(false)
    expect(clock.fighters[0]?.range).toBe("far")
    expect(clock.fighters[1]?.range).toBe("far")
  })

  test("a heavy point-blank special knocks both fighters apart", () => {
    // Spark at point blank: super-effective, 13 of 40 — heavy at near.
    const clock = clockOf(
      [
        snap("Bolt", "fire", stats(13, 11, 10, 40)),
        snap("Reed", "plant", stats(5, 11, 10, 40)),
      ],
      7,
    )
    const events = drive(
      clock,
      scripted({ Bolt: [CLOSE, { kind: "special", moveId: "spark" }] }),
      2,
    )
    expect(events.some((e) => e.kind === "knockback")).toBe(true)
    expect(clock.fighters[0]?.range).toBe("far")
    expect(clock.fighters[1]?.range).toBe("far")
  })

  test("a downing blow never knocks back", () => {
    // Reed hp 12: the heavy basic downs it outright - a down event, no
    // knockback for the fallen fighter.
    const clock = clockOf(
      [
        snap("Bolt", "fire", stats(13, 30, 10, 40)),
        snap("Reed", "plant", stats(5, 11, 10, 12)),
      ],
      7,
    )
    const events = drive(clock, scripted({ Bolt: [CLOSE, BASIC] }), 2)
    expect(events.some((e) => e.kind === "down" && e.actor === "Reed")).toBe(
      true,
    )
    expect(events.some((e) => e.kind === "knockback")).toBe(false)
  })

  test("the separation is not grace-gated", () => {
    // Two heavies land within the 3-tick grace (t2 and t4): the second
    // lock is suppressed, but the separation still fires so spacing stays
    // dynamic (clock.ts header contract).
    const clock = clockOf(
      [
        snap("Bolt", "fire", stats(13, 36, 10, 40)),
        snap("Reed", "plant", stats(5, 11, 10, 40)),
      ],
      7,
    )
    const events = drive(
      clock,
      scripted({ Bolt: [CLOSE, BASIC, CLOSE, BASIC] }),
      6,
    )
    const knockbacks = events.filter((e) => e.kind === "knockback")
    expect(knockbacks.map((e) => e.tick)).toEqual([2, 4])
    const staggers = events.filter((e) => e.kind === "stagger")
    expect(staggers.map((e) => e.tick)).toEqual([3])
  })
})
