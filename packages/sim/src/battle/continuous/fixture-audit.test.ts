/**
 * Fixture audit (FR-8, FR-9, AC-8): the four (stat basis x doctrine) cells over
 * the telemetry fixture's own 42 pairings, and the one cross-check that
 * matters — cell A is the telemetry gate's reading, so the audit and the gate
 * cannot disagree about what the fixture measures.
 *
 * These pins protect published numbers, not the game. They add no bound, no
 * target and no pass/fail criterion (NFR-4): the audit is a diagnostic and
 * nothing in CI reads it as a gate. What they stop is a change to the stat
 * basis, the doctrine rule or the resolver moving a figure that the track's
 * verdict was drawn from without anyone noticing.
 */

import { describe, expect, test } from "bun:test"
import { typicalLine } from "../../../scripts/battle-balance-report"
import {
  BOUNDS,
  measure,
  measureSmoke,
  midpointOf,
} from "../../../scripts/battle-telemetry"
import {
  attribution,
  audit,
  type CellReading,
  report,
} from "../../../scripts/fixture-audit"
import { ALL_SPECIES } from "../../species/catalog"

/** Four cells x 42 fights: measure them once for the whole file. */
let cached: CellReading[] | undefined

function cells(): readonly CellReading[] {
  cached ??= audit()
  return cached
}

describe("fixture audit — the four cells and the attribution (FR-8, FR-9)", () => {
  test("the audit runs four cells over the fixture's own 42 pairings (FR-8)", () => {
    const readings = cells()
    console.log(report(readings).join("\n"))
    expect(readings.map((reading) => reading.id)).toEqual(["A", "B", "C", "D"])
    // The same 42 pairings and seeds in every cell: the audit borrows the
    // fixture, it does not draw its own sample.
    for (const reading of readings) expect(reading.fights).toBe(42)
  })

  test("cell A is the historical smoke sample and cell D is the gate (FR-9, AC-8)", () => {
    // AC-8 asks for agreement between the two harnesses rather than the same
    // literal pinned twice. Cell A is the pre-2026-11-24 reference + split
    // sample, preserved as the named smoke diagnostic; cell D is the midpoint
    // + press sample the CI gate enforces since the D-4 re-stratification.
    // Agreement is checked against the calls the scripts actually make.
    const gate = measure()
    const smoke = measureSmoke()
    const [cellA, , , cellD] = cells()
    if (!cellA || !cellD) throw new Error("the audit returned no cells")
    expect(cellA.capCount).toBe(smoke.cap.count)
    expect(cellA.capShare).toBe(smoke.cap.share)
    expect(cellD.capCount).toBe(gate.cap.count)
    expect(cellD.capShare).toBe(gate.cap.share)
    // Cell D is the sample the shipped cap-share ceiling is read against since
    // 2026-11-24, and the audit adds no bound of its own (NFR-4): the only
    // ceiling involved is the gate's, still the 3/5 the telemetry track derived.
    const ceiling = BOUNDS.find((bound) => bound.metric === "capShare")
    expect(ceiling?.value).toBe(0.6)
  })

  // FR-9 / AC-8: the four readings, pinned. These are drift pins, not bounds:
  // nothing below compares a number to a threshold or says one is good, so the
  // audit still has no pass/fail criterion of its own. Each comment names the
  // variable that moved the number away from cell A.
  test("the four cells are pinned, and each number says what moved it", () => {
    const pinned = cells().map((reading) => [
      reading.id,
      reading.capCount,
      reading.medianMs,
      reading.koCount,
    ])
    expect(pinned).toEqual([
      // Roster Wave 2 rework: the diagnostic cells below are read from the
      // measured 21-species output after the owner-approved wind Thornvolt
      // and minimal stat-bound retunes. Nothing here is a bound or a target;
      // the only ceiling in play is the telemetry gate's 3/5 cap share (AC-7).
      //
      // A — the historical reference + split gate, now the named smoke sample.
      // 11/42 (26.2%), median 38.01 s. The count is asserted against
      // `measureSmoke()` above rather than trusted from this literal.
      // Re-pinned for the speed-aware Kite band and 45 s cap (20261120 track).
      ["A", 11, 38_010, 31],
      // B — A with the doctrine moved to press on both sides (the matrix's
      // doctrine), stats still reference. 8/42 (19.0%), median 35.12 s: on
      // the 21-species roster this cell is a drift pin for the doctrine
      // interaction, not a target. Re-pinned for the 45 s cap / re-tune.
      ["B", 8, 35_120, 34],
      // C — A with the stat basis moved to bounds midpoints (the matrix's stat
      // line), doctrine still split. 7/42 (16.7%), median 29.88 s: the stat
      // line alone removes four caps and 8.13 s of median fight. Re-pinned for
      // the 45 s cap / two-species re-tune (20261120 track).
      ["C", 7, 29_880, 35],
      // D — both variables moved: midpoint stats, press on both sides; the
      // representative gate since 2026-11-24. 5/42
      // (11.9%), median 31.26 s. This is a different population from the
      // 420 x 4 matrix (42 strided pairings, one seed each); the residual is
      // recorded here rather than explained away. Re-pinned for the 45 s cap.
      ["D", 5, 31_260, 37],
    ])
  })

  test("the attribution is the arithmetic on the cells (FR-10)", () => {
    const split = attribution(cells())
    // A - D is exact: doctrine at reference stats plus stat basis at press
    // doctrine, with no residual left over.
    expect(split.doctrinePoints + split.statPoints).toBeCloseTo(
      split.gapPoints,
      10,
    )
    // The interaction term is the difference between the two orderings, so it
    // has to agree with itself: (A - B) - (C - D) = (A - C) - (B - D).
    expect(split.interactionPoints).toBeCloseTo(
      split.statAtSplitPoints - split.statPoints,
      10,
    )
  })
})

describe("the recorded same-doctrine line (FR-4, FR-5, AC-4, AC-5)", () => {
  test("the report states the live 1,680-fight matrix arithmetic (FR-4, FR-5)", () => {
    // Pure: hand-built readings, no fixture measurement and no game state, so
    // this pins only the report's recorded-matrix claim. RECORDED is a
    // diagnostic comparison, not a target and not a gate (NFR-2).
    const readings: CellReading[] = [
      {
        id: "A",
        statBasis: "reference",
        doctrine: "split",
        fights: 42,
        capCount: 11,
        capShare: 11 / 42,
        medianMs: 38_010,
        koCount: 31,
      },
      {
        id: "B",
        statBasis: "reference",
        doctrine: "press",
        fights: 42,
        capCount: 8,
        capShare: 8 / 42,
        medianMs: 35_120,
        koCount: 34,
      },
      {
        id: "C",
        statBasis: "midpoint",
        doctrine: "split",
        fights: 42,
        capCount: 7,
        capShare: 7 / 42,
        medianMs: 29_880,
        koCount: 35,
      },
      {
        id: "D",
        statBasis: "midpoint",
        doctrine: "press",
        fights: 42,
        capCount: 5,
        capShare: 5 / 42,
        medianMs: 31_260,
        koCount: 37,
      },
    ]
    const lines = report(readings)
    const start = lines.findIndex((line) =>
      line.startsWith("same-doctrine check"),
    )
    if (start < 0) throw new Error("the report lost the same-doctrine line")
    const claim = lines.slice(start, start + 2).join("\n")

    // Current claim: the live 1,680-fight matrix comparison.
    expect(claim).toContain("same-doctrine check at 1680 fights")
    expect(claim).toContain("reference 580/1680 34.5%")
    expect(claim).toContain("midpoint 370/1680 22.0%")
    expect(claim).toContain("+12.5 points")
    expect(attribution(readings).recordedStatPoints).toBeCloseTo(12.5, 10)

    // The 2026-11-12 figures are historical, never a current claim (AC-4).
    expect(claim).not.toContain("840")
    expect(claim).not.toContain("377")
    expect(claim).not.toContain("224")
    expect(claim).not.toContain("+18.2")
  })
})

describe("the two harnesses agree on what a midpoint is (FR-6)", () => {
  // `battle-telemetry.ts` and `battle-balance-report.ts` each write the same
  // `floor((min + max) / 2)` arithmetic, because a script must not import
  // another script. The copy is one line and it decides whether the fixture's
  // midpoint cells describe the matrix's bodies at all, so it is asserted
  // rather than trusted: if either side changes its rounding, the audit's
  // attribution silently stops meaning what it says.
  test("midpointOf matches typicalLine for every species", () => {
    expect(ALL_SPECIES.length).toBeGreaterThan(0)
    for (const species of ALL_SPECIES) {
      expect(
        midpointOf(species.statBounds),
        `${species.id}: the two midpoint helpers disagree`,
      ).toEqual(typicalLine(species.statBounds))
    }
  })
})
