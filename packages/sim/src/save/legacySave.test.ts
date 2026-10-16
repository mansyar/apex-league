/**
 * Save v10 (legacy & breeding track): the bloodline slice migrates fresh for
 * older saves, round-trips through the adapter, and rejects corrupt values on
 * load. Mirrors the recipe in docs/save-schema.md.
 */

import { describe, expect, test } from "bun:test"
import { graduate, initialLineage } from "../legacy"
import { chooseStarter, createInitialState, type GameState } from "../state"
import { migrate } from "./migrate"
import { SAVE_VERSION } from "./schema"
import { createMemoryAdapter, loadGame, loadSave, saveGame } from "./storage"

/** A valid v9 payload for the same state (no lineage field). */
function v9Payload(state: GameState) {
  const sansLineage = { ...state } as Record<string, unknown>
  delete sansLineage.lineage
  return { version: 9, state: sansLineage, savedAt: 1234, session: null }
}

describe("save v10 — the bloodline slice", () => {
  test("current version is 10", () => {
    expect(SAVE_VERSION).toBe(11)
  })

  test("a v9 save migrates with a fresh lineage", () => {
    const migrated = migrate(v9Payload(createInitialState()))
    expect(migrated.version).toBe(SAVE_VERSION)
    expect(migrated.state.lineage).toEqual(initialLineage())
  })

  test("migration keeps the existing creature and history", () => {
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    const migrated = migrate(v9Payload(owned))
    expect(migrated.state.creature?.speciesId).toBe("fire_drake")
    expect(migrated.state.lineage).toEqual({ generation: 0, hallOfFame: [] })
  })

  test("the lineage slice round-trips through saveGame/loadSave", () => {
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    const creature = owned.creature
    if (!creature) throw new Error("expected a creature")
    const champion: GameState = {
      ...owned,
      day: 60,
      creature: { ...creature, stage: "champion" },
    }
    const result = graduate(champion, "plant_ox", 5)
    if (!result.ok) throw new Error("expected ok")
    const adapter = createMemoryAdapter()
    expect(saveGame(adapter, result.state, 10)).toBe(true)
    const loaded = loadSave(adapter)
    expect(loaded?.state.lineage).toEqual(result.state.lineage)
    expect(loaded?.state.lineage.generation).toBe(1)
    expect(loaded?.state.lineage.hallOfFame).toHaveLength(1)
    expect(loaded?.state.lineage.hallOfFame[0]?.speciesId).toBe("fire_drake")
  })

  test("a corrupt generation is rejected on load", () => {
    const bad = {
      ...createInitialState(),
      lineage: { generation: -1, hallOfFame: [] },
    } as unknown as GameState
    const adapter = createMemoryAdapter()
    saveGame(adapter, bad, 1)
    expect(loadGame(adapter)).toBeNull()
  })

  test("a malformed Hall of Fame record is rejected on load", () => {
    const bad = {
      ...createInitialState(),
      lineage: {
        generation: 1,
        hallOfFame: [{ name: "", speciesId: "fire_drake" }],
      },
    } as unknown as GameState
    const adapter = createMemoryAdapter()
    saveGame(adapter, bad, 1)
    expect(loadGame(adapter)).toBeNull()
  })

  test("a full-chain v0 save still migrates with a fresh lineage", () => {
    const migrated = migrate({ version: 0, day: 7 })
    expect(migrated.version).toBe(SAVE_VERSION)
    expect(migrated.state.lineage).toEqual({ generation: 0, hallOfFame: [] })
  })
})
