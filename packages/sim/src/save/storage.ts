import type { Creature } from "../creature"
import type { GameState } from "../state"
import { migrate } from "./migrate"
import { SAVE_VERSION, type SaveData, serializeSave } from "./schema"

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
  const data: SaveData = { version: SAVE_VERSION, state, savedAt }
  adapter.setItem(SAVE_KEY, serializeSave(data))
}

const ELEMENTS = ["fire", "water", "plant", "electric", "earth", "wind"]
const STAGES = ["baby", "juvenile", "champion"]

/** A creature is valid when every field is the right type and in range. */
function isValidCreature(c: unknown): c is Creature {
  if (typeof c !== "object" || c === null) return false
  const creature = c as Record<string, unknown>
  if (typeof creature.speciesId !== "string" || creature.speciesId.length === 0)
    return false
  if (typeof creature.bondedToday !== "boolean") return false
  if (!ELEMENTS.includes(creature.element as string)) return false
  if (!STAGES.includes(creature.stage as string)) return false
  const stats = creature.stats
  if (typeof stats !== "object" || stats === null) return false
  for (const value of Object.values(stats as Record<string, unknown>)) {
    if (typeof value !== "number" || !Number.isInteger(value) || value < 1)
      return false
  }
  const conditions = creature.conditions
  if (typeof conditions !== "object" || conditions === null) return false
  for (const value of Object.values(conditions as Record<string, unknown>)) {
    if (
      typeof value !== "number" ||
      !Number.isInteger(value) ||
      value < 0 ||
      value > 100
    )
      return false
  }
  return true
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
      state.actionPoints < 0 ||
      (state.creature !== null && !isValidCreature(state.creature))
    ) {
      return null
    }
    return state
  } catch {
    return null
  }
}
