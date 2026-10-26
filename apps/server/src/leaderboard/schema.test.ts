import { Database } from "bun:sqlite"
import { describe, expect, test } from "bun:test"
import { getTableColumns } from "drizzle-orm"
import { migrate } from "../migrate"
import { leaderboardScores } from "../schema"

/**
 * The leaderboard drift check lives beside the store because the table is
 * this module's. Same promise as `schema.test.ts`: the migration is
 * hand-written SQL, the queries go through Drizzle, and this is where the two
 * meet before a runtime failure does it for us.
 */
describe("leaderboard schema", () => {
  test("leaderboard_scores matches the committed migration", () => {
    const db = new Database(":memory:")
    migrate(db)
    try {
      const rows = db.query("PRAGMA table_info(leaderboard_scores)").all() as {
        name: string
      }[]
      expect(rows.map((row) => row.name).sort()).toEqual(
        Object.values(getTableColumns(leaderboardScores))
          .map((column) => column.name)
          .sort(),
      )
    } finally {
      db.close()
    }
  })
})
