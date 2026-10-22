import { describe, expect, test } from "bun:test"

import { createInitialState } from "../state"
import { migrate, validateStateShape } from "./migrate"
import { migrations } from "./migrations"
import { SAVE_VERSION, type SaveData } from "./schema"

describe("migration chain", () => {
  test("has exactly one step per version, 0 through 23", () => {
    expect(Object.keys(migrations)).toEqual([
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "11",
      "12",
      "13",
      "14",
      "15",
      "16",
      "17",
      "18",
      "19",
      "20",
      "21",
      "22",
      "23",
    ])
  })

  test("has a step for every version below the current one", () => {
    expect(Object.keys(migrations)).toEqual(
      Array.from({ length: SAVE_VERSION }, (_, version) => String(version)),
    )
  })

  test("migrates a v0 payload through every step to the current version", () => {
    const migrated = migrate({ version: 0, day: 1 })
    expect(migrated.version).toBe(SAVE_VERSION)
    expect(migrated.state.day).toBe(1)
    const shape = validateStateShape({ state: migrated.state }, SAVE_VERSION)
    expect(shape.day).toBe(1)
    expect(shape.phase).toBe("day")
  })

  test("a mid-chain payload starts at its own version", () => {
    const state = createInitialState()
    state.day = 4
    // No top-level `day`: only the v0 step reads one, so a chain that
    // walked from the start would throw "invalid v0 save: missing day".
    const migrated = migrate({ version: 18, state, savedAt: 0 })
    expect(migrated.version).toBe(SAVE_VERSION)
    expect(migrated.state.day).toBe(4)
  })

  test("an already-current save is a no-op", () => {
    const current: SaveData = {
      version: SAVE_VERSION,
      state: createInitialState(),
      session: null,
      savedAt: 42,
    }
    expect(migrate(current)).toEqual(current)
  })

  test("a save without a version is rejected", () => {
    expect(() => migrate({ day: 5 })).toThrow("invalid save: missing version")
  })

  test("a save from a newer build is rejected", () => {
    expect(() => migrate({ version: SAVE_VERSION + 1, state: {} })).toThrow(
      `invalid save: future version ${SAVE_VERSION + 1}`,
    )
  })
})
