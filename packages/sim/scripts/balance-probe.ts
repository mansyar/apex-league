/**
 * Seeded balance probe for the move-pool track.
 *
 * Replays the same species matrix the event-stream contract pins (three mirrors
 * plus three cross-element pairs, both side orders) over a wider seed batch and
 * reports win rates, ending mix, and per-move launch counts. Run it before and
 * after a move-catalog change with the same arguments to compare:
 *
 *   bun packages/sim/scripts/balance-probe.ts --out report.json
 *   bun packages/sim/scripts/balance-probe.ts --tiers=2,3,4,6 --seeds=96
 *
 * Deterministic: the same arguments always produce the same report.
 */

import type { Tactic } from "../src/battle/policy"
import { type BattleSide, resolveBattle } from "../src/battle/resolver"
import { createCreature } from "../src/creature"
import { getSpecies } from "../src/species"

const CREATURE_SEED = 777

/** Ordered pairings: three mirrors, then three cross-element pairs each way. */
const SPECIES_PAIRS: readonly (readonly [string, string])[] = [
  ["fire_drake", "fire_drake"],
  ["plant_ox", "plant_ox"],
  ["water_axolotl", "water_axolotl"],
  ["fire_drake", "plant_ox"],
  ["fire_drake", "water_axolotl"],
  ["plant_ox", "water_axolotl"],
]

const TACTIC_PAIRS: readonly (readonly [Tactic, Tactic])[] = [
  ["balanced", "balanced"],
  ["specials", "specials"],
  ["balanced", "specials"],
  ["specials", "balanced"],
]

interface CaseReport {
  /** Battles won by the left side, the right side, and drawn. */
  readonly winsA: number
  readonly winsB: number
  readonly draws: number
  /** Endings at the MAX_TICKS safety cap - the stall metric. */
  readonly timeCaps: number
  /** Left-side win share over decided battles, 0..1. */
  readonly rateA: number
  /** Launch counts per move id across every battle in the case. */
  readonly moves: Readonly<Record<string, number>>
}

interface ProbeReport {
  readonly creatureSeed: number
  readonly seedCount: number
  readonly seeds: readonly number[]
  readonly tiers: readonly number[]
  readonly cases: Readonly<Record<string, CaseReport>>
}

function arg(name: string, fallback: string): string {
  const withEquals = `--${name}=`
  const inline = process.argv.find((entry) => entry.startsWith(withEquals))
  if (inline !== undefined) return inline.slice(withEquals.length)
  const spaced = process.argv.indexOf(`--${name}`)
  if (spaced >= 0) return process.argv[spaced + 1] ?? fallback
  return fallback
}

function seeds(count: number): number[] {
  return Array.from({ length: count }, (_, index) => 1 + index * 7)
}

function side(
  speciesId: string,
  name: string,
  key: string,
  kitTier: number,
  tactic: Tactic,
): BattleSide {
  const def = getSpecies(speciesId)
  if (!def) throw new Error(`Unknown species: ${speciesId}`)
  const creature = createCreature(speciesId, CREATURE_SEED)
  return {
    name,
    id: key,
    element: creature.element,
    stats: creature.stats,
    kit: def.kit.slice(0, kitTier),
    tactic,
    temperament: def.temperament,
  }
}

function run(): ProbeReport {
  const seedCount = Number(arg("seeds", "96"))
  const tiers = arg("tiers", "2,3,4,6")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value) && value > 0)
  const battleSeeds = seeds(seedCount)
  const cases: Record<string, CaseReport> = {}

  for (const [leftId, rightId] of SPECIES_PAIRS) {
    for (const [aId, bId] of [
      [leftId, rightId],
      [rightId, leftId],
    ] as const) {
      for (const tier of tiers) {
        const caseId = `${aId}|${bId}|kit${tier}`
        let winsA = 0
        let winsB = 0
        let draws = 0
        let timeCaps = 0
        const moves: Record<string, number> = {}

        for (const [aTactic, bTactic] of TACTIC_PAIRS) {
          for (const seed of battleSeeds) {
            const result = resolveBattle(
              side(aId, "A", "a", tier, aTactic),
              side(bId, "B", "b", tier, bTactic),
              seed,
            )
            if (result.reason === "double_ko") draws += 1
            if (result.reason === "time") timeCaps += 1
            if (result.winner === "A") winsA += 1
            if (result.winner === "B") winsB += 1
            for (const event of result.events) {
              // Specials surface their move id on the impact/miss event; the
              // basic strike carries none.
              if (event.moveId !== undefined) {
                moves[event.moveId] = (moves[event.moveId] ?? 0) + 1
              }
            }
          }
        }

        const decided = winsA + winsB
        cases[caseId] = {
          winsA,
          winsB,
          draws,
          timeCaps,
          rateA: decided === 0 ? 0.5 : winsA / decided,
          moves,
        }
      }
    }
  }

  return {
    creatureSeed: CREATURE_SEED,
    seedCount,
    seeds: battleSeeds,
    tiers,
    cases,
  }
}

const report = run()
const out = arg("out", "")
const text = `${JSON.stringify(report, null, 2)}\n`
await Bun.write(out === "" ? `balance-probe-${Date.now()}.json` : out, text)

const decided = Object.entries(report.cases).flatMap(([id, entry]) => [
  `${id} ${(entry.rateA * 100).toFixed(1)}%`,
])
console.log(`tiers=${report.tiers.join(",")} seeds=${report.seedCount}`)
console.log(
  `cases=${decided.length} timeCaps=${Object.values(report.cases).reduce((sum, c) => sum + c.timeCaps, 0)}`,
)
console.log(out === "" ? "written to timestamped file" : `written: ${out}`)
