/**
 * Track release_polish_20261018 Phase 1: corrupt payload retention.
 *
 * A broken save must stay readable until the player chooses "Start over":
 * the recovery dialog downloads the exact stored bytes before any reset.
 */
import { describe, expect, test } from "bun:test"
import { chooseStarter, createInitialState } from "../state"
import {
  clearSave,
  createMemoryAdapter,
  loadBoot,
  readRawSave,
  SAVE_KEY,
  saveGame,
} from "./storage"

const BROKEN = '{"version":15,"state":'

describe("corrupt payload retention", () => {
  test("a corrupt boot keeps the exact raw payload readable", () => {
    const adapter = createMemoryAdapter()
    adapter.setItem(SAVE_KEY, BROKEN)

    expect(loadBoot(adapter)).toEqual({ corrupt: true })
    expect(readRawSave(adapter)).toBe(BROKEN)
    // Reading again proves nothing rewrote or cleared it.
    expect(readRawSave(adapter)).toBe(BROKEN)
    expect(loadBoot(adapter)).toEqual({ corrupt: true })
  })

  test("no save reads as null, and a healthy save reads back its bytes", () => {
    const adapter = createMemoryAdapter()
    expect(readRawSave(adapter)).toBeNull()

    const state = chooseStarter(createInitialState(), "plant_ox", 5)
    saveGame(adapter, state, 123)

    const raw = readRawSave(adapter)
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw ?? "{}")).toMatchObject({ version: 16, savedAt: 123 })
  })

  test("only clearSave removes the broken payload", () => {
    const adapter = createMemoryAdapter()
    adapter.setItem(SAVE_KEY, BROKEN)

    clearSave(adapter)

    expect(readRawSave(adapter)).toBeNull()
    expect(loadBoot(adapter)).toBeNull()
  })
})
