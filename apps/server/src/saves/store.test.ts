import { describe, expect, test } from "bun:test"
import { openDatabase } from "../db"
import { createTrainer } from "../identity/trainer"
import { pushSave, readDisplacedSave, readSave } from "./store"

/**
 * The store's own guarantees, tested without HTTP: the two clocks are separate
 * facts, the schema's primary key really is what keeps one save per trainer,
 * and a conflict either commits whole or not at all.
 */
function freshDb() {
  return openDatabase(":memory:")
}

describe("pushSave", () => {
  test("records the server's clock beside the client's", () => {
    const db = freshDb()
    const { id } = createTrainer(db)

    const before = Date.now()
    pushSave(db, id, { payload: "client-clock", savedAt: 1_000 })

    const row = db.query("SELECT saved_at, received_at FROM saves").get() as {
      saved_at: number
      received_at: number
    }
    expect(row.saved_at).toBe(1_000)
    expect(row.received_at).toBeGreaterThanOrEqual(before)
    // Two different facts, and neither is derived from the other: `saved_at`
    // is what the client claimed, `received_at` is when it actually arrived.
    expect(row.received_at).not.toBe(row.saved_at)
  })

  test("keeps exactly one save per trainer", () => {
    const db = freshDb()
    const { id } = createTrainer(db)

    pushSave(db, id, { payload: "one", savedAt: 1_000 })
    pushSave(db, id, { payload: "two", savedAt: 2_000 })
    pushSave(db, id, { payload: "three", savedAt: 3_000 })

    expect(db.query("SELECT COUNT(*) AS n FROM saves").get()).toEqual({ n: 1 })
    expect(readSave(db, id)).toEqual({ payload: "three", savedAt: 3_000 })
  })

  test("a failure between the displace and the overwrite leaves neither", () => {
    const db = freshDb()
    const { id } = createTrainer(db)
    pushSave(db, id, { payload: "keep", savedAt: 1_000 })

    // Force the second half of the conflict to fail after the first half has
    // already written. A displaced row without the overwrite would look like a
    // recoverable conflict that never happened, so the pair must roll back.
    db.exec(
      "CREATE TRIGGER refuse_save_update BEFORE UPDATE ON saves BEGIN SELECT RAISE(ABORT, 'refused'); END",
    )

    expect(() =>
      pushSave(db, id, { payload: "newer", savedAt: 2_000 }),
    ).toThrow()

    expect(readSave(db, id)).toEqual({ payload: "keep", savedAt: 1_000 })
    expect(readDisplacedSave(db, id)).toBeUndefined()
  })
})
