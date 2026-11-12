/**
 * Fixture audit — the four cells behind the 47.6%-vs-26.7% gap (FR-8, FR-10).
 *
 * The telemetry fixture reads a much higher cap share than the 840-fight
 * balance matrix on the same tree, and two things differ between them: the
 * **stat basis** (the fixture ramps both sides to `REFERENCE`, clamped into
 * each species' roll bounds; the matrix fights each species at its roll
 * midpoint) and the **doctrine mix** (the fixture splits press-versus-specials
 * by seed parity; the matrix presses on both sides). Neither had been
 * isolated, and `20261112-capshare-pacing` recorded that as debt D-4 after
 * review finding F1 rejected the unmeasured attribution.
 *
 * This script runs the full 2x2 factorial over the fixture's own 42 pairings
 * and seeds — one call per cell, no invented pairings — and prints the
 * attribution arithmetic:
 *
 *   bun packages/sim/scripts/fixture-audit.ts
 *   bun run fixture-audit --json
 *
 * **It is a diagnostic, not a gate (NFR-4).** There is no bound, no target, no
 * `ok`/`FAIL` line and no CI step reading this output. It always exits 0. The
 * one thing it must keep doing is reproducing cell A at 20/42: that is the
 * telemetry gate's own count, so a cell A that reads anything else means the
 * call is wrong, not that the gate moved.
 */

import {
  type DoctrineMix,
  type FightTelemetry,
  type Matchup,
  matchups,
  measureFight,
  median,
  type StatBasis,
} from "./battle-telemetry"

/**
 * The two 840-fight figures the balance report already prints, recorded here so
 * the attribution can compare the two axes without re-running a matrix this
 * script does not own. Both hold doctrine fixed (press on both sides) and move
 * only the stat basis, which is exactly the comparison the audit needs.
 *
 * Source: `bun run balance` on this tree —
 * `reference line cap share: 377/840 (44.9%) — diagnostic only` and
 * `cap share: 224/840 (26.7%)`. `balance-report.test.ts` pins both.
 */
const RECORDED = {
  fights: 840,
  referencePress: 377,
  midpointPress: 224,
} as const

/** One cell of the 2x2: a stat basis crossed with a doctrine mix. */
export interface Cell {
  readonly id: "A" | "B" | "C" | "D"
  readonly statBasis: StatBasis
  readonly doctrine: DoctrineMix
  readonly description: string
}

/**
 * The four cells, in the order the factorial is read. A is the fixture as it
 * ships (the telemetry gate), D is the matrix's stat line under the matrix's
 * doctrine, and B and C each move one variable away from A.
 */
export const CELLS: readonly Cell[] = Object.freeze([
  {
    id: "A",
    statBasis: "reference",
    doctrine: "split",
    description: "the telemetry gate as it ships",
  },
  {
    id: "B",
    statBasis: "reference",
    doctrine: "press",
    description: "the fixture's stat line under the matrix's doctrine",
  },
  {
    id: "C",
    statBasis: "midpoint",
    doctrine: "split",
    description: "the matrix's stat line under the fixture's doctrine",
  },
  {
    id: "D",
    statBasis: "midpoint",
    doctrine: "press",
    description: "the matrix's stat line and doctrine",
  },
])

/** One cell's reading over the 42 pairings. */
export interface CellReading {
  readonly id: Cell["id"]
  readonly statBasis: StatBasis
  readonly doctrine: DoctrineMix
  readonly fights: number
  readonly capCount: number
  readonly capShare: number
  /** Median fight time in ms, over the cell's fights. */
  readonly medianMs: number
  readonly koCount: number
}

/** Aggregate one cell's fights. */
function summarise(cell: Cell, fights: readonly FightTelemetry[]): CellReading {
  const capCount = fights.filter((fight) => fight.reason === "time").length
  return {
    id: cell.id,
    statBasis: cell.statBasis,
    doctrine: cell.doctrine,
    fights: fights.length,
    capCount,
    capShare: fights.length === 0 ? 0 : capCount / fights.length,
    medianMs: median(fights.map((fight) => fight.ms)),
    koCount: fights.filter((fight) => fight.reason === "ko").length,
  }
}

/** Play one cell over the sample. */
export function readCell(
  cell: Cell,
  drawn: readonly Matchup[] = matchups(),
): CellReading {
  return summarise(
    cell,
    drawn.map((matchup) =>
      measureFight(matchup, {
        statBasis: cell.statBasis,
        doctrine: cell.doctrine,
      }),
    ),
  )
}

/** All four cells over the same 42 pairings and seeds. */
export function audit(drawn: readonly Matchup[] = matchups()): CellReading[] {
  return CELLS.map((cell) => readCell(cell, drawn))
}

/** The attribution, in points of cap share (100 x a share difference). */
export interface Attribution {
  /** A - D: the fixture's cap share minus the matrix cell's, same pairings. */
  readonly gapPoints: number
  /** A - B: the doctrine effect at reference stats. */
  readonly doctrinePoints: number
  /** B - D: the stat-basis effect at press-on-both-sides, same pairings. */
  readonly statPoints: number
  /** (A - B) - (C - D): how much the doctrine effect depends on the stats. */
  readonly interactionPoints: number
  /** A - C: the stat-basis effect at split doctrine. */
  readonly statAtSplitPoints: number
  /** C - D: the doctrine effect at midpoint stats. */
  readonly doctrineAtMidpointPoints: number
  /** 44.9 - 26.7 at 840 fights: the stat effect at press doctrine. */
  readonly recordedStatPoints: number
}

function byId(readings: readonly CellReading[], id: Cell["id"]): CellReading {
  const found = readings.find((reading) => reading.id === id)
  if (!found) throw new Error(`cell ${id} is missing from the audit`)
  return found
}

function points(from: CellReading, to: CellReading): number {
  return (from.capShare - to.capShare) * 100
}

/**
 * Decompose the gap. A - D is exact: it is the doctrine effect at reference
 * stats plus the stat effect at press doctrine, with no residual. The
 * interaction term measures whether the two axes are separable at all: it is
 * zero when the doctrine effect is the same at both stat lines.
 */
export function attribution(readings: readonly CellReading[]): Attribution {
  const a = byId(readings, "A")
  const b = byId(readings, "B")
  const c = byId(readings, "C")
  const d = byId(readings, "D")
  return {
    gapPoints: points(a, d),
    doctrinePoints: points(a, b),
    statPoints: points(b, d),
    interactionPoints: points(a, b) - points(c, d),
    statAtSplitPoints: points(a, c),
    doctrineAtMidpointPoints: points(c, d),
    recordedStatPoints:
      ((RECORDED.referencePress - RECORDED.midpointPress) / RECORDED.fights) *
      100,
  }
}

/** Pad a cell to a fixed width. */
function pad(value: string | number, width: number): string {
  return String(value).padEnd(width)
}

/** A share as a percentage, one decimal. */
function share(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

/** A signed difference in points, one decimal. */
function signed(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`
}

/** The readable report, as lines. */
export function report(readings: readonly CellReading[]): string[] {
  const attributionOf = attribution(readings)
  const a = byId(readings, "A")
  const d = byId(readings, "D")
  const lines: string[] = []

  lines.push(
    `Fixture audit — ${a.fights} pairings x 4 cells (FR-8; diagnostic, never gated)`,
  )
  lines.push(
    "stat basis: reference = both sides at REFERENCE clamped into bounds; midpoint = each species' roll midpoint",
  )
  lines.push(
    "doctrine:   split = seed parity (press vs specials); press = balanced on both sides",
  )
  lines.push("")
  lines.push(
    `${pad("cell", 6)}${pad("stat basis", 12)}${pad("doctrine", 10)}${pad("fights", 8)}${pad("caps", 6)}${pad("cap share", 11)}${pad("median", 9)}ko`,
  )
  for (const reading of readings) {
    lines.push(
      `${pad(reading.id, 6)}${pad(reading.statBasis, 12)}${pad(reading.doctrine, 10)}${pad(reading.fights, 8)}${pad(reading.capCount, 6)}${pad(share(reading.capShare), 11)}${pad(`${(reading.medianMs / 1000).toFixed(2)}s`, 9)}${reading.koCount}`,
    )
  }
  lines.push("")
  lines.push("attribution — points of cap share, same 42 pairings:")
  lines.push(
    `  gap A - D (fixture - matrix cell)          ${signed(attributionOf.gapPoints)}   ${share(a.capShare)} - ${share(d.capShare)}`,
  )
  lines.push(
    `  doctrine   A - B (split -> press, ref)     ${signed(attributionOf.doctrinePoints)}`,
  )
  lines.push(
    `  stat basis B - D (ref -> midpoint, press)  ${signed(attributionOf.statPoints)}`,
  )
  lines.push(
    `  interaction (A - B) - (C - D)              ${signed(attributionOf.interactionPoints)}   how much the doctrine effect depends on the stats`,
  )
  lines.push(
    `  order check: stat A - C ${signed(attributionOf.statAtSplitPoints)}, doctrine C - D ${signed(attributionOf.doctrineAtMidpointPoints)}`,
  )
  lines.push("")
  lines.push(
    `same-doctrine check at ${RECORDED.fights} fights (press on both sides, \`bun run balance\`):`,
  )
  lines.push(
    `  reference ${RECORDED.referencePress}/${RECORDED.fights} ${share(RECORDED.referencePress / RECORDED.fights)}  ->  midpoint ${RECORDED.midpointPress}/${RECORDED.fights} ${share(RECORDED.midpointPress / RECORDED.fights)}  =  ${signed(attributionOf.recordedStatPoints)} points`,
  )
  return lines
}

/** The machine-readable dump: the readings and the arithmetic on them. */
export function toJson(readings: readonly CellReading[]): string {
  return JSON.stringify(
    { cells: readings, attribution: attribution(readings) },
    null,
    2,
  )
}

/**
 * Print the audit. Returns 0 unconditionally: the audit has no pass/fail
 * criterion (NFR-4), so there is no code path that fails it.
 */
export function run(
  readings: readonly CellReading[],
  json: boolean,
  out: (line: string) => void = console.log,
): number {
  if (json) {
    out(toJson(readings))
  } else {
    for (const line of report(readings)) out(line)
  }
  return 0
}

/** Measure the four cells and print them. */
export function main(argv: readonly string[] = process.argv): number {
  return run(audit(), argv.includes("--json"))
}

if (import.meta.main) {
  process.exitCode = main()
}
