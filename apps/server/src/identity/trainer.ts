import type { Database } from "bun:sqlite"
import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/bun-sqlite"
import { trainers } from "../schema"
import { newTrainerId } from "./id"
import { hashPassphrase, SALT_MARKER, verifyPassphrase } from "./passphrase"

/**
 * The identity store. Rows carry the hash and the salt; `Trainer` is the only
 * shape that leaves this module, so a route cannot accidentally serialise a
 * credential. The passphrase itself is never a parameter of a read.
 */
export type Trainer = {
  id: string
  name: string
  hasPassphrase: boolean
}

/** The columns a lookup needs to answer both "who is this" and "is it locked". */
const lookup = {
  id: trainers.id,
  name: trainers.name,
  passphraseHash: trainers.passphraseHash,
}

type TrainerRow = {
  id: string
  name: string
  passphraseHash: string
}

/** Drops the hash. `hasPassphrase` is all the client is allowed to know. */
function project(row: TrainerRow): Trainer {
  return {
    id: row.id,
    name: row.name,
    hasPassphrase: row.passphraseHash !== "",
  }
}

/**
 * A new trainer with no name and no passphrase. The id is server-issued and
 * the function takes no arguments on purpose: there is no field a caller could
 * supply that would be stored, so no personal data can enter the table here.
 */
export function createTrainer(db: Database): Trainer {
  const id = newTrainerId()
  drizzle(db)
    .insert(trainers)
    .values({
      id,
      name: "",
      passphraseHash: "",
      passphraseSalt: SALT_MARKER,
      createdAt: Date.now(),
    })
    .run()
  return { id, name: "", hasPassphrase: false }
}

export function findTrainer(db: Database, id: string): Trainer | undefined {
  const row = drizzle(db)
    .select(lookup)
    .from(trainers)
    .where(eq(trainers.id, id))
    .get()
  return row ? project(row) : undefined
}

/** Sets the display name. `false` when the trainer does not exist. */
export function renameTrainer(db: Database, id: string, name: string): boolean {
  // `returning` is how a typed drizzle update reports whether it matched: the
  // bun-sqlite driver's `run()` is typed `void` even though it returns a change
  // count at runtime, so reading `.changes` would not typecheck.
  const updated = drizzle(db)
    .update(trainers)
    .set({ name })
    .where(eq(trainers.id, id))
    .returning({ id: trainers.id })
    .get()
  return updated !== undefined
}

/** Replaces the stored hash. `false` when the trainer does not exist. */
export async function replacePassphrase(
  db: Database,
  id: string,
  passphrase: string,
): Promise<boolean> {
  if (!findTrainer(db, id)) return false
  const passphraseHash = await hashPassphrase(passphrase)
  const updated = drizzle(db)
    .update(trainers)
    .set({ passphraseHash, passphraseSalt: SALT_MARKER })
    .where(eq(trainers.id, id))
    .returning({ id: trainers.id })
    .get()
  return updated !== undefined
}

/**
 * Whether `passphrase` unlocks this trainer. Deliberately one `false` for three
 * different situations - no such id, no passphrase set, wrong passphrase - and
 * each of them pays for an Argon2 comparison, so the answer is uniform in both
 * shape and cost. Callers must not be able to tell the cases apart.
 */
export async function claimTrainer(
  db: Database,
  id: string,
  passphrase: string,
): Promise<boolean> {
  const row = drizzle(db)
    .select({ passphraseHash: trainers.passphraseHash })
    .from(trainers)
    .where(eq(trainers.id, id))
    .get()
  // An empty hash makes `verifyPassphrase` compare against the decoy, which is
  // the same work a real mismatch costs.
  return verifyPassphrase(passphrase, row?.passphraseHash ?? "")
}
