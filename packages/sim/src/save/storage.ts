import { type Creature, type StatKey, TRAINING_CAP } from "../creature"
import { SICK_COOLDOWN_NIGHTS } from "../evolution"
import { getSpecies } from "../species"
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
const STAT_KEYS = ["hp", "atk", "def", "spd"]
const TRAINING_RESULTS = ["gained", "sick", "hungry"]

/** A creature is valid when every field is the right type and in range. */
function isValidCreature(c: unknown): c is Creature {
  if (typeof c !== "object" || c === null) return false
  const creature = c as Record<string, unknown>
  if (typeof creature.speciesId !== "string" || creature.speciesId.length === 0)
    return false
  // The species must exist in the catalog — a hand-edited save referencing
  // an unknown species would crash the client on first render otherwise.
  if (getSpecies(creature.speciesId) === undefined) return false
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
  // v3: training fields must be present and well-formed. Trained bonuses
  // stay within [0, TRAINING_CAP]; focus and result are the sim's own
  // unions (or the absent null after a focusless night).
  const trained = creature.trained
  if (typeof trained !== "object" || trained === null) return false
  const t = trained as Record<string, unknown>
  for (const key of STAT_KEYS) {
    const value = t[key]
    if (
      typeof value !== "number" ||
      !Number.isInteger(value) ||
      value < 0 ||
      value > TRAINING_CAP
    )
      return false
  }
  const focus = creature.trainingFocus
  if (focus !== null && !STAT_KEYS.includes(focus as StatKey)) return false
  const result = creature.trainingResult
  if (result !== null && !TRAINING_RESULTS.includes(result as string))
    return false
  // v4: the daily food flag is a strict boolean and always present.
  if (typeof creature.fedToday !== "boolean") return false
  // v6: the sickness cooldown is a small non-negative integer — the sim
  // only ever writes 0..SICK_COOLDOWN_NIGHTS.
  const cooldown = creature.sickCooldown
  if (
    typeof cooldown !== "number" ||
    !Number.isInteger(cooldown) ||
    cooldown < 0 ||
    cooldown > SICK_COOLDOWN_NIGHTS
  ) {
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
      (state.creature !== null && !isValidCreature(state.creature)) ||
      // v5: the settings block is required and strictly typed.
      typeof state.settings !== "object" ||
      state.settings === null ||
      typeof state.settings.reducedMotion !== "boolean" ||
      // v5: cup bookkeeping must be present and well-formed.
      !Number.isInteger(state.cupsWon) ||
      state.cupsWon < 0 ||
      (state.lastCupDay !== null &&
        (!Number.isInteger(state.lastCupDay) || state.lastCupDay < 1))
    ) {
      return null
    }
    return state
  } catch {
    return null
  }
}
