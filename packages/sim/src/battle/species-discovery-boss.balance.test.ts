/**
 * Boss probe for the nine discovery lines without an authored-boss matrix.
 * Starters, the six reward lines, and the three wave-4 lines keep their
 * existing probes; this suite freezes only the remaining discovery roster.
 *
 * The gates reuse the shipped boss-probe methodology: six creature seeds,
 * six battle seeds, training levels +0/+2/+4/+6, the balanced player tactic,
 * production boss-side construction, and the production resolver. Fresh
 * challengers must lose only where the boss holds the chart edge; every
 * line must reach at least 35% wins against every boss at the training cap.
 * Electric, earth, and wind lines have no authored-boss counter-element, so
 * their fresh behavior is intentionally unconstrained.
 *
 * Print the complete measured matrix for the track docs:
 *   APEX_DISCOVERY_BOSS_REPORT=1 bun test packages/sim/src/battle/species-discovery-boss.balance.test.ts
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
import {
  DISCOVERY_SPECIES,
  getSpecies,
  REWARD_SPECIES,
  STARTER_SPECIES,
} from "../species"
import { typeFactor } from "./chart"
import type { Tactic } from "./policy"
import { type BattleSide, resolveBattle } from "./resolver"

/** The nine discovery lines not covered by an existing authored-boss probe. */
const TARGET_SPECIES: readonly string[] = [
  "voltfox",
  "galeheron",
  "shalemole",
  "dune_jerboa",
  "spark_ray",
  "gale_moth",
  "thornvolt",
  "siltback",
  "emberwing",
]

/** Wave-4 lines already covered by species-wave4-discovery.balance.test.ts. */
const WAVE4_LINES: readonly string[] = ["embercub", "mossboar", "mistkit"]

/** Discovery elements with no authored-boss counter-element. */
const CAP_ONLY_SPECIES: readonly string[] = [
  "voltfox",
  "galeheron",
  "shalemole",
  "dune_jerboa",
  "spark_ray",
  "gale_moth",
  "thornvolt",
]

/** Creature seeds sampling the stat-roll space (mirrors bosses.balance). */
const CREATURE_SEEDS: readonly number[] = [11, 42, 77, 101, 143, 202]

/** Battle seeds replayed inside every duel cell. */
const BATTLE_SEEDS: readonly number[] = [11, 29, 47, 53, 71, 89]

/** Training bonus per stat swept for the player profile. */
const TRAINED_LEVELS: readonly number[] = [0, 2, 4, 6]

/** The player's default tactic; authored bosses keep their registry tactics. */
const PLAYER_TACTIC: Tactic = "balanced"

/** Minimum challenger win share at the training cap. */
const CAP_WIN_RATE = 0.35

/**
 * A locked-species twin of `createCreature`: the identical seeded roll
 * (hp, atk, def, spd) and field defaults, minus the availability gate the
 * probe must bypass by contract.
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

function games(tally: Tally): number {
  return tally.won + tally.lost + tally.drew
}

function winRate(tally: Tally): number {
  const total = games(tally)
  return total === 0 ? 0 : tally.won / total
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function bossHoldsChartEdge(speciesId: string, boss: BossDef): boolean {
  const challenger = getSpecies(speciesId)
  const bossSpecies = getSpecies(boss.speciesId)
  if (!challenger) throw new Error(`unknown species ${speciesId}`)
  if (!bossSpecies) throw new Error(`unknown boss species ${boss.speciesId}`)
  const factor = typeFactor(bossSpecies.element, challenger.element)
  return factor.num > factor.den
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

describe("discovery lines against the authored bosses", () => {
  test("the target roster is exactly the nine uncovered discovery lines", () => {
    expect(TARGET_SPECIES).toEqual([
      "voltfox",
      "galeheron",
      "shalemole",
      "dune_jerboa",
      "spark_ray",
      "gale_moth",
      "thornvolt",
      "siltback",
      "emberwing",
    ])
    expect(
      DISCOVERY_SPECIES.map((species) => species.id).filter(
        (speciesId) => !WAVE4_LINES.includes(speciesId),
      ),
    ).toEqual([...TARGET_SPECIES])
    const excluded = [
      ...STARTER_SPECIES.map((species) => species.id),
      ...REWARD_SPECIES.map((species) => species.id),
      ...WAVE4_LINES,
    ]
    expect(
      TARGET_SPECIES.filter((speciesId) => excluded.includes(speciesId)),
    ).toEqual([])
    expect(BOSSES.map((boss) => boss.id)).toEqual([
      "koda",
      "hesse",
      "marlow",
      "delmar",
      "fenn",
      "thessa",
    ])
  })

  test("the frozen seed grid, training levels, and player tactic stay fixed", () => {
    expect(CREATURE_SEEDS).toEqual([11, 42, 77, 101, 143, 202])
    expect(BATTLE_SEEDS).toEqual([11, 29, 47, 53, 71, 89])
    expect(TRAINED_LEVELS).toEqual([0, 2, 4, 6])
    expect(PLAYER_TACTIC).toBe("balanced")
  })

  test("only water and fire targets have a boss-advantaged fresh cell", () => {
    const freshGated = TARGET_SPECIES.filter((speciesId) =>
      BOSSES.some((boss) => bossHoldsChartEdge(speciesId, boss)),
    )
    expect(freshGated).toEqual(["siltback", "emberwing"])
    expect(
      TARGET_SPECIES.filter((speciesId) => !freshGated.includes(speciesId)),
    ).toEqual([...CAP_ONLY_SPECIES])
  })

  test("a fresh target never beats a boss that holds the chart edge", () => {
    const failures: string[] = []
    for (const speciesId of TARGET_SPECIES) {
      for (const boss of BOSSES) {
        if (!bossHoldsChartEdge(speciesId, boss)) continue
        const tally = duelBoss(speciesId, boss, 0)
        if (tally.won !== 0) {
          failures.push(
            `${speciesId} vs ${boss.id} at trained+0: ${tally.won}/${games(tally)}`,
          )
        }
      }
    }
    expect(failures, "boss-advantaged fresh cells").toEqual([])
  }, 120000)

  test("every boss is grindable at the training cap for every target", () => {
    const failures: string[] = []
    for (const speciesId of TARGET_SPECIES) {
      for (const boss of BOSSES) {
        const tally = duelBoss(speciesId, boss, 6)
        if (winRate(tally) < CAP_WIN_RATE) {
          failures.push(
            `${speciesId} vs ${boss.id} at trained+6: ${pct(winRate(tally))} (${tally.won}/${games(tally)})`,
          )
        }
      }
    }
    expect(failures, "cap cells below 35%").toEqual([])
  }, 120000)
})

test("report mode emits the full discovery boss matrix", () => {
  if (process.env.APEX_DISCOVERY_BOSS_REPORT !== "1") return
  const lines = [
    "[apex-discovery-boss-report]",
    `creatureSeeds=${CREATURE_SEEDS.join(",")}`,
    `battleSeeds=${BATTLE_SEEDS.join(",")}`,
    `trainedLevels=${TRAINED_LEVELS.join(",")}`,
    `playerTactic=${PLAYER_TACTIC}`,
    "",
    "| Player | Boss | trained+0 | trained+2 | trained+4 | trained+6 |",
    "| --- | --- | --- | --- | --- | --- |",
  ]
  for (const speciesId of TARGET_SPECIES) {
    for (const boss of BOSSES) {
      const rates = TRAINED_LEVELS.map((trained) => {
        const tally = duelBoss(speciesId, boss, trained)
        return `${pct(winRate(tally))} (${tally.won}/${games(tally)})`
      })
      lines.push(`| ${speciesId} | ${boss.id} | ${rates.join(" | ")} |`)
    }
  }
  console.info(`\n${lines.join("\n")}\n`)
}, 120000)
