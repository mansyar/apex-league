import type { Database } from "bun:sqlite"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

/**
 * Migration runner. The SQL under `apps/server/migrations` is the schema; this
 * module only decides what has already run. `_migrations` records one filename
 * per applied file, so re-running at every boot is a no-op by construction
 * rather than by a separate "already migrated?" check.
 */

const MIGRATIONS_DIR = join(import.meta.dir, "..", "migrations")
const LEDGER = "_migrations"

export type Migration = {
  name: string
  sql: string
}

/** Every committed migration, in filename order (which is why they are numbered). */
export function migrations(dir: string = MIGRATIONS_DIR): Migration[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => ({ name, sql: readFileSync(join(dir, name), "utf8") }))
}

function hasLedger(db: Database): boolean {
  const row = db
    .query(
      "SELECT 1 AS present FROM sqlite_master WHERE type = 'table' AND name = ?",
    )
    .get(LEDGER)
  return row !== null
}

/** Filenames already applied, in order. Empty for a database that has never booted. */
export function appliedMigrations(db: Database): string[] {
  if (!hasLedger(db)) return []
  const rows = db.query(`SELECT name FROM ${LEDGER} ORDER BY name`).all() as {
    name: string
  }[]
  return rows.map((row) => row.name)
}

/** The highest applied migration, or `null` when the database has no schema yet. */
export function schemaVersion(db: Database): string | null {
  return appliedMigrations(db).at(-1) ?? null
}

/**
 * Applies every migration not yet in the ledger and returns their filenames.
 * Each file runs inside its own transaction together with its ledger row, so a
 * failure halfway through leaves neither a half-applied schema nor a filename
 * claiming work that did not happen.
 */
export function migrate(db: Database, dir: string = MIGRATIONS_DIR): string[] {
  db.exec(
    `CREATE TABLE IF NOT EXISTS ${LEDGER} (
      name TEXT PRIMARY KEY NOT NULL,
      applied_at INTEGER NOT NULL
    )`,
  )
  const done = new Set(appliedMigrations(db))
  const pending = migrations(dir).filter(
    (migration) => !done.has(migration.name),
  )

  for (const migration of pending) {
    db.transaction(() => {
      db.exec(migration.sql)
      db.run(`INSERT INTO ${LEDGER} (name, applied_at) VALUES (?, ?)`, [
        migration.name,
        Date.now(),
      ])
    })()
  }

  return pending.map((migration) => migration.name)
}
