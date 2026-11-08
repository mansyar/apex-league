/**
 * Fight telemetry (Continuous Arena Battle FR-14, AC-14, AC-24; Battle Spacing
 * and Cadence AC-1, AC-2, AC-4): the reference sample's engagement distance,
 * attack rate, idle time, distinct positions, contact share, retreat count and
 * cap share are measured, and every bound the harness enforces is enforced
 * here too.
 *
 * The numbers come from `scripts/battle-telemetry.ts`, the same module the
 * `bun run telemetry` command runs, so the readable local report and the CI gate
 * cannot drift: there is one `BOUNDS` table and one `measure()` call.
 *
 * The sample is the 14 seeded matchups `pacing.test.ts` pins. It is driven
 * through the public resolver and read from the stream the resolver already
 * records, so the harness changes nothing in the simulation.
 */

import { describe, expect, test } from "bun:test"
import {
  BOUNDS,
  describe as describeViolation,
  type Metric,
  measure,
  report,
  run,
  type SampleTelemetry,
  violations,
} from "../../../scripts/battle-telemetry"

/** The sample is 14 fights, so measure it once for the whole file. */
let cached: SampleTelemetry | undefined

function sample(): SampleTelemetry {
  cached ??= measure()
  return cached
}

/** Assert no bound on these metrics is broken, naming the ones that are. */
function assertBounds(metrics: readonly Metric[]): void {
  const broken = violations(sample())
    .filter((violation) => metrics.includes(violation.bound.metric))
    .map(describeViolation)
  expect(broken).toEqual([])
}

describe("telemetry — the fight is not turn-based (FR-14, AC-14)", () => {
  test("reports every metric for every matchup", () => {
    const measured = sample()
    console.log(report(measured).join("\n"))
    expect(measured.fights.length).toBe(14)
    for (const fight of measured.fights) {
      expect(fight.ms).toBeGreaterThan(0)
      // Both sides chose to attack, and both sides landed blows.
      expect(fight.commits[0]).toBeGreaterThan(0)
      expect(fight.commits[1]).toBeGreaterThan(0)
      expect(fight.hits[0]).toBeGreaterThan(0)
      expect(fight.hits[1]).toBeGreaterThan(0)
      // Movement is continuous: many positions, not two poses.
      expect(fight.distinct[0]).toBeGreaterThan(1)
      expect(fight.distinct[1]).toBeGreaterThan(1)
      // The gap summary is a real summary of the steps it sampled.
      expect(fight.gaps.length).toBe(fight.ms / 20)
      expect(fight.gap.min).toBeLessThanOrEqual(fight.gap.median)
      expect(fight.gap.median).toBeLessThanOrEqual(fight.gap.max)
      expect(fight.idle).toBeGreaterThanOrEqual(0)
      expect(fight.idle).toBeLessThanOrEqual(1)
      // Contact share is a share of the same steps, and retreats are whole
      // orders that can only count up.
      expect(fight.contact).toBeGreaterThanOrEqual(0)
      expect(fight.contact).toBeLessThanOrEqual(1)
      expect(Number.isInteger(fight.retreats[0])).toBe(true)
      expect(Number.isInteger(fight.retreats[1])).toBe(true)
      expect(fight.retreats[0]).toBeGreaterThanOrEqual(0)
      expect(fight.retreats[1]).toBeGreaterThanOrEqual(0)
    }
  })

  test("the fighters close to fighting range and stay engaged", () => {
    assertBounds(["engagementMin", "engagementMedian", "engagementMax"])
  })

  test("both sides keep committing attacks and the fight is not idle", () => {
    assertBounds(["exchangeHome", "exchangeAway", "idleShare"])
  })

  test("every side visits many distinct positions", () => {
    assertBounds(["distinctPositions"])
  })

  test("contact, retreats and attack rate are measured and bounded", () => {
    assertBounds(["contactShare", "retreatHome", "retreatAway"])
    const measured = sample()
    expect(measured.contact).toBeGreaterThanOrEqual(0)
    expect(measured.contact).toBeLessThanOrEqual(1)
    expect(measured.retreats.home).toBeGreaterThanOrEqual(0)
    expect(measured.retreats.away).toBeGreaterThanOrEqual(0)
    // The report names the new metrics with their observed values, so a local
    // run and CI read the same table.
    const lines = report(measured)
    for (const metric of [
      "contactShare",
      "retreatHome",
      "retreatAway",
    ] as const) {
      expect(lines.some((line) => line.startsWith(`ok   ${metric}:`))).toBe(
        true,
      )
    }
  })

  test("at most one fight in two is decided at the cap (AC-24)", () => {
    assertBounds(["capShare"])
    const cap = sample().cap
    expect(cap.total).toBe(14)
    expect(cap.count).toBeLessThanOrEqual(cap.total / 2)
  })

  test("every metric has a bound, so none can be reported unenforced", () => {
    const metrics = BOUNDS.map((bound) => bound.metric)
    expect(new Set(metrics).size).toBe(11)
  })

  test("a violated threshold is named with its observed value (AC-14)", () => {
    const measured = sample()
    const stalled: SampleTelemetry = { ...measured, idle: 0.99 }
    const idle = violations(stalled).map(describeViolation)
    expect(idle.some((line) => line.startsWith("idleShare:"))).toBe(true)
    expect(idle.some((line) => line.includes("observed"))).toBe(true)

    const passive: SampleTelemetry = {
      ...measured,
      exchange: { ...measured.exchange, home: 99 },
    }
    const rate = violations(passive).map(describeViolation)
    expect(rate.some((line) => line.startsWith("exchangeHome:"))).toBe(true)

    const crowded: SampleTelemetry = { ...measured, contact: 1.01 }
    const contact = violations(crowded).map(describeViolation)
    expect(contact.some((line) => line.startsWith("contactShare:"))).toBe(true)

    // A bound that holds is not reported.
    expect(violations(measured)).toEqual([])
  })

  test("the harness exits non-zero when a bound is violated (AC-14)", () => {
    const passing: string[] = []
    expect(run(sample(), (line) => passing.push(line))).toBe(0)
    expect(passing.some((line) => line.startsWith("FAIL"))).toBe(false)

    const stalled: SampleTelemetry = { ...sample(), idle: 0.99 }
    const failing: string[] = []
    expect(run(stalled, (line) => failing.push(line))).toBe(1)
    expect(failing.some((line) => line.startsWith("FAIL idleShare:"))).toBe(
      true,
    )
  })

  test("the sample replays byte for byte", () => {
    expect(JSON.stringify(sample())).toBe(JSON.stringify(measure()))
  })
})
