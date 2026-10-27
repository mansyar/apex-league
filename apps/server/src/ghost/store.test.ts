import { Database } from "bun:sqlite"
import { describe, expect, test } from "bun:test"
import { migrate } from "../migrate"
import {
  MAX_GHOST_ENTRIES,
  readGhost,
  readGhostBoard,
  submitGhost,
} from "./store"

function testDatabase(): Database {
  const db = new Database(":memory:")
  migrate(db)
  return db
}

function payloadFor(seed: number): string {
  return JSON.stringify({ simVersion: 1, seed, events: [`win-${seed}`] })
}

describe("ghost store", () => {
  test("reads nothing before the first upload", () => {
    const db = testDatabase()
    try {
      expect(readGhost(db, "trn_ghost")).toBeUndefined()
      expect(readGhostBoard(db)).toEqual([])
    } finally {
      db.close()
    }
  })

  test("the first upload stores payload, name, and the submission time", () => {
    const db = testDatabase()
    try {
      const outcome = submitGhost(db, "trn_ghost", payloadFor(1), "Ada", 1000)
      expect(outcome).toEqual({
        stored: true,
        entry: { name: "Ada", payload: payloadFor(1), updatedAt: 1000 },
      })
      expect(readGhost(db, "trn_ghost")).toEqual(outcome.entry)
    } finally {
      db.close()
    }
  })

  test("the latest upload wins: no comparison, the stored row is replaced", () => {
    const db = testDatabase()
    try {
      submitGhost(db, "trn_ghost", payloadFor(1), "Ada", 1000)
      const outcome = submitGhost(db, "trn_ghost", payloadFor(2), "Ada", 2000)
      expect(outcome.entry).toEqual({
        name: "Ada",
        payload: payloadFor(2),
        updatedAt: 2000,
      })
      expect(readGhost(db, "trn_ghost")?.payload).toBe(payloadFor(2))
    } finally {
      db.close()
    }
  })

  test("a rename lands on the next upload, like the leaderboard", () => {
    const db = testDatabase()
    try {
      submitGhost(db, "trn_ghost", payloadFor(1), "Ada", 1000)
      submitGhost(db, "trn_ghost", payloadFor(2), "Bex", 2000)
      expect(readGhost(db, "trn_ghost")?.name).toBe("Bex")
    } finally {
      db.close()
    }
  })

  test("trainers never share a row", () => {
    const db = testDatabase()
    try {
      submitGhost(db, "trn_ada", payloadFor(1), "Ada", 1000)
      submitGhost(db, "trn_bex", payloadFor(2), "Bex", 2000)
      expect(readGhost(db, "trn_ada")?.payload).toBe(payloadFor(1))
      expect(readGhost(db, "trn_bex")?.payload).toBe(payloadFor(2))
    } finally {
      db.close()
    }
  })

  test("the board is newest first, then trainer id, ranked by position", () => {
    const db = testDatabase()
    try {
      submitGhost(db, "trn_bex", payloadFor(2), "Bex", 2000)
      submitGhost(db, "trn_ada", payloadFor(1), "Ada", 2000)
      submitGhost(db, "trn_cyd", payloadFor(3), "Cyd", 1000)
      expect(readGhostBoard(db)).toEqual([
        {
          rank: 1,
          trainerId: "trn_ada",
          name: "Ada",
          updatedAt: 2000,
          payload: payloadFor(1),
        },
        {
          rank: 2,
          trainerId: "trn_bex",
          name: "Bex",
          updatedAt: 2000,
          payload: payloadFor(2),
        },
        {
          rank: 3,
          trainerId: "trn_cyd",
          name: "Cyd",
          updatedAt: 1000,
          payload: payloadFor(3),
        },
      ])
    } finally {
      db.close()
    }
  })

  test("the board holds the hundred newest ghosts", () => {
    const db = testDatabase()
    try {
      for (let n = 0; n < MAX_GHOST_ENTRIES + 2; n += 1) {
        const id = `trn_${String(n).padStart(3, "0")}`
        submitGhost(db, id, payloadFor(n), `Trainer ${n}`, 1000 + n)
      }
      const board = readGhostBoard(db)
      expect(board).toHaveLength(MAX_GHOST_ENTRIES)
      expect(board[0]?.trainerId).toBe(
        `trn_${String(MAX_GHOST_ENTRIES + 1).padStart(3, "0")}`,
      )
      expect(board[0]?.rank).toBe(1)
      expect(board[MAX_GHOST_ENTRIES - 1]?.rank).toBe(MAX_GHOST_ENTRIES)
    } finally {
      db.close()
    }
  })
})
