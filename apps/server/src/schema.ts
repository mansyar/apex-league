import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core"

/**
 * The typed view of the committed migrations (`migrations/0001_init.sql`,
 * `migrations/0002_leaderboard.sql`, `migrations/0003_ghost.sql`). Drizzle does not create these tables and
 * tables; the committed migration does. `schema.test.ts` compares this
 * declaration against the columns SQLite actually has, so the two cannot drift
 * apart silently.
 */

/** An anonymous trainer. The id is opaque and server-generated; nothing here identifies a person. */
export const trainers = sqliteTable("trainers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  passphraseHash: text("passphrase_hash").notNull(),
  passphraseSalt: text("passphrase_salt").notNull(),
  createdAt: integer("created_at").notNull(),
})

/** One row per trainer. `payload` is opaque: never parsed, never migrated here. */
export const saves = sqliteTable("saves", {
  trainerId: text("trainer_id")
    .primaryKey()
    .references(() => trainers.id, { onDelete: "cascade" }),
  payload: text("payload").notNull(),
  /** The client's clock, which decides which copy wins a conflict. */
  savedAt: integer("saved_at").notNull(),
  /** The server's clock, recorded only so clock skew is diagnosable. */
  receivedAt: integer("received_at").notNull(),
})

/** The copy a save conflict pushed aside, kept recoverable. */
export const displacedSaves = sqliteTable("displaced_saves", {
  trainerId: text("trainer_id")
    .primaryKey()
    .references(() => trainers.id, { onDelete: "cascade" }),
  payload: text("payload").notNull(),
  savedAt: integer("saved_at").notNull(),
  displacedAt: integer("displaced_at").notNull(),
})

/**
 * The per-trainer best per leaderboard category. The primary key is the whole
 * identity of a row: a submit upserts it, raising `value` only when beaten and
 * always refreshing `name` to the trainer's newest chosen label. `updatedAt`
 * is the server clock at the submit that set the value, never a client claim.
 */
export const leaderboardScores = sqliteTable(
  "leaderboard_scores",
  {
    trainerId: text("trainer_id")
      .notNull()
      .references(() => trainers.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    value: integer("value").notNull(),
    name: text("name").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.trainerId, table.category] })],
)

/**
 * The per-trainer ghost: one row per trainer holding the latest uploaded
 * cup-winning replay bundle. The primary key is the whole identity of a row:
 * an upload upserts it, replacing the payload outright (newest upload is the
 * best by definition) and always refreshing `name` to the trainer's newest
 * chosen label. `payload` is opaque text — validated for shape and size on
 * the way in, never parsed or migrated here. `updatedAt` is the server clock
 * at the upload that wrote the row, never a client claim.
 */
export const ghostBests = sqliteTable("ghost_bests", {
  trainerId: text("trainer_id")
    .primaryKey()
    .references(() => trainers.id, { onDelete: "cascade" }),
  payload: text("payload").notNull(),
  name: text("name").notNull(),
  updatedAt: integer("updated_at").notNull(),
})
