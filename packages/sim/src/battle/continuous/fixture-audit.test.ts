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
import { BOUNDS, measure, midpointOf } from "../../../scripts/battle-telemetry"
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

  test("cell A is the telemetry gate's own reading (FR-9, AC-8)", () => {
    // AC-8 asks for agreement between the two harnesses rather than the same
    // literal pinned twice: `measure()` is the call the CI gate makes, so this
    // fails if the audit ever measures a different fixture. 20/42 is the
    // gate's cap count; a cell A that reads anything else means the audit's
    // call is wrong, not that the gate moved.
    const gate = measure()
    const [cellA] = cells()
    if (!cellA) throw new Error("the audit returned no cells")
    expect(cellA.capCount).toBe(gate.cap.count)
    expect(cellA.capShare).toBe(gate.cap.share)
    // Cell A is the sample the shipped cap-share ceiling is read against, and
    // the audit adds no bound of its own (NFR-4): the only ceiling involved is
    // the gate's, still the 3/5 the telemetry track derived.
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
      // A — the telemetry gate as it ships: reference stats, split doctrine.
      // 20/42 (47.6%), median 39.69 s. The count is the gate's own, asserted
      // against `measure()` above rather than trusted from this literal.
      ["A", 20, 39_690, 22],
      // B — A with the doctrine moved to press on both sides (the matrix's
      // doctrine), stats still reference. 17/42 (40.5%), median 38.38 s: the
      // doctrine alone removes three caps and 1.31 s of median fight.
      ["B", 17, 38_380, 25],
      // C — A with the stat basis moved to bounds midpoints (the matrix's stat
      // line), doctrine still split. 13/42 (31.0%), median 35.72 s: the stat
      // line alone removes seven caps and 3.97 s of median fight.
      ["C", 13, 35_720, 29],
      // D — both variables moved: midpoint stats, press on both sides. 5/42
      // (11.9%), median 29.32 s. The pair accounts for 15 of A's 20 caps, and
      // D is 14.8 points below the matrix's 26.7% — a different population
      // (42 strided pairings, one seed each, versus 210 x 4), recorded as the
      // verdict's residual rather than explained away.
      ["D", 5, 29_320, 37],
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
