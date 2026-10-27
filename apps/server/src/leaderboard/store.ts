import type { Database } from "bun:sqlite"
import { and, asc, desc, eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/bun-sqlite"
import { leaderboardScores } from "../schema"
import type { LeaderboardCategory } from "./categories"

/**
 * The persistence behind the global leaderboards, mirroring the saves split:
 * this file owns the rows, `routes.ts` owns the HTTP surface. Every write
 * here is an upsert on (trainer, category): the value climbs only when beaten,
 * while the name always refreshes to the submit's label so renames land
 * without a second call. `now` is injected so tests can pin achievement time,
 * the tie-breaker; production passes the server clock.
 */

export type ScoreEntry = {
  category: LeaderboardCategory
  value: number
  name: string
  updatedAt: number
}

export type BoardEntry = {
  rank: number
  trainerId: string
  name: string
  value: number
}

export type SubmitOutcome = {
  /** True when the submit set a new best (or the first entry). */
  updated: boolean
  entry: ScoreEntry
}

/** The boards serve a fixed top-100 per category. */
export const MAX_BOARD_ENTRIES = 100

export function submitScore(
  db: Database,
  trainerId: string,
  category: LeaderboardCategory,
  value: number,
  name: string,
  now: number = Date.now(),
): SubmitOutcome {
  const orm = drizzle(db)
  const key = and(
    eq(leaderboardScores.trainerId, trainerId),
    eq(leaderboardScores.category, category),
  )
  const stored = orm
    .select({
      value: leaderboardScores.value,
      name: leaderboardScores.name,
      updatedAt: leaderboardScores.updatedAt,
    })
    .from(leaderboardScores)
    .where(key)
    .get()

  if (stored === undefined) {
    orm
      .insert(leaderboardScores)
      .values({ trainerId, category, value, name, updatedAt: now })
      .run()
    return { updated: true, entry: { category, value, name, updatedAt: now } }
  }

  if (value > stored.value) {
    orm
      .update(leaderboardScores)
      .set({ value, name, updatedAt: now })
      .where(key)
      .run()
    return { updated: true, entry: { category, value, name, updatedAt: now } }
  }

  // Not beaten: the best stands, but the label on it is the trainer's newest.
  // `updatedAt` stays pinned to the achievement, keeping the tie order honest.
  if (name !== stored.name) {
    orm.update(leaderboardScores).set({ name }).where(key).run()
  }
  return {
    updated: false,
    entry: {
      category,
      value: stored.value,
      name,
      updatedAt: stored.updatedAt,
    },
  }
}

export function readBoard(
  db: Database,
  category: LeaderboardCategory,
  limit: number = MAX_BOARD_ENTRIES,
): BoardEntry[] {
  const orm = drizzle(db)
  const rows = orm
    .select({
      trainerId: leaderboardScores.trainerId,
      name: leaderboardScores.name,
      value: leaderboardScores.value,
    })
    .from(leaderboardScores)
    .where(eq(leaderboardScores.category, category))
    .orderBy(
      desc(leaderboardScores.value),
      asc(leaderboardScores.updatedAt),
      asc(leaderboardScores.trainerId),
    )
    .limit(limit)
    .all()

  // Standard competition ranking: tied values share a rank, and the next rank
  // counts the entries above it. The row order inside a tie is already
  // deterministic from the query — earliest achievement, then trainer id.
  let rank = 0
  let lastValue: number | undefined
  return rows.map((row, index) => {
    if (row.value !== lastValue) {
      rank = index + 1
      lastValue = row.value
    }
    return { rank, ...row }
  })
}
