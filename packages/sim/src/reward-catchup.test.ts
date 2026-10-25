/**
 * The reward catch-up (species-roster-expansion FR-4): a save that claimed
 * a reward tier before that tier's newer species shipped receives the new
 * species on the next boot — as a queued `pendingReward`, with no new
 * claim stamp, exactly once, and in tier order. The new lines also pass
 * the FR-5 lifecycle parity checks that need no design decision: they
 * hatch purely from gift eggs and respond to every training program.
 */
import { describe, expect, test } from "bun:test"
import { createGiftEgg, hatchGiftEgg } from "./breeding"
import type { StatKey } from "./creature"
import { reconcileLeagueRewards } from "./cupRewards"
import type { LadderTier } from "./ladder"
import { retireeRecord } from "./legacy"
import { trainingPlan } from "./settlement"
import { getSpecies } from "./species"
import { chooseStarter, createInitialState, type GameState } from "./state"
import { TRAINING_PROGRAMS } from "./training"

const DAY = 7
const FERNSTAG = "fernstag"
const REEFCLAW = "reefclaw"
const CINDERMOOR = "cindermoor"

/** The new reward species, in tier order (Silver, Gold, Legend). */
const NEW_IDS = [FERNSTAG, REEFCLAW, CINDERMOOR]

/** A save standing at the given ladder position, on its cup day. */
function stateAt(): GameState {
  const started = chooseStarter(createInitialState(), "fire_drake", 42)
  return { ...started, day: DAY }
}

/** A claimed-tiers list for fixtures (mutable copy of the named tiers). */
function claimed(...tiers: LadderTier[]): LadderTier[] {
  return [...tiers]
}

describe("reconcileLeagueRewards — the retroactive catch-up", () => {
  test("a pre-claimed tier catches its newer species up on the next boot", () => {
    const s = stateAt()
    // Pre-track save: Silver and Gold claimed, hound and falcon delivered
    // (hound stashed, falcon on the ranch) — the newer lines never shipped
    // for this save.
    const delivered = {
      ...s,
      claimedTiers: claimed("silver", "gold"),
      creature: createGiftEgg("wind_falcon", 11),
      stable: [createGiftEgg("electric_hound", 12)],
    }
    const reconciled = reconcileLeagueRewards(delivered)
    // No new claim stamps — the tiers were already claimed.
    expect(reconciled.claimedTiers).toEqual(["silver", "gold"])
    // The catch-up eggs join the queue in tier order.
    expect(reconciled.pendingRewards.map((egg) => egg.speciesId)).toEqual([
      FERNSTAG,
      REEFCLAW,
    ])
  })

  test("every delivered hiding place satisfies the check — no re-grant", () => {
    const s = stateAt()
    const retired = retireeRecord({
      ...s,
      creature: createGiftEgg("electric_hound", 21),
    })
    if (!retired) throw new Error("the retiree record refused")
    const delivered = {
      ...s,
      claimedTiers: claimed("legend", "silver", "gold"),
      creature: createGiftEgg("wind_falcon", 22),
      stable: [createGiftEgg("earth_tortoise", 23)],
      lineage: { ...s.lineage, hallOfFame: [retired] },
    }
    const reconciled = reconcileLeagueRewards(delivered)
    expect(reconciled.pendingRewards.map((egg) => egg.speciesId)).toEqual([
      FERNSTAG,
      REEFCLAW,
      CINDERMOOR,
    ])
  })

  test("the catch-up never duplicates a grant on repeat boots", () => {
    const s = stateAt()
    const preTrack = {
      ...s,
      claimedTiers: claimed("silver"),
      stable: [createGiftEgg("electric_hound", 12)],
    }
    const first = reconcileLeagueRewards(preTrack)
    const second = reconcileLeagueRewards(first)
    expect(second.pendingRewards).toEqual(first.pendingRewards)
    expect(second.pendingRewards.map((egg) => egg.speciesId)).toEqual([
      FERNSTAG,
    ])
  })

  test("an already-hatched catch-up pet proves delivery on the next boot", () => {
    const s = stateAt()
    const preTrack = {
      ...s,
      claimedTiers: claimed("silver"),
      stable: [createGiftEgg("electric_hound", 12)],
    }
    const first = reconcileLeagueRewards(preTrack)
    const hatched = hatchGiftEgg(first)
    if (!hatched.ok) throw new Error(`hatch refused: ${hatched.reason}`)
    const booted = reconcileLeagueRewards(hatched.state)
    // The hatched fernstag now lives in the stable — delivery proven.
    expect(booted.pendingRewards).toEqual([])
  })

  test("the catch-up egg slots into the existing queue by tier order", () => {
    const s = stateAt()
    // A legend save that already holds an unhatched tortoise egg.
    const withQueue: GameState = {
      ...s,
      claimedTiers: claimed("silver", "gold", "legend"),
      pendingRewards: [{ speciesId: "earth_tortoise", seed: 31 }],
    }
    const reconciled = reconcileLeagueRewards(withQueue)
    expect(reconciled.pendingRewards.map((egg) => egg.speciesId)).toEqual([
      "electric_hound",
      FERNSTAG,
      "wind_falcon",
      REEFCLAW,
      "earth_tortoise",
      CINDERMOOR,
    ])
  })

  test("a fresh save passes through untouched", () => {
    const s = stateAt()
    expect(reconcileLeagueRewards(s)).toEqual(s)
  })

  test("the catch-up is pure — the input state is never mutated", () => {
    const s = stateAt()
    const preTrack = { ...s, claimedTiers: claimed("legend") }
    const before = JSON.stringify(preTrack)
    reconcileLeagueRewards(preTrack)
    expect(JSON.stringify(preTrack)).toBe(before)
  })
})

describe("the new lines hatch purely from gift eggs (FR-5 parity)", () => {
  for (const id of NEW_IDS) {
    test(`${id} hatches from its egg with the exact seeded roll`, () => {
      const egg = createGiftEgg(id, 77)
      expect(egg.affinity).toBeNull()
      expect(egg.giftEgg).toBe(true)
      expect(egg.parents).toEqual([])
      expect(egg.stage).toBe("baby")
      // The roll stays inside the species' own stat bounds.
      const species = getSpecies(id)
      if (!species) throw new Error(`species missing: ${id}`)
      for (const key of ["hp", "atk", "def", "spd"] as const) {
        const [lo, hi] = species.statBounds[key]
        expect(egg.stats[key]).toBeGreaterThanOrEqual(lo)
        expect(egg.stats[key]).toBeLessThanOrEqual(hi)
      }
    })
  }

  test("a queued catch-up egg hatches into the stable", () => {
    const s = stateAt()
    const preTrack = {
      ...s,
      claimedTiers: claimed("silver"),
      stable: [createGiftEgg("electric_hound", 12)],
    }
    const reconciled = reconcileLeagueRewards(preTrack)
    const hatched = hatchGiftEgg(reconciled)
    if (!hatched.ok) throw new Error(`hatch refused: ${hatched.reason}`)
    expect(hatched.state.pendingRewards).toEqual([])
    const pet = hatched.state.stable.at(-1)
    if (!pet) throw new Error("the hatch left no pet in the stable")
    expect(pet.speciesId).toBe(FERNSTAG)
    expect(pet.giftEgg).toBe(true)
    expect(pet.affinity).toBeNull()
  })
})

describe("the new lines respond to every training program (FR-5 parity)", () => {
  for (const id of NEW_IDS) {
    test(`${id} pays every program's primary on a trained night`, () => {
      const egg = createGiftEgg(id, 88)
      for (const program of TRAINING_PROGRAMS) {
        const assigned = { ...egg, trainingProgram: program.id }
        const plan = trainingPlan(assigned)
        expect(plan.result, `${id} × ${program.id}`).toBe("gained")
        const primary: StatKey = program.primary
        expect(plan.gains[primary], `${id} × ${program.id}`).toBe(1)
      }
    })
  }
})
