/**
 * The stable (stable & partner reserve, Phase 2): the pets the player owns
 * that are not in the ranch.
 *
 * FR-1/FR-2: the state holds the stable, and exactly one pet is active.
 * FR-3: the swap is free, instant and lossless — every field travels.
 * FR-4: a stashed pet is frozen — the night touches neither its conditions
 *        nor its age.
 * FR-7: the Storm Gift hatches into the stable, the ranch pet untouched.
 * FR-8: a graduation may hand the ranch to a stashed pet.
 * FR-10: a swap is refused while a cup or spar is live.
 * FR-11/FR-12: breeding stays Hall-only, the cups tally stays the family's.
 */
import { describe, expect, test } from "bun:test"
import { breedingPool, hatchGiftEgg } from "./breeding"
import { type Creature, createCreature, NAME_MAX_LENGTH } from "./creature"
import { canGraduate, GRADUATION_DAY, graduateFromStable } from "./legacy"
import { makeRng } from "./rng"
import {
  bringToRanch,
  renameStablePet,
  sendToStable,
  stablePetId,
  stablePetSlot,
} from "./stable"
import { chooseStarter, createInitialState, type GameState } from "./state"
import { advanceDay } from "./ticker"

/** A pet with every career field filled in, so a swap can be checked whole. */
function careerPet(overrides: Partial<Creature> = {}): Creature {
  const base = createCreature("fire_drake", 42)
  return {
    ...base,
    name: "Ember",
    stage: "juvenile",
    ageDays: 12,
    branch: "legacy",
    trained: { hp: 2, atk: 1, def: 0, spd: 1 },
    stats: { hp: 88, atk: 12, def: 9, spd: 11 },
    conditions: { hunger: 55, energy: 60, health: 90, mood: 70, bond: 45 },
    bondedToday: true,
    fedToday: true,
    sickCooldown: 2,
    trainingProgram: "power",
    trainingResult: "gained",
    giftEgg: false,
    parents: [1],
    loadout: ["spark", "flame_charge"],
    ...overrides,
  }
}

/** A save holding the given ranch pet and the given stable pets. */
function stateWith(
  creature: Creature | null,
  stable: Creature[] = [],
  overrides: Partial<GameState> = {},
): GameState {
  const base = chooseStarter(createInitialState(), "fire_drake", 42)
  return { ...base, creature, stable, ...overrides }
}

describe("the stable on the state (FR-1, FR-2)", () => {
  test("a fresh run owns one pet and an empty stable", () => {
    const state = createInitialState()
    expect(state.stable).toEqual([])
    expect(state.creature).toBeNull()
  })

  test("the stable holds every pet the player owns that is not in the ranch", () => {
    const waiting = careerPet({ name: "Waiting" })
    const state = stateWith(careerPet(), [waiting])
    expect(state.stable).toHaveLength(1)
    expect(state.stable[0]?.name).toBe("Waiting")
    expect(state.creature?.name).toBe("Ember")
  })

  test("two pets of the same species may wait in the stable", () => {
    const state = stateWith(careerPet(), [
      careerPet({ name: "First" }),
      careerPet({ name: "Second" }),
    ])
    expect(state.stable.map((pet) => pet.name)).toEqual(["First", "Second"])
  })
})

describe("the swap seam (FR-3)", () => {
  test("a pet can be stashed and brought back with every field intact", () => {
    const pet = careerPet()
    const waiting = careerPet({ name: "Waiting" })
    const state = stateWith(pet, [waiting])
    const stashed = sendToStable(state)
    if (!stashed.ok) throw new Error("the swap was refused")
    expect(stashed.state.creature).toBeNull()
    expect(stashed.state.stable).toEqual([waiting, pet])
    const back = bringToRanch(stashed.state, stablePetId(0))
    if (!back.ok) throw new Error("the swap was refused")
    expect(back.state.creature).toEqual(waiting)
    expect(back.state.stable).toEqual([pet])
  })

  test("a swap and its reverse return the very same state — the seam is pure", () => {
    const pet = careerPet()
    const waiting = careerPet({ name: "Waiting" })
    const state = stateWith(pet, [waiting])
    const forward = bringToRanch(state, stablePetId(0))
    if (!forward.ok) throw new Error("the swap was refused")
    const back = bringToRanch(forward.state, stablePetId(0))
    if (!back.ok) throw new Error("the swap was refused")
    expect(back.state).toEqual(state)
    // The input state was never touched.
    expect(state.creature).toBe(pet)
    expect(state.stable).toEqual([waiting])
  })

  test("the swap is free — it spends no action point and costs no time", () => {
    const pet = careerPet()
    const state = stateWith(pet, [careerPet()], { day: 9, actionPoints: 2 })
    const forward = bringToRanch(state, stablePetId(0))
    if (!forward.ok) throw new Error("the swap was refused")
    expect(forward.state.actionPoints).toBe(2)
    expect(forward.state.day).toBe(9)
  })

  test("the swap leaves the family's standing untouched (FR-12)", () => {
    const pet = careerPet()
    const state = stateWith(pet, [careerPet()], { cupsWon: 4 })
    const forward = bringToRanch(state, stablePetId(0))
    if (!forward.ok) throw new Error("the swap was refused")
    expect(forward.state.cupsWon).toBe(4)
    expect(forward.state.ladder).toEqual(state.ladder)
    expect(forward.state.lineage).toEqual(state.lineage)
  })

  test("a swap exchanges both pets and keeps every field of both", () => {
    const drake = careerPet({ name: "Drake" })
    const ox = {
      ...careerPet(),
      ...createCreature("plant_ox", 7),
      name: "Ox",
      ageDays: 4,
    } as Creature
    const state = stateWith(drake, [ox])
    const forward = bringToRanch(state, stablePetId(0))
    if (!forward.ok) throw new Error("the swap was refused")
    expect(forward.state.creature).toEqual(ox)
    expect(forward.state.stable).toEqual([drake])
    const back = bringToRanch(forward.state, stablePetId(0))
    if (!back.ok) throw new Error("the swap was refused")
    expect(back.state.creature).toEqual(drake)
    expect(back.state.stable).toEqual([ox])
  })

  test("a swap consumes no randomness — the seeded night is unchanged (NFR-3)", () => {
    const pet = careerPet()
    const waiting = careerPet({ name: "Waiting" })
    const state = stateWith(pet, [waiting])
    const forward = bringToRanch(state, stablePetId(0))
    if (!forward.ok) throw new Error("the swap was refused")
    const back = bringToRanch(forward.state, stablePetId(0))
    if (!back.ok) throw new Error("the swap was refused")
    const plain = advanceDay(state, makeRng(9))
    const swapped = advanceDay(back.state, makeRng(9))
    expect(swapped).toEqual(plain)
  })

  test("an unknown pet id is refused", () => {
    const state = stateWith(careerPet(), [careerPet()])
    expect(bringToRanch(state, "stable:9")).toEqual({
      ok: false,
      reason: "unknown-pet",
    })
    expect(bringToRanch(state, "nonsense")).toEqual({
      ok: false,
      reason: "unknown-pet",
    })
  })

  test("an empty ranch cannot be swapped — a swap always leaves one pet active", () => {
    const state = stateWith(null, [careerPet()])
    expect(sendToStable(state)).toEqual({ ok: false, reason: "no-creature" })
  })

  test("the only pet the player owns cannot be sent to the stable", () => {
    const state = stateWith(careerPet(), [])
    expect(sendToStable(state)).toEqual({ ok: false, reason: "only-pet" })
  })

  test("a pet may be parked when the player owns more than one", () => {
    const pet = careerPet()
    const state = stateWith(pet, [careerPet()])
    const parked = sendToStable(state)
    if (!parked.ok) throw new Error("the swap was refused")
    expect(parked.state.creature).toBeNull()
    expect(parked.state.stable).toHaveLength(2)
    expect(parked.state.stable[1]).toEqual(pet)
  })

  test("the stable slot id round-trips", () => {
    expect(stablePetId(0)).toBe("stable:0")
    expect(stablePetId(3)).toBe("stable:3")
    expect(stablePetSlot("stable:2")).toBe(2)
    expect(stablePetSlot("stable:x")).toBeNull()
    expect(stablePetSlot("creature")).toBeNull()
  })
})

describe("renaming a waiting pet (the spec's edge case)", () => {
  test("a stashed pet is renamed where it waits — no swap, no ranch", () => {
    const waiting = careerPet({ name: "Waiting" })
    const state = stateWith(careerPet(), [waiting])
    const renamed = renameStablePet(state, stablePetId(0), "Rolo")
    if (!renamed.ok) throw new Error("the rename was refused")
    expect(renamed.state.stable[0]?.name).toBe("Rolo")
    expect(renamed.state.creature?.name).toBe("Ember")
  })

  test("only the name moves — the pet keeps every other field", () => {
    const waiting = careerPet({ name: "Waiting" })
    const state = stateWith(careerPet(), [waiting])
    const renamed = renameStablePet(state, stablePetId(0), "Rolo")
    if (!renamed.ok) throw new Error("the rename was refused")
    expect(renamed.state.stable[0]).toEqual({ ...waiting, name: "Rolo" })
  })

  test("the ranch pet, the day, the lineage and the ladder stand untouched", () => {
    const pet = careerPet()
    const state = stateWith(pet, [careerPet()], { day: 9, cupsWon: 4 })
    const renamed = renameStablePet(state, stablePetId(0), "Rolo")
    if (!renamed.ok) throw new Error("the rename was refused")
    expect(renamed.state.creature).toBe(pet)
    expect(renamed.state.day).toBe(9)
    expect(renamed.state.cupsWon).toBe(4)
    expect(renamed.state.ladder).toEqual(state.ladder)
    expect(renamed.state.lineage).toEqual(state.lineage)
  })

  test("the name is trimmed and clamped, like the ranch pet's", () => {
    const state = stateWith(careerPet(), [careerPet()])
    const padded = renameStablePet(state, stablePetId(0), "  Rolo  ")
    if (!padded.ok) throw new Error("the rename was refused")
    expect(padded.state.stable[0]?.name).toBe("Rolo")
    const long = renameStablePet(state, stablePetId(0), "x".repeat(40))
    if (!long.ok) throw new Error("the rename was refused")
    expect(long.state.stable[0]?.name).toHaveLength(NAME_MAX_LENGTH)
  })

  test("an empty name falls back to the species' display name", () => {
    const state = stateWith(careerPet(), [careerPet()])
    const blank = renameStablePet(state, stablePetId(0), "   ")
    if (!blank.ok) throw new Error("the rename was refused")
    expect(blank.state.stable[0]?.name).toBe("Ember Drake")
  })

  test("a rename is refused while a cup or spar is live", () => {
    const state = stateWith(careerPet(), [careerPet()], { phase: "cup" })
    expect(renameStablePet(state, stablePetId(0), "Rolo")).toEqual({
      ok: false,
      reason: "cup-phase",
    })
  })

  test("a pet that is not waiting is refused", () => {
    const state = stateWith(careerPet(), [careerPet()])
    expect(renameStablePet(state, "stable:9", "Rolo")).toEqual({
      ok: false,
      reason: "unknown-pet",
    })
    expect(renameStablePet(state, "nonsense", "Rolo")).toEqual({
      ok: false,
      reason: "unknown-pet",
    })
  })

  test("the seam is pure — the input state is never touched", () => {
    const waiting = careerPet({ name: "Waiting" })
    const state = stateWith(careerPet(), [waiting])
    renameStablePet(state, stablePetId(0), "Rolo")
    expect(state.stable[0]?.name).toBe("Waiting")
    expect(state.stable[0]).toBe(waiting)
  })
})

describe("the day-phase lock (FR-10)", () => {
  test("a swap is refused while a cup or spar is live", () => {
    const state = stateWith(careerPet(), [careerPet()], { phase: "cup" })
    expect(sendToStable(state)).toEqual({ ok: false, reason: "cup-phase" })
    expect(bringToRanch(state, stablePetId(0))).toEqual({
      ok: false,
      reason: "cup-phase",
    })
  })

  test("the refused swap changes nothing", () => {
    const state = stateWith(careerPet(), [careerPet()], { phase: "cup" })
    expect(sendToStable(state).ok).toBe(false)
    expect(state.creature?.name).toBe("Ember")
    expect(state.stable).toHaveLength(1)
  })
})

describe("a stashed pet is frozen (FR-4)", () => {
  test("the night settlement touches neither a stashed pet's conditions nor its age", () => {
    const waiting = careerPet({ ageDays: 12 })
    const state = stateWith(careerPet(), [waiting])
    const next = advanceDay(state, makeRng(3))
    expect(next.stable[0]).toEqual(waiting)
    expect(next.stable[0]?.ageDays).toBe(12)
    expect(next.stable[0]?.conditions).toEqual(waiting.conditions)
    // The ranch pet did age — the freeze is the stable's, not the night's.
    expect(next.creature?.ageDays).toBe(13)
  })

  test("a stashed pet resumes exactly where it left off", () => {
    const waiting = careerPet({ ageDays: 12, bondedToday: true })
    const state = stateWith(careerPet(), [waiting])
    const next = advanceDay(state, makeRng(3))
    const back = bringToRanch(next, stablePetId(0))
    if (!back.ok) throw new Error("the swap was refused")
    expect(back.state.creature).toEqual(waiting)
  })

  test("a stashed pet's illness cooldown and training assignment freeze with it", () => {
    const waiting = careerPet({
      sickCooldown: 3,
      trainingProgram: "power",
      trainingResult: "gained",
      trainingDays: 4,
    })
    const state = stateWith(careerPet(), [waiting])
    const next = advanceDay(state, makeRng(3))
    expect(next.stable[0]?.sickCooldown).toBe(3)
    expect(next.stable[0]?.trainingProgram).toBe("power")
    expect(next.stable[0]?.trainingResult).toBe("gained")
    expect(next.stable[0]?.trainingDays).toBe(4)
  })
})

describe("the Storm Gift hatches into the stable (FR-7)", () => {
  test("the hound joins the stable and the ranch pet is untouched", () => {
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    const granted: GameState = {
      ...owned,
      claimedTiers: ["silver"],
      pendingRewards: [{ speciesId: "electric_hound", seed: 4242 }],
    }
    const result = hatchGiftEgg(granted)
    if (!result.ok) throw new Error("the hatch was refused")
    expect(result.state.creature).toEqual(owned.creature)
    expect(result.state.stable).toHaveLength(1)
    expect(result.state.stable[0]?.speciesId).toBe("electric_hound")
    expect(result.state.stable[0]?.giftEgg).toBe(true)
    expect(result.state.pendingRewards).toEqual([])
  })

  test("the ranch pet is not archived — it never left the ranch", () => {
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    const granted: GameState = {
      ...owned,
      claimedTiers: ["silver"],
      pendingRewards: [{ speciesId: "electric_hound", seed: 4242 }],
    }
    const result = hatchGiftEgg(granted)
    if (!result.ok) throw new Error("the hatch was refused")
    expect(result.state.lineage.hallOfFame).toEqual([])
    expect(result.state.lineage.generation).toBe(0)
  })

  test("the queue drains one egg per claim flow", () => {
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    const granted: GameState = {
      ...owned,
      claimedTiers: ["silver", "gold"],
      pendingRewards: [
        { speciesId: "electric_hound", seed: 4242 },
        { speciesId: "wind_falcon", seed: 99 },
      ],
    }
    const hatched = hatchGiftEgg(granted)
    if (!hatched.ok) throw new Error("the hatch was refused")
    expect(hatched.state.stable.map((pet) => pet.speciesId)).toEqual([
      "electric_hound",
    ])
    // A stashed gift pet does not block the next tier's reward: the
    // per-tier queue replaced the single-gift rule (save v25).
    const again = hatchGiftEgg(hatched.state)
    if (!again.ok) throw new Error("the hatch was refused")
    expect(again.state.stable.map((pet) => pet.speciesId)).toEqual([
      "electric_hound",
      "wind_falcon",
    ])
  })
})

describe("graduation hands the ranch to a stashed pet (FR-8)", () => {
  test("a stashed pet succeeds the retiring champion", () => {
    const champion = careerPet({ stage: "champion", ageDays: GRADUATION_DAY })
    const heir = careerPet({ name: "Heir", ageDays: 30 })
    const state = stateWith(champion, [heir], { day: GRADUATION_DAY })
    expect(canGraduate(state).eligible).toBe(true)
    const result = graduateFromStable(state, stablePetId(0))
    if (!result.ok) throw new Error("the graduation was refused")
    expect(result.state.creature).toEqual(heir)
    expect(result.state.stable).toEqual([])
    expect(result.state.lineage.generation).toBe(1)
  })

  test("the retired pet is archived exactly as before", () => {
    const champion = careerPet({ stage: "champion", ageDays: GRADUATION_DAY })
    const heir = careerPet({ name: "Heir", ageDays: 30 })
    const state = stateWith(champion, [heir], { day: GRADUATION_DAY })
    const result = graduateFromStable(state, stablePetId(0))
    if (!result.ok) throw new Error("the graduation was refused")
    const archived = result.state.lineage.hallOfFame
    expect(archived).toHaveLength(1)
    expect(archived[0]?.name).toBe(champion.name)
    expect(archived[0]?.speciesId).toBe(champion.speciesId)
    expect(archived[0]?.generation).toBe(0)
  })

  test("the successor is not added to the Hall a second time", () => {
    const champion = careerPet({ stage: "champion", ageDays: GRADUATION_DAY })
    const heir = careerPet({ name: "Heir", ageDays: 30 })
    const state = stateWith(champion, [heir], { day: GRADUATION_DAY })
    const result = graduateFromStable(state, stablePetId(0))
    if (!result.ok) throw new Error("the graduation was refused")
    expect(result.state.lineage.hallOfFame).toHaveLength(1)
    expect(result.state.lineage.hallOfFame.some((r) => r.name === "Heir")).toBe(
      false,
    )
  })

  test("the career gate still applies to the handover", () => {
    const young = careerPet({ stage: "juvenile", ageDays: 3 })
    const heir = careerPet({ name: "Heir" })
    const state = stateWith(young, [heir], { day: GRADUATION_DAY })
    expect(graduateFromStable(state, stablePetId(0))).toEqual({
      ok: false,
      reason: "not-champion",
    })
  })

  test("an unknown pet id is refused", () => {
    const champion = careerPet({ stage: "champion", ageDays: GRADUATION_DAY })
    const state = stateWith(champion, [careerPet()], { day: GRADUATION_DAY })
    expect(graduateFromStable(state, "stable:7")).toEqual({
      ok: false,
      reason: "unknown-pet",
    })
  })
})

describe("breeding stays Hall-only (FR-11)", () => {
  test("the breeding pool ignores the stable", () => {
    const champion = careerPet({ stage: "champion", ageDays: GRADUATION_DAY })
    const state = stateWith(champion, [careerPet({ name: "Waiting" })], {
      day: GRADUATION_DAY,
    })
    const pool = breedingPool(state)
    expect(pool).toHaveLength(1)
    expect(pool[0]?.name).toBe(champion.name)
    expect(pool.some((record) => record.name === "Waiting")).toBe(false)
  })
})
