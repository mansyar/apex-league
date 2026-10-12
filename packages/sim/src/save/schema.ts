import type { CupSession } from "../cup"
import type { GameState } from "../state"

/** Current save schema version. Bump and add a migration on every change. */
export const SAVE_VERSION = 8

/** Versioned save payload. `state` is the full serializable sim state. */
export interface SaveData {
  version: typeof SAVE_VERSION
  state: GameState
  /**
   * The live cup session, or null (save v7). The session is presentation
   * bookkeeping: a refresh mid-cup restores the bracket walk exactly where
   * it stopped, so a committed cup can never strand its rewards. Sessions
   * come from the sim and are plain JSON data.
   */
  session: CupSession | null
  /** Epoch milliseconds when the save was written. */
  savedAt: number
}

/** Serialize a save payload to its on-disk JSON form. */
export function serializeSave(data: SaveData): string {
  return JSON.stringify(data)
}
