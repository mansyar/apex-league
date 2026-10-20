/**
 * Module size probe for the client modules this track created or split
 * (evolution_discovery_20261020 NFR-2, review finding F2).
 *
 * The 12 KB guard in `module-size.test.ts` scans only `scene-logic/` and
 * `ranch/`, so `creature-detail.ts` crossed the cap without failing anything.
 * These four pins cover the Growth modules and the shared tab controller they
 * now depend on: the split has to keep each part inside the cap, so a future
 * edit cannot quietly push one back over.
 */
import { expect, test } from "bun:test"
import { statSync } from "node:fs"
import { join } from "node:path"

/** Mirrors `CAP_BYTES` in module-size.test.ts — the project-wide cap. */
const CAP_BYTES = 12 * 1024

const MODULES = [
  "creature-detail.ts",
  "growth.ts",
  "growth-panel.ts",
  "ui/tabs.ts",
] as const

test("the Growth and tab-controller modules stay inside the 12 KB cap", () => {
  const oversized = MODULES.map((name) => ({
    name,
    bytes: statSync(join(import.meta.dir, name)).size,
  }))
    .filter(({ bytes }) => bytes > CAP_BYTES)
    .map(({ name, bytes }) => `${name} is ${bytes} B (cap ${CAP_BYTES} B)`)
  expect(oversized).toEqual([])
})
