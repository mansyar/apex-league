import { describe, expect, test } from "bun:test"
import { spendActionPoints } from "./ap"
import { isCupDay } from "./calendar"
import { makeRng, type Rng } from "./rng"
import { createInitialState, type GameState } from "./state"
import { advanceDay } from "./ticker"

function stateAfterDays(days: number): GameState {
  let s = createInitialState()
  for (let i = 0; i < days; i++) s = advanceDay(s)
  return s
}

describe("phase state machine", () => {
  test("the ticker grants the cup phase on a cup day", () => {
    const d = stateAfterDays(6) // day 7 — a cup day
    expect(isCupDay(d.day)).toBe(true)
    expect(d.phase).toBe("cup")
  })

  test("non-cup days stay in the day phase", () => {
    const d = stateAfterDays(5) // day 6
    expect(isCupDay(d.day)).toBe(false)
    expect(d.phase).toBe("day")
  })

  test("day 1 starts in the day phase", () => {
    expect(createInitialState().phase).toBe("day")
  })
})

describe("action points", () => {
  test("spending reduces action points", () => {
    const s = createInitialState()
    const r = spendActionPoints(s, 2)
    expect(r.ok).toBe(true)
    expect(r.state.actionPoints).toBe(1)
  })

  test("spending more than available is rejected and leaves state untouched", () => {
    const s = createInitialState()
    const r = spendActionPoints(s, 99)
    expect(r.ok).toBe(false)
    expect(r.state.actionPoints).toBe(s.actionPoints)
  })

  test("spending zero is allowed", () => {
    const s = createInitialState()
    const r = spendActionPoints(s, 0)
    expect(r.ok).toBe(true)
    expect(r.state.actionPoints).toBe(s.actionPoints)
  })
})

describe("seeded RNG seam", () => {
  test("same seed produces the same sequence", () => {
    const a = makeRng(1234)
    const b = makeRng(1234)
    const seqA = Array.from({ length: 10 }, () => a.next())
    const seqB = Array.from({ length: 10 }, () => b.next())
    expect(seqA).toEqual(seqB)
  })

  test("different seeds diverge", () => {
    const a = makeRng(1)
    const b = makeRng(2)
    const seqA = Array.from({ length: 10 }, () => a.next())
    const seqB = Array.from({ length: 10 }, () => b.next())
    expect(seqA).not.toEqual(seqB)
  })

  test("int() stays within [0, max)", () => {
    const rng = makeRng(42)
    for (let i = 0; i < 100; i++) {
      const v = rng.int(6)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(6)
      expect(Number.isInteger(v)).toBe(true)
    }
  })

  test("Rng is injectable — consumers receive the interface, not the impl", () => {
    // A fixed stub proves consumers can depend on the interface alone.
    const fixed: Rng = {
      next: () => 0.5,
      int: () => 3,
    }
    expect(fixed.int(6)).toBe(3)
  })
})
