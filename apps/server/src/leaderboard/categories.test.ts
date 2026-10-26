import { describe, expect, test } from "bun:test"
import {
  isLeaderboardCategory,
  isPlausibleScore,
  LEADERBOARD_CATEGORIES,
  MAX_COLLECTION_BREADTH,
  MAX_CUP_WINS,
  MAX_LADDER_POINTS,
  MAX_TRAINER_AP,
  SCORE_CAPS,
} from "./categories"

describe("leaderboard categories", () => {
  test("the boards are exactly the four spec categories", () => {
    expect([...LEADERBOARD_CATEGORIES]).toEqual([
      "cups",
      "ladder",
      "ap",
      "collection",
    ])
  })

  test("every category has a positive cap", () => {
    for (const category of LEADERBOARD_CATEGORIES) {
      expect(SCORE_CAPS[category]).toBeGreaterThan(0)
    }
    expect(SCORE_CAPS).toEqual({
      cups: MAX_CUP_WINS,
      ladder: MAX_LADDER_POINTS,
      ap: MAX_TRAINER_AP,
      collection: MAX_COLLECTION_BREADTH,
    })
  })

  test("unknown categories are rejected", () => {
    expect(isLeaderboardCategory("wins")).toBe(false)
    expect(isLeaderboardCategory("Cups")).toBe(false)
    expect(isLeaderboardCategory("")).toBe(false)
    expect(isLeaderboardCategory(undefined)).toBe(false)
    expect(isLeaderboardCategory(42)).toBe(false)
  })

  test("zero and the cap itself are plausible", () => {
    for (const category of LEADERBOARD_CATEGORIES) {
      expect(isPlausibleScore(category, 0)).toBe(true)
      expect(isPlausibleScore(category, SCORE_CAPS[category])).toBe(true)
    }
  })

  test("negatives, fractions, and non-finite values are implausible", () => {
    expect(isPlausibleScore("cups", -1)).toBe(false)
    expect(isPlausibleScore("ladder", 1.5)).toBe(false)
    expect(isPlausibleScore("ap", Number.NaN)).toBe(false)
    expect(isPlausibleScore("ap", Number.POSITIVE_INFINITY)).toBe(false)
    expect(isPlausibleScore("collection", Number.NEGATIVE_INFINITY)).toBe(false)
    expect(isPlausibleScore("cups", "3")).toBe(false)
    expect(isPlausibleScore("cups", null)).toBe(false)
  })

  test("anything over the cap is implausible", () => {
    expect(isPlausibleScore("cups", MAX_CUP_WINS + 1)).toBe(false)
    expect(isPlausibleScore("ladder", MAX_LADDER_POINTS + 1)).toBe(false)
    expect(isPlausibleScore("ap", MAX_TRAINER_AP + 1)).toBe(false)
    expect(isPlausibleScore("collection", MAX_COLLECTION_BREADTH + 1)).toBe(
      false,
    )
  })
})
