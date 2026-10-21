import { describe, expect, test } from "bun:test"
import { graduate } from "../legacy"
import { chooseStarter, createInitialState, type GameState } from "../state"
import { migrate } from "./migrate"
import { SAVE_VERSION } from "./schema"
import { createMemoryAdapter, loadGame, saveGame } from "./storage"

function activeCreature(state: GameState) {
  if (!state.creature) throw new Error("expected an active creature")
  return state.creature
}

function hallRecord(state: GameState, index: number) {
  const record = state.lineage.hallOfFame[index]
  if (!record) throw new Error(`expected Hall record ${index}`)
  return record
}

/** Two archived generations plus a water champion (generation 2). */
function populatedState(): GameState {
  const owned = chooseStarter(createInitialState(), "fire_drake", 42)
  const first = graduate(
    {
      ...owned,
      day: 60,
      creature: { ...activeCreature(owned), stage: "champion" },
    },
    "plant_ox",
    5,
  )
  if (!first.ok) throw new Error("expected first graduation")
  const second = graduate(
    {
      ...first.state,
      creature: { ...activeCreature(first.state), stage: "champion" },
    },
    "water_axolotl",
    6,
  )
  if (!second.ok) throw new Error("expected second graduation")
  return {
    ...second.state,
    day: 70,
    creature: { ...activeCreature(second.state), stage: "champion" },
  }
}

/** A v14-shaped state: the v15 lineage fields are absent. */
function withoutV15Fields(state: GameState): GameState {
  const copy = structuredClone(state)
  const creature = copy.creature as unknown as Record<string, unknown> | null
  if (creature) {
    delete creature.traits
    delete creature.parents
  }
  for (const record of copy.lineage.hallOfFame) {
    const row = record as unknown as Record<string, unknown>
    delete row.traits
    delete row.parents
  }
  return copy
}

function v14Payload(): Record<string, unknown> {
  return {
    version: 14,
    state: withoutV15Fields(populatedState()),
    savedAt: 1234,
    session: null,
  }
}

describe("save v15 (dynasty_breeding_20261018)", () => {
  test("SAVE_VERSION is 19", () => {
    expect(SAVE_VERSION).toBe(20)
  })

  test("migrates a v14 creature and Hall records to empty v15 lineage fields", () => {
    const before = v14Payload()
    const migrated = migrate(before)

    expect(migrated.version).toBe(SAVE_VERSION)
    expect(migrated.savedAt).toBe(1234)
    expect(migrated.state.day).toBe(70)
    expect(migrated.state.lineage.generation).toBe(2)
    expect(migrated.state.lineage.hallOfFame).toHaveLength(2)
    expect(migrated.state.creature?.traits).toEqual([])
    expect(migrated.state.creature?.parents).toEqual([])
    for (const record of migrated.state.lineage.hallOfFame) {
      expect(record.traits).toEqual([])
      expect(record.parents).toEqual([])
    }
  })

  test("does not invent parentage for pre-v15 records", () => {
    const migrated = migrate(v14Payload())
    expect(
      migrated.state.lineage.hallOfFame.map((record) => record.parents),
    ).toEqual([[], []])
  })

  test("forwards settings, ladder, and the boss ledger untouched", () => {
    const before = populatedState()
    before.settings.muted = true
    before.settings.reducedMotion = true
    before.ladder.points = 37
    before.bossDefeats = ["koda"]
    const migrated = migrate({
      version: 14,
      state: withoutV15Fields(before),
      savedAt: 99,
      session: null,
    })
    expect(migrated.state.settings.muted).toBe(true)
    expect(migrated.state.settings.reducedMotion).toBe(true)
    expect(migrated.state.ladder.points).toBe(37)
    expect(migrated.state.bossDefeats).toEqual(["koda"])
  })

  test("round-trips a v15 bred creature with traits and parentage", () => {
    const adapter = createMemoryAdapter()
    const state = populatedState()
    state.creature = {
      ...activeCreature(state),
      traits: ["sturdy", "fierce"],
      parents: [0, 1],
    }
    expect(saveGame(adapter, state, 5)).toBe(true)

    const loaded = loadGame(adapter)
    expect(loaded).not.toBeNull()
    expect(loaded?.creature?.traits).toEqual(["sturdy", "fierce"])
    expect(loaded?.creature?.parents).toEqual([0, 1])
    expect(loaded?.lineage.hallOfFame[0]?.traits.length).toBe(1)
    expect(loaded?.lineage.hallOfFame[0]?.parents).toEqual([])
  })

  test("rejects unknown or duplicated traits", () => {
    const cases: Array<(state: GameState) => void> = [
      (state) => {
        activeCreature(state).traits = ["unknown" as never]
      },
      (state) => {
        activeCreature(state).traits = ["sturdy", "sturdy"]
      },
      (state) => {
        hallRecord(state, 0).traits = ["unknown" as never]
      },
      (state) => {
        hallRecord(state, 1).traits = ["fierce", "fierce"]
      },
    ]
    for (const mutate of cases) {
      const adapter = createMemoryAdapter()
      const state = structuredClone(populatedState())
      mutate(state)
      saveGame(adapter, state, 1)
      expect(loadGame(adapter)).toBeNull()
    }
  })

  test("rejects malformed parent lists", () => {
    const cases: Array<(state: GameState) => void> = [
      (state) => {
        activeCreature(state).parents = [1, 1]
      },
      (state) => {
        activeCreature(state).parents = [1, 2, 3]
      },
      (state) => {
        activeCreature(state).parents = [-1]
      },
      (state) => {
        activeCreature(state).parents = [1.5]
      },
      (state) => {
        hallRecord(state, 0).parents = [0, 0]
      },
      (state) => {
        hallRecord(state, 0).parents = [0, 1, 2]
      },
    ]
    for (const mutate of cases) {
      const adapter = createMemoryAdapter()
      const state = structuredClone(populatedState())
      mutate(state)
      saveGame(adapter, state, 1)
      expect(loadGame(adapter)).toBeNull()
    }
  })

  test("rejects a v15 record or creature missing its lineage fields", () => {
    const adapter = createMemoryAdapter()
    const missingRecord = structuredClone(populatedState())
    delete (
      missingRecord.lineage.hallOfFame[0] as unknown as Record<string, unknown>
    ).traits
    saveGame(adapter, missingRecord, 1)
    expect(loadGame(adapter)).toBeNull()

    const missingCreature = structuredClone(populatedState())
    delete (missingCreature.creature as unknown as Record<string, unknown>)
      .parents
    saveGame(adapter, missingCreature, 1)
    expect(loadGame(adapter)).toBeNull()
  })
})
