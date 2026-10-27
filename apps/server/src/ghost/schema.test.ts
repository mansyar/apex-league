import { Database } from "bun:sqlite"
import { describe, expect, test } from "bun:test"
import { getTableColumns } from "drizzle-orm"
import { migrate } from "../migrate"
import { ghostBests } from "../schema"

/**
 * The ghost drift check lives beside the store because the table is this
 * module's. Same promise as `schema.test.ts` and the leaderboard precedent:
 * the migration is hand-written SQL, the queries go through Drizzle, and this
 * is where the two meet before a runtime failure does it for us.
 */
describe("ghost schema", () => {
  test("ghost_bests matches the committed migration", () => {
    const db = new Database(":memory:")
    migrate(db)
    try {
      const rows = db.query("PRAGMA table_info(ghost_bests)").all() as {
        name: string
      }[]
      expect(rows.map((row) => row.name).sort()).toEqual(
        Object.values(getTableColumns(ghostBests))
          .map((column) => column.name)
          .sort(),
      )
    } finally {
      db.close()
    }
  })

  test("a ghost payload is stored as opaque text", () => {
    const db = new Database(":memory:")
    migrate(db)
    try {
      db.run(
        "INSERT INTO trainers (id, name, passphrase_hash, passphrase_salt, created_at) VALUES (?, ?, ?, ?, ?)",
        ["trn_1", "Ada", "hash", "salt", 1_700_000_000_000],
      )
      // A bundle from a newer sim than this server understands: it must come
      // back byte for byte, because the server validates the shape but never
      // migrates the contents. The reader, not the store, decides whether the
      // version is replayable.
      const payload = '{"simVersion":999,"seed":7,"future":["nested",{"a":1}]}'
      db.run(
        "INSERT INTO ghost_bests (trainer_id, payload, name, updated_at) VALUES (?, ?, ?, ?)",
        ["trn_1", payload, "Ada", 1_700_000_000_001],
      )
      const row = db
        .query("SELECT payload FROM ghost_bests WHERE trainer_id = ?")
        .get("trn_1") as { payload: string }
      expect(row.payload).toBe(payload)
    } finally {
      db.close()
    }
  })
})
