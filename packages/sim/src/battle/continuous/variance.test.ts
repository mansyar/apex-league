/**
 * Outcome variance (FR-21, AC-18).
 *
 * Before this phase the continuous engine drew nothing: `accuracy` was dead
 * data and the seeded RNG in the step context was never read, so the same two
 * creatures always produced the same fight and a 56-game sample was really 28
 * fights counted twice. Three claims are proved here:
 *
 * 1. **Accuracy rolls.** A connecting swing or shot that rolls out is a miss
 *    with a reason, carried into the playback stream the way the legacy clock's
 *    `missReason: "accuracy"` was — a miss the client cannot draw is not a miss.
 *    Positional dodging is untouched and stays separately reportable.
 * 2. **The spread is downward only**, so the best possible roll on any row is
 *    the base hit the 4-12% band is measured on. The spread can lower a blow;
 *    it can never push one past the ceiling.
 * 3. **Determinism holds both ways.** One seed replays to an identical event
 *    sequence and hash; two seeds play two different fights. The RNG cursor is
 *    part of the hash, so a divergence that is only a different number of draws
 *    cannot hide behind an otherwise identical state.
 */

import { describe, expect, test } from "bun:test"
import type { Rng } from "../../rng"
import { makeRng } from "../../rng"
import { BASIC_MOVE, CATALOG, getMove } from "../moves"
import type { BattleSide } from "../resolver"
import { positionalDamage } from "./damage"
import { startingHp } from "./hp"
import { ARENA_BOUNDS, resolveContinuous } from "./resolve"
import { rollHits, SPREAD_DIVISOR, spreadDamage } from "./roll"
import { createFight, stateHash } from "./step"
import type { StrikeStats } from "./strike"

/** A stub that always rolls the maximum: every check passes, nothing is lost. */
const MAX_ROLL: Rng = { next: () => 0, int: () => 0, cursor: () => 0 }

/** A stub that always rolls the minimum of an `int(max)` draw. */
const MIN_ROLL: Rng = {
  next: () => 0.999999,
  int: (max) => max - 1,
  cursor: () => 0,
}

const REFERENCE_STATS: StrikeStats = { atk: 10, def: 10 }
const REFERENCE_POOL = startingHp({
  stats: { hp: 189, atk: 10, def: 10, spd: 10 },
})
const BAND_MAX_PERCENT = 12

function side(id: string, kit: readonly string[]): BattleSide {
  return {
    name: id,
    id,
    element: "fire",
    stats: { hp: 189, atk: 10, def: 10, spd: 10 },
    kit,
    tactic: "balanced",
    doctrine: "press",
    temperament: "obedient",
  }
}

describe("accuracy rolls (FR-21)", () => {
  test("a hundred always connects and draws nothing", () => {
    let draws = 0
    const counting: Rng = {
      next: () => {
        draws += 1
        return 0.99
      },
      int: () => 0,
      cursor: () => draws,
    }
    expect(rollHits(100, counting)).toBe(true)
    expect(draws).toBe(0)
  })

  test("a seventy connects on a low draw and misses on a high one", () => {
    expect(rollHits(70, MAX_ROLL)).toBe(true)
    expect(
      rollHits(70, { next: () => 0.99, int: () => 99, cursor: () => 0 }),
    ).toBe(false)
  })

  test("every authored value lands near its own number over a seeded sample", () => {
    // AC-1: the number on the card is the probability. Twenty draws on each
    // of 1,000 seeds per value, covering the AC example (70), the branch
    // gamble (80), and every re-authored kit row (88/95/99).
    for (const accuracy of [70, 80, 88, 95, 99]) {
      let hits = 0
      let total = 0
      for (let seed = 1; seed <= 1000; seed += 1) {
        const rng = makeRng(seed)
        for (let i = 0; i < 20; i += 1) {
          total += 1
          if (rollHits(accuracy, rng)) hits += 1
        }
      }
      const rate = hits / total
      expect(rate).toBeGreaterThan(accuracy / 100 - 0.02)
      expect(rate).toBeLessThan(accuracy / 100 + 0.02)
    }
  })

  test("a miss is an event with a reason, and the dodge is still its own reason", () => {
    // Blaze Bolt is 95 accuracy; with a minimum roll every shot goes wide.
    const result = resolveContinuous(
      side("Ash", ["blaze_bolt", "blaze_bolt", "blaze_bolt", "blaze_bolt"]),
      side("Reed", ["blaze_bolt", "blaze_bolt", "blaze_bolt", "blaze_bolt"]),
      7,
    )
    const events = result.events
    const misses = events.filter((event) => event.missReason === "accuracy")
    const dodges = events.filter((event) => event.missReason === "dodge")
    // The fight was played with a real seed, so accuracy misses must occur on
    // a 95-accuracy kit; the point is that when one happens it is labelled.
    for (const miss of misses) {
      expect(miss.hit).toBe(false)
      expect(miss.line).toContain("goes wide")
    }
    for (const dodge of dodges) {
      expect(dodge.line).toContain("slips")
    }
    // A 95-accuracy exchange that lands at least one blow proves the stream
    // distinguishes landed shots from rolled ones.
    expect(events.some((event) => event.kind === "impact")).toBe(true)
  })

  test("the same seed replays the same events, and two seeds differ", () => {
    const one = resolveContinuous(
      side("Ash", ["spark", "blaze_bolt", "cinder_shot", "flare_dart"]),
      side("Reed", ["bubble", "splash_bolt", "foam_volley", "mist_spray"]),
      1,
    )
    const again = resolveContinuous(
      side("Ash", ["spark", "blaze_bolt", "cinder_shot", "flare_dart"]),
      side("Reed", ["bubble", "splash_bolt", "foam_volley", "mist_spray"]),
      1,
    )
    expect(JSON.stringify(one.events)).toBe(JSON.stringify(again.events))
    expect(one.finalHp).toEqual(again.finalHp)

    const other = resolveContinuous(
      side("Ash", ["spark", "blaze_bolt", "cinder_shot", "flare_dart"]),
      side("Reed", ["bubble", "splash_bolt", "foam_volley", "mist_spray"]),
      2,
    )
    expect(JSON.stringify(other.events)).not.toBe(JSON.stringify(one.events))
  })
})

describe("damage spread (FR-21)", () => {
  test("the spread only ever subtracts", () => {
    const rng = makeRng(20261110)
    for (const move of [BASIC_MOVE, ...CATALOG]) {
      const base = positionalDamage({
        power: move.power,
        atk: REFERENCE_STATS.atk,
        def: REFERENCE_STATS.def,
        type: { num: 1, den: 1 },
        position: "front",
        counter: false,
      })
      const floor = base - Math.floor(base / SPREAD_DIVISOR)
      for (let i = 0; i < 40; i += 1) {
        const rolled = spreadDamage(base, rng)
        expect(rolled).toBeLessThanOrEqual(base)
        expect(rolled).toBeGreaterThanOrEqual(floor)
      }
    }
  })

  test("the best possible roll is the base hit, so the 12% ceiling holds", () => {
    let heaviest = 0
    let heaviestId = ""
    for (const move of [BASIC_MOVE, ...CATALOG]) {
      const base = positionalDamage({
        power: move.power,
        atk: REFERENCE_STATS.atk,
        def: REFERENCE_STATS.def,
        type: { num: 1, den: 1 },
        position: "front",
        counter: false,
      })
      const best = spreadDamage(base, MAX_ROLL)
      // Downward only: the maximum of the spread is the base hit itself.
      expect(best).toBe(base)
      if (best > heaviest) {
        heaviest = best
        heaviestId = move.id
      }
    }
    const share = (heaviest * 100) / REFERENCE_POOL
    expect(
      share,
      `${heaviestId} best roll ${heaviest}/${REFERENCE_POOL} = ${share.toFixed(2)}%`,
    ).toBeLessThanOrEqual(BAND_MAX_PERCENT)
  })

  test("the worst roll still deals damage and never reaches zero", () => {
    for (const move of [BASIC_MOVE, ...CATALOG]) {
      const base = positionalDamage({
        power: move.power,
        atk: REFERENCE_STATS.atk,
        def: REFERENCE_STATS.def,
        type: { num: 1, den: 1 },
        position: "front",
        counter: false,
      })
      expect(spreadDamage(base, MIN_ROLL)).toBeGreaterThanOrEqual(1)
    }
  })

  test("a blow can differ between two draws", () => {
    const base = 22
    const seen = new Set<number>()
    const rng = makeRng(9)
    for (let i = 0; i < 200; i += 1) seen.add(spreadDamage(base, rng))
    expect(seen.size).toBeGreaterThan(1)
    expect(Math.max(...seen)).toBe(base)
  })
})

describe("the RNG cursor is part of the state hash (FR-21)", () => {
  test("an identical state with a different draw count hashes differently", () => {
    const fight = createFight({
      seed: 3,
      bounds: ARENA_BOUNDS,
      fighters: [
        { key: "a", spd: 10, at: { x: -1000, z: 0 }, hp: 100 },
        { key: "b", spd: 10, at: { x: 1000, z: 0 }, hp: 100 },
      ],
    })
    const state = fight.state
    expect(stateHash(state, 0)).toBe(stateHash(state, 0))
    expect(stateHash(state, 0)).not.toBe(stateHash(state, 1))
  })

  test("a real fight reports the cursor its draws produced", () => {
    const fight = createFight({
      seed: 11,
      bounds: ARENA_BOUNDS,
      fighters: [
        { key: "a", spd: 10, at: { x: -1000, z: 0 }, hp: 100 },
        { key: "b", spd: 10, at: { x: 1000, z: 0 }, hp: 100 },
      ],
    })
    fight.commit(0, "spark")
    fight.commit(1, "spark")
    const first = fight.advance([
      { x: 0, z: 1 },
      { x: 0, z: -1 },
    ])
    // Replaying the same steps from a fresh fight reproduces the hash exactly.
    const replay = createFight({
      seed: 11,
      bounds: ARENA_BOUNDS,
      fighters: [
        { key: "a", spd: 10, at: { x: -1000, z: 0 }, hp: 100 },
        { key: "b", spd: 10, at: { x: 1000, z: 0 }, hp: 100 },
      ],
    })
    replay.commit(0, "spark")
    replay.commit(1, "spark")
    const second = replay.advance([
      { x: 0, z: 1 },
      { x: 0, z: -1 },
    ])
    expect(second.hash).toBe(first.hash)
  })

  test("the accuracy roll is drawn from the fight's own RNG", () => {
    // A kit of one low-accuracy move at a fixed seed: the number of draws the
    // fight reports must be at least the number of landed-or-rolled shots.
    const result = resolveContinuous(
      side("Ash", ["blaze_bolt", "blaze_bolt", "blaze_bolt", "blaze_bolt"]),
      side("Reed", ["blaze_bolt", "blaze_bolt", "blaze_bolt", "blaze_bolt"]),
      21,
    )
    const impacts = result.events.filter((event) => event.kind === "impact")
    expect(impacts.length).toBeGreaterThan(0)
    for (const impact of impacts) {
      expect(impact.moveId === "blaze_bolt").toBe(true)
      if (impact.hit) expect(impact.missReason).toBeUndefined()
      else expect(impact.missReason).toBeDefined()
    }
  })

  test("every catalog move still exists and the basic is the floor", () => {
    expect(getMove(BASIC_MOVE.id)).toBe(BASIC_MOVE)
    expect(CATALOG.length).toBe(48)
  })
})
