import type { Database } from "bun:sqlite"
import { Elysia } from "elysia"
import { normalizeName } from "../identity/name"
import { claimTrainer, findTrainer } from "../identity/trainer"
import { isPlausibleGhost, isWithinGhostLimit, MAX_GHOST_BYTES } from "./caps"
import { readGhost, readGhostBoard, submitGhost } from "./store"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** A body field by name, or `undefined` when the body is not an object. */
function field(body: unknown, key: string): unknown {
  if (!isRecord(body)) return undefined
  return Object.hasOwn(body, key) ? body[key] : undefined
}

type Refusal = { status: number; body: Record<string, unknown> }

/**
 * Whether `passphrase` unlocks this trainer's ghost. Same three refusals as
 * save pushes, for the same reason: 404 for an id never issued, 409 for a
 * trainer with no passphrase, 401 for a wrong one. The upload is the only
 * route that asks; the board and the single download are public, like the
 * leaderboard — reading a ghost reveals nothing the board does not.
 */
async function refuse(
  db: Database,
  trainerId: string,
  passphrase: string,
): Promise<Refusal | undefined> {
  const trainer = findTrainer(db, trainerId)
  if (!trainer) return { status: 404, body: { error: "trainer_not_found" } }
  if (!trainer.hasPassphrase) {
    return {
      status: 409,
      body: { error: "passphrase_required", field: "passphrase" },
    }
  }
  if (!(await claimTrainer(db, trainerId, passphrase))) {
    return { status: 401, body: { error: "wrong_passphrase" } }
  }
  return undefined
}

/**
 * Parses a stored ghost back into a bundle. The payload left here through
 * `JSON.stringify` on the upload path, so this restores exactly that shape;
 * the column is still opaque text the store never inspects.
 */
function revive(payload: string): unknown {
  return JSON.parse(payload)
}

/**
 * The ghost surface: upload one trainer's best, download one ghost, read the
 * top-100 board. The upload validates shape and size before the passphrase
 * check — a body that cannot be stored should not cost an Argon2 verification
 * — and every rejection names a field, never a value: the payload is far too
 * large to echo and carries another trainer's winning team.
 */
export function ghostRoutes({ db }: { db: Database }) {
  return new Elysia()
    .put("/trainers/:id/ghost", async ({ body, params, set }) => {
      const passphrase = field(body, "passphrase")
      if (typeof passphrase !== "string" || passphrase.length === 0) {
        set.status = 400
        return { error: "invalid_passphrase", field: "passphrase" }
      }

      const ghost = field(body, "ghost")
      if (!isPlausibleGhost(ghost)) {
        set.status = 400
        return { error: "invalid_ghost", field: "ghost" }
      }

      if (!isWithinGhostLimit(ghost)) {
        set.status = 413
        return {
          error: "ghost_too_large",
          field: "ghost",
          limitBytes: MAX_GHOST_BYTES,
        }
      }

      const name = normalizeName(field(body, "name"))
      if (name === null) {
        set.status = 400
        return { error: "invalid_name", field: "name" }
      }

      const refusal = await refuse(db, params.id, passphrase)
      if (refusal) {
        set.status = refusal.status
        return refusal.body
      }

      return submitGhost(db, params.id, JSON.stringify(ghost), name)
    })
    .get("/trainers/:id/ghost", ({ params, set }) => {
      const stored = readGhost(db, params.id)
      if (!stored) {
        set.status = 404
        return { error: "ghost_not_found" }
      }
      return {
        trainerId: params.id,
        name: stored.name,
        updatedAt: stored.updatedAt,
        ghost: revive(stored.payload),
      }
    })
    .get("/ghosts", () => ({
      entries: readGhostBoard(db).map((row) => ({
        rank: row.rank,
        trainerId: row.trainerId,
        name: row.name,
        updatedAt: row.updatedAt,
        ghost: revive(row.payload),
      })),
    }))
}
