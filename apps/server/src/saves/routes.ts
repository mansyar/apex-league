import type { Database } from "bun:sqlite"
import { Elysia } from "elysia"
import { claimTrainer, findTrainer } from "../identity/trainer"
import { isWithinPayloadLimit, MAX_PAYLOAD_BYTES } from "./limits"
import { pushSave, readDisplacedSave, readSave } from "./store"

/**
 * Where a pull carries its passphrase. A header rather than a query parameter:
 * a query string is recorded by every proxy, CDN and access log on the way
 * here, and NFR-3 says the passphrase is never logged. A push carries it in the
 * body, because a push already has one.
 */
export const PASSPHRASE_HEADER = "x-trainer-passphrase"

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
 * Whether `passphrase` unlocks this trainer's save.
 *
 * Unlike `claimTrainer`, these three refusals are distinct: 404 for an id that
 * was never issued, 409 for a trainer that has not set a passphrase, 401 for a
 * wrong one. That reveals nothing new - `GET /trainers/:id` already answers
 * both questions publicly - and the 409 is actionable for the caller who owns
 * the trainer it just created. The verification itself is still `claimTrainer`,
 * so the constant-time comparison is not re-implemented, and not weakened.
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
 * The save surface: push, pull, and the copy the last conflict pushed aside.
 *
 * The payload is never inspected beyond its size. Not its `version`, not its
 * `state`, not whether it is JSON at all - the client owns that shape, and a
 * server that parsed it would have to migrate it, which NFR-1 forbids.
 */
export function saveRoutes({ db }: { db: Database }) {
  return new Elysia()
    .put("/trainers/:id/save", async ({ body, params, set }) => {
      const passphrase = field(body, "passphrase")
      if (typeof passphrase !== "string" || passphrase.length === 0) {
        set.status = 400
        return { error: "invalid_passphrase", field: "passphrase" }
      }

      const payload = field(body, "payload")
      if (typeof payload !== "string" || payload.length === 0) {
        set.status = 400
        return { error: "invalid_payload", field: "payload" }
      }

      const savedAt = field(body, "savedAt")
      if (typeof savedAt !== "number" || !Number.isInteger(savedAt)) {
        set.status = 400
        return { error: "invalid_saved_at", field: "savedAt" }
      }

      // Before the hash, not after: a body that cannot be stored should not
      // cost an Argon2 verification. Refusing here is what keeps the write
      // below from ever seeing a payload it would have to truncate.
      if (!isWithinPayloadLimit(payload)) {
        set.status = 413
        return {
          error: "payload_too_large",
          field: "payload",
          limitBytes: MAX_PAYLOAD_BYTES,
        }
      }

      const refusal = await refuse(db, params.id, passphrase)
      if (refusal) {
        set.status = refusal.status
        return refusal.body
      }

      // 200 whether or not anything was replaced. `stored: false` means "your
      // copy is older, keep playing on yours" - a normal outcome the client
      // must not treat as a failure, so it is not an error status.
      return pushSave(db, params.id, { payload, savedAt })
    })
    .get("/trainers/:id/save", async ({ params, request, set }) => {
      const passphrase = request.headers.get(PASSPHRASE_HEADER) ?? ""
      const refusal = await refuse(db, params.id, passphrase)
      if (refusal) {
        set.status = refusal.status
        return refusal.body
      }

      const save = readSave(db, params.id)
      if (!save) {
        set.status = 404
        return { error: "save_not_found" }
      }
      return save
    })
    .get("/trainers/:id/save/displaced", async ({ params, request, set }) => {
      const passphrase = request.headers.get(PASSPHRASE_HEADER) ?? ""
      const refusal = await refuse(db, params.id, passphrase)
      if (refusal) {
        set.status = refusal.status
        return refusal.body
      }

      const displaced = readDisplacedSave(db, params.id)
      if (!displaced) {
        set.status = 404
        return { error: "no_displaced_save" }
      }
      return displaced
    })
}
