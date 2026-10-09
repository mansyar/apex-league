import { isCupDay } from "../calendar"
import type { GameState } from "../state"
import { ACTION_POINTS_PER_DAY } from "../state"
import { SAVE_VERSION, type SaveDataV1 } from "./schema"

/**
 * Migration chain: each entry upgrades a payload from key version to key + 1.
 * New versions append here; migrate() walks the chain step by step.
 */
const migrations: Record<
  number,
  (raw: Record<string, unknown>) => Record<string, unknown>
> = {
  // v0 (pre-schema): { version: 0, day } — derive the rest of GameState.
  0: (raw) => {
    const day = raw.day
    if (typeof day !== "number" || !Number.isInteger(day) || day < 1) {
      throw new Error("invalid v0 save: missing day")
    }
    const state: GameState = {
      day,
      phase: isCupDay(day) ? "cup" : "day",
      actionPoints: ACTION_POINTS_PER_DAY,
    }
    return { version: 1, state, savedAt: 0 }
  },
}

/**
 * Migrate any versioned save payload to the current schema.
 * Throws on unknown/missing versions — callers treat throws as corrupt data.
 */
export function migrate(raw: unknown): SaveDataV1 {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("invalid save: not an object")
  }
  let obj = raw as Record<string, unknown>
  const rawVersion: unknown = obj.version
  if (typeof rawVersion !== "number") {
    throw new Error("invalid save: missing version")
  }
  let version: number = rawVersion
  while (version < SAVE_VERSION) {
    const step = migrations[version]
    if (!step) {
      throw new Error(`invalid save: no migration from version ${version}`)
    }
    obj = step(obj)
    version = obj.version as number
  }
  if (version !== SAVE_VERSION) {
    throw new Error(`invalid save: future version ${version}`)
  }
  return obj as unknown as SaveDataV1
}
