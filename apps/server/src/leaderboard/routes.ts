import type { Database } from "bun:sqlite"
import { Elysia } from "elysia"
import { normalizeName } from "../identity/name"
import { claimTrainer, findTrainer } from "../identity/trainer"
import { isLeaderboardCategory, isPlausibleScore } from "./categories"
import { readBoard, submitScore } from "./store"

/**
 * The leaderboard HTTP surface. Submits are writes on one trainer's rows, so
 * they authenticate exactly like save pushes: an unknown id is a 404, a
 * trainer with no passphrase is a 409, a wrong one a 401. Implausible scores
 * are rejected with what the client sent wrong, and the trainer's last valid
 * entry stands untouched. The board itself is public — any device can read
 * the top-100, no passphrase needed.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function field(body: unknown, name: string): unknown {
  return isRecord(body) ? body[name] : undefined
}

type Refusal = { status: 409 | 404 | 401; body: { error: string } }

async function refuse(
  db: Database,
  trainerId: string,
  passphrase: string,
): Promise<Refusal | null> {
  const trainer = findTrainer(db, trainerId)
  if (!trainer) return { status: 404, body: { error: "trainer_not_found" } }
  if (!trainer.hasPassphrase) {
    return { status: 409, body: { error: "passphrase_required" } }
  }
  if (!(await claimTrainer(db, trainerId, passphrase))) {
    return { status: 401, body: { error: "wrong_passphrase" } }
  }
  return null
}

export function leaderboardRoutes({ db }: { db: Database }) {
  return new Elysia()
    .post("/trainers/:id/scores", async ({ body, params, set }) => {
      const passphrase = field(body, "passphrase")
      if (typeof passphrase !== "string" || passphrase.length === 0) {
        set.status = 400
        return { error: "invalid_passphrase", field: "passphrase" }
      }
      const category = field(body, "category")
      if (!isLeaderboardCategory(category)) {
        set.status = 400
        return { error: "invalid_category", field: "category" }
      }
      const value = field(body, "value")
      if (!isPlausibleScore(category, value)) {
        set.status = 400
        return { error: "invalid_value", field: "value" }
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
      return submitScore(db, params.id, category, value, name)
    })
    .get("/leaderboard/:category", ({ params, set }) => {
      if (!isLeaderboardCategory(params.category)) {
        set.status = 400
        return { error: "invalid_category", field: "category" }
      }
      return {
        category: params.category,
        entries: readBoard(db, params.category),
      }
    })
}
