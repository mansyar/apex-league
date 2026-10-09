import { describe, expect, test } from "bun:test"

import { createInitialState } from "../state"
import { advanceDay } from "../ticker"
import { migrate } from "./migrate"
import { SAVE_VERSION, type SaveDataV1, serializeSave } from "./schema"
import {
  createMemoryAdapter,
  loadGame,
  type SaveAdapter,
  saveGame,
} from "./storage"

describe("save schema v1", () => {
  test("current version is 1", () => {
    expect(SAVE_VERSION).toBe(1)
  })

  test("serializeSave wraps state with version metadata", () => {
    const data: SaveDataV1 = {
      version: 1,
      state: createInitialState(),
      savedAt: 1000,
    }
    const json = serializeSave(data)
    const parsed = JSON.parse(json) as SaveDataV1
    expect(parsed.version).toBe(1)
    expect(parsed.state.day).toBe(1)
    expect(parsed.savedAt).toBe(1000)
  })
})

describe("migration chain", () => {
  test("migrates a synthetic v0 save to current", () => {
    // v0 predates the versioned schema: flat shape, no phase/AP.
    const v0 = { version: 0, day: 7 }
    const migrated = migrate(v0)
    expect(migrated.version).toBe(1)
    expect(migrated.state.day).toBe(7)
    expect(migrated.state.phase).toBe("cup")
    expect(migrated.state.actionPoints).toBeGreaterThan(0)
  })

  test("v0 day 3 lands in the day phase", () => {
    const migrated = migrate({ version: 0, day: 3 })
    expect(migrated.state.phase).toBe("day")
  })

  test("migrates a current-version save through unchanged", () => {
    const v1: SaveDataV1 = {
      version: 1,
      state: advanceDay(createInitialState()),
      savedAt: 42,
    }
    const migrated = migrate(v1)
    expect(migrated).toEqual(v1)
  })

  test("rejects saves from an unknown future version", () => {
    expect(() => migrate({ version: 99, state: {} })).toThrow()
  })

  test("rejects saves without a version", () => {
    expect(() => migrate({ day: 5 })).toThrow()
  })
})

describe("storage adapter", () => {
  test("saveGame then loadGame round-trips the state", () => {
    const adapter: SaveAdapter = createMemoryAdapter()
    const state = advanceDay(createInitialState())
    saveGame(adapter, state, 777)
    const loaded = loadGame(adapter)
    expect(loaded).not.toBeNull()
    expect(loaded?.day).toBe(2)
    expect(loaded?.phase).toBe(state.phase)
    expect(loaded?.actionPoints).toBe(state.actionPoints)
  })

  test("loadGame returns null when no save exists", () => {
    const adapter: SaveAdapter = createMemoryAdapter()
    expect(loadGame(adapter)).toBeNull()
  })

  test("loadGame returns null on corrupt JSON", () => {
    const adapter: SaveAdapter = createMemoryAdapter()
    adapter.setItem("apex.save", "{not valid json!!")
    expect(loadGame(adapter)).toBeNull()
  })

  test("loadGame returns null on an unreadable future version", () => {
    const adapter: SaveAdapter = createMemoryAdapter()
    adapter.setItem("apex.save", JSON.stringify({ version: 99, state: {} }))
    expect(loadGame(adapter)).toBeNull()
  })

  test("loadGame returns null on a non-object payload", () => {
    const adapter: SaveAdapter = createMemoryAdapter()
    adapter.setItem("apex.save", JSON.stringify("just a string"))
    expect(loadGame(adapter)).toBeNull()
  })
})
