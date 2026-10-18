/**
 * Save export/import core (release_polish_20261018 Phase 1). Pure: turns a
 * live GameState into a downloadable payload and inspects an uploaded payload
 * without touching storage. The client surfaces only own the DOM and the
 * confirmation flow.
 */
import type { GameState } from "../state"
import { migrate } from "./migrate"
import { SAVE_VERSION, type SaveData } from "./schema"
import { isValidSaveState } from "./storage"

/** One downloadable save: the JSON body plus the filename to suggest. */
export interface SaveExport {
  filename: string
  json: string
}

/** Why an uploaded save was refused. */
export type SaveImportReason = "malformed" | "future-version" | "invalid"

/** The inspection outcome: migrated data, or a reason to explain. */
export type SaveImportResult =
  | { ok: true; data: SaveData }
  | { ok: false; reason: SaveImportReason }

function twoDigits(value: number): string {
  return String(value).padStart(2, "0")
}

/** The suggested filename: version plus the local calendar date. */
export function exportFilename(now: Date): string {
  const month = twoDigits(now.getMonth() + 1)
  const day = twoDigits(now.getDate())
  return `apex-league-save-v${SAVE_VERSION}-${now.getFullYear()}-${month}-${day}.json`
}

/**
 * Build a downloadable payload from the current state. The live cup session
 * is deliberately excluded (a downloaded save resumes at the ranch), and the
 * state itself is never mutated.
 */
export function buildSaveExport(
  state: GameState,
  now: Date = new Date(),
): SaveExport {
  const data: SaveData = {
    version: SAVE_VERSION,
    state,
    session: null,
    savedAt: now.getTime(),
  }
  return { filename: exportFilename(now), json: JSON.stringify(data, null, 2) }
}

/**
 * Inspect an uploaded payload before anything is replaced.
 *
 * - `malformed`: not JSON, or no numeric version to check.
 * - `future-version`: a save from a newer build (refused, never downgraded).
 * - `invalid`: a known/older version whose migrated state fails validation.
 *
 * Accepted saves come back migrated to the current version with any live
 * cup session dropped - an imported walk could not be trusted mid-bracket.
 */
export function inspectSaveImport(raw: string): SaveImportResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, reason: "malformed" }
  }
  if (typeof parsed !== "object" || parsed === null) {
    return { ok: false, reason: "malformed" }
  }
  const version = (parsed as Record<string, unknown>).version
  if (typeof version !== "number") {
    return { ok: false, reason: "malformed" }
  }
  if (version > SAVE_VERSION) {
    return { ok: false, reason: "future-version" }
  }
  try {
    const data = migrate(parsed)
    if (!isValidSaveState(data.state)) {
      return { ok: false, reason: "invalid" }
    }
    return { ok: true, data: { ...data, session: null } }
  } catch {
    return { ok: false, reason: "invalid" }
  }
}
