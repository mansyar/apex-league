/**
 * Module size probe for the client modules this track created or split
 * (evolution_discovery_20261020 NFR-2, review finding F2).
 *
 * The 12 KB guard in `module-size.test.ts` scans only `scene-logic/` and
 * `ranch/`, so `creature-detail.ts` crossed the cap without failing anything.
 * These three pins cover exactly the Growth modules: the extraction has to
 * keep both halves inside the cap, and a future edit to either cannot quietly
 * push it back over.
 */
import { expect, test } from "bun:test"
import { statSync } from "node:fs"
import { join } from "node:path"

/** Mirrors `CAP_BYTES` in module-size.test.ts — the project-wide cap. */
const CAP_BYTES = 12 * 1024

const MODULES = ["creature-detail.ts", "growth.ts", "growth-panel.ts"] as const

test("the Growth modules stay inside the 12 KB cap", () => {
  const oversized = MODULES.map((name) => ({
    name,
    bytes: statSync(join(import.meta.dir, name)).size,
  }))
    .filter(({ bytes }) => bytes > CAP_BYTES)
    .map(({ name, bytes }) => `${name} is ${bytes} B (cap ${CAP_BYTES} B)`)
  expect(oversized).toEqual([])
})
