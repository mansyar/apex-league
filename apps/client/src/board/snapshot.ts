/**
 * The board's last-snapshot cache (FR-6, AC-5).
 *
 * The last good fetch of all four boards, beside the save and the
 * credentials, never inside the save (NFR-1: the save is exported and
 * shared). The board is global — every trainer reads the same ranks — so
 * the snapshot is one value, overwritten on every good fetch and read back
 * when the server is out of reach. Everything here is quiet: a corrupt
 * value reads as absent, a refused write just retries on the next fetch.
 */
import type { SaveAdapter } from "@apex/sim"
import type { BoardEntry, ScoreCategory } from "../cloud/api"
import { BOARD_CATEGORIES } from "./copy"

/** The snapshot, beside the save and never inside it. */
export const BOARD_SNAPSHOT_KEY = "apex.boards"

/** All four boards, in the shape an open paints. */
export type CategoryBoards = Record<ScoreCategory, BoardEntry[]>

/** The last good fetch: the boards and when they were seen. */
export interface BoardSnapshot {
  boards: CategoryBoards
  fetchedAt: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** A served row: rank, trainer and value are shaped like the wire. */
export function isBoardEntry(value: unknown): value is BoardEntry {
  if (!isRecord(value)) return false
  return (
    typeof value.rank === "number" &&
    Number.isInteger(value.rank) &&
    value.rank > 0 &&
    typeof value.trainerId === "string" &&
    value.trainerId.length > 0 &&
    typeof value.name === "string" &&
    value.name.length > 0 &&
    typeof value.value === "number" &&
    Number.isInteger(value.value) &&
    value.value >= 0
  )
}

/** All four boards from a stored value, or null when it is not a snapshot. */
function boardsOf(value: unknown): CategoryBoards | null {
  if (!isRecord(value)) return null
  const boards = {} as CategoryBoards
  for (const category of BOARD_CATEGORIES) {
    const rows: unknown = value[category]
    if (!Array.isArray(rows)) return null
    // A malformed row is dropped; the board it rode in on still shows.
    boards[category] = rows.filter(isBoardEntry)
  }
  return boards
}

/** The last good fetch, or null when none was ever written or kept. */
export function readBoardSnapshot(storage: SaveAdapter): BoardSnapshot | null {
  try {
    const raw = storage.getItem(BOARD_SNAPSHOT_KEY)
    if (raw === null) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) return null
    const boards = boardsOf(parsed.boards)
    if (boards === null) return null
    if (
      typeof parsed.fetchedAt !== "number" ||
      !Number.isFinite(parsed.fetchedAt)
    ) {
      return null
    }
    return { boards, fetchedAt: parsed.fetchedAt }
  } catch {
    return null
  }
}

/** Remember a good fetch. A refused write stays quiet — next fetch retries. */
export function writeBoardSnapshot(
  storage: SaveAdapter,
  snapshot: BoardSnapshot,
): void {
  try {
    storage.setItem(BOARD_SNAPSHOT_KEY, JSON.stringify(snapshot))
  } catch {
    // A full quota just means the next fetch retries — stay quiet.
  }
}
