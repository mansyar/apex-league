/**
 * The sheet shows the numbers the fight uses (FR-2, AC-2): neither multiplier
 * that used to sit between the stat panel and the resolver may survive in
 * production code.
 *
 * `HP_SCALE_PERCENT = 210` scaled the pool behind the raw HP stat, and
 * `BLOW_WEIGHT = 2` doubled the attack term inside positional damage. Phase 5
 * folded both into the stored stats and `MoveDef.power`; a read of either name
 * anywhere in shipped code means the lie is back.
 */

import { describe, expect, test } from "bun:test"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { NEUTRAL_RATIO, positionalDamage } from "./continuous/damage"
import { startingHp } from "./continuous/hp"

const REPO_ROOT = join(import.meta.dir, "../../../..")
const SCAN_ROOTS = ["packages/sim/src", "packages/sim/scripts", "apps"]
const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".turbo",
  ".git",
])
const SOURCE_EXTENSIONS = /\.(ts|tsx|mts)$/
const FOLDED_NAME = /\b(?:HP_SCALE_PERCENT|BLOW_WEIGHT)\b/

function isSource(path: string): boolean {
  if (!SOURCE_EXTENSIONS.test(path)) return false
  return !path.includes(".test.") && !path.includes(".spec.")
}

function* sources(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      yield* sources(join(dir, entry.name))
    } else if (isSource(entry.name)) {
      yield join(dir, entry.name)
    }
  }
}

describe("the sheet is the fight (FR-2, AC-2)", () => {
  test("no production module reads the HP scale or the blow weight", () => {
    const offenders: string[] = []
    for (const root of SCAN_ROOTS) {
      for (const file of sources(join(REPO_ROOT, root))) {
        if (FOLDED_NAME.test(readFileSync(file, "utf8"))) {
          offenders.push(file.slice(REPO_ROOT.length + 1))
        }
      }
    }
    expect(offenders).toEqual([])
  })

  test("startingHp is an identity read of the stat", () => {
    const stats = { hp: 189, atk: 10, def: 10, spd: 10 }
    expect(startingHp({ stats })).toBe(189)
    expect(startingHp({ stats: { ...stats, hp: 143 } })).toBe(143)
  })

  test("positional damage is the attack term, with no weight left in it", () => {
    const plain = positionalDamage({
      power: 10,
      atk: 10,
      def: 10,
      type: NEUTRAL_RATIO,
      position: "front",
      counter: false,
    })
    expect(plain).toBe(10)
  })
})
