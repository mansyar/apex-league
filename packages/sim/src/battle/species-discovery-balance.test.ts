/**
 * Breeding-discovery kit probe (`roster_wave_3` FR-3, AC-3, NFR-5): the
 * voltfox/galeheron/shalemole six-move kits recompose only their element's
 * existing vocabulary and land inside the sustained-output band the shipped
 * roster already defines — no kit changes, no golden regressions.
 *
 * A kit's sustained score sums, over its six rows, the policy's own expected
 * damage per action window: `strikeDamage` with fixed 10/10 reference stats
 * on a chart-neutral mirror, times accuracy, divided by `1 + cooldown`. The
 * band is read off the nine shipped kits at runtime, so the gate
 * self-calibrates: a kit edit that pushes any line outside the roster's own
 * spread fails here, not in a golden.
 *
 * The duels smoke the production battle path for the three lines (seeded
 * sibling creatures, both side orders, fresh and capped training): every
 * duel must terminate with the winner decided or drawn.
 *
 * Print the score table for the track docs:
 *   APEX_DISCOVERY_REPORT=1 bun test packages/sim/src/battle/species-discovery-balance.test.ts
 */

import { describe, expect, test } from "bun:test"
import {
  CONDITION_START,
  type Creature,
  type CreatureStats,
  effectiveStats,
} from "../creature"
import { defaultLoadout } from "../loadout"
import { makeRng } from "../rng"
import {
  DISCOVERY_SPECIES,
  getSpecies,
  REWARD_SPECIES,
  STARTER_SPECIES,
} from "../species"
import { typeFactor } from "./chart"
import { strikeDamage } from "./damage"
import { getMove } from "./moves"
import type { Tactic } from "./policy"
import { type BattleSide, resolveBattle } from "./resolver"

/** Creature seeds sampling the stat-roll space (mirrors species-balance). */
const CREATURE_SEEDS: readonly number[] = [11, 42, 77, 101, 143, 202]

/** Battle seeds replayed inside every duel cell. */
const BATTLE_SEEDS: readonly number[] = [11, 29, 47, 53, 71, 89]

/** The fixed reference stats every sustained score is computed with. */
const REFERENCE_ATK = 10
const REFERENCE_DEF = 10

/** The same-element sibling each discovery line shares its chart with. */
const SIBLINGS: Readonly<Record<string, string>> = Object.freeze({
  voltfox: "electric_hound",
  galeheron: "wind_falcon",
  shalemole: "earth_tortoise",
})

/**
 * A locked-species twin of `createCreature`: the identical seeded roll
 * (hp, atk, def, spd) and field defaults, minus the availability gate the
 * probe must bypass by contract (the nursery egg is the only way in).
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

/**
 * A kit's sustained output per action window under the policy's own
 * arithmetic, on a chart-neutral mirror with fixed reference stats.
 */
function sustainedScore(speciesId: string): number {
  const def = getSpecies(speciesId)
  if (!def) throw new Error(`unknown species ${speciesId}`)
  const type = typeFactor(def.element, def.element)
  let total = 0
  for (const moveId of def.kit) {
    const move = getMove(moveId)
    if (!move) throw new Error(`kit move unknown: ${moveId}`)
    const damage = strikeDamage(
      move.power,
      REFERENCE_ATK,
      REFERENCE_DEF,
      type.num,
      type.den,
      true,
    )
    total += (damage * move.accuracy) / 100 / (1 + move.cooldown)
  }
  return total
}

/** A cup side for a probe creature, built the way the cup builds the player's. */
function probeSide(
  c: Creature,
  name: string,
  id: string,
  tactic: Tactic,
): BattleSide {
  const def = getSpecies(c.speciesId)
  if (!def) throw new Error(`unknown species ${c.speciesId}`)
  return {
    name,
    id,
    element: c.element,
    stats: effectiveStats(c),
    kit: defaultLoadout(c, def),
    tactic,
    temperament: def.temperament,
  }
}

function report(scores: Readonly<Record<string, number>>): void {
  if (process.env.APEX_DISCOVERY_REPORT !== "1") return
  const rows = Object.entries(scores)
    .map(([id, score]) => `${id}: ${score.toFixed(3)}`)
    .join("\n")
  console.log(`[apex-discovery-report]\n${rows}`)
}

describe("discovery kit sustained band", () => {
  test("the roster reads nine shipped kits plus the three discovery kits", () => {
    expect([...STARTER_SPECIES, ...REWARD_SPECIES]).toHaveLength(9)
    expect(DISCOVERY_SPECIES.map((s) => s.id)).toEqual([
      "voltfox",
      "galeheron",
      "shalemole",
    ])
  })

  test("every discovery kit scores inside the shipped roster's own band", () => {
    const shipped = [...STARTER_SPECIES, ...REWARD_SPECIES].map((s) =>
      sustainedScore(s.id),
    )
    const lo = Math.min(...shipped)
    const hi = Math.max(...shipped)
    const scores: Record<string, number> = {}
    for (const line of DISCOVERY_SPECIES) {
      const score = sustainedScore(line.id)
      scores[line.id] = score
      expect(score, `${line.id} sustained`).toBeGreaterThanOrEqual(lo)
      expect(score, `${line.id} sustained`).toBeLessThanOrEqual(hi)
    }
    report(scores)
  })

  test("every discovery kit is battle-legal: six known rows, four equipped", () => {
    for (const line of DISCOVERY_SPECIES) {
      expect(line.kit).toHaveLength(6)
      expect(new Set(line.kit).size).toBe(6)
      for (const moveId of line.kit) {
        expect(getMove(moveId)?.element).toBe(line.element)
      }
      const creature = speciesAt(line.id, 42, 6)
      expect(defaultLoadout(creature, line)).toHaveLength(4)
      for (const moveId of defaultLoadout(creature, line)) {
        expect(line.kit).toContain(moveId)
      }
    }
  })

  test("sibling duels terminate on the production path, both side orders", () => {
    const tactic: Tactic = "balanced"
    for (const line of DISCOVERY_SPECIES) {
      const sibling = SIBLINGS[line.id]
      if (!sibling) throw new Error(`no sibling pinned for ${line.id}`)
      for (const trained of [0, 6]) {
        for (const creatureSeed of CREATURE_SEEDS) {
          const lineSide = (name: string, id: string) =>
            probeSide(
              speciesAt(line.id, creatureSeed, trained),
              name,
              id,
              tactic,
            )
          const siblingSide = (name: string, id: string) =>
            probeSide(
              speciesAt(sibling, creatureSeed, trained),
              name,
              id,
              tactic,
            )
          for (const seed of BATTLE_SEEDS) {
            for (const swapped of [false, true]) {
              const first = swapped
                ? siblingSide("Sibling", "sibling")
                : lineSide("Discovery", "discovery")
              const second = swapped
                ? lineSide("Discovery", "discovery")
                : siblingSide("Sibling", "sibling")
              const result = resolveBattle(first, second, seed)
              expect(
                [null, first.name, second.name],
                `${line.id} vs ${sibling} seed ${seed}`,
              ).toContain(result.winner)
            }
          }
        }
      }
    }
  })
})
