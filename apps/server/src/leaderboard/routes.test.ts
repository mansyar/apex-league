import type { Database } from "bun:sqlite"
import { describe, expect, test } from "bun:test"
import { createApp } from "../app"
import { openDatabase } from "../db"
import { MAX_CUP_WINS } from "./categories"

/**
 * The leaderboard routes run in-process against the Elysia app, exactly like
 * the saves precedent: no ports, no network, `:memory:` databases. Two trainers
 * on one app double as two devices — what one submits, the other reads back
 * from the public board.
 */

function setup(): { db: Database; app: ReturnType<typeof createApp> } {
  const db = openDatabase(":memory:")
  return { db, app: createApp({ db }) }
}

type App = ReturnType<typeof createApp>

async function request(
  app: App,
  method: string,
  path: string,
  body?: unknown,
): Promise<Response> {
  const init: RequestInit = {
    method,
    headers: { "content-type": "application/json" },
  }
  if (body !== undefined) init.body = JSON.stringify(body)
  return app.handle(new Request(`http://localhost${path}`, init))
}

async function unlockedTrainer(
  app: App,
  name: string,
  passphrase: string,
): Promise<{ id: string }> {
  const created = (await (await request(app, "POST", "/trainers")).json()) as {
    id: string
  }
  await request(app, "PUT", `/trainers/${created.id}`, { name, passphrase })
  return { id: created.id }
}

describe("leaderboard routes", () => {
  test("a submit lands on the board for a second device to read", async () => {
    const { db, app } = setup()
    try {
      const ada = await unlockedTrainer(app, "Ada", "first-secret")
      await unlockedTrainer(app, "Grace", "second-secret")

      const submit = await request(app, "POST", `/trainers/${ada.id}/scores`, {
        passphrase: "first-secret",
        category: "cups",
        value: 3,
        name: "Ada",
      })
      expect(submit.status).toBe(200)
      expect(await submit.json()).toEqual({
        updated: true,
        entry: {
          category: "cups",
          value: 3,
          name: "Ada",
          updatedAt: expect.any(Number),
        },
      })

      const board = await request(app, "GET", "/leaderboard/cups")
      expect(board.status).toBe(200)
      expect(await board.json()).toEqual({
        category: "cups",
        entries: [
          {
            rank: 1,
            trainerId: ada.id,
            name: "Ada",
            value: 3,
          },
        ],
      })
    } finally {
      db.close()
    }
  })

  test("a lesser submit keeps the best but carries the newest name", async () => {
    const { db, app } = setup()
    try {
      const ada = await unlockedTrainer(app, "Ada", "first-secret")
      const submit = (value: number, name: string) =>
        request(app, "POST", `/trainers/${ada.id}/scores`, {
          passphrase: "first-secret",
          category: "ladder",
          value,
          name,
        })

      const first = (await (await submit(15, "Ada")).json()) as {
        updated: boolean
      }
      expect(first.updated).toBe(true)
      const kept = await submit(12, "Ada Lovelace")
      expect(kept.status).toBe(200)
      expect(await kept.json()).toEqual({
        updated: false,
        entry: {
          category: "ladder",
          value: 15,
          name: "Ada Lovelace",
          updatedAt: expect.any(Number),
        },
      })

      const board = (await (
        await request(app, "GET", "/leaderboard/ladder")
      ).json()) as {
        entries: {
          rank: number
          trainerId: string
          name: string
          value: number
        }[]
      }
      expect(board.entries).toEqual([
        { rank: 1, trainerId: ada.id, name: "Ada Lovelace", value: 15 },
      ])
    } finally {
      db.close()
    }
  })

  test("an implausible submit is rejected and the last valid entry stands", async () => {
    const { db, app } = setup()
    try {
      const ada = await unlockedTrainer(app, "Ada", "first-secret")
      await request(app, "POST", `/trainers/${ada.id}/scores`, {
        passphrase: "first-secret",
        category: "cups",
        value: 3,
        name: "Ada",
      })

      for (const value of [-1, 1.5, MAX_CUP_WINS + 1, "many", null]) {
        const rejected = await request(
          app,
          "POST",
          `/trainers/${ada.id}/scores`,
          {
            passphrase: "first-secret",
            category: "cups",
            value,
            name: "Hacker",
          },
        )
        expect(rejected.status).toBe(400)
        expect(await rejected.json()).toEqual({
          error: "invalid_value",
          field: "value",
        })
      }

      const board = (await (
        await request(app, "GET", "/leaderboard/cups")
      ).json()) as { entries: { name: string; value: number }[] }
      expect(board.entries).toHaveLength(1)
      expect(board.entries[0]).toMatchObject({ name: "Ada", value: 3 })
    } finally {
      db.close()
    }
  })

  test("unknown categories are rejected on both routes", async () => {
    const { db, app } = setup()
    try {
      const ada = await unlockedTrainer(app, "Ada", "first-secret")
      const submit = await request(app, "POST", `/trainers/${ada.id}/scores`, {
        passphrase: "first-secret",
        category: "wins",
        value: 3,
        name: "Ada",
      })
      expect(submit.status).toBe(400)
      expect(await submit.json()).toEqual({
        error: "invalid_category",
        field: "category",
      })

      const board = await request(app, "GET", "/leaderboard/wins")
      expect(board.status).toBe(400)
      expect(await board.json()).toEqual({
        error: "invalid_category",
        field: "category",
      })
    } finally {
      db.close()
    }
  })

  test("an empty name is rejected", async () => {
    const { db, app } = setup()
    try {
      const ada = await unlockedTrainer(app, "Ada", "first-secret")
      const submit = await request(app, "POST", `/trainers/${ada.id}/scores`, {
        passphrase: "first-secret",
        category: "ap",
        value: 100,
        name: "   ",
      })
      expect(submit.status).toBe(400)
      expect(await submit.json()).toEqual({
        error: "invalid_name",
        field: "name",
      })
      const board = (await (
        await request(app, "GET", "/leaderboard/ap")
      ).json()) as { entries: unknown[] }
      expect(board.entries).toEqual([])
    } finally {
      db.close()
    }
  })

  test("submits authenticate like save pushes", async () => {
    const { db, app } = setup()
    try {
      const ada = await unlockedTrainer(app, "Ada", "first-secret")
      const payload = {
        category: "cups",
        value: 3,
        name: "Ada",
      }

      const wrong = await request(app, "POST", `/trainers/${ada.id}/scores`, {
        ...payload,
        passphrase: "wrong-secret",
      })
      expect(wrong.status).toBe(401)
      expect(await wrong.json()).toEqual({ error: "wrong_passphrase" })

      const missing = await request(app, "POST", `/trainers/${ada.id}/scores`, {
        ...payload,
        passphrase: "",
      })
      expect(missing.status).toBe(400)

      const unknown = await request(
        app,
        "POST",
        "/trainers/no-such-trainer/scores",
        { ...payload, passphrase: "whatever" },
      )
      expect(unknown.status).toBe(404)

      const board = (await (
        await request(app, "GET", "/leaderboard/cups")
      ).json()) as { entries: unknown[] }
      expect(board.entries).toEqual([])
    } finally {
      db.close()
    }
  })

  test("a trainer with no passphrase gets a 409, like saves", async () => {
    const { db, app } = setup()
    try {
      const created = (await (
        await request(app, "POST", "/trainers")
      ).json()) as { id: string }
      const submit = await request(
        app,
        "POST",
        `/trainers/${created.id}/scores`,
        {
          passphrase: "anything",
          category: "cups",
          value: 1,
          name: "Nameless",
        },
      )
      expect(submit.status).toBe(409)
      expect(await submit.json()).toEqual({ error: "passphrase_required" })
    } finally {
      db.close()
    }
  })

  test("the board needs no passphrase but pins the category", async () => {
    const { db, app } = setup()
    try {
      const ada = await unlockedTrainer(app, "Ada", "first-secret")
      const bea = await unlockedTrainer(app, "Bea", "second-secret")
      await request(app, "POST", `/trainers/${ada.id}/scores`, {
        passphrase: "first-secret",
        category: "collection",
        value: 40,
        name: "Ada",
      })
      await request(app, "POST", `/trainers/${bea.id}/scores`, {
        passphrase: "second-secret",
        category: "collection",
        value: 40,
        name: "Bea",
      })

      const board = await request(app, "GET", "/leaderboard/collection")
      expect(board.status).toBe(200)
      const body = (await board.json()) as {
        category: string
        entries: { rank: number; name: string; value: number }[]
      }
      expect(body.category).toBe("collection")
      expect(body.entries).toHaveLength(2)
      // Tied values share a rank in a deterministic order that repeats.
      expect(body.entries.map((entry) => entry.rank)).toEqual([1, 1])
      const again = (await (
        await request(app, "GET", "/leaderboard/collection")
      ).json()) as typeof body
      expect(again.entries).toEqual(body.entries)
    } finally {
      db.close()
    }
  })

  test("console stays silent: no trainer data in logs", async () => {
    const { db, app } = setup()
    const lines: string[] = []
    const original = console.log
    console.log = (...args: unknown[]) => {
      lines.push(args.map(String).join(" "))
    }
    try {
      const ada = await unlockedTrainer(app, "Ada", "first-secret")
      await request(app, "POST", `/trainers/${ada.id}/scores`, {
        passphrase: "first-secret",
        category: "cups",
        value: 3,
        name: "Ada",
      })
      await request(app, "GET", "/leaderboard/cups")
      expect(lines.join("\n")).not.toContain("Ada")
    } finally {
      console.log = original
      db.close()
    }
  })
})
