/**
 * The bounded opponent read (FR-14, AC-14).
 *
 * Three fields, overwritten in place, expiring after MEMORY_MS. It changes how
 * a decision is executed (which side to circle, whether to answer with a shot)
 * and never what the doctrine wants.
 */

import { describe, expect, test } from "bun:test"
import {
  EMPTY_MEMORY,
  MEMORY_MS,
  observe,
  type PatternMemory,
  preferRangedPunish,
  strafeSide,
} from "./controller-memory"
import { createFight } from "./step"
import type { FighterState } from "./types"

const BOUNDS = { minX: -4000, maxX: 4000, minZ: -3000, maxZ: 3000 }

function pair(): [FighterState, FighterState] {
  const fight = createFight({
    seed: 7,
    bounds: BOUNDS,
    fighters: [
      { key: "home", spd: 10, at: { x: 0, z: 0 } },
      { key: "away", spd: 10, at: { x: 1000, z: 0 } },
    ],
  })
  return [fight.state.fighters[0], fight.state.fighters[1]]
}

/** Push the foe sideways faster than its walk, so it reads as a burst. */
function burst(foe: FighterState, z: number): FighterState {
  return { ...foe, vel: { x: 0, y: 0, z } }
}

function swing(foe: FighterState, moveId: string): FighterState {
  return {
    ...foe,
    attack: { moveId, phase: "startup", elapsedMs: 0, landed: false },
  }
}

describe("pattern memory", () => {
  test("a burst is read as a side and expires after the window", () => {
    const [me, base] = pair()
    const foe = burst(base, 1900)
    const read = observe(EMPTY_MEMORY, me, foe, 100)
    expect(read.dodgeSign).toBe(1)
    expect(read.untilMs).toBe(100 + MEMORY_MS)
    // Same read, nothing new seen: the expiry is not refreshed.
    const quiet = observe(read, me, burst(foe, 0), 400)
    expect(quiet.untilMs).toBe(100 + MEMORY_MS)
    // Expired: the read is gone, not merely stale.
    const gone = observe(read, me, burst(foe, 0), 100 + MEMORY_MS)
    expect(gone.dodgeSign).toBe(0)
    expect(gone.openingMove).toBeNull()
  })

  test("the opening move is kept, and a new one refreshes the window", () => {
    const [me, base] = pair()
    const first = observe(EMPTY_MEMORY, me, swing(base, "basic"), 0)
    expect(first.openingMove).toBe("basic")
    expect(first.untilMs).toBe(MEMORY_MS)
    const second = observe(first, me, swing(base, "spark"), 300)
    expect(second.openingMove).toBe("basic")
    expect(second.untilMs).toBe(MEMORY_MS)
    // A read taken after the first expired starts a fresh one.
    const third = observe(second, me, swing(base, "spark"), MEMORY_MS)
    expect(third.openingMove).toBe("spark")
    expect(third.untilMs).toBe(MEMORY_MS + MEMORY_MS)
  })

  test("the record is fixed size, not a log", () => {
    const [me, base] = pair()
    let foe = base
    let read: PatternMemory = EMPTY_MEMORY
    for (let i = 0; i < 50; i++) {
      const side = i % 2 === 0 ? 1900 : -1900
      foe = swing(burst(foe, side), i % 2 ? "spark" : "basic")
      read = observe(read, me, foe, i * 100)
      expect(Object.keys(read).sort()).toEqual(Object.keys(EMPTY_MEMORY).sort())
    }
  })

  test("the read is deterministic", () => {
    const [me, base] = pair()
    const foe = swing(burst(base, 1900), "basic")
    expect(observe(EMPTY_MEMORY, me, foe, 100)).toEqual(
      observe(EMPTY_MEMORY, me, foe, 100),
    )
  })

  test("circling cuts against the read, and stops when it expires", () => {
    const [me, base] = pair()
    const read = observe(EMPTY_MEMORY, me, burst(base, 1900), 0)
    expect(read.dodgeSign).toBe(1)
    expect(strafeSide(read, 100, 1)).toBe(-1)
    expect(strafeSide(read, 100, -1)).toBe(-1)
    expect(strafeSide(read, MEMORY_MS, 1)).toBe(1)
  })

  test("a rear-seeker keeps its own side whatever the read says", () => {
    const [me, base] = pair()
    const read = observe(EMPTY_MEMORY, me, burst(base, 1900), 0)
    expect(strafeSide(read, 100, 1, true)).toBe(1)
    expect(strafeSide(read, 100, -1, true)).toBe(-1)
  })

  test("a ranged opener is answered with a shot while the read is live", () => {
    const [me, base] = pair()
    const ranged = observe(EMPTY_MEMORY, me, swing(base, "spark"), 0)
    expect(preferRangedPunish(ranged, 100)).toBe(true)
    expect(preferRangedPunish(ranged, MEMORY_MS)).toBe(false)
    const melee = observe(EMPTY_MEMORY, me, swing(base, "basic"), 0)
    expect(preferRangedPunish(melee, 100)).toBe(false)
  })
})
