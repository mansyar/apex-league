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
  CAP_MARGIN_FLOOR_BP,
  describe as describeTarget,
  designBandMisses,
  fightSignature,
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
 * Today's target misses, in the order the report declares them. Rework 2 (owner
 * ruling 2026-11-10) retired the knockout-only band as a gate: a cap decision
 * is an outlasting win, so FR-4 now bounds cap share, the median and the fifth
 * percentile, and FR-20 gates a *decisive* share (knockouts plus cap wins whose
 * HP margin clears `CAP_MARGIN_FLOOR_BP`). The band stays printed as a
 * diagnostic.
 *
 * Rework 4 (R4 T2) left one entry: `earth_tortoise`. The phase measured the
 * paired delta of every candidate attack band and reverted the row to its
 * authored 10-14, because no whole-band shift with a ceiling at or below 15
 * moves the row at all — 11-15 is a zero-flip change — and the only bands that
 * clear the gate either lift the ceiling above every starter's (12-16, 13-17)
 * or compress the roll to reach the same midpoint (13-15). The row was recorded
 * as a red gate by decision, not a stale list.
 *
 * R5 closed it from the other side of the sheet. The tortoise's problem was
 * volume, not reach or power: `recoveryMsFor` scales recovery by
 * `10 / spd`, so at spd 4 every swing costs 2.5x recovery and it got a third of
 * its opponent's attempts. Startup is the one authored frame field that is not
 * SPD-scaled, and the trace shows the tank commits to exactly two rows — the
 * innate strike and `boulder_toss`. Shortening `boulder_toss` startup 600 -> 512
 * moved the row from 26.8% to 39.3% with every pacing row still green, so the
 * list is empty and the gate exits 0.
 */
const KNOWN_MISSES: readonly string[] = []

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
      // independent samples if the fights repeated. R1: `se` is the binomial
      // error over the *distinct* fights, not over the games — a row resting
      // on 6 distinct fights carries the noise of 6.
      expect(row.distinct).toBeGreaterThan(1)
      expect(row.distinct).toBeLessThanOrEqual(row.games)
      expect(row.se).toBeGreaterThan(0)
      expect(row.se).toBeCloseTo(Math.sqrt(0.25 / row.distinct), 6)
    }
    // The engine draws now, so some pairings must flip with the seed.
    expect(measured.matrix.diversity).toBeGreaterThan(0)
  })

  test("a distinct fight is more than its winner and duration (R3 T1)", () => {
    // The defect this pins: the signature read `finalHp[side.name]` while the
    // resolver keys `finalHp` by `id ?? name`, so the HP half was `undefined`
    // on every fight and `distinct` counted only (winner, duration). Two fights
    // that share both but end on different HP are two fights.
    expect(fightSignature("fire_drake", "w", 31_200, 40)).not.toBe(
      fightSignature("fire_drake", "w", 31_200, 41),
    )
    // A missing key is a harness defect, not a quietly narrower sample.
    expect(() => fightSignature("fire_drake", "w", 31_200, undefined)).toThrow(
      /go blind/,
    )
    // The corrected counts, pinned on the two rows that used to fail. Before
    // R3 these read 30 and 16 — the blind count of the same 112 games. The
    // tortoise read 30 again after R4 reverted its atk band to the authored
    // 10-14 (the 13-17 band it briefly carried made more of its fights distinct
    // because it won more of them). R5's `boulder_toss` startup moved both:
    // the tortoise to 35, reefclaw to 22, because the two play each other.
    const measured = sample()
    const byId = new Map(measured.matrix.species.map((row) => [row.id, row]))
    expect(byId.get("earth_tortoise")?.distinct).toBe(35)
    expect(byId.get("reefclaw")?.distinct).toBe(22)
    // The one-species replay reads the same key, so it must agree.
    for (const id of ["earth_tortoise", "reefclaw"]) {
      expect(measureSpecies(id).distinct).toBe(byId.get(id)?.distinct ?? -1)
    }
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
    // R2: the ladder's top compressed (9..19) — the floor is Strike 9 and the
    // ceiling the power-19 finisher, both still inside the frozen 4-12%.
    expect(Math.min(...shares)).toBeCloseTo(4.76, 2)
    expect(Math.max(...shares)).toBeCloseTo(10.05, 2)
    const band = targets(measured).find(
      (target) => target.name === "damageBand",
    )
    if (!band) throw new Error("the report lost the damage band target")
    expect(band.ok).toBe(true)
  })

  test("a cap fight is never counted inside the knockout band (FR-4, Rework 2)", () => {
    // The R1 gate printed 54.5% by counting every 40.00 s cap fight as
    // "inside 25-40 s". The honest figure was 23.1%. A sample of pure cap
    // fights must therefore report a 0% knockout band, even though every
    // duration sits at the top of the window — and that band no longer gates,
    // because the owner ruled a cap win is an outlasting victory.
    const measured = sample()
    const allCaps: BalanceSample = {
      ...measured,
      duration: {
        ...measured.duration,
        time: measured.duration.total,
        ko: 0,
        draws: 0,
        resolvedInBand: 0,
      },
    }
    expect(targets(allCaps).some((row) => row.name === "resolvedInBand")).toBe(
      false,
    )
    const text = report(allCaps).join("\n")
    expect(text).toContain("knockout band:     0/840 (0.0%")
    expect(text).toContain("diagnostic only")
  })

  test("the gate gates FR-20's decisive share and median (Rework 2)", () => {
    const measured = sample()
    // No knockouts and no cap margin to speak of: nothing ended decisively.
    const noKo: BalanceSample = {
      ...measured,
      duration: { ...measured.duration, ko: 0, capMargins: [] },
    }
    const decisive = violations(noKo).find(
      (row) => row.name === "decisiveShare",
    )
    if (!decisive) throw new Error("decisive share produced no violation")
    expect(decisive.why).toContain("FR-20")
    expect(decisive.why).toContain("AC-17")
    // The margin floor is integer-exact: a cap win exactly at the floor is
    // decisive, one basis point below it is not.
    const atFloor: BalanceSample = {
      ...measured,
      duration: {
        ...measured.duration,
        ko: 0,
        time: 560,
        total: 840,
        capMargins: Array.from({ length: 560 }, () => CAP_MARGIN_FLOOR_BP),
      },
    }
    const belowFloor: BalanceSample = {
      ...measured,
      duration: {
        ...measured.duration,
        ko: 0,
        time: 560,
        total: 840,
        capMargins: Array.from({ length: 560 }, () => CAP_MARGIN_FLOOR_BP - 1),
      },
    }
    expect(
      violations(atFloor).some((row) => row.name === "decisiveShare"),
    ).toBe(false)
    expect(
      violations(belowFloor).some((row) => row.name === "decisiveShare"),
    ).toBe(true)
    const atCap: BalanceSample = {
      ...measured,
      duration: { ...measured.duration, median: 40_000 },
    }
    const median = violations(atCap).find(
      (row) => row.name === "medianDuration",
    )
    if (!median) throw new Error("median duration produced no violation")
    expect(median.why).toContain("FR-4")
    expect(median.why).toContain("FR-20")
  })

  test("cap-win quality is its own row, not a side effect of decisive share (R3 T3)", () => {
    // decisiveShare is ko + decisive cap wins over every fight, so a sample
    // full of knockouts passes it no matter how the cap wins finish. This row
    // judges the cap wins alone: two in three must clear the margin floor.
    const measured = sample()
    const nearTies: BalanceSample = {
      ...measured,
      duration: {
        ...measured.duration,
        ko: measured.duration.total - 100,
        time: 100,
        capMargins: Array.from({ length: 100 }, () => CAP_MARGIN_FLOOR_BP - 1),
      },
    }
    // decisiveShare is satisfied - 740 of 840 fights are knockouts.
    expect(
      violations(nearTies).some((row) => row.name === "decisiveShare"),
    ).toBe(false)
    const quality = violations(nearTies).find(
      (row) => row.name === "capWinQuality",
    )
    if (!quality) throw new Error("cap-win quality produced no violation")
    expect(quality.why).toContain("FR-20")
    expect(quality.why).toContain("AC-17")
    // Two of three at the floor pass; one basis point below does not.
    const passes: BalanceSample = {
      ...measured,
      duration: {
        ...measured.duration,
        ko: 0,
        time: 100,
        capMargins: [
          ...Array.from({ length: 67 }, () => CAP_MARGIN_FLOOR_BP),
          ...Array.from({ length: 33 }, () => CAP_MARGIN_FLOOR_BP - 1),
        ],
      },
    }
    expect(violations(passes).some((row) => row.name === "capWinQuality")).toBe(
      false,
    )
    const fails: BalanceSample = {
      ...measured,
      duration: {
        ...measured.duration,
        ko: 0,
        time: 100,
        capMargins: [
          ...Array.from({ length: 66 }, () => CAP_MARGIN_FLOOR_BP),
          ...Array.from({ length: 34 }, () => CAP_MARGIN_FLOOR_BP - 1),
        ],
      },
    }
    expect(violations(fails).some((row) => row.name === "capWinQuality")).toBe(
      true,
    )
  })

  test("the report names the design-band misses it computes (FR-5, R2 T3)", () => {
    // AC-5's maintained list: a row drifting across 45% or 55% fails here and
    // is updated deliberately. The list is computed, printed and asserted, so
    // it cannot silently go stale like the old one-row KNOWN_MISSES. R4 removed
    // electric_hound: reverting the tortoise's atk band to 10-14 raised the
    // hound's row from 41.1% to 48.2%, inside the design band. R5 put it back
    // at 42.9%: the tortoise's shorter `boulder_toss` startup is a swing the
    // hound no longer gets to interrupt, so the tank's main victim loses six of
    // its 112 games. That is the lever working, and the row is recorded here
    // rather than argued with.
    const DESIGN_BAND_MISSES = [
      "fire_drake",
      "plant_ox",
      "water_axolotl",
      "electric_hound",
      "fernstag",
      "wind_falcon",
      "reefclaw",
      "earth_tortoise",
      "cindermoor",
      "shalemole",
      "embercub",
      "mossboar",
    ] as const
    const measured = sample()
    expect(designBandMisses(measured).map((row) => row.id)).toEqual([
      ...DESIGN_BAND_MISSES,
    ])
    const text = report(measured).join("\n")
    expect(text).toContain("design-band misses (outside 45.0%..55.0%")
    for (const id of DESIGN_BAND_MISSES) expect(text).toContain(id)
  })

  test("the doctrine table's dodge column differs by doctrine (R2 T5)", () => {
    // The fixed matchup draws no paid dodge, so the table's own rate is zero
    // for three rows. The probe rate is printed alongside it; at least two
    // doctrines must show distinct non-zero rates.
    const measured = sample()
    const rates = measured.dodgeProbe
      .map((row) => row.perFight)
      .filter((rate) => rate > 0)
    expect(new Set(rates).size).toBeGreaterThanOrEqual(2)
    const text = report(measured).join("\n")
    expect(text).toContain("probe/fight")
    expect(text).toContain("finding: Kite")
  })

  test("today's target misses are named with their observed values", () => {
    // R5: the list is empty. Every species row sits inside its interval, cap
    // share, decisive share, cap-win quality, median, p05, the damage band and
    // the bosses all hold. The rows still outside the 45-55% design band are a
    // separate assertion about the roster, not about the gate.
    expect(violations(sample()).map(describeTarget)).toEqual([...KNOWN_MISSES])
    expect(KNOWN_MISSES).toHaveLength(0)
  })

  test("the gate is green end to end (R5)", () => {
    // A cap win counts as a decisive outlasting win when its margin clears the
    // floor, and every species row's interval covers 50% — the tortoise's
    // included, at 39.3% against a 16.6-point bound. When a row regresses this
    // test fails on the FAIL list and is updated deliberately.
    const lines: string[] = []
    expect(run(sample(), (line) => lines.push(line))).toBe(0)
    const failures = lines.filter((line) => line.startsWith("FAIL "))
    expect(failures).toEqual([])
    expect(lines.some((line) => line.startsWith("ok   capShare:"))).toBe(true)
    expect(lines.some((line) => line.startsWith("ok   decisiveShare:"))).toBe(
      true,
    )
    expect(lines.some((line) => line.startsWith("ok   medianDuration:"))).toBe(
      true,
    )
    expect(lines.some((line) => line.startsWith("ok   durationP05:"))).toBe(
      true,
    )
    expect(lines.some((line) => line.startsWith("ok   damageBand:"))).toBe(true)
    expect(
      lines.some((line) => line.startsWith("ok   species:earth_tortoise:")),
    ).toBe(true)
  })

  test("a target that holds is not reported as a violation", () => {
    const measured = sample()
    const fixed: BalanceSample = {
      ...measured,
      duration: { ...measured.duration, time: 0 },
    }
    expect(violations(fixed).some((row) => row.name === "capShare")).toBe(false)
    // R4 (T1): a matrix with no cap fights has no cap wins to judge, so
    // cap-win quality is vacuously satisfied. FR-4 explicitly allows a 0% cap
    // share, and before this fix the row failed on the empty population by
    // reading 0/0 as 0.0% against a 66.7% bound.
    expect(violations(fixed).some((row) => row.name === "capWinQuality")).toBe(
      false,
    )
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
