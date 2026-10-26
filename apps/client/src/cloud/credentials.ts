/**
 * Trainer credentials (FR-7, AC-7, NFR-3).
 *
 * The trainer id and passphrase are the player's cloud keys, and they live in
 * their own storage entry on purpose: the save is exported and imported by
 * players (`save-transfer.ts`), so a credential inside it would travel with
 * every shared save file. They are also never part of `SaveData`, so
 * `SAVE_VERSION` stays where it is (NFR-1).
 */
import type { SaveAdapter } from "@apex/sim"

/** The credential entry, beside the save and never inside it. */
export const TRAINER_KEY = "apex.trainer"

export interface TrainerCredentials {
  id: string
  /** The display name last set on the server; "" when never named. */
  name: string
  passphrase: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * The stored credentials, or null when signed out. Anything malformed reads
 * as signed out: a corrupt entry must never stop the ranch from booting.
 */
export function readCredentials(
  storage: SaveAdapter,
): TrainerCredentials | null {
  const raw = storage.getItem(TRAINER_KEY)
  if (raw === null) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) return null
    const { id, name, passphrase } = parsed
    if (typeof id !== "string" || id.length === 0) return null
    if (typeof passphrase !== "string" || passphrase.length === 0) return null
    return { id, name: typeof name === "string" ? name : "", passphrase }
  } catch {
    return null
  }
}

/** Persist credentials. `false` when storage refused the write (quota). */
export function writeCredentials(
  storage: SaveAdapter,
  credentials: TrainerCredentials,
): boolean {
  try {
    storage.setItem(TRAINER_KEY, JSON.stringify(credentials))
    return true
  } catch {
    return false
  }
}

export function clearCredentials(storage: SaveAdapter): void {
  storage.removeItem(TRAINER_KEY)
}
