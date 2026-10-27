import type { Database } from "bun:sqlite"
import { describe, expect, test } from "bun:test"
import { openDatabase } from "../db"
import { createTrainer } from "../identity/trainer"
import { MAX_BOARD_ENTRIES, readBoard, submitScore } from "./store"

function setup(): Database {
  return openDatabase(":memory:")
}

describe("leaderboard store", () => {
  test("the first submit creates the entry", () => {
    const db = setup()
    try {
      const { id } = createTrainer(db)
      const outcome = submitScore(db, id, "cups", 3, "Ada", 1000)
      expect(outcome.updated).toBe(true)
      expect(outcome.entry).toEqual({
        category: "cups",
        value: 3,
        name: "Ada",
        updatedAt: 1000,
      })
    } finally {
      db.close()
    }
  })

  test("a beaten best is replaced, a lesser submit keeps it", () => {
    const db = setup()
    try {
      const { id } = createTrainer(db)
      submitScore(db, id, "ladder", 10, "Ada", 1000)
      const beaten = submitScore(db, id, "ladder", 15, "Ada", 2000)
      expect(beaten.updated).toBe(true)
      expect(beaten.entry.value).toBe(15)
      expect(beaten.entry.updatedAt).toBe(2000)

      const kept = submitScore(db, id, "ladder", 12, "Ada", 3000)
      expect(kept.updated).toBe(false)
      expect(kept.entry.value).toBe(15)
      // The achievement time stays pinned to the submit that set the value,
      // so a lesser score cannot jump its owner's tie order.
      expect(kept.entry.updatedAt).toBe(2000)
    } finally {
      db.close()
    }
  })

  test("an unbeaten submit still refreshes the name, an equal one keeps the value", () => {
    const db = setup()
    try {
      const { id } = createTrainer(db)
      submitScore(db, id, "cups", 3, "Ada", 1000)
      const renamed = submitScore(db, id, "cups", 1, "Ada Lovelace", 2000)
      expect(renamed.updated).toBe(false)
      expect(renamed.entry).toEqual({
        category: "cups",
        value: 3,
        name: "Ada Lovelace",
        updatedAt: 1000,
      })

      const board = readBoard(db, "cups")
      expect(board).toHaveLength(1)
      expect(board[0]?.name).toBe("Ada Lovelace")
    } finally {
      db.close()
    }
  })

  test("categories are independent per trainer", () => {
    const db = setup()
    try {
      const { id } = createTrainer(db)
      submitScore(db, id, "cups", 3, "Ada", 1000)
      submitScore(db, id, "ladder", 30, "Ada", 1000)
      expect(readBoard(db, "cups")).toHaveLength(1)
      expect(readBoard(db, "ladder")).toHaveLength(1)
      expect(readBoard(db, "ap")).toEqual([])
    } finally {
      db.close()
    }
  })

  test("the board orders by value desc, ties by earliest achievement then id", () => {
    const db = setup()
    try {
      const late = createTrainer(db).id
      const early = createTrainer(db).id
      const low = createTrainer(db).id
      submitScore(db, late, "cups", 5, "Late", 2000)
      submitScore(db, early, "cups", 5, "Early", 1000)
      submitScore(db, low, "cups", 2, "Low", 500)

      const board = readBoard(db, "cups")
      expect(board.map((entry) => entry.name)).toEqual(["Early", "Late", "Low"])
      // Standard competition ranking: the tie shares first place and the
      // next rank skips to third.
      expect(board.map((entry) => entry.rank)).toEqual([1, 1, 3])
    } finally {
      db.close()
    }
  })

  test("a same-moment tie falls back to trainer id order", () => {
    const db = setup()
    try {
      const first = createTrainer(db).id
      const second = createTrainer(db).id
      submitScore(db, first, "ap", 100, "One", 1000)
      submitScore(db, second, "ap", 100, "Two", 1000)

      const board = readBoard(db, "ap")
      const inIdOrder = first < second ? ["One", "Two"] : ["Two", "One"]
      expect(board.map((entry) => entry.name)).toEqual(inIdOrder)
      expect(board.map((entry) => entry.rank)).toEqual([1, 1])
    } finally {
      db.close()
    }
  })

  test("the board serves a fixed top-100", () => {
    const db = setup()
    try {
      for (let i = 0; i < MAX_BOARD_ENTRIES + 2; i += 1) {
        const { id } = createTrainer(db)
        submitScore(db, id, "collection", i, `Trainer ${i}`, 1000 + i)
      }
      const board = readBoard(db, "collection")
      expect(board).toHaveLength(MAX_BOARD_ENTRIES)
      expect(board[0]?.value).toBe(MAX_BOARD_ENTRIES + 1)
      expect(board[0]?.rank).toBe(1)
    } finally {
      db.close()
    }
  })
})
