import { Database } from "bun:sqlite"
import { statSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { migrate } from "./migrate"

/**
 * Opening the database is the one boot step that must never degrade quietly: a
 * server that cannot persist saves but still answers requests loses a player's
 * progress silently. Every failure here therefore throws, naming the path, and
 * the entry point lets the process die.
 */

function isInMemory(path: string): boolean {
  return path === ":memory:" || path.startsWith("file::memory:")
}

function assertUsableParent(path: string): void {
  const parent = dirname(resolve(path))
  const stats = statSync(parent, { throwIfNoEntry: false })
  if (!stats) {
    throw new Error(
      `cannot open the database at ${path}: directory ${parent} does not exist`,
    )
  }
  if (!stats.isDirectory()) {
    throw new Error(
      `cannot open the database at ${path}: ${parent} is not a directory`,
    )
  }
}

/**
 * Opens (creating if needed) the SQLite database at `path` and brings its
 * schema up to date. `:memory:` skips the filesystem checks and is what the
 * route tests use, so no test needs a file or a port.
 */
export function openDatabase(path: string): Database {
  if (!isInMemory(path)) assertUsableParent(path)

  let db: Database
  try {
    db = new Database(path, { create: true })
  } catch (cause) {
    throw new Error(`cannot open the database at ${path}`, { cause })
  }

  try {
    migrate(db)
  } catch (cause) {
    db.close()
    throw new Error(`cannot migrate the database at ${path}`, { cause })
  }

  return db
}
