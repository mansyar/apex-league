/**
 * Save v24 (stable & partner reserve, Phase 2): the state gains the stable —
 * the pets the player owns that are not in the ranch.
 *
 * Mirrors the recipe in docs/save-schema.md: bump the version, add the
 * migration, extend the validation, and pin both with tests.
 */

import { describe, expect, test } from "bun:test"
import { type Creature, createCreature } from "../creature"
import { chooseStarter, createInitialState, type GameState } from "../state"
import { migrate } from "./migrate"
import { SAVE_VERSION } from "./schema"
import { createMemoryAdapter, loadGame, SAVE_KEY, saveGame } from "./storage"

/** A v23 payload: the same state, minus the stable. */
function v23Payload(state: GameState) {
  const sansStable = { ...state } as Record<string, unknown>
  delete sansStable.stable
  return { version: 23, state: sansStable, savedAt: 1234, session: null }
}

/** A pet waiting in the stable. */
function waitingPet(overrides: Partial<Creature> = {}): Creature {
  return {
    ...createCreature("plant_ox", 7),
    name: "Bramble",
    ageDays: 5,
    ...overrides,
  }
}

describe("save v24 — the stable", () => {
  test("the schema version is 24", () => {
    expect(SAVE_VERSION).toBe(25)
  })

  test("a v23 save migrates to an empty stable", () => {
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    const migrated = migrate(v23Payload(owned))
    expect(migrated.version).toBe(25)
    expect(migrated.state.stable).toEqual([])
  })

  test("the migration keeps the active pet's own age", () => {
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    const pet = owned.creature
    if (!pet) throw new Error("expected a creature")
    const aged: GameState = {
      ...owned,
      day: 40,
      creature: { ...pet, ageDays: 40 },
    }
    const migrated = migrate(v23Payload(aged))
    expect(migrated.state.creature?.ageDays).toBe(40)
    expect(migrated.state.day).toBe(40)
  })

  test("a save with a pending gift still waits for the player after migrating", () => {
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    const granted: GameState = {
      ...owned,
      claimedTiers: ["silver"],
      pendingRewards: [{ speciesId: "electric_hound", seed: 4242 }],
    }
    const migrated = migrate(v23Payload(granted))
    expect(migrated.state.stable).toEqual([])
    expect(migrated.state.pendingRewards[0]?.speciesId).toBe("electric_hound")
  })

  test("the stable round-trips through saveGame/loadGame", () => {
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    const waiting = waitingPet()
    const state: GameState = { ...owned, stable: [waiting] }
    const adapter = createMemoryAdapter()
    expect(saveGame(adapter, state, 11)).toBe(true)
    const loaded = loadGame(adapter)
    expect(loaded?.stable).toHaveLength(1)
    expect(loaded?.stable[0]?.name).toBe("Bramble")
    expect(loaded?.stable[0]?.speciesId).toBe("plant_ox")
    expect(loaded?.stable[0]?.ageDays).toBe(5)
  })

  test("an empty stable round-trips too", () => {
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    const adapter = createMemoryAdapter()
    expect(saveGame(adapter, owned, 11)).toBe(true)
    expect(loadGame(adapter)?.stable).toEqual([])
  })

  test("a malformed stable fails the load", () => {
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    const cases: unknown[] = [
      // Not a list at all.
      "not-a-list",
      // A pet that is not a pet.
      ["Ember"],
      // A pet with an unknown species.
      [{ ...waitingPet(), speciesId: "moon_wolf" }],
      // A pet with a broken age.
      [{ ...waitingPet(), ageDays: 0 }],
      // A pet with a broken stage.
      [{ ...waitingPet(), stage: "legend" }],
      // A pet with a broken loadout.
      [{ ...waitingPet(), loadout: "spark" }],
    ]
    for (const stable of cases) {
      const adapter = createMemoryAdapter()
      adapter.setItem(
        SAVE_KEY,
        JSON.stringify({
          version: 24,
          state: { ...owned, stable },
          savedAt: 1,
          session: null,
        }),
      )
      expect(loadGame(adapter)).toBeNull()
    }
  })

  test("a stashed pet with an unknown species fails the load like any unknown species", () => {
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    const adapter = createMemoryAdapter()
    adapter.setItem(
      SAVE_KEY,
      JSON.stringify({
        version: 24,
        state: {
          ...owned,
          stable: [{ ...waitingPet(), speciesId: "moon_wolf" }],
        },
        savedAt: 1,
        session: null,
      }),
    )
    expect(loadGame(adapter)).toBeNull()
  })
})
