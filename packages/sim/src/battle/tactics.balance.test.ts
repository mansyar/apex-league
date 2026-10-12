/**
 * Tactic balance probe (battle-sim-consolidation FR7) — the seed batch that
 * decides whether a rebalance landed, and the tripwire that fails the build if
 * the meta tips out of band again.
 *
 * It answers the question `conductor/learnings.md` finding 10 left open: the
 * innate Strike used to out-sustain every special, so "Favor Specials" never
 * fired one and lost every mirror attrition race while "Balanced" won them
 * outright. No tactic is supposed to be *strictly* better — the band below is
 * deliberately wide (25–60% decisive win rate) because a tactics game wants
 * edge, not a coin flip; what it forbids is a tactic that cannot lose.
 *
 * Runs 216 mirrored battles: 3 species × kit tiers 2/3/4 × 4 tactic pairings
 * (balanced×balanced, specials×specials, and balanced×specials in both side
 * orders) × 6 battle seeds. Stats are frozen per species so the only variables
 * are the tactic, the loadout tier, and the seed.
 *
 * Regenerate the markdown report for the track docs:
 *   APEX_BALANCE_REPORT=1 bun test packages/sim/src/battle/tactics.balance.test.ts
 */

import { describe, expect, test } from "bun:test"
import { createCreature } from "../creature"
import { getSpecies, type SpeciesDef } from "../species"
import type { Tactic } from "./policy"
import type { BattleReason, BattleSide } from "./resolver"
import { resolveBattle } from "./resolver"

/** Fixed creature seed: identical stats for both sides of every matchup. */
const CREATURE_SEED = 777

/** The rival's own stat rolls for the varied-stats pass. */
const RIVAL_SEED = 4242

/** Battle seeds replayed inside every case. */
const BATTLE_SEEDS: readonly number[] = [11, 29, 47, 53, 71, 89]

/** Kit tiers: the first 2, 3 or 4 moves of a species kit. */
const KIT_TIERS: readonly number[] = [2, 3, 4]

/** The three starters, one per element the mirror matrix covers. */
const SPECIES: readonly string[] = ["fire_drake", "plant_ox", "water_axolotl"]

/**
 * The cross-element half of the matrix.
 *
 * A mirror is the easy case: one element between the two fighters makes the
 * type chart inert, and identical stats leave move choice as the only thing
 * that can separate them. It is also the case where an even split is
 * *expected* — comparable games settle their mirrors on stats and tempo,
 * because a type chart strong enough to decide mirrors would decide
 * everything.
 *
 * Cross-element is where a tactic can honestly have an edge, which is what
 * the band exists to police. Auto-battlers call this a soft counter: the
 * stronger tactic should win more, never every time. Every ordered pair is
 * listed so neither element gets credited with its own side's bias.
 */
const CROSS_PAIRS: readonly (readonly [string, string])[] = [
  ["fire_drake", "plant_ox"],
  ["fire_drake", "water_axolotl"],
  ["plant_ox", "fire_drake"],
  ["plant_ox", "water_axolotl"],
  ["water_axolotl", "fire_drake"],
  ["water_axolotl", "plant_ox"],
]

/** Tactic pairings. The cross pairing runs in both side orders so neither
 * tactic is credited with the other's side bias. */
const TACTIC_PAIRS: readonly (readonly [Tactic, Tactic])[] = [
  ["balanced", "balanced"],
  ["specials", "specials"],
  ["balanced", "specials"],
  ["specials", "balanced"],
]

/** Decisive win-rate band a tactic must stay inside, as FR7 specifies. */
const WIN_BAND = { min: 0.25, max: 0.6 }

/** Ceiling on the share of battles that reach the 40-tick cap. */
const DRAW_CEILING = 0.2

function species(id: string): SpeciesDef {
  const def = getSpecies(id)
  if (!def) throw new Error(`Unknown species: ${id}`)
  return def
}

function side(
  id: string,
  key: string,
  kitTier: number,
  tactic: Tactic,
  creatureSeed = CREATURE_SEED,
): BattleSide {
  const def = species(id)
  const creature = createCreature(id, creatureSeed)
  return {
    name: `${def.displayName} ${key.toUpperCase()}`,
    id: key,
    element: creature.element,
    stats: creature.stats,
    kit: def.kit.slice(0, kitTier),
    tactic,
    temperament: def.temperament,
  }
}

/** One side's results across the batch. */
interface Tally {
  wins: number
  losses: number
  draws: number
}

type Reasons = Record<BattleReason, number>

function emptyReasons(): Reasons {
  return { ko: 0, double_ko: 0, time: 0 }
}

function emptyTally(): Tally {
  return { wins: 0, losses: 0, draws: 0 }
}

function add(tally: Tally, won: boolean | null): void {
  if (won === null) tally.draws += 1
  else if (won) tally.wins += 1
  else tally.losses += 1
}

function games(tally: Tally): number {
  return tally.wins + tally.losses + tally.draws
}

/** Decisive win rate: draws are measured separately, not counted as losses. */
function winRate(tally: Tally): number {
  const decided = tally.wins + tally.losses
  return decided === 0 ? 0 : tally.wins / decided
}

function drawRate(tally: Tally): number {
  return games(tally) === 0 ? 0 : tally.draws / games(tally)
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

/** One matrix cell: a species, a kit tier, a tactic pairing. */
interface Cell {
  id: string
  a: Tally
  b: Tally
  aTactic: Tactic
  bTactic: Tactic
}

interface Probe {
  cells: Cell[]
  byTactic: Record<Tactic, Tally>
  /**
   * Why a battle had no winner. A timeout (`time`) and a mutual KO
   * (`double_ko`) are different stories: the first is two turtles who cannot
   * finish, the second is the most dramatic outcome the game has and the one
   * the cup tiebreak exists for (FR4). Only `time` is a stall.
   */
  reasons: Reasons
  battles: number
}

/** Run a seed batch over a list of species pairs — the single source of truth
 * for the tests below and for the markdown report. */
function runProbe(
  pairs: readonly (readonly [string, string])[],
  rivalSeed = CREATURE_SEED,
): Probe {
  const byTactic: Record<Tactic, Tally> = {
    balanced: emptyTally(),
    specials: emptyTally(),
  }
  const cells: Cell[] = []
  const reasons = emptyReasons()
  let battles = 0

  for (const [aId, bId] of pairs) {
    for (const kitTier of KIT_TIERS) {
      for (const [aTactic, bTactic] of TACTIC_PAIRS) {
        const cell: Cell = {
          id: `${aId} vs ${bId} kit${kitTier} ${aTactic} vs ${bTactic}`,
          a: emptyTally(),
          b: emptyTally(),
          aTactic,
          bTactic,
        }
        for (const seed of BATTLE_SEEDS) {
          const a = side(aId, "a", kitTier, aTactic)
          const b = side(bId, "b", kitTier, bTactic, rivalSeed)
          const result = resolveBattle(a, b, seed)
          battles += 1
          const aWon = result.winner === null ? null : result.winner === a.name
          const bWon = result.winner === null ? null : result.winner === b.name
          add(cell.a, aWon)
          add(cell.b, bWon)
          add(byTactic[aTactic], aWon)
          add(byTactic[bTactic], bWon)
          reasons[result.reason] += 1
        }
        cells.push(cell)
      }
    }
  }
  return { cells, byTactic, reasons, battles }
}

/** Every species against a copy of itself. */
const MIRROR_PAIRS: readonly (readonly [string, string])[] = SPECIES.map(
  (id) => [id, id] as const,
)

const mirror = runProbe(MIRROR_PAIRS)
const cross = runProbe(CROSS_PAIRS)

/**
 * The mirror matrix again, but the rival rolls its own stats.
 *
 * The main matrix freezes both creatures to one seed on purpose — identical
 * stats are what isolate the tactic as the only variable. The cost is that
 * perfect symmetry produces perfect simultaneity: two identical fighters that
 * trade the same damage on the same ticks go down together, so the mirror
 * matrix inflates mutual KOs far above anything real play produces. This pass
 * measures the honest outcome mix.
 */
const varied = runProbe(MIRROR_PAIRS, RIVAL_SEED)

/** Share of battles that ended in a mutual KO. */
function mutualKoRate(result: Probe): number {
  return result.reasons.double_ko / result.battles
}

/** The markdown report used for the track's before/after documentation. */
function report(): string {
  const section = (heading: string, result: Probe): string[] => {
    const lines: string[] = [
      `## ${heading}`,
      "",
      `Seed batch: ${result.battles} battles (${result.cells.length / (TACTIC_PAIRS.length * KIT_TIERS.length)} pairings × ${KIT_TIERS.length} kit tiers × ${TACTIC_PAIRS.length} tactic pairings × ${BATTLE_SEEDS.length} seeds).`,
      "",
      `Outcomes: ${result.reasons.ko} KOs, ${result.reasons.double_ko} double KOs, ${result.reasons.time} 40-tick stalls.`,
      "",
      "| Case | Side A | A wins | Side B | B wins | Non-decisive |",
      "| --- | --- | --- | --- | --- | --- |",
    ]
    for (const cell of result.cells) {
      lines.push(
        `| ${cell.id} | ${cell.aTactic} | ${pct(winRate(cell.a))} | ${cell.bTactic} | ${pct(winRate(cell.b))} | ${cell.a.draws + cell.b.draws} |`,
      )
    }
    lines.push(
      "",
      "| Tactic | Samples | Decisive win rate | Non-decisive | Band |",
      "| --- | --- | --- | --- | --- |",
    )
    for (const tactic of ["balanced", "specials"] as const) {
      const tally = result.byTactic[tactic]
      const rate = winRate(tally)
      const inBand = rate >= WIN_BAND.min && rate <= WIN_BAND.max
      lines.push(
        `| ${tactic} | ${games(tally)} | ${pct(rate)} | ${pct(drawRate(tally))} | ${inBand ? "in" : "OUT"} |`,
      )
    }
    return lines
  }
  return [
    ...section("Mirrors — one species against itself", mirror),
    "",
    ...section("Cross-element — the soft-counter matrix", cross),
    "",
    "## Mirrors with the rival rolling its own stats",
    "",
    `Outcomes: ${varied.reasons.ko} KOs, ${varied.reasons.double_ko} double KOs, ${varied.reasons.time} 40-tick stalls (${pct(mutualKoRate(varied))} mutual, against ${pct(mutualKoRate(mirror))} with identical stats).`,
  ].join("\n")
}

describe("tactic balance probe", () => {
  test("the batch is the size it claims", () => {
    // A silently shrinking matrix would make the bands meaningless.
    for (const result of [mirror, cross, varied]) {
      expect(result.battles).toBe(result.cells.length * BATTLE_SEEDS.length)
      expect(games(result.byTactic.balanced)).toBe(result.battles)
      expect(games(result.byTactic.specials)).toBe(result.battles)
    }
    expect(mirror.battles).toBe(216)
    expect(cross.battles).toBe(432)
  })

  // Both matrices are policed by the same band. The mirrors are expected to
  // sit near an even split; the cross-element matrix is where a tactic earns
  // an edge, and the band is what stops that edge becoming a hard counter.
  for (const [label, result] of [
    ["mirrors", mirror],
    ["cross-element", cross],
  ] as const) {
    for (const tactic of ["balanced", "specials"] as const) {
      test(`'${tactic}' wins between ${pct(WIN_BAND.min)} and ${pct(WIN_BAND.max)} of its decisive ${label} battles`, () => {
        const rate = winRate(result.byTactic[tactic])
        expect(rate).toBeGreaterThanOrEqual(WIN_BAND.min)
        expect(rate).toBeLessThanOrEqual(WIN_BAND.max)
      })

      test(`'${tactic}' rarely stalls out a draw in ${label}`, () => {
        // Only a 40-tick timeout is a stall. A double KO is a real finish —
        // the cup has a tiebreak for it (FR4) — so it is measured, not failed.
        expect(result.reasons.time / result.battles).toBeLessThan(DRAW_CEILING)
      })
    }
  }

  test("mutual knockouts stay a rarity once rivals roll their own stats", () => {
    // The frozen-stats mirror matrix deliberately creates perfect symmetry,
    // which is why its double-KO share is an artefact rather than a finding.
    expect(mutualKoRate(varied)).toBeLessThan(mutualKoRate(mirror))
  })

  test.skipIf(!process.env.APEX_BALANCE_REPORT)(
    "prints the seed-batch report",
    () => {
      console.log(report())
      expect(report()).toContain("| Tactic |")
    },
  )
})
