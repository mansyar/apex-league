/**
 * Fight telemetry (Continuous Arena Battle FR-14, AC-14; Battle Spacing and
 * Cadence AC-1, AC-2, AC-4, AC-7): the gated representative sample's engagement distance,
 * attack rate, idle time, distinct positions, contact share, retreat count,
 * duration band and cap share are measured, and every bound the harness
 * enforces is enforced here too.
 *
 * The numbers come from `scripts/battle-telemetry.ts`, the same module the
 * `bun run telemetry` command runs, so the readable local report and the CI gate
 * cannot drift: there is one `BOUNDS` table and one `measure()` call.
 *
 * The sample is 42 seeded fights on 42 distinct pairings, drawn by the script's
 * own written roster rule — one seed each, so a stalled pairing cannot count
 * three times. Minimum Reach phase 3 widened the sample from 14 (FR-7) because
 * a 14-fight sample could not adjudicate an outcome-changing mechanic; this
 * track re-composed it because the old 14-pairing x 3-seed walk replayed ten
 * pairings three times and measured its own composition. It is driven through
 * the public resolver and read from the stream the resolver already records, so
 * the harness changes nothing in the simulation.
 */

import { describe, expect, test } from "bun:test"
import {
  BOUNDS,
  type Bound,
  describe as describeViolation,
  type MeasureOptions,
  type Metric,
  matchups,
  measure,
  measureFight,
  pool,
  report,
  run,
  type SampleTelemetry,
  violations,
} from "../../../scripts/battle-telemetry"
import { ALL_SPECIES } from "../../species"

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
  // FR-3 / AC-3: the fixture must measure the roster, not its own composition.
  // The old walk was 14 pairings x 3 seeds with `away = (i * 5 + 7) % 15`;
  // gcd(5, 15) = 5, so only three species ever appeared on the away side and a
  // stalled pairing contributed three caps. These pins are what stop the walk
  // drifting back to triple-counting.
  test("the sample is 42 distinct pairings spread across the roster (FR-3)", () => {
    const drawn = matchups()
    expect(drawn.length).toBe(42)
    // 42 fights, 42 distinct pairings: no `home v away` may appear twice.
    expect(new Set(drawn.map((m) => `${m.home.id} v ${m.away.id}`)).size).toBe(
      42,
    )
    // One seed each, and every seed distinct.
    expect(new Set(drawn.map((m) => m.seed)).size).toBe(42)
    // No mirrors: a mirror keys both sides the same, so the event log cannot
    // attribute a blow to a side.
    for (const matchup of drawn) {
      expect(matchup.home.id).not.toBe(matchup.away.id)
    }
    // Every species is home and away at least twice. The old walk only ever put
    // three species on the away side, which is why its cap share was largely a
    // reading of its own composition.
    for (const species of ALL_SPECIES) {
      const home = drawn.filter((m) => m.home.id === species.id).length
      const away = drawn.filter((m) => m.away.id === species.id).length
      expect(home).toBeGreaterThanOrEqual(2)
      expect(away).toBeGreaterThanOrEqual(2)
    }
    // The rule is deterministic: two calls draw the same list.
    expect(matchups()).toEqual(drawn)
  })

  test("reports every metric for every matchup", () => {
    const measured = sample()
    console.log(report(measured).join("\n"))
    expect(measured.fights.length).toBe(42)
    const knownIdleLabel = "gale_moth v emberwing"
    const knownIdleSeed = matchups().find(
      (m) => `${m.home.id} v ${m.away.id}` === knownIdleLabel,
    )?.seed
    expect(knownIdleSeed).toBe(20261146)
    const zeroCommit = measured.fights.filter(
      (fight) => fight.commits[0] === 0 || fight.commits[1] === 0,
    )
    expect(zeroCommit.map((fight) => fight.label)).toEqual([knownIdleLabel])
    expect(zeroCommit[0]?.ms).toBe(45000)
    expect(zeroCommit[0]?.idle).toBe(1)
    expect(zeroCommit[0]?.contact).toBe(0)
    for (const fight of measured.fights) {
      expect(fight.ms).toBeGreaterThan(0)
      // Both sides chose to attack, except for the one documented cadence
      // resonance (owner revision 2026-11-24 in the track spec): midpoint +
      // press makes gale_moth v emberwing @ seed 20261146 bounce between
      // retreat and advance on every 240 ms decision tick, so neither side
      // reaches the press branch. No bound or game gate was changed for it.
      if (fight.label !== knownIdleLabel) {
        expect(fight.commits[0]).toBeGreaterThan(0)
        expect(fight.commits[1]).toBeGreaterThan(0)
      }
      // A fighter cannot win without landing a blow, except for the pinned
      // cadence-resonance cap fight, whose time winner is decided on HP share.
      // The loser may land none: at the tuned HP scale a glass cannon is
      // knocked out before it connects (wind_falcon and electric_hound do),
      // which is a balance outcome, not a broken fight.
      if (fight.winner !== null && fight.label !== knownIdleLabel) {
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
  // it must be small, so the ceiling is deliberately loose: every row with
  // reachMm >= 5000 authors 90 mm, so the shipped sample measures 2.4%, and the
  // 1,000 mm candidate measured 92.5%.
  test("the dead zone share is measured and reported (FR-7, AC-6)", () => {
    assertBounds(["deadZoneShare"])
    const measured = sample()
    expect(measured.deadZone.share).toBeGreaterThanOrEqual(0)
    expect(measured.deadZone.share).toBeLessThanOrEqual(1)
    expect(Number.isInteger(measured.deadZone.misses)).toBe(true)
    // The metric must be able to see the mechanic: a regression to an unauthored
    // dead zone reads 0 here, so zero is the failure this pins, not the ceiling.
    expect(measured.deadZone.misses).toBeGreaterThan(0)
    const lines = report(measured)
    expect(lines.some((line) => line.startsWith("dead zone:"))).toBe(true)
  })

  test("the duration band and the cap share are separate bounds (AC-7)", () => {
    assertBounds(["durationMin", "durationMax"])
    const measured = sample()
    // The band is measured from the sample, not assumed: the floor is the
    // fastest knockout, the ceiling is the cap.
    expect(measured.duration.min).toBeLessThanOrEqual(measured.duration.max)
    expect(measured.duration.max).toBeLessThanOrEqual(45_000)
  })

  // Phase 8 (FR-20, P8.T4) moved the cap share from 8/14 (57.1%) to 6/14
  // (42.9%) on the old 14-fight sample. Minimum Reach phase 3 widened the sample
  // to 42 fights and re-derived the smoke ceiling from the measurement: 22/42
  // (52.4%) at minReachMm = 0, so the ceiling is 3/5, three fights of headroom.
  // Phase 4's 90 mm dead zone then consumed two of them: the shipped 14-pairing
  // x 3-seed walk read 25/42 (59.5%), one fight of headroom.
  //
  // That reading was largely a reading of the fixture's own composition: ten
  // stalled pairings, each replayed three times. This track re-composed the
  // sample to 42 distinct pairings with one seed each (FR-3). On that same walk
  // the historical reference + split sample measures 20/42 (47.6%), while the
  // representative midpoint + press sample gated here measures 5/42 (11.9%).
  // The ceiling is untouched at 3/5 and the one-in-three pin below is the
  // gate's own assertion, not the matrix's D-1 fence.
  test("the cap share stays inside its re-derived smoke ceiling (AC-24)", () => {
    assertBounds(["capShare"])
    const cap = sample().cap
    expect(cap.total).toBe(42)
    // The re-derived ceiling, in exact integer form: 25/42 passes, 26/42 fails.
    expect(cap.count * 5).toBeLessThanOrEqual(cap.total * 3)
    // The track's target on the historical reference + split sample: at most
    // 21 of 42 (52%). 20/42 passes with one fight of headroom; 22/42 fails.
    expect(cap.count * 100).toBeLessThanOrEqual(cap.total * 52)
    // The 45 s cap (20261120 track) took the sample to 11/42 (26.2%), so the
    // one-in-three target is now met; this pin flips from debt to met.
    expect(cap.count * 3).toBeLessThanOrEqual(cap.total)
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
      engagementMax: 8000,
      exchangeHome: 2.5,
      exchangeAway: 2.5,
      idleShare: 0.5,
      distinctPositions: 16,
      contactShare: 0.7,
      retreatHome: 42,
      retreatAway: 42,
      deadZoneShare: 0.5,
      capShare: 0.6,
      durationMin: 8000,
      durationMax: 45000,
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

  // FR-6: the harness can be asked for the other three (stat basis x doctrine)
  // cells, and asking for nothing is still the shipped fixture. Phase 3 pins the
  // four readings; this pins only that the parameters are wired and that
  // omitting them is the same path as naming the defaults.
  test("the stat basis and the doctrine mix default to the shipped fixture (FR-6)", () => {
    const [first] = matchups()
    if (!first) throw new Error("the sample is empty")
    const shipped = measureFight(first)
    expect(measureFight(first, {})).toEqual(shipped)
    expect(
      measureFight(first, { statBasis: "reference", doctrine: "split" }),
    ).toEqual(shipped)
    // Both parameters are live: some pairing in the sample plays differently
    // under each of the other settings. `some` stops at the first difference,
    // so this stays cheap.
    const moves = (options: MeasureOptions): boolean =>
      matchups().some(
        (matchup) =>
          JSON.stringify(measureFight(matchup, options)) !==
          JSON.stringify(measureFight(matchup)),
      )
    expect(moves({ statBasis: "midpoint" })).toBe(true)
    expect(moves({ doctrine: "press" })).toBe(true)
  })

  test("the sample replays byte for byte", () => {
    expect(JSON.stringify(sample())).toBe(JSON.stringify(measure()))
  })
})

describe("telemetry — representative gate and historical smoke (20261124 D-4)", () => {
  test("the gated sample uses midpoint stats and press doctrine (AC-2)", () => {
    const representative = pool(
      matchups().map((matchup) =>
        measureFight(matchup, { statBasis: "midpoint", doctrine: "press" }),
      ),
    )
    expect(sample()).toEqual(representative)
    expect(sample().cap.count).toBe(5)
    expect(sample().cap.total).toBe(42)
    expect(sample().duration.min).toBe(12500)
    expect(Math.round(sample().engagement.max)).toBe(6061)
    expect(sample().distinct.min).toBe(19)
  })

  test("the two re-derived bounds cite the before and after readings (AC-4)", () => {
    const boundFor = (metric: Metric): Bound => {
      const found = BOUNDS.find((bound) => bound.metric === metric)
      expect(found).toBeDefined()
      if (!found) throw new Error(`missing bound ${metric}`)
      return found
    }
    const engagement = boundFor("engagementMax")
    const positions = boundFor("distinctPositions")
    expect(engagement.kind).toBe("max")
    expect(engagement.value).toBe(8000)
    expect(engagement.why).toContain("3992")
    expect(engagement.why).toContain("6061")
    expect(positions.kind).toBe("min")
    expect(positions.value).toBe(16)
    expect(positions.why).toContain("31")
    expect(positions.why).toContain("19")
    expect(boundFor("capShare").value).toBe(0.6)
  })

  test("smoke keeps the historical sample and adds no gate (AC-3)", async () => {
    interface SmokeApi {
      measureSmoke(): SampleTelemetry
      main(smoke?: boolean, out?: (line: string) => void): number
    }
    const script = (await import(
      "../../../scripts/battle-telemetry"
    )) as unknown as SmokeApi
    const historical = pool(
      matchups().map((matchup) =>
        measureFight(matchup, {
          statBasis: "reference",
          doctrine: "split",
        }),
      ),
    )
    expect(script.measureSmoke()).toEqual(historical)
    expect(script.measureSmoke().cap.count).toBe(11)
    expect(script.measureSmoke().duration.min).toBe(9080)
    const lines: string[] = []
    expect(script.main(true, (line) => lines.push(line))).toBe(0)
    expect(lines.some((line) => line.includes("SMOKE"))).toBe(true)
    expect(lines.some((line) => line.startsWith("FAIL"))).toBe(false)
  })
})
