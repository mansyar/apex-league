/**
 * The board's last-snapshot cache (FR-6, AC-5): the last good fetch of all
 * four boards, beside the save and never inside it. A corrupt value reads as
 * absent; a refused write stays quiet.
 */
import { describe, expect, test } from "bun:test"
import { createMemoryAdapter, type SaveAdapter } from "@apex/sim"
import type { BoardEntry } from "../cloud/api"
import {
  BOARD_SNAPSHOT_KEY,
  type BoardSnapshot,
  isBoardEntry,
  readBoardSnapshot,
  writeBoardSnapshot,
} from "./snapshot"

function entry(over: Partial<BoardEntry> = {}): BoardEntry {
  return { rank: 1, trainerId: "trn_abc", name: "Ada", value: 3, ...over }
}

function snapshot(): BoardSnapshot {
  return {
    boards: {
      cups: [entry()],
      ladder: [entry({ trainerId: "trn_def", name: "Bea", value: 7 })],
      ap: [],
      collection: [
        entry({ trainerId: "trn_def", name: "Bea", value: 5 }),
        entry({ rank: 1, trainerId: "trn_aaa", name: "Al", value: 5 }),
        entry({ rank: 3, trainerId: "trn_abc", name: "Ada", value: 2 }),
      ],
    },
    fetchedAt: 42,
  }
}

describe("board snapshot", () => {
  test("a good fetch round-trips, ties and ranks verbatim", () => {
    const storage = createMemoryAdapter()
    const before = snapshot()
    writeBoardSnapshot(storage, before)
    expect(readBoardSnapshot(storage)).toEqual(before)
  })

  test("a fresh browser with no snapshot reads as absent", () => {
    expect(readBoardSnapshot(createMemoryAdapter())).toBeNull()
  })

  test("a corrupt value reads as absent, never a throw", () => {
    const storage = createMemoryAdapter()
    storage.setItem(BOARD_SNAPSHOT_KEY, "{not json")
    expect(readBoardSnapshot(storage)).toBeNull()
  })

  test.each([
    ["boards missing", { fetchedAt: 1 }],
    ["boards not an object", { boards: [], fetchedAt: 1 }],
    ["a category missing", { boards: { cups: [] }, fetchedAt: 1 }],
    ["a category not a list", { boards: null, fetchedAt: 1 }],
    [
      "fetchedAt missing",
      { boards: { cups: [], ladder: [], ap: [], collection: [] } },
    ],
    [
      "fetchedAt not finite",
      {
        boards: { cups: [], ladder: [], ap: [], collection: [] },
        fetchedAt: Number.NaN,
      },
    ],
    ["a stored string", "apex.boards"],
  ])("a %s snapshot reads as absent", (_label, stored) => {
    const storage = createMemoryAdapter()
    storage.setItem(BOARD_SNAPSHOT_KEY, JSON.stringify(stored))
    expect(readBoardSnapshot(storage)).toBeNull()
  })

  test("malformed rows are dropped; the board they rode in on still shows", () => {
    const storage = createMemoryAdapter()
    storage.setItem(
      BOARD_SNAPSHOT_KEY,
      JSON.stringify({
        boards: {
          cups: [
            entry(),
            { rank: 0, trainerId: "trn_bad", name: "No", value: 1 },
            { rank: 2, trainerId: "", name: "No", value: 1 },
            { rank: 2, trainerId: "trn_bad", name: "", value: 1 },
            { rank: 2, trainerId: "trn_bad", name: "No", value: -1 },
            { rank: 2.5, trainerId: "trn_bad", name: "No", value: 1 },
            "not a row",
          ],
          ladder: [],
          ap: [],
          collection: [],
        },
        fetchedAt: 7,
      }),
    )
    expect(readBoardSnapshot(storage)?.boards.cups).toEqual([entry()])
  })

  test("a refused write stays quiet — the next fetch retries", () => {
    const storage = createMemoryAdapter()
    const failing: SaveAdapter = {
      ...storage,
      setItem: () => {
        throw new Error("quota")
      },
    }
    expect(() => writeBoardSnapshot(failing, snapshot())).not.toThrow()
    expect(readBoardSnapshot(storage)).toBeNull()
  })

  test("served ranks are shaped like the wire", () => {
    expect(isBoardEntry(entry())).toBe(true)
    expect(isBoardEntry(null)).toBe(false)
    expect(isBoardEntry({ rank: 1, trainerId: "t", name: "N" })).toBe(false)
  })
})
