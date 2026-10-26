import { Database } from "bun:sqlite"
import { describe, expect, test } from "bun:test"
import { getTableColumns } from "drizzle-orm"
import { migrate } from "./migrate"
import { displacedSaves, saves, trainers } from "./schema"

/**
 * The migration is hand-written SQL while the queries are written against the
 * Drizzle tables, so the two can drift. Comparing the columns SQLite actually
 * created against the columns Drizzle believes in is the only place that drift
 * shows up before a query fails at runtime.
 */
function migratedDatabase(): Database {
  const db = new Database(":memory:")
  migrate(db)
  return db
}

function sqliteColumns(db: Database, table: string): string[] {
  const rows = db.query(`PRAGMA table_info(${table})`).all() as {
    name: string
  }[]
  return rows.map((row) => row.name).sort()
}

describe("drizzle schema", () => {
  test("trainers matches the committed migration", () => {
    const db = migratedDatabase()
    try {
      expect(sqliteColumns(db, "trainers")).toEqual(
        Object.values(getTableColumns(trainers))
          .map((column) => column.name)
          .sort(),
      )
    } finally {
      db.close()
    }
  })

  test("saves matches the committed migration", () => {
    const db = migratedDatabase()
    try {
      expect(sqliteColumns(db, "saves")).toEqual(
        Object.values(getTableColumns(saves))
          .map((column) => column.name)
          .sort(),
      )
    } finally {
      db.close()
    }
  })

  test("displaced_saves matches the committed migration", () => {
    const db = migratedDatabase()
    try {
      expect(sqliteColumns(db, "displaced_saves")).toEqual(
        Object.values(getTableColumns(displacedSaves))
          .map((column) => column.name)
          .sort(),
      )
    } finally {
      db.close()
    }
  })

  test("a save payload is stored as opaque text", () => {
    const db = migratedDatabase()
    try {
      db.run(
        "INSERT INTO trainers (id, name, passphrase_hash, passphrase_salt, created_at) VALUES (?, ?, ?, ?, ?)",
        ["trn_1", "Ada", "hash", "salt", 1_700_000_000_000],
      )
      // A payload from a newer client than this server understands: it must
      // come back byte for byte, because the server never parses it.
      const payload = '{"saveVersion":99,"unknown":["nested",{"a":1}]}'
      db.run(
        "INSERT INTO saves (trainer_id, payload, saved_at, received_at) VALUES (?, ?, ?, ?)",
        ["trn_1", payload, 1_700_000_000_001, 1_700_000_000_002],
      )
      const row = db
        .query("SELECT payload FROM saves WHERE trainer_id = ?")
        .get("trn_1") as { payload: string }
      expect(row.payload).toBe(payload)
    } finally {
      db.close()
    }
  })
})
