import type { GameState } from "../state"
import { migrate } from "./migrate"
import { SAVE_VERSION, type SaveDataV1, serializeSave } from "./schema"

export const SAVE_KEY = "apex.save"

/**
 * Minimal storage surface (the subset of Storage the game needs).
 * Keeps this module DOM-free: the client wires real localStorage in,
 * tests pass a mock.
 */
export interface SaveAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/** In-memory adapter for tests and headless use. */
export function createMemoryAdapter(): SaveAdapter {
  const map = new Map<string, string>()
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value)
    },
  }
}

/** Persist the current state as a versioned save. */
export function saveGame(
  adapter: SaveAdapter,
  state: GameState,
  savedAt: number,
): void {
  const data: SaveDataV1 = { version: SAVE_VERSION, state, savedAt }
  adapter.setItem(SAVE_KEY, serializeSave(data))
}

/**
 * Load and migrate the saved state.
 * Returns null on absent, corrupt, or unreadable saves — the caller
 * falls back to a fresh run.
 */
export function loadGame(adapter: SaveAdapter): GameState | null {
  const raw = adapter.getItem(SAVE_KEY)
  if (raw === null) return null
  try {
    const data = migrate(JSON.parse(raw) as unknown)
    const { state } = data
    if (
      !Number.isInteger(state.day) ||
      state.day < 1 ||
      (state.phase !== "day" && state.phase !== "cup") ||
      !Number.isInteger(state.actionPoints) ||
      state.actionPoints < 0
    ) {
      return null
    }
    return state
  } catch {
    return null
  }
}
