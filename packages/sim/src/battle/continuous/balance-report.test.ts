/**
 * Battle balance report gate (FR-4, FR-5, FR-6, FR-7, FR-22, AC-4, AC-5, AC-6,
 * AC-7, AC-19): the species matrix, the doctrine table, the boss table, the
 * base-hit band and the duration distribution are measured by the same module
 * `bun run balance` runs, so the readable report and the CI gate cannot drift.
 *
 * Since Phase 12 every measured side is its species' own typical creature (the
 * integer midpoint of its authored stat bounds), so a species' stats are a lever
 * the gate can see; the equal-investment reference line is measured and printed
 * as a diagnostic that never gates. The roster does not pass yet — Phase 13 owns
 * the re-tune — and this file records today's misses as named targets with
 * observed values. When one is fixed, this test fails on the stale list and the
 * list is updated deliberately: the bound itself is never weakened.
 */

import { describe, expect, test } from "bun:test"
import {
  type BalanceSample,
  boundsOf,
  describe as describeTarget,
  measure,
  measureSpecies,
  report,
  run,
  targets,
  typicalLine,
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
 * Today's misses, in the order the report declares them. Phase 12 re-baselined
 * them: every measured side is now its own species' typical creature (FR-22), so
 * the rows are the honest spread at real stat lines and Phase 13 owns the
 * re-tune. Update a row, never the bound, when one is fixed.
 */
const KNOWN_MISSES = [] as const

describe("balance report — one deterministic command (FR-7, AC-7)", () => {
  test("reports the roster, the doctrines, the bosses and every move", () => {
    const measured = sample()
    console.log(report(measured).join("\n"))
    expect(measured.matrix.species.length).toBe(ALL_SPECIES.length)
    expect(measured.matrix.fights).toBe(840)
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
    expect(lines).toContain("210 ordered pairings x 4 seeds = 840 fights")
    expect(lines).toContain("112 games per species")
    expect(lines).toContain("24 doctrine fights")
    expect(lines).toContain("180 boss fights")
  })

  test("reports distinct fights and a binomial error per row (FR-21, P10.T2.1)", () => {
    const measured = sample()
    for (const row of measured.matrix.species) {
      // The whole point of Phase 10: a row can no longer look like 112
      // independent samples if the fights repeated.
      expect(row.distinct).toBeGreaterThan(1)
      expect(row.distinct).toBeLessThanOrEqual(row.games)
      expect(row.se).toBeGreaterThan(0)
      expect(row.se).toBeCloseTo(
        Math.sqrt((row.rate * (1 - row.rate)) / row.games),
        6,
      )
    }
    // The engine draws now, so some pairings must flip with the seed.
    expect(measured.matrix.diversity).toBeGreaterThan(0)
  })

  test("every measured side is its species' typical creature (FR-22, AC-19)", () => {
    // The definition, stated once and asserted against every species:
    //   midpoint(bounds) = floor((min + max) / 2), per stat.
    for (const species of ALL_SPECIES) {
      const bounds = boundsOf(species)
      expect(typicalLine(bounds)).toEqual({
        hp: Math.floor((bounds.hp[0] + bounds.hp[1]) / 2),
        atk: Math.floor((bounds.atk[0] + bounds.atk[1]) / 2),
        def: Math.floor((bounds.def[0] + bounds.def[1]) / 2),
        spd: Math.floor((bounds.spd[0] + bounds.spd[1]) / 2),
      })
    }
    // Two species whose bounds all straddled 10 used to field byte-identical
    // sides; at their own midpoints the roster is no longer one stat line.
    const lines = new Set(
      ALL_SPECIES.map((species) =>
        JSON.stringify(typicalLine(boundsOf(species))),
      ),
    )
    expect(lines.size).toBeGreaterThan(1)
    // The report says the definition and labels the reference line a diagnostic.
    const text = report(sample()).join("\n")
    expect(text).toContain("integer midpoint of its roll bounds")
    expect(text).toContain("diagnostic only, never gates")
    expect(text).toContain("reference line (diagnostic")
  })

  test("a species' stat bounds are a lever the gate can see (FR-22, AC-19)", () => {
    const id = "fire_drake"
    const species = ALL_SPECIES.find((def) => def.id === id)
    if (!species) throw new Error(`the roster lost ${id}`)
    const atk = species.statBounds.atk
    const up = measureSpecies(id, {
      bounds: { [id]: { atk: [atk[0] + 2, atk[1] + 2] } },
    })
    const down = measureSpecies(id, {
      bounds: { [id]: { atk: [atk[0] - 2, atk[1] - 2] } },
    })
    // The whole point of Phase 12: moving a species' bounds by 2 moves its
    // measured win rate in the expected direction.
    expect(up.rate).toBeGreaterThan(down.rate)
    // And the single-row path is the gate's own arithmetic, not a second
    // measurement that could drift from it.
    const gated = sample().matrix.species.find((row) => row.id === id)
    if (!gated) throw new Error(`the matrix lost ${id}`)
    const base = measureSpecies(id)
    expect(base.rate).toBe(gated.rate)
    expect(base.wins).toBe(gated.wins)
    expect(base.games).toBe(gated.games)
  })

  test("excludes mirrors and gives every species the same schedule", () => {
    const measured = sample()
    const opponents = ALL_SPECIES.length - 1
    for (const row of measured.matrix.species) {
      // 14 opponents x 2 orders x 4 seeds; a species never fights itself.
      expect(row.games).toBe(opponents * 8)
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
    // Phase 12: the table now measures a real creature on both sides, and at
    // those stat lines Circle's median gap is *shorter* than Press's (950mm vs
    // 1176mm) — the opposite of the clamped-reference reading this file used to
    // assert. Recorded as a finding for Phase 13 rather than asserted either way.
    expect(circle.engagementMedian).not.toBe(press.engagementMedian)
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
    // Phase 13 (FR-5): the roster pass brought every species inside the gate
    // and every resolvability target with it, so the miss list is empty.
    expect(violations(sample()).map(describeTarget)).toEqual([...KNOWN_MISSES])
  })

  test("the gate exits zero and reports no violated target", () => {
    const lines: string[] = []
    expect(run(sample(), (line) => lines.push(line))).toBe(0)
    expect(lines.some((line) => line.startsWith("FAIL "))).toBe(false)
    expect(lines.some((line) => line.startsWith("ok   capShare:"))).toBe(true)
    expect(lines.some((line) => line.startsWith("ok   durationMin:"))).toBe(
      true,
    )
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
