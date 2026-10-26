/**
 * The save adapter: the game's only persistence seam — write the state, read
 * it back, wipe it.
 *
 * Split out of the former monolith (sim-voxel-size-guard, phase 2): the
 * adapter's I/O lives here, the persisted payload's shape rules live in
 * `./validators`. This module still exports `isValidSaveState`, so every
 * consumer import (`./save/storage`) stays untouched.
 */

import type { CupSession } from "../cup"
import { reconcileLeagueRewards } from "../cupRewards"
import type { GameState } from "../state"
import { migrate } from "./migrate"
import { SAVE_VERSION, type SaveData, serializeSave } from "./schema"
import { isValidSaveState, isValidSession } from "./validators"

export { isValidSaveState }

export const SAVE_KEY = "apex.save"

/**
 * Minimal storage surface (the subset of Storage the game needs).
 * Keeps this module DOM-free: the client wires real localStorage in,
 * tests pass a mock.
 */
export interface SaveAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** In-memory adapter for tests and headless use. */
export function createMemoryAdapter(): SaveAdapter {
  const map = new Map<string, string>()
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value)
    },
    removeItem: (key) => {
      map.delete(key)
    },
  }
}

/**
 * Persist the current state (and optionally the live cup session) as a
 * versioned save. Returns false when the write fails (quota, private mode)
 * — the caller decides how to surface it; saving must never crash the day.
 */
export function saveGame(
  adapter: SaveAdapter,
  state: GameState,
  savedAt: number,
  session: CupSession | null = null,
): boolean {
  const data: SaveData = { version: SAVE_VERSION, state, savedAt, session }
  try {
    adapter.setItem(SAVE_KEY, serializeSave(data))
    return true
  } catch {
    return false
  }
}

/**
 * Load and migrate the full save payload - state plus the live cup session.
 * Returns null on absent, corrupt, or unreadable saves; a corrupt session
 * inside an otherwise-valid save is dropped (state survives, the cup walk
 * is lost) rather than failing the whole load.
 */
export function loadSave(adapter: SaveAdapter): SaveData | null {
  const raw = adapter.getItem(SAVE_KEY)
  if (raw === null) return null
  try {
    const data = migrate(JSON.parse(raw) as unknown)
    const { state } = data
    if (!isValidSaveState(state)) {
      return null
    }
    // A session is presentation bookkeeping: it rides the save even after
    // the first fight commits (phase "day") so a refresh mid-walk can
    // never strand the rewards. An invalid session is dropped, not fatal.
    const session =
      data.session !== undefined &&
      data.session !== null &&
      isValidSession(data.session)
        ? data.session
        : null
    return { ...data, session }
  } catch {
    return null
  }
}

/**
 * Load and migrate the saved state.
 * Returns null on absent, corrupt, or unreadable saves — the caller
 * falls back to a fresh run. Callers that need the persisted cup session
 * use loadSave instead.
 */
export function loadGame(adapter: SaveAdapter): GameState | null {
  return loadSave(adapter)?.state ?? null
}

/**
 * Wipe the persisted save. The next boot reads as "no save yet" — a silent
 * fresh start with the starter picker, never the corrupt-save banner.
 * Backed by SaveAdapter.removeItem (localStorage has it natively).
 */
export function clearSave(adapter: SaveAdapter): void {
  adapter.removeItem(SAVE_KEY)
}

/**
 * The raw stored payload, byte-for-byte, or null when nothing is stored.
 * The corrupt-save recovery dialog downloads this before any reset; nothing
 * here writes, migrates, or validates.
 */
export function readRawSave(adapter: SaveAdapter): string | null {
  return adapter.getItem(SAVE_KEY)
}

/**
 * Boot probe: distinguishes "no save yet" (null — a silent fresh start)
 * from "a save exists but is unreadable" ({corrupt: true} — fresh start
 * plus a calm notice, so the player is never silently robbed of a ranch).
 * A healthy save boots state + session in one read.
 */
export type BootPayload =
  | { state: GameState; session: CupSession | null }
  | { corrupt: true }

export function loadBoot(adapter: SaveAdapter): BootPayload | null {
  if (adapter.getItem(SAVE_KEY) === null) return null
  const data = loadSave(adapter)
  if (data === null) return { corrupt: true }
  // The reward catch-up (species-roster-expansion FR-4) runs at boot: a
  // save that claimed a tier before its newer species shipped receives
  // that species as a queued egg here. Idempotent — repeat boots never
  // duplicate a grant — so it can sit on the boot path permanently.
  return { state: reconcileLeagueRewards(data.state), session: data.session }
}
