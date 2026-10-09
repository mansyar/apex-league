import { describe, expect, test } from "bun:test"

import {
  ACTION_POINTS_PER_DAY,
  advanceDay,
  createInitialState,
  isCupDay,
} from "./index"

describe("createInitialState", () => {
  test("starts on day 1 in the day phase", () => {
    const s = createInitialState()
    expect(s.day).toBe(1)
    expect(s.phase).toBe("day")
  })

  test("starts with a full action point budget", () => {
    const s = createInitialState()
    expect(s.actionPoints).toBe(ACTION_POINTS_PER_DAY)
    expect(ACTION_POINTS_PER_DAY).toBeGreaterThan(0)
  })
})

describe("advanceDay", () => {
  test("increments the day counter", () => {
    const s = advanceDay(createInitialState())
    expect(s.day).toBe(2)
  })

  test("advancing from day 6 lands on cup day 7 in the cup phase", () => {
    let s = createInitialState()
    for (let i = 0; i < 6; i++) s = advanceDay(s)
    expect(s.day).toBe(7)
    expect(s.phase).toBe("cup")
  })

  test("advancing from cup day returns to the day phase", () => {
    let s = createInitialState()
    for (let i = 0; i < 7; i++) s = advanceDay(s)
    expect(s.day).toBe(8)
    expect(s.phase).toBe("day")
  })

  test("resets action points on each day advance", () => {
    let s = createInitialState()
    s = { ...s, actionPoints: 0 }
    s = advanceDay(s)
    expect(s.actionPoints).toBe(ACTION_POINTS_PER_DAY)
  })

  test("is pure — does not mutate the input state", () => {
    const before = createInitialState()
    const snapshot = structuredClone(before)
    advanceDay(before)
    expect(before).toEqual(snapshot)
  })

  test("cup days recur every 7 days (7, 14, 21)", () => {
    let s = createInitialState()
    const cupDays: number[] = []
    for (let i = 0; i < 21; i++) {
      s = advanceDay(s)
      if (s.phase === "cup") cupDays.push(s.day)
    }
    expect(cupDays).toEqual([7, 14, 21])
  })
})

describe("isCupDay", () => {
  test("flags days 7, 14, 21", () => {
    expect(isCupDay(7)).toBe(true)
    expect(isCupDay(14)).toBe(true)
    expect(isCupDay(21)).toBe(true)
  })

  test("does not flag other days", () => {
    expect(isCupDay(1)).toBe(false)
    expect(isCupDay(6)).toBe(false)
    expect(isCupDay(8)).toBe(false)
  })
})
