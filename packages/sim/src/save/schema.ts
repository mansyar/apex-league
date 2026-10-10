import type { GameState } from "../state"

/** Current save schema version. Bump and add a migration on every change. */
export const SAVE_VERSION = 5

/** Versioned save payload. `state` is the full serializable sim state. */
export interface SaveData {
  version: typeof SAVE_VERSION
  state: GameState
  /** Epoch milliseconds when the save was written. */
  savedAt: number
}

/** Serialize a save payload to its on-disk JSON form. */
export function serializeSave(data: SaveData): string {
  return JSON.stringify(data)
}
