/**
 * Ladder tests (bronze_ladder_20261012): cup placements convert to ladder
 * points; crossing thresholds climbs Bronze III → II → I automatically.
 * Table-driven per the workflow: every rule has success AND failure cases.
 */

import { describe, expect, it } from "bun:test"
import { applyCupPlacement, initialLadder } from "./ladder"
import { createInitialState } from "./state"

function freshState() {
  return createInitialState()
}

describe("initialLadder", () => {
  it("starts at Bronze III with zero points", () => {
    expect(initialLadder()).toEqual({
      points: 0,
      tier: "bronze",
      subTier: "III",
    })
  })

  it("is part of the fresh GameState", () => {
    expect(freshState().ladder).toEqual({
      points: 0,
      tier: "bronze",
      subTier: "III",
    })
  })
})

describe("applyCupPlacement — placement → points table", () => {
  const cases = [
    { placement: 1 as const, expected: 3 },
    { placement: 2 as const, expected: 2 },
    { placement: 3 as const, expected: 1 },
    { placement: 4 as const, expected: 0 },
  ]
  for (const { placement, expected } of cases) {
    it(`placement ${placement} awards +${expected} points`, () => {
      const s = freshState()
      const r = applyCupPlacement(s, placement, false)
      expect(r.state.ladder.points).toBe(expected)
    })
  }

  it("a forfeited cup awards 0 points even at the semifinal stage", () => {
    const s = freshState()
    const r = applyCupPlacement(s, 3, true)
    expect(r.state.ladder.points).toBe(0)
    expect(r.state.ladder.subTier).toBe("III")
  })
})

describe("applyCupPlacement — threshold crossings", () => {
  it("crossing 6 promotes Bronze III → II", () => {
    // Champion (+3) then champion (+3) = 6 → Bronze II.
    const first = applyCupPlacement(freshState(), 1, false)
    const second = applyCupPlacement(first.state, 1, false)
    expect(second.state.ladder.points).toBe(6)
    expect(second.state.ladder.subTier).toBe("II")
    expect(second.climbed).toBe(true)
  })

  it("one point below the threshold stays put (5 → Bronze III)", () => {
    // Champion (+3) + runner-up (+2) = 5 → still Bronze III.
    const first = applyCupPlacement(freshState(), 1, false)
    const second = applyCupPlacement(first.state, 2, false)
    expect(second.state.ladder.points).toBe(5)
    expect(second.state.ladder.subTier).toBe("III")
    expect(second.climbed).toBe(false)
  })

  it("crossing 12 promotes Bronze II → I", () => {
    // 3 + 2 + 3 + 3 = 11 → still Bronze II; then +1 = 12 → Bronze I.
    let s = freshState()
    for (const placement of [1, 2, 1, 1] as const) {
      s = applyCupPlacement(s, placement, false).state
    }
    expect(s.ladder.points).toBe(11)
    expect(s.ladder.subTier).toBe("II")
    const climb = applyCupPlacement(s, 3, false)
    expect(climb.state.ladder.points).toBe(12)
    expect(climb.state.ladder.subTier).toBe("I")
    expect(climb.climbed).toBe(true)
  })

  it("one point below the top threshold stays put (11 → Bronze II)", () => {
    let s = freshState()
    for (const placement of [1, 2, 1, 1] as const) {
      s = applyCupPlacement(s, placement, false).state
    }
    expect(s.ladder.points).toBe(11)
    expect(s.ladder.subTier).toBe("II")
  })

  it("a single cup cannot skip a sub-tier past the next threshold", () => {
    // At 5, a champion lands on 8 — Bronze II, not I.
    const first = applyCupPlacement(freshState(), 1, false)
    const second = applyCupPlacement(first.state, 2, false) // 5
    const third = applyCupPlacement(second.state, 1, false) // 8
    expect(third.state.ladder.points).toBe(8)
    expect(third.state.ladder.subTier).toBe("II")
  })
})

describe("applyCupPlacement — losses never subtract", () => {
  it("an early exit keeps the current points and sub-tier", () => {
    let s = freshState()
    for (const placement of [1, 2] as const) {
      s = applyCupPlacement(s, placement, false).state
    } // 5, Bronze III
    const exit = applyCupPlacement(s, 4, false)
    expect(exit.state.ladder.points).toBe(5)
    expect(exit.state.ladder.subTier).toBe("III")
    expect(exit.climbed).toBe(false)
  })

  it("a forfeit at a higher rung never subtracts points", () => {
    let s = freshState()
    for (const placement of [1, 1] as const) {
      s = applyCupPlacement(s, placement, false).state
    } // 6, Bronze II
    const forfeit = applyCupPlacement(s, 3, true)
    expect(forfeit.state.ladder.points).toBe(6)
    expect(forfeit.state.ladder.subTier).toBe("II")
  })
})

describe("applyCupPlacement — top of the ladder", () => {
  it("points keep banking past 12 while subTier stays Bronze I", () => {
    let s = freshState()
    for (const placement of [1, 1, 1, 1] as const) {
      s = applyCupPlacement(s, placement, false).state
    } // 12 → Bronze I
    const more = applyCupPlacement(s, 1, false)
    expect(more.state.ladder.points).toBe(15)
    expect(more.state.ladder.subTier).toBe("I")
    expect(more.climbed).toBe(false)
    expect(more.topReached).toBe(true)
  })

  it("topReached does not fire below the top sub-tier", () => {
    const r = applyCupPlacement(freshState(), 1, false)
    expect(r.topReached).toBe(false)
  })
})

describe("applyCupPlacement — purity", () => {
  it("leaves the input state untouched", () => {
    const s = freshState()
    const snapshot = structuredClone(s)
    applyCupPlacement(s, 1, false)
    expect(s).toEqual(snapshot)
  })
})
