import { describe, expect, test } from "bun:test"

import { chooseStarter, createInitialState } from "../state"
import { migrate } from "./migrate"
import { SAVE_VERSION } from "./schema"
import { createMemoryAdapter, loadGame, saveGame } from "./storage"

describe("save schema cup fields (v5 origin)", () => {
  test("current version matches the schema", () => {
    expect(SAVE_VERSION).toBe(17)
  })

  test("a v4 save migrates to v5 with cupsWon 0 and lastCupDay null", () => {
    const v4 = {
      version: 4,
      state: {
        day: 7,
        phase: "cup" as const,
        actionPoints: 3,
        creature: chooseStarter(createInitialState(), "fire_drake", 42)
          .creature,
      },
      savedAt: 55,
    }
    const migrated = migrate(v4)
    expect(migrated.version).toBe(SAVE_VERSION)
    expect(migrated.savedAt).toBe(55)
    expect(migrated.state.day).toBe(7)
    expect(migrated.state.cupsWon).toBe(0)
    expect(migrated.state.lastCupDay).toBeNull()
  })

  test("a v4 save round-trips training/loadout through to current", () => {
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    if (!owned.creature) throw new Error("no creature")
    const v4 = {
      version: 4,
      state: {
        day: 3,
        phase: "day" as const,
        actionPoints: 1,
        creature: { ...owned.creature, trainingDays: 4 },
      },
      savedAt: 9,
    }
    const migrated = migrate(v4)
    expect(migrated.state.creature?.trainingDays).toBe(4)
    expect(migrated.state.creature?.loadout).toBeNull()
  })

  test("cupsWon and lastCupDay round-trip on a current save", () => {
    const adapter = createMemoryAdapter()
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    const state = { ...owned, cupsWon: 3, lastCupDay: 14 }
    saveGame(adapter, state, 1)
    const loaded = loadGame(adapter)
    expect(loaded?.cupsWon).toBe(3)
    expect(loaded?.lastCupDay).toBe(14)
  })

  test("loadGame rejects corrupt cup fields", () => {
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    const cases: unknown[] = [
      { ...owned, cupsWon: -1 },
      { ...owned, cupsWon: 1.5 },
      { ...owned, cupsWon: "three" },
      { ...owned, lastCupDay: 0 },
      { ...owned, lastCupDay: 3.5 },
      { ...owned, lastCupDay: "seven" },
    ]
    for (const bad of cases) {
      const adapter = createMemoryAdapter()
      saveGame(adapter, bad as typeof owned, 1)
      expect(loadGame(adapter)).toBeNull()
    }
  })

  test("old chain still reaches current: a v1 save walks to v5 with cup defaults", () => {
    const migrated = migrate({
      version: 1,
      state: { day: 2, phase: "day", actionPoints: 3 },
      savedAt: 0,
    })
    expect(migrated.version).toBe(SAVE_VERSION)
    expect(migrated.state.cupsWon).toBe(0)
    expect(migrated.state.lastCupDay).toBeNull()
  })
})
