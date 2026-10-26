import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

/**
 * The typed view of `migrations/0001_init.sql`. Drizzle does not create these
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
