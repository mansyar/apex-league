/**
 * The legacy fence (continuous-arena-battle FR-15): the gauge clock is
 * frozen replay-only. Two things must stay true, and this file is the guard
 * for both.
 *
 * 1. A live fight resolves through `resolveContinuous` and files a dense
 *    trace. The clock cannot produce one, so a stream-less result is the
 *    signature of the legacy path — and the live path never returns one.
 * 2. Nothing new in production may call `resolveBattle` or build a clock.
 *    The allow-list below is the whole current truth: the resolver itself
 *    (the frozen path), the clock's own definitions, and one known live
 *    caller (`apps/client/src/spar.ts`) that Phase 13 reported rather than
 *    deleted. Adding a site fails here on purpose — a new fight routed
 *    through the gauge clock is a design decision, not a quiet import.
 *
 * The scan reads source text, comments included: naming a call in prose with
 * parentheses trips it too. That is deliberate — the fence should be hard to
 * talk past.
 */

import { describe, expect, test } from "bun:test"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative, sep } from "node:path"

import { resolveContinuous } from "./continuous/resolve"
import { streamOf } from "./continuous/stream"
import { type BattleSide, resolveBattle } from "./resolver"

/** A side with every field filled, so a case only names what it changes. */
function side(over: Partial<BattleSide> = {}): BattleSide {
  return {
    name: "Ember",
    id: "ember",
    element: "fire",
    stats: { hp: 80, atk: 10, def: 8, spd: 10 },
    kit: ["spark", "flare_dart"],
    tactic: "balanced",
    temperament: "rush",
    ...over,
  }
}

const SEED = 11

const LIVE_A = side()
const LIVE_B = side({
  name: "Reed",
  id: "reed",
  element: "plant",
  stats: { hp: 80, atk: 9, def: 9, spd: 8 },
})

describe("the gauge clock is replay-only", () => {
  test("a live fight files the dense trace the clock cannot make", () => {
    const live = resolveContinuous(LIVE_A, LIVE_B, SEED)
    expect(streamOf(live)).toBeDefined()
    // A fight always logs an ending; the trace rides beside it (FR-13).
    expect(live.events.length).toBeGreaterThan(0)
  })

  test("the frozen resolver's result carries no dense trace", () => {
    const legacy = resolveBattle(LIVE_A, LIVE_B, SEED)
    // A restored verdict looks the same: no trace, so playback falls back to
    // the paced step path. The clock has no way to file one.
    expect(streamOf(legacy)).toBeUndefined()
  })

  test("no production module outside the frozen path builds a clock", () => {
    expect(productionCallSites()).toEqual(EXPECTED_CALL_SITES)
  })
})

// ── the production scan ────────────────────────────────────────────────────

const REPO_ROOT = join(import.meta.dir, "../../../..")

/** Every tree a shipped module can live in. Tests are exempt below. */
const SCAN_ROOTS = ["packages/sim/src", "apps"] as const

/** Build output and dependency trees hold no hand-written module. */
const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".turbo",
  ".git",
])

const SOURCE_EXTENSIONS = /\.(ts|tsx|mts)$/

/** A call (or a definition, which matches the same shape). */
const CLOCK_CALL = /\b(?:resolveBattle|createClock|createClockFighter)\s*\(/

/**
 * The current truth, repo-relative with `/` separators:
 *
 * - `battle/resolver.ts` — the frozen resolver, and the only caller of the
 *   clock's constructors;
 * - `battle/clock/engine.ts` — the constructors' definitions;
 * - `apps/client/src/spar.ts` — the known live caller Phase 13 reported.
 */
const EXPECTED_CALL_SITES: string[] = [
  "apps/client/src/spar.ts",
  "packages/sim/src/battle/clock/engine.ts",
  "packages/sim/src/battle/resolver.ts",
]

function isSource(name: string): boolean {
  return SOURCE_EXTENSIONS.test(name) && !/\.(test|spec)\./.test(name)
}

/** Every production source file under `dir`, recursively. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    if (statSync(full).isDirectory()) {
      return SKIP_DIRS.has(entry.name) ? [] : sourceFiles(full)
    }
    return isSource(entry.name) ? [full] : []
  })
}

/** Repo-relative, forward-slashed: the same report on every platform. */
function repoPath(full: string): string {
  return relative(REPO_ROOT, full).split(sep).join("/")
}

/**
 * The production files that reach for the clock, sorted. A non-vacuous scan
 * is part of the assertion: an empty tree would otherwise pass silently.
 */
function productionCallSites(): string[] {
  const files = SCAN_ROOTS.flatMap((root) => sourceFiles(join(REPO_ROOT, root)))
  expect(files.length).toBeGreaterThan(100)
  return files
    .filter((file) => CLOCK_CALL.test(readFileSync(file, "utf8")))
    .map(repoPath)
    .sort()
}
