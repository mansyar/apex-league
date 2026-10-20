/**
 * Track release_polish_20261018 Phase 1: save v16 settings volumes.
 *
 * TDD red phase: these tests describe the schema bump (music/SFX volume
 * preferences persisted alongside the existing settings block) before the
 * implementation exists.
 */
import { describe, expect, test } from "bun:test"
import {
  chooseStarter,
  createInitialState,
  setMusicVolume,
  setSfxVolume,
} from "../state"
import { migrate } from "./migrate"
import { SAVE_VERSION } from "./schema"
import { createMemoryAdapter, loadSave, SAVE_KEY, saveGame } from "./storage"

/** A valid v15 payload whose settings block predates the volume fields. */
function v15Payload(): Record<string, unknown> {
  const owned = chooseStarter(createInitialState(), "fire_drake", 7)
  const state = JSON.parse(JSON.stringify(owned)) as Record<string, unknown>
  const settings = state.settings as Record<string, unknown>
  delete settings.musicVolume
  delete settings.sfxVolume
  return { version: 15, state, session: null, savedAt: 0 }
}

describe("save v16 volumes", () => {
  test("a fresh state starts at full music and SFX volume", () => {
    const state = createInitialState()
    expect(state.settings.musicVolume).toBe(1)
    expect(state.settings.sfxVolume).toBe(1)
  })

  test("the setters clamp to 0..1 and leave the old state untouched", () => {
    const base = createInitialState()

    expect(setMusicVolume(base, 0.35).settings.musicVolume).toBe(0.35)
    expect(setMusicVolume(base, -1).settings.musicVolume).toBe(0)
    expect(setMusicVolume(base, 2).settings.musicVolume).toBe(1)
    expect(setMusicVolume(base, Number.NaN).settings.musicVolume).toBe(0)

    expect(setSfxVolume(base, 0.8).settings.sfxVolume).toBe(0.8)
    expect(setMusicVolume(base, 0.5).settings.sfxVolume).toBe(1)
    expect(base.settings.musicVolume).toBe(1)
    expect(base.settings.sfxVolume).toBe(1)
  })

  test("v15 migrates to v16 with both volumes at full and settings intact", () => {
    const payload = v15Payload()
    const settings = (payload.state as Record<string, unknown>)
      .settings as Record<string, unknown>
    settings.reducedMotion = true
    settings.muted = true

    const migrated = migrate(payload)

    expect(migrated.version).toBe(SAVE_VERSION)
    expect(SAVE_VERSION).toBe(19)
    expect(migrated.state.settings.musicVolume).toBe(1)
    expect(migrated.state.settings.sfxVolume).toBe(1)
    expect(migrated.state.settings.reducedMotion).toBe(true)
    expect(migrated.state.settings.muted).toBe(true)
    expect(migrated.state.creature?.speciesId).toBe("fire_drake")
  })

  test("a v15 file on disk loads with the volume defaults", () => {
    const adapter = createMemoryAdapter()
    adapter.setItem(SAVE_KEY, JSON.stringify(v15Payload()))

    const loaded = loadSave(adapter)

    expect(loaded).not.toBeNull()
    expect(loaded?.state.settings.musicVolume).toBe(1)
    expect(loaded?.state.settings.sfxVolume).toBe(1)
  })

  test("volumes round-trip through save and load", () => {
    const adapter = createMemoryAdapter()
    const state = setSfxVolume(
      setMusicVolume(chooseStarter(createInitialState(), "plant_ox", 3), 0.25),
      0.6,
    )

    expect(saveGame(adapter, state, 0)).toBe(true)

    const loaded = loadSave(adapter)
    expect(loaded?.state.settings.musicVolume).toBe(0.25)
    expect(loaded?.state.settings.sfxVolume).toBe(0.6)
  })

  test("storage rejects non-numeric and out-of-range volumes", () => {
    const seed = createInitialState()
    const adapter = createMemoryAdapter()
    saveGame(adapter, seed, 0)
    const valid = JSON.parse(adapter.getItem(SAVE_KEY) ?? "{}") as Record<
      string,
      unknown
    >

    const withVolume = (value: unknown) => {
      const copy = JSON.parse(JSON.stringify(valid)) as Record<string, unknown>
      const settings = (copy.state as Record<string, unknown>)
        .settings as Record<string, unknown>
      settings.musicVolume = value
      adapter.setItem(SAVE_KEY, JSON.stringify(copy))
      return loadSave(adapter)
    }

    expect(withVolume("loud")).toBeNull()
    expect(withVolume(1.5)).toBeNull()
    expect(withVolume(-0.1)).toBeNull()
    expect(withVolume(0.5)).not.toBeNull()
  })
})
