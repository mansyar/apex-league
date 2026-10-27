import { Database } from "bun:sqlite"
import { describe, expect, test } from "bun:test"
import { appliedMigrations, migrate, schemaVersion } from "./migrate"

function freshDatabase(): Database {
  return new Database(":memory:")
}

function tables(db: Database): string[] {
  const rows = db
    .query("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all() as { name: string }[]
  return rows.map((row) => row.name)
}

describe("migrations", () => {
  test("a fresh database gets the committed schema", () => {
    const db = freshDatabase()
    try {
      expect(schemaVersion(db)).toBeNull()
      expect(migrate(db)).toEqual(["0001_init.sql", "0002_leaderboard.sql", "0003_ghost.sql"])
      expect(tables(db)).toEqual([
        "_migrations",
        "displaced_saves",
        "ghost_bests",
        "leaderboard_scores",
        "saves",
        "trainers",
      ])
      expect(schemaVersion(db)).toBe("0003_ghost.sql")
    } finally {
      db.close()
    }
  })

  test("running again applies nothing and keeps the data", () => {
    const db = freshDatabase()
    try {
      migrate(db)
      db.run(
        "INSERT INTO trainers (id, name, passphrase_hash, passphrase_salt, created_at) VALUES (?, ?, ?, ?, ?)",
        ["trn_1", "Ada", "hash", "salt", 1_700_000_000_000],
      )

      // Boot runs the same code every time, so a second call must be a no-op
      // rather than a "table already exists" crash.
      expect(migrate(db)).toEqual([])
      expect(migrate(db)).toEqual([])

      const counted = db.query("SELECT count(*) AS n FROM trainers").get() as {
        n: number
      }
      expect(counted.n).toBe(1)
      expect(appliedMigrations(db)).toEqual([
        "0001_init.sql",
        "0002_leaderboard.sql",
        "0003_ghost.sql",
      ])
    } finally {
      db.close()
    }
  })

  test("the ledger records the applied filename once", () => {
    const db = freshDatabase()
    try {
      migrate(db)
      migrate(db)
      const rows = db
        .query("SELECT name FROM _migrations ORDER BY name")
        .all() as { name: string }[]
      expect(rows).toEqual([
        { name: "0001_init.sql" },
        { name: "0002_leaderboard.sql" },
        { name: "0003_ghost.sql" },
      ])
    } finally {
      db.close()
    }
  })
})
