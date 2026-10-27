/**
 * The board surface's copy (FR-5, FR-6, AC-5): four labelled boards and
 * quiet state lines — information, never an alarm.
 */
import { describe, expect, test } from "bun:test"
import {
  BOARD_CATEGORIES,
  BOARD_CHIP_LABEL,
  BOARD_EMPTY_COPY,
  BOARD_ERROR_COPY,
  BOARD_LOADING_COPY,
  BOARD_OFFLINE_COPY,
  BOARD_TITLE,
  boardCategoryLabel,
  boardOfflineLine,
  GHOST_BADGE_LABEL,
  GHOST_EMPTY_COPY,
  GHOST_ERROR_COPY,
  GHOST_FIGHT_LABEL,
  GHOST_SECTION_TITLE,
  GHOST_STALE_COPY,
  GHOST_VERSION_COPY,
  ghostPreviewLine,
  ghostStaleLine,
  staleAgeLine,
} from "./copy"

describe("board copy", () => {
  test("covers all four boards in spec order", () => {
    expect([...BOARD_CATEGORIES]).toEqual([
      "cups",
      "ladder",
      "ap",
      "collection",
    ])
  })

  test("every board has a short distinct label", () => {
    const labels = BOARD_CATEGORIES.map(boardCategoryLabel)
    expect(labels).toEqual([
      "Cup wins",
      "Ladder points",
      "Trainer AP",
      "Collection",
    ])
    expect(new Set(labels).size).toBe(4)
  })

  test("the surface names itself once, on the chip and the modal", () => {
    expect(BOARD_TITLE).toBe("Leaderboards")
    expect(BOARD_CHIP_LABEL).toBe("Boards")
  })

  test("loading says what is happening", () => {
    expect(BOARD_LOADING_COPY).toContain("boards")
  })

  test("the empty state is words, never a blank panel", () => {
    expect(BOARD_EMPTY_COPY.length).toBeGreaterThan(0)
  })

  test("the offline note says the boards are the last ones seen", () => {
    expect(BOARD_OFFLINE_COPY).toContain("last")
  })

  test("no state line raises its voice", () => {
    const lines = [
      BOARD_LOADING_COPY,
      BOARD_EMPTY_COPY,
      BOARD_OFFLINE_COPY,
      BOARD_ERROR_COPY,
    ]
    for (const line of lines) {
      expect(line).not.toContain("!")
    }
  })

  test("ghost rows read team then score, and missing stamps read shorter", () => {
    expect(ghostPreviewLine("Ember", 12, 3)).toBe("Ember · day 12 · round 3")
    expect(ghostPreviewLine("Ember", null, 3)).toBe("Ember · round 3")
    expect(ghostPreviewLine("Ember", null, null)).toBe("Ember")
  })

  test("the preview lists the kit the bout borrows, or nothing when bare", () => {
    expect(ghostPreviewLine("Ember", 12, 3, ["Spark", "Charge"])).toBe(
      "Ember · day 12 · round 3 · kit: Spark, Charge",
    )
    expect(ghostPreviewLine("Ember", null, null, [])).toBe("Ember")
  })

  test("a snapshot says how old last is, in the same quiet voice", () => {
    expect(staleAgeLine(1000, 1000)).toBe("Updated just now.")
    expect(staleAgeLine(9999, 1000)).toBe("Updated just now.")
    expect(staleAgeLine(0, 5 * 60 * 1000)).toBe("Updated 5 min ago.")
    expect(staleAgeLine(0, 3 * 60 * 60 * 1000)).toBe("Updated 3h ago.")
    expect(staleAgeLine(0, 2 * 24 * 60 * 60 * 1000)).toBe("Updated 2d ago.")
    const offline = boardOfflineLine(0, 60 * 1000)
    expect(offline).toContain(BOARD_OFFLINE_COPY)
    expect(offline).toContain("Updated 1 min ago.")
    const stale = ghostStaleLine(0, 60 * 1000)
    expect(stale).toContain(GHOST_STALE_COPY)
    expect(stale).toContain("Updated 1 min ago.")
    for (const line of [offline, stale]) {
      expect(line).not.toContain("!")
    }
  })

  test("ghost lines stay quiet information, never an alarm", () => {
    expect(GHOST_SECTION_TITLE).toBe("Ghost rivals")
    expect(GHOST_BADGE_LABEL).toBe("Ghost")
    expect(GHOST_FIGHT_LABEL).toBe("Fight Ghost")
    for (const line of [
      GHOST_EMPTY_COPY,
      GHOST_STALE_COPY,
      GHOST_ERROR_COPY,
      GHOST_VERSION_COPY,
    ]) {
      expect(line.length).toBeGreaterThan(0)
      expect(line).not.toContain("!")
    }
    expect(GHOST_STALE_COPY).toContain("last")
  })
})
