import type { Database } from "bun:sqlite"
import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/bun-sqlite"
import { displacedSaves, saves } from "../schema"

/**
 * The save store. `payload` is opaque text from here to the database and back:
 * this module never parses it, never validates its `version`, and never
 * migrates it. That is what lets a newer client's save round trip byte for
 * byte through a server that has never heard of its schema.
 *
 * `savedAt` is the client's clock and the only ordering authority. `receivedAt`
 * is the server's clock and never participates in a comparison; it exists so a
 * clock-skew bug can be reconstructed after the fact ("the client claimed T, it
 * arrived at T+40s").
 */
export type SavePayload = {
  payload: string
  savedAt: number
}

export type DisplacedSave = SavePayload & {
  /** When the server pushed this copy aside, on the server's clock. */
  displacedAt: number
}

/** Which copy the client should keep playing on. */
export type PushOutcome = {
  stored: boolean
  winner: "incoming" | "stored"
}

const SAVE_COLUMNS = { payload: saves.payload, savedAt: saves.savedAt }

/**
 * Offers `incoming` as this trainer's save and reports who won.
 *
 * The whole conflict path is one transaction: read the stored row, compare
 * `savedAt`, then either insert, displace-and-overwrite, or leave everything
 * alone. A displaced row written without the overwrite - or the reverse - would
 * be a conflict that half happened, which is worse than refusing the request.
 *
 * A tie (equal `savedAt`, two pushes in the same millisecond) leaves the stored
 * copy alone. The client that pushed still holds its own copy, so refusing
 * loses nothing; replacing would overwrite a genuine earlier loser in the
 * displaced slot with a near-duplicate of the winner, which does lose
 * something. See the phase evidence for the full argument.
 */
export function pushSave(
  db: Database,
  trainerId: string,
  incoming: SavePayload,
): PushOutcome {
  const orm = drizzle(db)
  const receivedAt = Date.now()

  return db.transaction((): PushOutcome => {
    const stored = orm
      .select(SAVE_COLUMNS)
      .from(saves)
      .where(eq(saves.trainerId, trainerId))
      .get()

    if (!stored) {
      orm
        .insert(saves)
        .values({ trainerId, ...incoming, receivedAt })
        .run()
      return { stored: true, winner: "incoming" }
    }

    if (incoming.savedAt <= stored.savedAt) {
      return { stored: false, winner: "stored" }
    }

    // Exactly one displaced copy per trainer: the primary key on `trainer_id`
    // makes the next conflict replace this one rather than accumulate history.
    orm
      .insert(displacedSaves)
      .values({
        trainerId,
        payload: stored.payload,
        savedAt: stored.savedAt,
        displacedAt: receivedAt,
      })
      .onConflictDoUpdate({
        target: displacedSaves.trainerId,
        set: {
          payload: stored.payload,
          savedAt: stored.savedAt,
          displacedAt: receivedAt,
        },
      })
      .run()

    const replaced = orm
      .update(saves)
      .set({ ...incoming, receivedAt })
      .where(eq(saves.trainerId, trainerId))
      .returning({ trainerId: saves.trainerId })
      .get()

    // Unreachable while the row read above is inside this transaction. Throwing
    // is how the displace is rolled back instead of being left behind alone.
    if (!replaced) {
      throw new Error("save row vanished inside its own transaction")
    }

    return { stored: true, winner: "incoming" }
  })()
}

/** The stored save, or `undefined`. `receivedAt` is deliberately not returned. */
export function readSave(
  db: Database,
  trainerId: string,
): SavePayload | undefined {
  return drizzle(db)
    .select(SAVE_COLUMNS)
    .from(saves)
    .where(eq(saves.trainerId, trainerId))
    .get()
}

/** The copy the last conflict pushed aside, or `undefined` if there was none. */
export function readDisplacedSave(
  db: Database,
  trainerId: string,
): DisplacedSave | undefined {
  return drizzle(db)
    .select({
      payload: displacedSaves.payload,
      savedAt: displacedSaves.savedAt,
      displacedAt: displacedSaves.displacedAt,
    })
    .from(displacedSaves)
    .where(eq(displacedSaves.trainerId, trainerId))
    .get()
}
