import type { Database } from "bun:sqlite"
import { Elysia } from "elysia"
import { normalizeName } from "./name"
import { isPassphrase } from "./passphrase"
import {
  claimTrainer,
  createTrainer,
  findTrainer,
  renameTrainer,
  replacePassphrase,
} from "./trainer"

/**
 * The identity surface. Four routes, and the only one a stranger can use as an
 * oracle - `claim` - answers every failure identically (see below).
 *
 * Error bodies name a field and never a value: an invalid passphrase must not be
 * echoed back, and a message that quoted the body would put the secret in the
 * response and, from there, in any proxy log that records bodies.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** A body field by name, or `undefined` when the body is not an object. */
function field(body: unknown, key: string): unknown {
  if (!isRecord(body)) return undefined
  return Object.hasOwn(body, key) ? body[key] : undefined
}

const TRAINER_NOT_FOUND = { error: "trainer_not_found" } as const

/** The single failure shape for `claim`. Wrong passphrase, no passphrase and no
 * such trainer all return exactly this, so the endpoint cannot enumerate ids. */
const CLAIM_REJECTED = { ok: false } as const

export function identityRoutes({ db }: { db: Database }) {
  return (
    new Elysia()
      /**
       * Creates a trainer and returns only its id. A body is accepted and
       * ignored rather than rejected: an error naming an unknown field would
       * tell a caller which fields exist, and nothing in it is ever stored.
       */
      .post("/trainers", ({ set }) => {
        set.status = 201
        return { id: createTrainer(db).id }
      })
      .get("/trainers/:id", ({ params, set }) => {
        const trainer = findTrainer(db, params.id)
        if (!trainer) {
          set.status = 404
          return TRAINER_NOT_FOUND
        }
        return trainer
      })
      .put("/trainers/:id", async ({ body, params, set }) => {
        const trainer = findTrainer(db, params.id)
        if (!trainer) {
          set.status = 404
          return TRAINER_NOT_FOUND
        }

        const hasName = isRecord(body) && Object.hasOwn(body, "name")
        const hasPassphrase =
          isRecord(body) && Object.hasOwn(body, "passphrase")
        if (!hasName && !hasPassphrase) {
          set.status = 400
          return { error: "nothing_to_update" }
        }

        const name = normalizeName(field(body, "name"))
        if (hasName && name === null) {
          set.status = 400
          return { error: "invalid_name", field: "name" }
        }

        const passphrase = field(body, "passphrase")
        if (hasPassphrase && !isPassphrase(passphrase)) {
          set.status = 400
          return { error: "invalid_passphrase", field: "passphrase" }
        }

        if (hasPassphrase && trainer.hasPassphrase) {
          // An existing passphrase may only be replaced by whoever knows it.
          // Without this, learning an id would be enough to lock the owner out.
          const current = field(body, "currentPassphrase")
          if (
            typeof current !== "string" ||
            !(await claimTrainer(db, trainer.id, current))
          ) {
            set.status = 401
            return {
              error: "wrong_current_passphrase",
              field: "currentPassphrase",
            }
          }
        }

        if (name !== null) renameTrainer(db, trainer.id, name)
        if (isPassphrase(passphrase)) {
          await replacePassphrase(db, trainer.id, passphrase)
        }
        return findTrainer(db, trainer.id)
      })
      .post("/trainers/:id/claim", async ({ body, params, set }) => {
        const passphrase = field(body, "passphrase")
        if (typeof passphrase !== "string" || passphrase.length === 0) {
          // Decided before any lookup, so this 400 says nothing about whether
          // the trainer exists.
          set.status = 400
          return { error: "passphrase_required", field: "passphrase" }
        }

        if (!(await claimTrainer(db, params.id, passphrase))) {
          set.status = 401
          return CLAIM_REJECTED
        }
        return { ok: true }
      })
  )
}
