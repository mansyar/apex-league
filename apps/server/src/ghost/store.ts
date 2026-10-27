import type { Database } from "bun:sqlite"
import { asc, desc, eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/bun-sqlite"
import { ghostBests } from "../schema"

/**
 * The ghost store. One row per trainer: the latest uploaded cup-winning
 * replay bundle, stored as opaque text. Unlike leaderboard scores there is
 * no value to raise — the newest upload is the per-trainer best by
 * definition, so an upload replaces the row outright. The payload is never
 * parsed here: shape and size were validated on the way in (`caps.ts`), and
 * the reader decides whether the pinned version is replayable.
 */

/** One trainer's stored best: display name, opaque bundle, server clock. */
export type GhostEntry = {
  name: string
  payload: string
  updatedAt: number
}

/** One board row: the entry plus whose it is and where it stands. */
export type GhostBoardEntry = GhostEntry & {
  rank: number
  trainerId: string
}

/** The board holds at most this many ghosts, like the leaderboard. */
export const MAX_GHOST_ENTRIES = 100

/** The columns a read needs. `trainerId` rides only on board rows. */
const GHOST_COLUMNS = {
  name: ghostBests.name,
  payload: ghostBests.payload,
  updatedAt: ghostBests.updatedAt,
}

/**
 * Stores `payload` as this trainer's ghost, replacing any previous upload.
 * Always stored: the latest cup-winning team is the best by definition, so
 * there is no comparison and no keep-the-old path. Returns the stored row.
 */
export function submitGhost(
  db: Database,
  trainerId: string,
  payload: string,
  name: string,
  now: number = Date.now(),
): { stored: true; entry: GhostEntry } {
  const entry = { name, payload, updatedAt: now }
  drizzle(db)
    .insert(ghostBests)
    .values({ trainerId, ...entry })
    .onConflictDoUpdate({
      target: ghostBests.trainerId,
      set: { ...entry },
    })
    .run()
  return { stored: true, entry }
}

/** The trainer's stored ghost, or `undefined` when none was ever uploaded. */
export function readGhost(
  db: Database,
  trainerId: string,
): GhostEntry | undefined {
  return drizzle(db)
    .select(GHOST_COLUMNS)
    .from(ghostBests)
    .where(eq(ghostBests.trainerId, trainerId))
    .get()
}

/**
 * The public board: the newest uploads first, trainer id breaking ties, at
 * most `MAX_GHOST_ENTRIES` rows. Rank is the position (1-based): recency has
 * no ties worth sharing, unlike leaderboard values.
 */
export function readGhostBoard(
  db: Database,
  limit: number = MAX_GHOST_ENTRIES,
): GhostBoardEntry[] {
  const rows = drizzle(db)
    .select({ trainerId: ghostBests.trainerId, ...GHOST_COLUMNS })
    .from(ghostBests)
    .orderBy(desc(ghostBests.updatedAt), asc(ghostBests.trainerId))
    .limit(limit)
    .all()
  return rows.map((row, index) => ({ rank: index + 1, ...row }))
}
