/**
 * Track release_polish_20261018 Phase 1: save export/import core.
 *
 * TDD red phase: the transfer module is the pure heart of the Settings
 * download/upload actions - no DOM, no adapter, no I/O.
 */
import { describe, expect, test } from "bun:test"
import { chooseStarter, createInitialState } from "../state"
import { SAVE_VERSION } from "./schema"
import { buildSaveExport, inspectSaveImport } from "./transfer"

const NOW = new Date(2026, 9, 18, 12, 0, 0)

function owned() {
  return chooseStarter(createInitialState(), "fire_drake", 42)
}

describe("buildSaveExport", () => {
  test("exports the current version, no session, and a dated filename", () => {
    const state = owned()

    const exported = buildSaveExport(state, NOW)
    const parsed = JSON.parse(exported.json) as Record<string, unknown>

    expect(exported.filename).toBe("apex-league-save-v20-2026-10-18.json")
    expect(parsed.version).toBe(SAVE_VERSION)
    expect(parsed.session).toBeNull()
    expect(parsed.savedAt).toBe(NOW.getTime())
    expect(parsed.state).toEqual(state)
  })

  test("does not mutate the state it exports", () => {
    const state = owned()
    const before = JSON.stringify(state)

    buildSaveExport(state, NOW)

    expect(JSON.stringify(state)).toBe(before)
  })
})

describe("inspectSaveImport", () => {
  test("accepts an export and yields the same state", () => {
    const state = owned()
    const exported = buildSaveExport(state, NOW)

    const result = inspectSaveImport(exported.json)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.version).toBe(SAVE_VERSION)
      expect(result.data.state).toEqual(state)
      expect(result.data.session).toBeNull()
    }
  })

  test("accepts a v15 payload and migrates it to the current version", () => {
    const state = JSON.parse(JSON.stringify(owned())) as Record<string, unknown>
    const settings = state.settings as Record<string, unknown>
    delete settings.musicVolume
    delete settings.sfxVolume
    const raw = JSON.stringify({
      version: 15,
      state,
      session: null,
      savedAt: 1,
    })

    const result = inspectSaveImport(raw)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.version).toBe(SAVE_VERSION)
      expect(result.data.state.settings.musicVolume).toBe(1)
    }
  })

  test("rejects malformed JSON and a missing version", () => {
    expect(inspectSaveImport("not json")).toEqual({
      ok: false,
      reason: "malformed",
    })
    expect(inspectSaveImport("{}")).toEqual({
      ok: false,
      reason: "malformed",
    })
    expect(inspectSaveImport("null")).toEqual({
      ok: false,
      reason: "malformed",
    })
  })

  test("rejects a save from a newer version without touching it", () => {
    const state = owned()
    const raw = JSON.stringify({
      version: SAVE_VERSION + 1,
      state,
      session: null,
      savedAt: 1,
    })

    expect(inspectSaveImport(raw)).toEqual({
      ok: false,
      reason: "future-version",
    })
  })

  test("rejects a migrated payload with an invalid state", () => {
    const state = JSON.parse(JSON.stringify(owned())) as Record<string, unknown>
    const settings = state.settings as Record<string, unknown>
    settings.musicVolume = 4
    const raw = JSON.stringify({
      version: SAVE_VERSION,
      state,
      session: null,
      savedAt: 1,
    })

    expect(inspectSaveImport(raw)).toEqual({ ok: false, reason: "invalid" })
  })

  test("drops a live session rather than importing a stale cup walk", () => {
    const state = owned()
    const raw = JSON.stringify({
      version: SAVE_VERSION,
      state,
      session: { bogus: true },
      savedAt: 1,
    })

    const result = inspectSaveImport(raw)

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.session).toBeNull()
  })
})

describe("affinity drift — transfer round-trip (v20)", () => {
  test("export and import round-trip a drifted affinity", () => {
    const state = owned()
    if (!state.creature) throw new Error("no creature")
    const drifted = {
      ...state,
      creature: { ...state.creature, affinity: "plant" as const },
    }
    const exported = buildSaveExport(drifted, NOW)

    const result = inspectSaveImport(exported.json)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.state.creature?.affinity).toBe("plant")
    }
  })

  test("rejects an import whose secondary affinity equals the primary element", () => {
    const state = owned()
    if (!state.creature) throw new Error("no creature")
    const raw = JSON.stringify({
      version: SAVE_VERSION,
      state: { ...state, creature: { ...state.creature, affinity: "fire" } },
      session: null,
      savedAt: 1,
    })

    expect(inspectSaveImport(raw)).toEqual({ ok: false, reason: "invalid" })
  })

  test("rejects an import with an unknown affinity element", () => {
    const state = owned()
    if (!state.creature) throw new Error("no creature")
    const raw = JSON.stringify({
      version: SAVE_VERSION,
      state: { ...state, creature: { ...state.creature, affinity: "magma" } },
      session: null,
      savedAt: 1,
    })

    expect(inspectSaveImport(raw)).toEqual({ ok: false, reason: "invalid" })
  })
})
