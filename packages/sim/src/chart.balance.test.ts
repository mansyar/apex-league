/**
 * Element-chart acceptance probe (element_chart_20261016, FR5).
 *
 * Encodes the "grindable" acceptance bands as tripwires: in a duel between
 * two sides of EQUAL base effective stats, a fully-trained player on the
 * disadvantaged side of an element matchup must win a real share of duels,
 * while an untrained player on that same side must lose the vast majority.
 *
 * Sides are built from one canonical stat block so the ONLY differences are
 * element matchup, species kit, temperament, and the player's training
 * investment (+1 per stat per level, +2 HP per level — the trained-HP model
 * this track pins). Both sides get full kits and the balanced tactic so the
 * isolated variables stay training vs. typing.
 *
 * Report mode (`APEX_CHART_REPORT=1`) prints the full markdown matrix for
 * factor/HP-scale sweep runs and is the instrument Phase 1 uses to pick the
 * pinned constants.
 */

import { expect, test } from "bun:test"
import { typeFactor } from "./battle/chart"
import type { Tactic } from "./battle/policy"
import { type BattleSide, resolveBattle } from "./battle/resolver"
import { getSpecies, STARTER_SPECIES } from "./species"

const BATTLE_SEEDS = [11, 29, 47, 53, 71, 89, 113, 127, 149, 163, 181, 199]
const PLAYER_TACTIC: Tactic = "balanced"

/** Mid-band canonical stats both sides start from (hp, atk, def, spd). */
const CANONICAL_STATS = { hp: 88, atk: 10, def: 9, spd: 8 }

/** Training levels probed: the full investment curve 0 → cap. */
const TRAINED_LEVELS = [0, 2, 4, 6]

interface Tally {
  games: number
  won: number
  lost: number
  drew: number
}

function emptyTally(): Tally {
  return { games: 0, won: 0, lost: 0, drew: 0 }
}

function add(tally: Tally, won: boolean | null): void {
  tally.games += 1
  if (won === null) tally.drew += 1
  else if (won) tally.won += 1
  else tally.lost += 1
}

function winRate(tally: Tally): number {
  return tally.games === 0 ? 0 : tally.won / tally.games
}

function drawRate(tally: Tally): number {
  return tally.games === 0 ? 0 : tally.drew / tally.games
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

/** One side of a duel: canonical stats plus a flat training level. */
function side(
  speciesId: string,
  key: string,
  trained: number,
  tactic: Tactic,
): BattleSide {
  const def = getSpecies(speciesId)
  if (!def) throw new Error(`Unknown species: ${speciesId}`)
  return {
    name: `${def.displayName} ${key.toUpperCase()}`,
    id: key,
    element: def.element,
    stats: {
      hp: CANONICAL_STATS.hp + 2 * trained,
      atk: CANONICAL_STATS.atk + trained,
      def: CANONICAL_STATS.def + trained,
      spd: CANONICAL_STATS.spd + trained,
    },
    kit: def.kit,
    tactic,
    temperament: def.temperament,
  }
}

interface Cell {
  id: string
  tally: Tally
}

/** Every ordered starter-species pair, player on the disadvantaged side. */
function runPairProbe(): { cells: Cell[] } {
  const cells: Cell[] = []
  for (const a of STARTER_SPECIES) {
    for (const b of STARTER_SPECIES) {
      if (a.id === b.id) continue
      const factor = typeFactor(a.element, b.element)
      if (factor.num <= factor.den) continue // keep only advantaged A rows
      for (const trained of TRAINED_LEVELS) {
        const tally = emptyTally()
        const player = side(b.id, "disadvantaged", trained, PLAYER_TACTIC)
        const rival = side(a.id, "advantaged", 0, PLAYER_TACTIC)
        for (const seed of BATTLE_SEEDS) {
          const result = resolveBattle(player, rival, seed)
          add(
            tally,
            result.winner === null ? null : result.winner === player.name,
          )
        }
        cells.push({ id: `${b.id} <- ${a.id} trained+${trained}`, tally })
      }
    }
  }
  return { cells }
}

function markdown(probe: { cells: Cell[] }): string {
  const rows = probe.cells
    .map((c) => {
      const t = c.tally
      return `| ${c.id} | ${t.games} | ${t.won} | ${t.lost} | ${t.drew} | ${pct(winRate(t))} | ${pct(drawRate(t))} |`
    })
    .join("\n")
  return [
    "| matchup (disadvantaged player) | games | win | loss | draw | win rate | draw rate |",
    "|---|---|---|---|---|---|---|",
    rows,
  ].join("\n")
}

if (process.env.APEX_CHART_REPORT === "1") {
  const probe = runPairProbe()
  console.log(markdown(probe))
}

// --- Acceptance bands (element_chart_20261016) ---

/** A fully-trained disadvantaged player must grind out a real win share. */
const CAP_FLOOR = 0.35

/** An untrained disadvantaged player must lose the vast majority. */
const BASE_CEILING = 0.25

test("equal-stat disadvantaged players grind through at full training", () => {
  const probe = runPairProbe()
  for (const cell of probe.cells.filter((c) => c.id.endsWith("trained+6"))) {
    expect(winRate(cell.tally), cell.id).toBeGreaterThanOrEqual(CAP_FLOOR)
  }
})

test("untrained disadvantaged players lose the vast majority", () => {
  const probe = runPairProbe()
  for (const cell of probe.cells.filter((c) => c.id.endsWith("trained+0"))) {
    expect(winRate(cell.tally), cell.id).toBeLessThanOrEqual(BASE_CEILING)
  }
})

test("no cell exceeds the 20% draw ceiling", () => {
  const probe = runPairProbe()
  for (const cell of probe.cells) {
    expect(drawRate(cell.tally), cell.id).toBeLessThanOrEqual(0.2)
  }
})

test("probe covers every starter advantage edge at both levels", () => {
  const probe = runPairProbe()
  // fire>plant, plant>water, water>fire — the three edges × 2 training
  // levels. Reverse orders are advantaged-player cells, outside the bands.
  expect(probe.cells.length).toBe(3 * TRAINED_LEVELS.length)
})
