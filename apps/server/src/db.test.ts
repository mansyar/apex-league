import { describe, expect, test } from "bun:test"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { openDatabase } from "./db"
import { schemaVersion } from "./migrate"

function scratchDir(): string {
  return mkdtempSync(join(tmpdir(), "apex-server-db-"))
}

describe("openDatabase", () => {
  test("opens a file database and migrates it", () => {
    const dir = scratchDir()
    try {
      const db = openDatabase(join(dir, "apex.sqlite"))
      try {
        expect(schemaVersion(db)).toBe("0002_leaderboard.sql")
      } finally {
        db.close()
      }
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test("opens in-memory without touching the filesystem", () => {
    const db = openDatabase(":memory:")
    try {
      expect(schemaVersion(db)).toBe("0002_leaderboard.sql")
    } finally {
      db.close()
    }
  })

  test("fails loudly when the parent directory is missing, naming the path", () => {
    const dir = scratchDir()
    try {
      const target = join(dir, "no-such-dir", "apex.sqlite")
      expect(() => openDatabase(target)).toThrow(target)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test("fails loudly when the parent path is a file, naming the path", () => {
    const dir = scratchDir()
    try {
      const blocker = join(dir, "not-a-dir")
      writeFileSync(blocker, "occupied")
      const target = join(blocker, "apex.sqlite")
      expect(() => openDatabase(target)).toThrow(target)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
