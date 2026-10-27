/**
 * Wave-4 discovery boss probe (roster_wave_4 FR-6, NFR-5): `embercub`
 * (fire), `mossboar` (plant) and `mistkit` (water) must be competitively
 * viable against the authored boss roster without any boss, band, or
 * golden changing — the same two gates the reward-line probe
 * (species-roster.balance.test.ts) holds its lines to:
 *
 * 1. fresh gate: at zero training every chart-disadvantaged boss duel is
 *    lost (0/36) — the roster stays a climb, not a handout. Same-element
 *    mirrors and chart-advantaged cells carry no fresh pin here: the
 *    reward-line precedent pins those exactly, and exact pins need a shell
 *    run to record (see the report mode below).
 * 2. cap gate: at the training cap every boss is grindable (>= 35%) for
 *    every new line — the Hesse/Marlow counter-grind bar. Each duel cell
 *    reads both ways at once: the challenger share is the new line's
 *    grind while the complement is the boss loadout's answer, so one
 *    36-game cell per (line, boss) covers the challenger and the
 *    boss-loadout readings the plan asks for.
 *
 * Thresholds only, no exact tallies: exact pins are recorded from a shell
 * run the primary owns. Regenerate the markdown matrix for the track docs:
 *   APEX_WAVE4_BOSS_REPORT=1 bun test packages/sim/src/battle/species-wave4-discovery.balance.test.ts
 */

import { describe, expect, test } from "bun:test"
import { BOSSES, type BossDef } from "../bosses"
import {
  CONDITION_START,
  type Creature,
  type CreatureStats,
  effectiveStats,
} from "../creature"
import { battleSideForSlot } from "../cup"
import { defaultLoadout } from "../loadout"
import { makeRng } from "../rng"
import { getSpecies } from "../species"
import { typeFactor } from "./chart"
import type { Tactic } from "./policy"
import { type BattleSide, resolveBattle } from "./resolver"

/** The wave-4 discovery lines, in recipe-table order. */
const WAVE4_LINES: readonly string[] = ["embercub", "mossboar", "mistkit"]

/** Creature seeds sampling the stat-roll space (mirrors bosses.balance). */
const CREATURE_SEEDS: readonly number[] = [11, 42, 77, 101, 143, 202]

/** Battle seeds replayed inside every duel cell. */
const BATTLE_SEEDS: readonly number[] = [11, 29, 47, 53, 71, 89]

/** The player's default tactic; rivals roll theirs in real cups. */
const PLAYER_TACTIC: Tactic = "balanced"

/**
 * A locked-species twin of `createCreature`: the identical seeded roll
 * (hp, atk, def, spd) and field defaults, minus the availability gate the
 * probe must bypass by contract (acquisition is the reward seam's job).
 */
function speciesAt(speciesId: string, seed: number, trained: number): Creature {
  const def = getSpecies(speciesId)
  if (!def) throw new Error(`unknown species ${speciesId}`)
  const rng = makeRng(seed)
  const roll = ([min, max]: readonly [number, number]) =>
    min + rng.int(max - min + 1)
  const stats: CreatureStats = {
    hp: roll(def.statBounds.hp),
    atk: roll(def.statBounds.atk),
    def: roll(def.statBounds.def),
    spd: roll(def.statBounds.spd),
  }
  const bonus = Math.min(trained, 6)
  return {
    archetypeId: def.archetypeId,
    speciesId: def.id,
    name: def.displayName,
    element: def.element,
    affinity: null,
    traits: [],
    parents: [],
    stage: "baby",
    ageDays: 1,
    branch: null,
    giftEgg: false,
    sickCooldown: 0,
    stats,
    trained: { hp: bonus, atk: bonus, def: bonus, spd: bonus },
    trainingProgram: null,
    trainingResult: null,
    trainingDays: trained,
    loadout: null,
    conditions: { ...CONDITION_START },
    bondedToday: false,
    fedToday: false,
  }
}

/** The player's cup side, built the way slotPlayerSide builds it. */
function playerSide(c: Creature, tactic: Tactic): BattleSide {
  const def = getSpecies(c.speciesId)
  if (!def) throw new Error(`unknown species ${c.speciesId}`)
  return {
    name: "Challenger",
    id: "player",
    element: c.element,
    stats: effectiveStats(c),
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

/** One species vs one boss at one trained level, over every seed combination. */
function duelBoss(speciesId: string, boss: BossDef, trained: number): Tally {
  const tally = emptyTally()
  for (const creatureSeed of CREATURE_SEEDS) {
    const player = playerSide(
      speciesAt(speciesId, creatureSeed, trained),
      PLAYER_TACTIC,
    )
    const rival = bossSide(boss, creatureSeed)
    for (const seed of BATTLE_SEEDS) {
      const result = resolveBattle(player, rival, seed)
      if (result.winner === null) tally.drew += 1
      else if (result.winner === player.name) tally.won += 1
      else tally.lost += 1
    }
  }
  return tally
}

describe("the wave-4 discovery lines against the authored bosses", () => {
  test("a fresh wave-4 line never beats a boss that holds the chart edge", () => {
    for (const speciesId of WAVE4_LINES) {
      const line = getSpecies(speciesId)
      if (!line) throw new Error(`unknown species ${speciesId}`)
      for (const boss of BOSSES) {
        const bossSpecies = getSpecies(boss.speciesId)
        if (!bossSpecies) {
          throw new Error(`unknown boss species ${boss.speciesId}`)
        }
        // The boss holds the edge exactly when its element is
        // chart-advantaged into the challenger's (the disadvantagedSpecies
        // convention in bosses.balance.test.ts). Mirrors and cells the
        // challenger holds carry no fresh pin — see the header.
        const factor = typeFactor(bossSpecies.element, line.element)
        if (factor.num <= factor.den) continue
        const tally = duelBoss(speciesId, boss, 0)
        expect(tally.won, `${speciesId} vs ${boss.name} at trained+0`).toBe(0)
      }
    }
  }, 120000)

  test("every boss is grindable at the training cap for every wave-4 line", () => {
    for (const speciesId of WAVE4_LINES) {
      for (const boss of BOSSES) {
        const tally = duelBoss(speciesId, boss, 6)
        expect(
          winRate(tally),
          `${speciesId} vs ${boss.name} at trained+6`,
        ).toBeGreaterThanOrEqual(0.35)
      }
    }
  }, 120000)
})

test("reports the wave-4 boss matrix for the track docs", () => {
  if (process.env.APEX_WAVE4_BOSS_REPORT !== "1") return
  const levels = [0, 2, 4, 6] as const
  const lines = [
    "| Player | Boss | trained+0 | trained+2 | trained+4 | trained+6 |",
    "| --- | --- | --- | --- | --- | --- |",
  ]
  for (const speciesId of WAVE4_LINES) {
    for (const boss of BOSSES) {
      const rates = levels.map((trained) => {
        const tally = duelBoss(speciesId, boss, trained)
        return `${pct(winRate(tally))} (${tally.won}/${games(tally)})`
      })
      lines.push(`| ${speciesId} | ${boss.name} | ${rates.join(" | ")} |`)
    }
  }
  console.info(`\n${lines.join("\n")}\n`)
})
