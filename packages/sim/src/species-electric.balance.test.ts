/**
 * New-species balance probe (electric_species_line FR-3, AC-3, NFR-4): the
 * electric_hound must be competitively viable against the authored boss
 * roster without any boss or band changing.
 *
 * The probe mirrors the bosses.balance methodology exactly — same creature
 * and battle seeds, the production `resolveBattle`, the production slot
 * builder for boss sides — with one difference: the species is still locked,
 * so the probe builds the hound creature directly from the registry with the
 * same seeded stat roll `createCreature` uses (hp, atk, def, spd order).
 *
 * Electric holds no authored matchup in the boss roster (all six bosses are
 * fire/plant/water), so every cell is an even or advantaged fight for the
 * hound — the first species whose every boss cell is neutral-or-better. The
 * bands therefore mirror what the existing methodology actually enforces,
 * calibrated against the starters' own measured cells:
 *
 * 1. fresh gate: at zero training the hound still loses every even-element
 *    boss duel (type advantage is the only fresh win, as with the starters);
 * 2. cap gate: at the training cap every boss is grindable (>= 35%), with
 *    the exact tallies pinned like the bosses' disadvantaged-cap cells;
 * 3. envelope band: every cap cell sits inside the min-max envelope of the
 *    three starters' own cap cells on that boss — the new species is
 *    balanced against the roster without exceeding any of it — and the
 *    hound's cap vector is distinct from every starter's;
 * 4. final-rival probe: the +5% clamped self-rival the generated bracket
 *    fields at its strongest stays a real fight at every training level,
 *    pinned exactly with a 15-90% sanity band.
 *
 * Regenerate the markdown report for the track docs:
 *   APEX_HOUND_REPORT=1 bun test packages/sim/src/species-electric.balance.test.ts
 */

import { describe, expect, test } from "bun:test"
import type { Tactic } from "./battle/policy"
import { type BattleSide, resolveBattle } from "./battle/resolver"
import { BOSSES, type BossDef } from "./bosses"
import {
  CONDITION_START,
  type Creature,
  type CreatureStats,
  createCreature,
  effectiveStats,
} from "./creature"
import { battleSideForSlot } from "./cup"
import { defaultLoadout } from "./loadout"
import { makeRng } from "./rng"
import { getSpecies, STARTER_SPECIES } from "./species"

const HOUND = "electric_hound"

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
 * probe must bypass by contract (acquisition lands in a later phase).
 */
function houndAt(seed: number, trained: number): Creature {
  const def = getSpecies(HOUND)
  if (!def) throw new Error(`unknown species ${HOUND}`)
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

/** Hound vs one boss at one trained level, over every seed combination. */
function duelBoss(boss: BossDef, trained: number): Tally {
  const tally = emptyTally()
  for (const creatureSeed of CREATURE_SEEDS) {
    const player = playerSide(houndAt(creatureSeed, trained), PLAYER_TACTIC)
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

/** A trained starter creature: rolled stats plus a flat trained bonus. */
function playerAt(speciesId: string, seed: number, trained: number): Creature {
  const base = createCreature(speciesId, seed)
  const bonus = Math.min(trained, 6)
  return {
    ...base,
    trained: { hp: bonus, atk: bonus, def: bonus, spd: bonus },
  }
}

/** A starter species vs one boss at one trained level. */
function duelAs(speciesId: string, boss: BossDef, trained: number): Tally {
  const tally = emptyTally()
  for (const creatureSeed of CREATURE_SEEDS) {
    const player = playerSide(
      playerAt(speciesId, creatureSeed, trained),
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
 * generated bracket can field, clamped to the hound's own bounds.
 */
function duelFinalRival(trained: number): Tally {
  const def = getSpecies(HOUND)
  if (!def) throw new Error(`unknown species ${HOUND}`)
  const tally = emptyTally()
  for (const creatureSeed of CREATURE_SEEDS) {
    const player = houndAt(creatureSeed, trained)
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

/** Bosses the hound fights on even elements (no electric edge). */
function bossElement(boss: BossDef): string {
  const species = getSpecies(boss.speciesId)
  if (!species) throw new Error(`unknown boss species ${boss.speciesId}`)
  return species.element
}

const EVEN_BOSSES = BOSSES.filter((boss) => bossElement(boss) !== "water")
const ADVANTAGED_BOSSES = BOSSES.filter((boss) => bossElement(boss) === "water")

describe("electric_hound boss probe", () => {
  test("the authored roster stays starter-only — no boss fields the new species", () => {
    const starterIds = new Set(STARTER_SPECIES.map((s) => s.id))
    for (const boss of BOSSES) {
      expect(starterIds.has(boss.speciesId), boss.id).toBe(true)
    }
  })

  test("a fresh hound never beats an even-element boss", () => {
    for (const boss of EVEN_BOSSES) {
      const tally = duelBoss(boss, 0)
      expect(winRate(tally), `${boss.name} at trained+0`).toBe(0)
    }
  })

  test("a fresh hound can still pay the water tax forward", () => {
    // Electric beats water: the fresh hound already takes a real share of
    // the advantaged cells, exactly like the starters' fresh type wins.
    for (const boss of ADVANTAGED_BOSSES) {
      const tally = duelBoss(boss, 0)
      expect(
        winRate(tally),
        `${boss.name} at trained+0`,
      ).toBeGreaterThanOrEqual(0.4)
    }
  })

  /**
   * Pinned cap cells (the bosses.balance pin style): exact won/games for the
   * hound at the training cap, plus the >= 35% grindability gate.
   * Recorded 2026-10-21 (electric_species_line Phase 1).
   */
  const HOUND_CAP_WINS: Record<string, { won: number; games: number }> = {
    koda: { won: 31, games: 36 },
    hesse: { won: 36, games: 36 },
    marlow: { won: 36, games: 36 },
    delmar: { won: 36, games: 36 },
    fenn: { won: 30, games: 36 },
    thessa: { won: 36, games: 36 },
  }

  test("every boss is grindable at the training cap, with the cells pinned", () => {
    for (const boss of BOSSES) {
      const tally = duelBoss(boss, 6)
      expect(
        winRate(tally),
        `${boss.name} at trained+6`,
      ).toBeGreaterThanOrEqual(0.35)
      const pinned = HOUND_CAP_WINS[boss.id]
      if (!pinned) throw new Error(`no cap pin for ${boss.id}`)
      expect(tally.won, boss.name).toBe(pinned.won)
      expect(games(tally), boss.name).toBe(pinned.games)
    }
  })

  test("every cap cell sits inside the existing roster's envelope", () => {
    for (const boss of BOSSES) {
      const starterRates = STARTER_SPECIES.map((def) =>
        winRate(duelAs(def.id, boss, 6)),
      )
      const houndRate = winRate(duelBoss(boss, 6))
      expect(
        houndRate,
        `${boss.name} above the roster max`,
      ).toBeLessThanOrEqual(Math.max(...starterRates))
      expect(
        houndRate,
        `${boss.name} below the roster min`,
      ).toBeGreaterThanOrEqual(Math.min(...starterRates))
    }
  })

  test("the hound's cap vector is distinct from every starter's", () => {
    const houndVector = BOSSES.map((boss) => winRate(duelBoss(boss, 6)))
    for (const def of STARTER_SPECIES) {
      const starterVector = BOSSES.map((boss) =>
        winRate(duelAs(def.id, boss, 6)),
      )
      expect(
        houndVector.join(","),
        `indistinguishable from ${def.id}`,
      ).not.toBe(starterVector.join(","))
    }
  })

  /**
   * Pinned final-rival cells: the strongest generated rival stays a real
   * fight at every training level (15-90% sanity band around the pins).
   * Recorded 2026-10-21 (electric_species_line Phase 1).
   */
  const FINAL_RIVAL_WINS: Record<number, { won: number; games: number }> = {
    0: { won: 7, games: 36 },
    2: { won: 11, games: 36 },
    4: { won: 25, games: 36 },
    6: { won: 30, games: 36 },
  }

  test("the strongest generated rival stays beatable", () => {
    for (const trained of TRAINED_LEVELS) {
      const tally = duelFinalRival(trained)
      const rate = winRate(tally)
      const pinned = FINAL_RIVAL_WINS[trained]
      if (!pinned) throw new Error(`no final-rival pin for trained+${trained}`)
      expect(tally.won, `final rival at trained+${trained}`).toBe(pinned.won)
      expect(games(tally), `final rival at trained+${trained}`).toBe(
        pinned.games,
      )
      expect(rate, `final rival at trained+${trained}`).toBeGreaterThanOrEqual(
        0.15,
      )
      expect(rate, `final rival at trained+${trained}`).toBeLessThanOrEqual(0.9)
    }
  })

  test("reports the full matrix for the track docs", () => {
    if (process.env.APEX_HOUND_REPORT !== "1") return
    const players: readonly {
      id: string
      at: (seed: number, trained: number) => Creature
    }[] = [
      { id: HOUND, at: houndAt },
      ...STARTER_SPECIES.map((def) => ({
        id: def.id,
        at: (seed: number, trained: number) => {
          const base = createCreature(def.id, seed)
          const bonus = Math.min(trained, 6)
          return {
            ...base,
            trained: { hp: bonus, atk: bonus, def: bonus, spd: bonus },
          }
        },
      })),
    ]
    const lines = [
      "| Player | Boss | trained+0 | trained+2 | trained+4 | trained+6 |",
      "| --- | --- | --- | --- | --- | --- |",
    ]
    for (const player of players) {
      for (const boss of BOSSES) {
        const rates = TRAINED_LEVELS.map((trained) => {
          const tally = emptyTally()
          for (const creatureSeed of CREATURE_SEEDS) {
            const mine = playerSide(
              player.at(creatureSeed, trained),
              PLAYER_TACTIC,
            )
            const rival = bossSide(boss, creatureSeed)
            for (const seed of BATTLE_SEEDS) {
              const result = resolveBattle(mine, rival, seed)
              if (result.winner === null) tally.drew += 1
              else if (result.winner === mine.name) tally.won += 1
              else tally.lost += 1
            }
          }
          return `${pct(winRate(tally))} (${tally.won}/${games(tally)})`
        })
        lines.push(`| ${player.id} | ${boss.name} | ${rates.join(" | ")} |`)
      }
    }
    const rivalRates = TRAINED_LEVELS.map((trained) => {
      const tally = duelFinalRival(trained)
      return `${pct(winRate(tally))} (${tally.won}/${games(tally)})`
    })
    lines.push(`| ${HOUND} | Final rival | ${rivalRates.join(" | ")} |`)
    console.info(`\n${lines.join("\n")}\n`)
  })
})
