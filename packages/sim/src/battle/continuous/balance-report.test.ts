/**
 * Battle balance report gate (FR-4, FR-5, FR-6, FR-7, AC-4, AC-5, AC-6, AC-7):
 * the species matrix, the doctrine table, the boss table, the base-hit band
 * and the duration distribution are measured by the same module
 * `bun run balance` runs, so the readable report and the CI gate cannot drift.
 *
 * The current roster does not pass the spec's species band or the one-in-three
 * cap target. That is expected: Phase 8 owns the re-tune, and this file records
 * today's misses as named targets with observed values. When Phase 8 fixes one,
 * this test fails on the stale list and the list is updated deliberately — the
 * bound itself is never weakened.
 */

import { describe, expect, test } from "bun:test"
import {
  type BalanceSample,
  describe as describeTarget,
  measure,
  report,
  run,
  targets,
  violations,
} from "../../../scripts/battle-balance-report"
import { ALL_SPECIES } from "../../species"

/** Measure the roster once for the whole file. */
let cached: BalanceSample | undefined

function sample(): BalanceSample {
  cached ??= measure()
  return cached
}

/**
 * Today's misses, in the order the report declares them: every species outside
 * 45-55% under the standard doctrine, then the cap share. Phase 9 owns the
 * roster rows; update the row, never the bound, when one is fixed. Phase 8
 * (FR-20) cleared the cap-share row, so it is no longer listed.
 */
const KNOWN_MISSES = [
  "species:fire_drake: observed 35.7% (20/56), bound 45.0%..55.0%",
  "species:plant_ox: observed 28.6% (16/56), bound 45.0%..55.0%",
  "species:electric_hound: observed 17.9% (10/56), bound 45.0%..55.0%",
  "species:wind_falcon: observed 25.0% (14/56), bound 45.0%..55.0%",
  "species:reefclaw: observed 57.1% (32/56), bound 45.0%..55.0%",
  "species:cindermoor: observed 57.1% (32/56), bound 45.0%..55.0%",
  "species:voltfox: observed 92.9% (52/56), bound 45.0%..55.0%",
  "species:galeheron: observed 82.1% (46/56), bound 45.0%..55.0%",
  "species:shalemole: observed 78.6% (44/56), bound 45.0%..55.0%",
  "species:mistkit: observed 17.9% (10/56), bound 45.0%..55.0%",
] as const

describe("balance report — one deterministic command (FR-7, AC-7)", () => {
  test("reports the roster, the doctrines, the bosses and every move", () => {
    const measured = sample()
    console.log(report(measured).join("\n"))
    expect(measured.matrix.species.length).toBe(ALL_SPECIES.length)
    expect(measured.matrix.fights).toBe(420)
    expect(measured.doctrines.length).toBe(4)
    for (const row of measured.doctrines) expect(row.fights).toBe(6)
    expect(measured.bosses.length).toBe(6)
    for (const row of measured.bosses) {
      expect(row.fights).toBe(30)
      expect(row.stage.length).toBeGreaterThan(0)
    }
    expect(measured.damage.rows.length).toBe(49)
  })

  test("states the sample size in the output", () => {
    const lines = report(sample()).join("\n")
    expect(lines).toContain("210 ordered pairings x 2 seeds = 420 fights")
    expect(lines).toContain("56 games per species")
    expect(lines).toContain("24 doctrine fights")
    expect(lines).toContain("180 boss fights")
  })

  test("excludes mirrors and gives every species the same schedule", () => {
    const measured = sample()
    const opponents = ALL_SPECIES.length - 1
    for (const row of measured.matrix.species) {
      // 14 opponents x 2 orders x 2 seeds; a species never fights itself.
      expect(row.games).toBe(opponents * 4)
      expect(row.wins + row.draws).toBeLessThanOrEqual(row.games)
    }
  })

  test("species and doctrines are measured separately (FR-5, AC-5)", () => {
    const measured = sample()
    // The doctrine table holds one species and one matchup; only the measured
    // side's doctrine varies, so a doctrine effect cannot read as species
    // strength. Circle's rear hunt must show as more flank-or-rear blows than
    // Press's straight line in the same matchup.
    const press = measured.doctrines.find((row) => row.id === "press")
    const circle = measured.doctrines.find((row) => row.id === "circle")
    if (!press || !circle) throw new Error("the doctrine table lost a row")
    expect(circle.rearOrFlank).toBeGreaterThan(press.rearOrFlank)
    expect(circle.engagementMedian).toBeGreaterThan(press.engagementMedian)
    for (const row of measured.doctrines) {
      expect(row.rearOrFlank).toBeGreaterThanOrEqual(0)
      expect(row.rearOrFlank).toBeLessThanOrEqual(1)
      expect(row.dodgeRate).toBeGreaterThanOrEqual(0)
      expect(row.dodgeRate).toBeLessThanOrEqual(1)
    }
  })

  test("bosses are a separate table, each beatable and not trivial (FR-6)", () => {
    const measured = sample()
    for (const boss of measured.bosses) {
      expect(boss.playerWins).toBeGreaterThan(0)
      expect(boss.playerWins).toBeLessThan(boss.fights)
    }
    const bossTargets = targets(measured).filter((target) =>
      target.name.startsWith("boss:"),
    )
    expect(bossTargets.length).toBe(6)
    for (const target of bossTargets) expect(target.ok).toBe(true)
  })

  test("the base-hit band is measured, not assumed (FR-1)", () => {
    const measured = sample()
    const shares = measured.damage.rows.map((row) => row.share)
    expect(Math.min(...shares)).toBeCloseTo(5.29, 2)
    expect(Math.max(...shares)).toBeCloseTo(11.64, 2)
    const band = targets(measured).find(
      (target) => target.name === "damageBand",
    )
    if (!band) throw new Error("the report lost the damage band target")
    expect(band.ok).toBe(true)
  })

  test("today's misses are named targets with their observed values", () => {
    expect(violations(sample()).map(describeTarget)).toEqual([...KNOWN_MISSES])
  })

  test("the gate exits non-zero and names the violated target", () => {
    const lines: string[] = []
    expect(run(sample(), (line) => lines.push(line))).toBe(1)
    expect(
      lines.some((line) =>
        line.startsWith(
          "FAIL species:voltfox: observed 92.9% (52/56), bound 45.0%..55.0%",
        ),
      ),
    ).toBe(true)
    // Phase 8 (FR-20) cleared the cap share, so the resolvability targets pass
    // and only the roster rows keep the gate non-zero.
    expect(lines.some((line) => line.startsWith("FAIL capShare:"))).toBe(false)
    expect(lines.some((line) => line.startsWith("ok   capShare:"))).toBe(true)
  })

  test("a target that holds is not reported as a violation", () => {
    const measured = sample()
    const fixed: BalanceSample = {
      ...measured,
      duration: { ...measured.duration, time: 0 },
    }
    expect(violations(fixed).some((row) => row.name === "capShare")).toBe(false)
    // The cap bound is integer-exact: 140/420 is one in three, 141 is not.
    const third: BalanceSample = {
      ...measured,
      duration: { ...measured.duration, time: 140, total: 420 },
    }
    expect(violations(third).some((row) => row.name === "capShare")).toBe(false)
  })

  test("the report replays byte for byte with no wall clock in it", () => {
    const once = report(sample()).join("\n")
    const twice = report(measure()).join("\n")
    expect(once).toBe(twice)
    expect(/\b\d{2}:\d{2}(:\d{2})?\b/.test(once)).toBe(false)
  })
})
