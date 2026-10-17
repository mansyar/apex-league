/**
 * Boss & ladder balance probe (silver_ladder_bosses_20261016 FR12) — the
 * seed batch that decides whether the authored bosses and the Silver
 * thresholds landed fair, and the tripwire that fails the build if a boss
 * drifts out of band.
 *
 * Two questions, in the spirit of `tactics.balance.test.ts`:
 *
 * 1. Boss difficulty. Each boss is a pinned ABSOLUTE build met at a ladder
 *    milestone. The player profile that matters is not "fresh hatchling"
 *    (that run loses to any max-stat rival — see the doctored-verdict choice
 *    in cup.boss.test.ts) but the trained creature a milestone implies: a
 *    Promotion Cup gate player has been raising their starter for weeks.
 *    The probe sweeps training investment and reports win rates against
 *    each boss AND against the ramped rivals the generated pool fields, so
 *    "harder than the +5% final" is measurable rather than vibes.
 *
 * 2. Climb cadence. Ladder points are pure arithmetic (LADDER_POINTS +
 *    thresholds); the probe turns the constants into "champion cups per
 *    sub-tier" and flags thresholds a real placement distribution cannot
 *    reach in reasonable time.
 *
 * Regenerate the markdown report for the track docs:
 *   APEX_BOSS_REPORT=1 bun test packages/sim/src/bosses.balance.test.ts
 */

import { describe, expect, test } from "bun:test"
import { typeFactor } from "./battle/chart"
import type { Tactic } from "./battle/policy"
import { type BattleSide, resolveBattle } from "./battle/resolver"
import { BOSSES, type BossDef } from "./bosses"
import type { CreatureStats } from "./creature"
import { type Creature, createCreature, effectiveStats } from "./creature"
import {
  battleSideForSlot,
  completeCup,
  cupPlacement,
  resolvePlayerMatch,
  startCupSession,
} from "./cup"
import {
  GOLD_THRESHOLDS,
  LADDER_POINTS,
  LADDER_THRESHOLDS,
  SILVER_THRESHOLDS,
} from "./ladder"
import { defaultLoadout } from "./loadout"
import { getSpecies, STARTER_SPECIES } from "./species"

/** Creature seeds sampling the stat-roll space. */
const CREATURE_SEEDS: readonly number[] = [11, 42, 77, 101, 143, 202]

/** Battle seeds replayed inside every duel cell. */
const BATTLE_SEEDS: readonly number[] = [11, 29, 47, 53, 71, 89]

/** Training bonus per stat swept for the player profile. */
const TRAINED_LEVELS: readonly number[] = [0, 2, 4, 6]

/** The player's default tactic; rivals roll theirs in real cups. */
const PLAYER_TACTIC: Tactic = "balanced"

/** A trained player creature: rolled stats plus a flat trained bonus. */
function playerAt(speciesId: string, seed: number, trained: number): Creature {
  const base = createCreature(speciesId, seed)
  return {
    ...base,
    trained: {
      hp: Math.min(trained, 6),
      atk: Math.min(trained, 6),
      def: Math.min(trained, 6),
      spd: Math.min(trained, 6),
    },
  }
}

/** The player's cup side, built the way slotPlayerSide builds it. */
function playerSide(c: Creature, tactic: Tactic): BattleSide {
  const def = getSpecies(c.speciesId)
  if (!def) throw new Error(`unknown species ${c.speciesId}`)
  const eff = effectiveStats(c)
  return {
    name: "Challenger",
    id: "player",
    element: c.element,
    stats: eff,
    kit: defaultLoadout(c, def),
    tactic,
    temperament: def.temperament,
  }
}

/** The boss's cup side, straight from the production slot builder. */
function bossSide(boss: BossDef, seed: number): BattleSide {
  const slot = {
    isPlayer: false,
    name: boss.name,
    speciesId: boss.speciesId,
    stats: boss.stats,
    bossId: boss.id,
  }
  return battleSideForSlot(slot, seed)
}

interface Tally {
  won: number
  lost: number
  drew: number
}

function emptyTally(): Tally {
  return { won: 0, lost: 0, drew: 0 }
}

function games(t: Tally): number {
  return t.won + t.lost + t.drew
}

function winRate(t: Tally): number {
  const g = games(t)
  return g === 0 ? 0 : t.won / g
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

/** Duel matrix: every starter species vs every boss at every trained level. */
function runBossProbe(): {
  cells: { id: string; tally: Tally; games: number }[]
  battles: number
} {
  const cells: { id: string; tally: Tally; games: number }[] = []
  let battles = 0
  for (const boss of BOSSES) {
    for (const speciesId of STARTER_SPECIES.map((s) => s.id)) {
      for (const trained of TRAINED_LEVELS) {
        const tally = emptyTally()
        for (const creatureSeed of CREATURE_SEEDS) {
          const player = playerSide(
            playerAt(speciesId, creatureSeed, trained),
            PLAYER_TACTIC,
          )
          const rivalSide = bossSide(boss, creatureSeed)
          for (const seed of BATTLE_SEEDS) {
            const result = resolveBattle(player, rivalSide, seed)
            battles += 1
            if (result.winner === null) tally.drew += 1
            else if (result.winner === player.name) tally.won += 1
            else tally.lost += 1
          }
        }
        cells.push({
          id: `${boss.name} <- ${speciesId} trained+${trained}`,
          tally,
          games: games(tally),
        })
      }
    }
  }
  return { cells, battles }
}

/** The +5% final rival at the same profile, for the difficulty comparison. */
function runFinalRivalProbe(): { cells: { id: string; tally: Tally }[] } {
  const cells: { id: string; tally: Tally }[] = []
  for (const speciesId of STARTER_SPECIES.map((s) => s.id)) {
    for (const trained of TRAINED_LEVELS) {
      const tally = emptyTally()
      for (const creatureSeed of CREATURE_SEEDS) {
        const player = playerAt(speciesId, creatureSeed, trained)
        const def = getSpecies(speciesId)
        if (!def) throw new Error(`unknown species ${speciesId}`)
        // The final rival of a generated bracket: +5% ramp on the player's
        // effective stats, clamped to species bounds — the strongest rival
        // the generated pool fields.
        const eff = effectiveStats(player)
        const clamp = (v: number, [lo, hi]: readonly [number, number]) =>
          Math.min(hi, Math.max(lo, v))
        const rivalStats: CreatureStats = {
          hp: clamp(Math.round(eff.hp * 1.05), def.statBounds.hp),
          atk: clamp(Math.round(eff.atk * 1.05), def.statBounds.atk),
          def: clamp(Math.round(eff.def * 1.05), def.statBounds.def),
          spd: clamp(Math.round(eff.spd * 1.05), def.statBounds.spd),
        }
        const rival: BattleSide = {
          name: "Rival Coach",
          id: "rival",
          element: def.element,
          stats: rivalStats,
          kit: def.kit,
          tactic: PLAYER_TACTIC,
          temperament: def.temperament,
        }
        const side = playerSide(player, PLAYER_TACTIC)
        for (const seed of BATTLE_SEEDS) {
          const result = resolveBattle(side, rival, seed)
          if (result.winner === null) tally.drew += 1
          else if (result.winner === side.name) tally.won += 1
          else tally.lost += 1
        }
      }
      cells.push({
        id: `final rival <- ${speciesId} trained+${trained}`,
        tally,
      })
    }
  }
  return { cells }
}

/** Champion-cups needed per climb leg under the current constants. */
function cupsPerClimb(from: number, to: number): number {
  const gap = to - from
  return gap / LADDER_POINTS.champion
}

/** Full generated-cup placement distribution for a representative player. */
function runPlacementProbe(): { placements: Record<number, number> } {
  const placements: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 }
  const speciesId = "fire_drake"
  const def = getSpecies(speciesId)
  if (!def) throw new Error(`unknown species ${speciesId}`)
  for (const creatureSeed of CREATURE_SEEDS) {
    const creature = playerAt(speciesId, creatureSeed, 2)
    const loadout = defaultLoadout(creature, def)
    for (const day of [7, 14, 21, 28, 35, 42, 49]) {
      let session = startCupSession(creature, day, (day * 7 + 1) >>> 0)
      while (session.status === "player-turn") {
        session = resolvePlayerMatch(session, loadout, PLAYER_TACTIC).session
      }
      if (session.status === "eliminated") session = completeCup(session)
      const placement = cupPlacement(session)
      placements[placement] = (placements[placement] ?? 0) + 1
    }
  }
  return { placements }
}

describe("boss balance probe (FR12)", () => {
  // Tuned 2026-10-16 (Phase 3, post element_chart_20261016): the 3/2·2/3
  // chart + softened pins give every boss a per-element exam shape —
  // mirrors ramp 0 → low → high → 100, disadvantaged species cannot win
  // below full training and grind to >=35% at cap, advantaged species pay
  // the type tax forward. See probe-before/probe-after in the track folder.

  /** The species each boss elementally dominates — the disadvantaged exam
   * cell (fire→plant, plant→water, water→fire, per the type chart). */
  function disadvantagedSpecies(boss: BossDef): string {
    const bossDef = getSpecies(boss.speciesId)
    if (!bossDef) throw new Error(`unknown boss species ${boss.speciesId}`)
    const match = STARTER_SPECIES.find((s) => {
      const factor = typeFactor(bossDef.element, s.element)
      return factor.num > factor.den
    })
    if (!match) throw new Error(`no disadvantaged species for ${boss.id}`)
    return match.id
  }

  test("a fresh player never beats the boss on even or worse elements", () => {
    const probe = runBossProbe()
    for (const boss of BOSSES) {
      const bossDef = getSpecies(boss.speciesId)
      if (!bossDef) throw new Error(`unknown boss species ${boss.speciesId}`)
      for (const species of STARTER_SPECIES) {
        const factor = typeFactor(species.element, bossDef.element)
        if (factor.num > factor.den) continue // advantaged: the type tax pays forward
        const cell = probe.cells.find(
          (c) => c.id === `${boss.name} <- ${species.id} trained+0`,
        )
        if (!cell)
          throw new Error(`missing cell ${boss.id} vs ${species.id} at +0`)
        expect(winRate(cell.tally), `${boss.name} vs fresh ${species.id}`).toBe(
          0,
        )
      }
    }
  }, 30000)

  test("a disadvantaged player cannot win below full training", () => {
    const probe = runBossProbe()
    for (const boss of BOSSES) {
      const speciesId = disadvantagedSpecies(boss)
      for (const trained of [0, 2, 4]) {
        const cell = probe.cells.find(
          (c) => c.id === `${boss.name} <- ${speciesId} trained+${trained}`,
        )
        if (!cell)
          throw new Error(`missing cell ${boss.id} ${speciesId} +${trained}`)
        expect(
          winRate(cell.tally),
          `${boss.name} vs ${speciesId} trained+${trained}`,
        ).toBe(0)
      }
    }
  }, 30000)

  test("every boss is grindable at full training for every species", () => {
    const probe = runBossProbe()
    for (const boss of BOSSES) {
      for (const speciesId of STARTER_SPECIES.map((s) => s.id)) {
        const cell = probe.cells.find(
          (c) => c.id === `${boss.name} <- ${speciesId} trained+6`,
        )
        if (!cell) throw new Error(`missing cell ${boss.id} ${speciesId}`)
        expect(
          winRate(cell.tally),
          `${boss.name} vs ${speciesId} at cap`,
        ).toBeGreaterThanOrEqual(0.35)
      }
    }
  })

  test("climb cadence: whole champion-cups per leg, sane span", () => {
    // Bronze legs: 6 points per sub-tier = 2 champion cups.
    expect(cupsPerClimb(0, LADDER_THRESHOLDS.bronzeII)).toBe(2)
    expect(
      cupsPerClimb(LADDER_THRESHOLDS.bronzeII, LADDER_THRESHOLDS.bronzeI),
    ).toBe(2)
    // Silver legs: the tuned constants encode 2 champion cups per sub-tier
    // at ideal pace (probe Phase 3: real mid-trained pace banks ~1–2 pts
    // per cup, so 6 points per leg is the deliberate grind).
    expect(
      cupsPerClimb(LADDER_THRESHOLDS.bronzeI, SILVER_THRESHOLDS.silverII),
    ).toBe(2)
    expect(
      cupsPerClimb(SILVER_THRESHOLDS.silverII, SILVER_THRESHOLDS.silverI),
    ).toBe(2)
    // Gold legs: the same uniform +6 spacing (gold_legend_ladder_20261017).
    expect(
      cupsPerClimb(SILVER_THRESHOLDS.silverI, GOLD_THRESHOLDS.goldII),
    ).toBe(2)
    expect(cupsPerClimb(GOLD_THRESHOLDS.goldII, GOLD_THRESHOLDS.goldI)).toBe(2)
  })

  test("report mode emits the markdown probe doc", () => {
    if (!process.env.APEX_BOSS_REPORT) return
    const boss = runBossProbe()
    const rival = runFinalRivalProbe()
    const lines: string[] = []
    lines.push("# Boss & ladder balance probe")
    lines.push("")
    lines.push(`Battles: ${boss.battles}`)
    lines.push("")
    lines.push("| matchup | games | win | loss | draw | win rate |")
    lines.push("|---|---|---|---|---|---|")
    for (const cell of boss.cells) {
      lines.push(
        `| ${cell.id} | ${cell.games} | ${cell.tally.won} | ${cell.tally.lost} | ${cell.tally.drew} | ${pct(winRate(cell.tally))} |`,
      )
    }
    for (const cell of rival.cells) {
      lines.push(
        `| ${cell.id} | ${games(cell.tally)} | ${cell.tally.won} | ${cell.tally.lost} | ${cell.tally.drew} | ${pct(winRate(cell.tally))} |`,
      )
    }
    lines.push("")
    lines.push(
      `Champion cups per climb: bronze legs ${cupsPerClimb(0, LADDER_THRESHOLDS.bronzeII)}/${cupsPerClimb(LADDER_THRESHOLDS.bronzeII, LADDER_THRESHOLDS.bronzeI)}, silver legs ${cupsPerClimb(LADDER_THRESHOLDS.bronzeI, SILVER_THRESHOLDS.silverII)}/${cupsPerClimb(SILVER_THRESHOLDS.silverII, SILVER_THRESHOLDS.silverI)}, gold legs ${cupsPerClimb(SILVER_THRESHOLDS.silverI, GOLD_THRESHOLDS.goldII)}/${cupsPerClimb(GOLD_THRESHOLDS.goldII, GOLD_THRESHOLDS.goldI)}`,
    )
    const placement = runPlacementProbe()
    const total = Object.values(placement.placements).reduce((a, b) => a + b, 0)
    lines.push("")
    lines.push(
      `Placement distribution (trained+2 fire_drake, 7 cups): ${total} cups`,
    )
    for (const key of ["1", "2", "3", "4"]) {
      lines.push(
        `- placement ${key}: ${placement.placements[Number(key)]} (${pct((placement.placements[Number(key)] ?? 0) / total)})`,
      )
    }
    console.log(lines.join("\n"))
  })
})
