/**
 * Fetch-on-open for the four boards (FR-6, AC-5).
 *
 * One load reads every category through the public ranked-list endpoint and,
 * when all four answer with shaped boards, writes the last-good snapshot the
 * offline fallback reads back. Any failure — an unreachable server, a refused
 * status, or a body that is not a board — falls back to that snapshot, or
 * reports unavailable when no snapshot was ever written. Nothing here throws.
 */
import type { SaveAdapter } from "@apex/sim"
import type { BoardEntry, CloudApi } from "../cloud/api"
import { BOARD_CATEGORIES } from "./copy"
import {
  type CategoryBoards,
  isBoardEntry,
  readBoardSnapshot,
  writeBoardSnapshot,
} from "./snapshot"

/** What an open paints: live boards, the last snapshot, or nothing yet. */
export type BoardLoad =
  | { kind: "live"; boards: CategoryBoards }
  | { kind: "snapshot"; boards: CategoryBoards }
  | { kind: "unavailable" }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** The entries of a ranked-list answer, or null when it is not a board. */
function entriesOf(value: unknown): BoardEntry[] | null {
  if (!isRecord(value) || !Array.isArray(value.entries)) return null
  return value.entries.filter(isBoardEntry)
}

export function createBoardLoader(opts: {
  api: Pick<CloudApi, "readBoard">
  storage: SaveAdapter
  now: () => number
}): { load: () => Promise<BoardLoad> } {
  const { api, storage, now } = opts
  return {
    async load(): Promise<BoardLoad> {
      const boards = {} as CategoryBoards
      let complete = true
      await Promise.all(
        BOARD_CATEGORIES.map(async (category) => {
          const answer = await api.readBoard(category)
          if (!answer.ok) {
            complete = false
            return
          }
          const entries = entriesOf(answer.value)
          if (entries === null) {
            complete = false
            return
          }
          boards[category] = entries
        }),
      )
      if (complete) {
        // All four answered with shaped boards: this is the new last-good.
        writeBoardSnapshot(storage, { boards, fetchedAt: now() })
        return { kind: "live", boards }
      }
      // Any failure falls back to the snapshot whole — the four boards stay
      // one consistent visit instead of a mix of fresh and stale.
      const snapshot = readBoardSnapshot(storage)
      if (snapshot === null) return { kind: "unavailable" }
      return { kind: "snapshot", boards: snapshot.boards }
    },
  }
}
