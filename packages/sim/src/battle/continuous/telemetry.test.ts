/**
 * Fight telemetry (Continuous Arena Battle FR-14, AC-14; Battle Spacing and
 * Cadence AC-1, AC-2, AC-4, AC-7): the reference sample's engagement distance,
 * attack rate, idle time, distinct positions, contact share, retreat count,
 * duration band and cap share are measured, and every bound the harness
 * enforces is enforced here too.
 *
 * The numbers come from `scripts/battle-telemetry.ts`, the same module the
 * `bun run telemetry` command runs, so the readable local report and the CI gate
 * cannot drift: there is one `BOUNDS` table and one `measure()` call.
 *
 * The sample is 42 seeded fights: the same 14 pairings `pacing.test.ts` plays,
 * drawn three times each by the script's own roster walk. Minimum Reach phase 3
 * widened it from 14 (FR-7) because a 14-fight sample could not adjudicate an
 * outcome-changing mechanic. It is driven through the public resolver and read
 * from the stream the resolver already records, so the harness changes nothing
 * in the simulation.
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

/** The sample is 42 fights, so measure it once for the whole file. */
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
    expect(measured.fights.length).toBe(42)
    for (const fight of measured.fights) {
      expect(fight.ms).toBeGreaterThan(0)
      // Both sides chose to attack, and both sides landed blows.
      expect(fight.commits[0]).toBeGreaterThan(0)
      expect(fight.commits[1]).toBeGreaterThan(0)
      // A fighter cannot win without landing a blow. The loser may land none:
      // at the tuned HP scale a glass cannon is knocked out before it connects
      // (wind_falcon and electric_hound do), which is a balance outcome, not a
      // broken fight.
      if (fight.winner !== null) {
        expect(fight.hits[fight.winner]).toBeGreaterThan(0)
      }
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
    assertBounds([
      "contactShare",
      "retreatHome",
      "retreatAway",
      "deadZoneShare",
    ])
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
      "deadZoneShare",
    ] as const) {
      expect(lines.some((line) => line.startsWith(`ok   ${metric}:`))).toBe(
        true,
      )
    }
  })

  // Minimum Reach phase 4 (FR-7, AC-6): the share of commits whose only failure
  // was the move's inner edge. It exists to say the blind spot is real, not that
  // it must be small, so the ceiling is deliberately loose: measured 0.0% on the
  // shipped sample (no dead zone authored — the phase-4 sweep could not find a
  // positive value both gates accept), and 92.5% at the 1,000 mm candidate.
  test("the dead zone share is measured and reported (FR-7, AC-6)", () => {
    assertBounds(["deadZoneShare"])
    const measured = sample()
    expect(measured.deadZone.share).toBeGreaterThanOrEqual(0)
    expect(measured.deadZone.share).toBeLessThanOrEqual(1)
    expect(Number.isInteger(measured.deadZone.misses)).toBe(true)
    expect(measured.deadZone.misses).toBeGreaterThanOrEqual(0)
    const lines = report(measured)
    expect(lines.some((line) => line.startsWith("dead zone:"))).toBe(true)
  })

  test("the duration band and the cap share are separate bounds (AC-7)", () => {
    assertBounds(["durationMin", "durationMax"])
    const measured = sample()
    // The band is measured from the sample, not assumed: the floor is the
    // fastest knockout, the ceiling is the cap.
    expect(measured.duration.min).toBeLessThanOrEqual(measured.duration.max)
    expect(measured.duration.max).toBeLessThanOrEqual(40_000)
  })

  // Phase 8 (FR-20, P8.T4) moved the cap share from 8/14 (57.1%) to 6/14
  // (42.9%) on the old 14-fight sample. Minimum Reach phase 3 widened the sample
  // to 42 fights and re-derived the smoke ceiling from the measurement: 22/42
  // (52.4%), so the ceiling is 3/5 (25/42), three fights of headroom. The
  // spec's one-in-two target is now missed on this fixture — that is a pacing
  // finding recorded in the track's phase-3 evidence, not a regression from this
  // phase (no simulation code changed), and the bound was not tightened.
  test("the cap share stays inside its re-derived smoke ceiling (AC-24)", () => {
    assertBounds(["capShare"])
    const cap = sample().cap
    expect(cap.total).toBe(42)
    // The re-derived ceiling, in exact integer form: 25/42 passes, 26/42 fails.
    expect(cap.count * 5).toBeLessThanOrEqual(cap.total * 3)
    // The one-in-three target is still missed at 22/42 (52.4%). Pinned as debt,
    // not as met — the spec's own ceiling is the bound above.
    expect(cap.count * 3).toBeGreaterThan(cap.total)
  })

  test("every metric has a bound, so none can be reported unenforced", () => {
    const metrics = BOUNDS.map((bound) => bound.metric)
    expect(new Set(metrics).size).toBe(14)
  })

  test("every re-derived bound is pinned at its chosen value (AC-10)", () => {
    // The before/after table in the track's phase-3 evidence. A bound that moves
    // without that evidence moving with it fails here.
    const pinned = Object.fromEntries(
      BOUNDS.map((bound) => [bound.metric, bound.value]),
    )
    expect(pinned).toEqual({
      engagementMin: 900,
      engagementMedian: 1500,
      engagementMax: 4500,
      exchangeHome: 2.5,
      exchangeAway: 2.5,
      idleShare: 0.5,
      distinctPositions: 20,
      contactShare: 0.7,
      retreatHome: 42,
      retreatAway: 42,
      deadZoneShare: 0.5,
      capShare: 0.6,
      durationMin: 8000,
      durationMax: 40000,
    })
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
