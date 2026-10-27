/**
 * FR-7: generated rival rosters may field the reward line — `electric_hound`
 * from Silver, `wind_falcon` from Gold, `earth_tortoise` from Legend — exactly
 * when `obtainableSpecies` opens their gate. Roster wave 3 (FR-6) widened
 * every non-Bronze field with the breeding-discovery lines, and roster
 * wave 4 completes the set to six — the wave-3 trio (`voltfox`,
 * `galeheron`, `shalemole`) plus `embercub`, `mossboar`, `mistkit` —
 * rivals are wild opponents, so the acquisition gate that keeps discovery
 * out of `obtainableSpecies` does not bind them.
 * Below a gate the pool is exactly the three starters, so every pre-Silver
 * bracket stays byte-identical to what the draw stream produced before
 * these tracks.
 */

import { describe, expect, test } from "bun:test"
import { bossForCup } from "../bosses"
import { effectiveStats } from "../creature"
import type { LadderTier } from "../ladder"
import { prepareCup } from "../machine"
import {
  DISCOVERY_SPECIES,
  getSpecies,
  obtainableSpecies,
  STARTER_SPECIES,
} from "../species"
import { chooseStarter, createInitialState, type GameState } from "../state"
import { startCupSession } from "./session"

const STARTER_IDS = new Set(STARTER_SPECIES.map((s) => s.id))
const DAYS = Array.from({ length: 24 }, (_, i) => 7 + i * 4)

function stateAt(tier: LadderTier): GameState {
  const started = chooseStarter(createInitialState(), "fire_drake", 42)
  return {
    ...started,
    ladder: { points: tier === "bronze" ? 0 : 20, tier, subTier: "III" },
  }
}

function rivalSpecies(state: GameState, day: number): string[] {
  const session = prepareCup({ ...state, day })
  if (!session) throw new Error("no session")
  return session.bracket.slots
    .filter((slot) => !slot.isPlayer)
    .map((slot) => slot.speciesId)
}

describe("generated rival rosters (FR-7)", () => {
  test("a Bronze save never meets the reward line", () => {
    const state = stateAt("bronze")
    for (const day of DAYS) {
      for (const id of rivalSpecies(state, day)) {
        expect(STARTER_IDS.has(id)).toBe(true)
      }
    }
  })

  test("a pre-Silver bracket is byte-identical to the three-starter draw", () => {
    const state = stateAt("bronze")
    const creature = state.creature
    if (!creature) throw new Error("no creature")
    for (const day of DAYS) {
      const session = prepareCup({ ...state, day })
      if (!session) throw new Error("no session")
      // The machine's seed formula (machine.ts prepareCup): day ⊕ identity.
      const eff = effectiveStats(creature)
      const identity = eff.hp * 7 + eff.atk * 13 + eff.def * 17 + eff.spd * 23
      const seed = (day * 2654435761 + identity * 97 + 1) >>> 0
      const plain = startCupSession(creature, day, seed)
      expect(JSON.parse(JSON.stringify(session.bracket.slots))).toEqual(
        JSON.parse(JSON.stringify(plain.bracket.slots)),
      )
    }
  })

  test("each tier draws exactly its opened pool into the field", () => {
    for (const tier of ["silver", "gold", "legend"] as const) {
      const state = stateAt(tier)
      const met = new Set<string>()
      for (const day of DAYS) {
        for (const id of rivalSpecies(state, day)) met.add(id)
      }
      // The widened pool is the reward-gated pool plus the six discovery
      // lines (waves 3+4): each unlocked species shows up across a
      // two-dozen-day sweep, and no locked one leaks in early.
      const pool = new Set(
        [...obtainableSpecies(tier), ...DISCOVERY_SPECIES].map((s) => s.id),
      )
      expect(pool.size).toBeGreaterThan(STARTER_IDS.size)
      for (const id of pool) expect(met.has(id)).toBe(true)
      for (const id of met) expect(pool.has(id)).toBe(true)
    }
  })

  /** The wave-4 trio joins the widened pool through DISCOVERY_SPECIES. */
  const WAVE4_IDS: readonly string[] = ["embercub", "mossboar", "mistkit"]

  test("each non-Bronze pool holds the six discovery lines over the reward gate", () => {
    expect(DISCOVERY_SPECIES.map((species) => species.id)).toHaveLength(6)
    const sizes = { silver: 11, gold: 13, legend: 15 } as const
    for (const tier of ["silver", "gold", "legend"] as const) {
      const pool = new Set(
        [...obtainableSpecies(tier), ...DISCOVERY_SPECIES].map((s) => s.id),
      )
      expect(pool.size, `${tier} pool`).toBe(sizes[tier])
      for (const id of WAVE4_IDS) expect(pool.has(id), tier).toBe(true)
    }
  })

  test("the wave-4 lines join every non-Bronze field and never leak into Bronze", () => {
    for (const tier of ["bronze", "silver", "gold", "legend"] as const) {
      // Mirror the file's own sweep: DAYS across the tier's state.
      const state = stateAt(tier)
      const met = new Set<string>()
      for (const day of DAYS) {
        for (const id of rivalSpecies(state, day)) met.add(id)
      }
      for (const id of WAVE4_IDS) {
        expect(met.has(id), `${tier} ${id}`).toBe(tier !== "bronze")
      }
    }
  })

  test("widened rivals stay inside their species' legal stat bounds", () => {
    const state = stateAt("gold")
    for (const day of DAYS) {
      const session = prepareCup({ ...state, day })
      if (!session) throw new Error("no session")
      for (const slot of session.bracket.slots) {
        if (slot.isPlayer) continue
        const species = getSpecies(slot.speciesId)
        if (!species) continue // authored boss slot
        for (const stat of ["hp", "atk", "def", "spd"] as const) {
          const [lo, hi] = species.statBounds[stat]
          expect(slot.stats[stat]).toBeGreaterThanOrEqual(lo)
          expect(slot.stats[stat]).toBeLessThanOrEqual(hi)
        }
      }
    }
  })

  test("an authored boss final is untouched by the widened pool", () => {
    // Silver I at 18 points routes the authored Silver final.
    const state = stateAt("silver")
    const gated: GameState = {
      ...state,
      ladder: { ...state.ladder, points: 18 },
    }
    const gate = bossForCup(gated)
    expect(gate?.boss).toBeDefined()
    const session = prepareCup(gated)
    if (!session) throw new Error("no session")
    const final = session.bracket.slots.at(-1)
    expect(final?.bossId).toBe(gate?.boss?.id)
    expect(final?.speciesId).toBe(gate?.boss?.speciesId)
    expect(final?.stats).toEqual(gate?.boss?.stats)
  })
})
