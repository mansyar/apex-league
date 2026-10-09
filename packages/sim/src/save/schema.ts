import type { GameState } from "../state"

/** Current save schema version. Bump and add a migration on every change. */
export const SAVE_VERSION = 1

/** Versioned save payload. `state` is the full serializable sim state. */
export interface SaveDataV1 {
  version: 1
  state: GameState
  /** Epoch milliseconds when the save was written. */
  savedAt: number
}

/** Serialize a save payload to its on-disk JSON form. */
export function serializeSave(data: SaveDataV1): string {
  return JSON.stringify(data)
}
