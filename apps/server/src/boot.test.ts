import { describe, expect, test } from "bun:test"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const ENTRY = join(import.meta.dir, "main.ts")

/**
 * The boot path is the one place a test has to leave the process: the promise
 * is that a server which cannot persist saves dies instead of serving. A
 * subprocess is the only honest way to observe an exit code. It binds no port,
 * because it never gets as far as listening.
 */
describe("boot", () => {
  test("exits non-zero and names the path when the database is unreachable", () => {
    const dir = mkdtempSync(join(tmpdir(), "apex-server-boot-"))
    try {
      const missing = join(dir, "absent", "apex.sqlite")
      const result = Bun.spawnSync({
        cmd: [process.execPath, ENTRY],
        env: { ...process.env, DATABASE_PATH: missing, PORT: "0" },
        stdout: "pipe",
        stderr: "pipe",
      })

      expect(result.exitCode).not.toBe(0)
      expect(result.stderr.toString()).toContain(missing)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
