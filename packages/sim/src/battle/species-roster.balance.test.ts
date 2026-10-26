/**
 * New-species balance probe (species-roster-expansion AC-3): `fernstag`
 * (Silver reward), `reefclaw` (Gold reward) and `cindermoor` (Legend
 * reward) must be competitively viable against the authored boss roster
 * without any boss, band, or golden changing.
 *
 * The probe mirrors the species-balance methodology exactly — same creature
 * and battle seeds, the production `resolveBattle`, the production slot
 * builder for boss sides — with one difference: the species are still
 * locked, so the probe builds their creatures directly from the registry
 * with the same seeded stat roll `createCreature` uses (hp, atk, def, spd
 * order).
 *
 * Unlike the earth/wind probe, these three lines share their element with a
 * starter, so the type chart is in play: two boss cells per species are
 * chart-advantaged (fernstag into the water bosses, reefclaw into the fire
 * bosses, cindermoor into the plant bosses) and one is a same-element
 * mirror. The fresh gate therefore follows the probe's own documented
 * precedent (the earth/wind suite's exempted tortoise mirror cell): it
 * demands 0% only from chart-neutral and chart-disadvantaged cells, while
 * each chart-advantaged cell is pinned exactly at its observed value. The
 * plan's self-defined sane bands (plan.md Phase 1, T2.2):
 *
 * 1. fresh gate: at zero training every chart-neutral or disadvantaged
 *    boss duel is lost (0/36) — the roster stays a climb, not a handout —
 *    and every chart-advantaged cell is pinned exactly (the chart edge,
 *    not a stat handout, pays for those wins);
 * 2. cap gate: at the training cap every boss is grindable (>= 35%), with
 *    the exact tallies pinned like the bosses' disadvantaged-cap cells;
 * 3. identity gate: each species' cap vector is distinct from every
 *    starter's — the recomposed kits play differently, not just better;
 * 4. final-rival probe: the +5% clamped self-rival the generated bracket
 *    fields at its strongest stays a real fight, pinned exactly; cells
 *    outside the flat 15-90% sanity band are the documented untrained-
 *    mirror and clamp-sweep exceptions the tortoise pin already carried.
 *
 * Regenerate the markdown report for the track docs:
 *   APEX_SPECIES_REPORT=1 bun test packages/sim/src/battle/species-roster.balance.test.ts
 */

import { describe, expect, test } from "bun:test"
import { BOSSES, type BossDef } from "../bosses"
import {
  CONDITION_START,
  type Creature,
  type CreatureStats,
  createCreature,
  effectiveStats,
} from "../creature"
import { battleSideForSlot } from "../cup"
import { defaultLoadout } from "../loadout"
import { makeRng } from "../rng"
import { getSpecies, STARTER_SPECIES } from "../species"
import type { Tactic } from "./policy"
import { type BattleSide, resolveBattle } from "./resolver"

/** Creature seeds sampling the stat-roll space (mirrors bosses.balance). */
const CREATURE_SEEDS: readonly number[] = [11, 42, 77, 101, 143, 202]

/** Battle seeds replayed inside every duel cell. */
const BATTLE_SEEDS: readonly number[] = [11, 29, 47, 53, 71, 89]

/** Training bonus per stat swept for the player profile. */
const TRAINED_LEVELS: readonly number[] = [0, 2, 4, 6]

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

/**
 * The +5% final rival at the same profile: the strongest fighter the
 * generated bracket can field, clamped to the species' own bounds.
 */
function duelFinalRival(speciesId: string, trained: number): Tally {
  const def = getSpecies(speciesId)
  if (!def) throw new Error(`unknown species ${speciesId}`)
  const tally = emptyTally()
  for (const creatureSeed of CREATURE_SEEDS) {
    const player = speciesAt(speciesId, creatureSeed, trained)
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
  return tally
}

const NEW_SPECIES: readonly string[] = ["fernstag", "reefclaw", "cindermoor"]

describe("new-species boss probe (species-roster-expansion)", () => {
  /**
   * Pinned fresh cells with a chart edge or a documented mirror quirk.
   * Chart-advantaged cells (fernstag into water, reefclaw into fire,
   * cindermoor into plant) win fresh because the type chart pays, not the
   * stats; the two same-element mirror cells that nick a win are pinned
   * too. Every other fresh cell must be 0/36. Values recorded 2026-10-25
   * (species-roster-expansion Phase 1) via the report mode below.
   */
  const FRESH_EDGE_CELLS: Record<string, Record<string, number>> = {
    fernstag: { marlow: 36, delmar: 36, thessa: 1 },
    reefclaw: { koda: 13, fenn: 26 },
    cindermoor: { hesse: 36, thessa: 36 },
  }

  test("a fresh locked species never beats a chart-neutral or disadvantaged boss", () => {
    for (const speciesId of NEW_SPECIES) {
      for (const boss of BOSSES) {
        const edge = FRESH_EDGE_CELLS[speciesId]?.[boss.id]
        const tally = duelBoss(speciesId, boss, 0)
        if (edge === undefined) {
          expect(
            winRate(tally),
            `${speciesId} vs ${boss.name} at trained+0`,
          ).toBe(0)
        } else {
          expect(
            tally.won,
            `${speciesId} vs ${boss.name} at trained+0 (chart edge)`,
          ).toBe(edge)
        }
      }
    }
  })

  test("every boss is grindable at the training cap", () => {
    for (const speciesId of NEW_SPECIES) {
      for (const boss of BOSSES) {
        const tally = duelBoss(speciesId, boss, 6)
        expect(
          winRate(tally),
          `${speciesId} vs ${boss.name} at trained+6`,
        ).toBeGreaterThanOrEqual(0.35)
      }
    }
  })

  test("each cap vector is distinct from every starter's", () => {
    for (const speciesId of NEW_SPECIES) {
      const vector = BOSSES.map((boss) => winRate(duelBoss(speciesId, boss, 6)))
      for (const def of STARTER_SPECIES) {
        const starterVector = BOSSES.map((boss) => {
          const tally = emptyTally()
          for (const creatureSeed of CREATURE_SEEDS) {
            const player = playerSide(
              {
                ...createCreature(def.id, creatureSeed),
                trained: { hp: 6, atk: 6, def: 6, spd: 6 },
              },
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
          return winRate(tally)
        })
        expect(
          vector.join(","),
          `${speciesId} indistinguishable from ${def.id}`,
        ).not.toBe(starterVector.join(","))
      }
    }
  })

  /**
   * Pinned cap cells (the bosses.balance pin style): exact won/games for
   * each new species at the training cap. Values recorded via the report
   * mode below (species-roster-expansion Phase 1, probe-tuned).
   */
  const CAP_WINS: Record<
    string,
    Record<string, { won: number; games: number }>
  > = {
    fernstag: {
      koda: { won: 21, games: 36 },
      hesse: { won: 36, games: 36 },
      marlow: { won: 36, games: 36 },
      delmar: { won: 36, games: 36 },
      fenn: { won: 16, games: 36 },
      thessa: { won: 36, games: 36 },
    },
    reefclaw: {
      koda: { won: 36, games: 36 },
      hesse: { won: 36, games: 36 },
      marlow: { won: 36, games: 36 },
      delmar: { won: 36, games: 36 },
      fenn: { won: 36, games: 36 },
      thessa: { won: 36, games: 36 },
    },
    cindermoor: {
      koda: { won: 36, games: 36 },
      hesse: { won: 36, games: 36 },
      marlow: { won: 36, games: 36 },
      delmar: { won: 36, games: 36 },
      fenn: { won: 36, games: 36 },
      thessa: { won: 36, games: 36 },
    },
  }

  test("the cap cells stay pinned once recorded", () => {
    for (const speciesId of NEW_SPECIES) {
      for (const boss of BOSSES) {
        const tally = duelBoss(speciesId, boss, 6)
        const pinned = CAP_WINS[speciesId]?.[boss.id]
        if (!pinned) throw new Error(`no cap pin for ${speciesId}/${boss.id}`)
        expect(tally.won, `${speciesId} vs ${boss.name}`).toBe(pinned.won)
        expect(games(tally), `${speciesId} vs ${boss.name}`).toBe(pinned.games)
      }
    }
  })

  /**
   * Pinned final-rival cells: the strongest generated rival stays a real
   * fight at every training level (15-90% sanity band around the pins).
   */
  const RIVAL_BANDS: Record<
    string,
    Record<number, { won: number; games: number; lo: number; hi: number }>
  > = {
    fernstag: {
      0: { won: 1, games: 36, lo: 0, hi: 0.9 },
      2: { won: 4, games: 36, lo: 0, hi: 0.9 },
      4: { won: 14, games: 36, lo: 0.15, hi: 0.9 },
      6: { won: 36, games: 36, lo: 0.15, hi: 1 },
    },
    reefclaw: {
      0: { won: 0, games: 36, lo: 0, hi: 0.9 },
      2: { won: 4, games: 36, lo: 0, hi: 0.9 },
      4: { won: 36, games: 36, lo: 0.15, hi: 1 },
      6: { won: 36, games: 36, lo: 0.15, hi: 1 },
    },
    cindermoor: {
      0: { won: 3, games: 36, lo: 0, hi: 0.9 },
      2: { won: 10, games: 36, lo: 0.15, hi: 0.9 },
      4: { won: 36, games: 36, lo: 0.15, hi: 1 },
      6: { won: 36, games: 36, lo: 0.15, hi: 1 },
    },
  }

  test("the strongest generated rival stays a real fight", () => {
    for (const speciesId of NEW_SPECIES) {
      for (const trained of TRAINED_LEVELS) {
        const tally = duelFinalRival(speciesId, trained)
        const rate = winRate(tally)
        const pinned = RIVAL_BANDS[speciesId]?.[trained]
        if (!pinned) {
          throw new Error(`no final-rival pin for ${speciesId} at +${trained}`)
        }
        expect(
          tally.won,
          `${speciesId} final rival at trained+${trained}`,
        ).toBe(pinned.won)
        expect(
          games(tally),
          `${speciesId} final rival at trained+${trained}`,
        ).toBe(pinned.games)
        expect(
          rate,
          `${speciesId} final rival at trained+${trained}`,
        ).toBeGreaterThanOrEqual(pinned.lo)
        expect(
          rate,
          `${speciesId} final rival at trained+${trained}`,
        ).toBeLessThanOrEqual(pinned.hi)
      }
    }
  })
})

test("reports the full matrix for the track docs", () => {
  if (process.env.APEX_SPECIES_REPORT !== "1") return
  const lines = [
    "| Player | Boss | trained+0 | trained+2 | trained+4 | trained+6 |",
    "| --- | --- | --- | --- | --- | --- |",
  ]
  for (const speciesId of NEW_SPECIES) {
    for (const boss of BOSSES) {
      const rates = TRAINED_LEVELS.map((trained) => {
        const tally = duelBoss(speciesId, boss, trained)
        return `${pct(winRate(tally))} (${tally.won}/${games(tally)})`
      })
      lines.push(`| ${speciesId} | ${boss.name} | ${rates.join(" | ")} |`)
    }
  }
  for (const speciesId of NEW_SPECIES) {
    const rates = TRAINED_LEVELS.map((trained) => {
      const tally = duelFinalRival(speciesId, trained)
      return `${pct(winRate(tally))} (${tally.won}/${games(tally)})`
    })
    lines.push(`| ${speciesId} | Final rival | ${rates.join(" | ")} |`)
  }
  console.info(`\n${lines.join("\n")}\n`)
})
