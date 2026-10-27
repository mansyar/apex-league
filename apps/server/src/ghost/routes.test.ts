import type { Database } from "bun:sqlite"
import { describe, expect, test } from "bun:test"
import { createApp } from "../app"
import { openDatabase } from "../db"
import { MAX_GHOST_BYTES } from "./caps"
import { validGhostBundle } from "./fixtures"

/**
 * The ghost routes run in-process against the Elysia app, exactly like the
 * leaderboard precedent: no ports, no network, `:memory:` databases. Two
 * trainers on one app double as two devices — what one uploads, the other
 * reads back from the public board and the public single download.
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

function upload(
  app: App,
  id: string,
  passphrase: string,
  ghost: unknown,
  name = "Ada",
) {
  return request(app, "PUT", `/trainers/${id}/ghost`, {
    passphrase,
    name,
    ghost,
  })
}

describe("ghost routes", () => {
  test("an upload lands for a second device to read from the board and the download", async () => {
    const { db, app } = setup()
    try {
      const ada = await unlockedTrainer(app, "Ada", "first-secret")
      await unlockedTrainer(app, "Grace", "second-secret")
      const ghost = validGhostBundle()

      const put = await upload(app, ada.id, "first-secret", ghost)
      expect(put.status).toBe(200)
      expect(await put.json()).toEqual({
        stored: true,
        entry: {
          name: "Ada",
          payload: JSON.stringify(ghost),
          updatedAt: expect.any(Number),
        },
      })

      const board = await request(app, "GET", "/ghosts")
      expect(board.status).toBe(200)
      expect(await board.json()).toEqual({
        entries: [
          {
            rank: 1,
            trainerId: ada.id,
            name: "Ada",
            updatedAt: expect.any(Number),
            ghost,
          },
        ],
      })

      const single = await request(app, "GET", `/trainers/${ada.id}/ghost`)
      expect(single.status).toBe(200)
      expect(await single.json()).toEqual({
        trainerId: ada.id,
        name: "Ada",
        updatedAt: expect.any(Number),
        ghost,
      })
    } finally {
      db.close()
    }
  })

  test("the latest upload replaces the stored ghost", async () => {
    const { db, app } = setup()
    try {
      const ada = await unlockedTrainer(app, "Ada", "first-secret")
      await upload(app, ada.id, "first-secret", validGhostBundle())
      const next = { ...validGhostBundle(), seed: 777 }
      await upload(app, ada.id, "first-secret", next, "Ada Lovelace")

      const single = (await (
        await request(app, "GET", `/trainers/${ada.id}/ghost`)
      ).json()) as { name: string; ghost: { seed: number } }
      expect(single.name).toBe("Ada Lovelace")
      expect(single.ghost.seed).toBe(777)
    } finally {
      db.close()
    }
  })

  test("a foreign bundle is rejected and the last valid ghost stands", async () => {
    const { db, app } = setup()
    try {
      const ada = await unlockedTrainer(app, "Ada", "first-secret")
      await upload(app, ada.id, "first-secret", validGhostBundle())

      const foreign = [
        { ...validGhostBundle(), simVersion: -1 },
        { ...validGhostBundle(), events: [] },
        { ...validGhostBundle(), player: { name: "Nobody" } },
        { notAGhost: true },
        "ghost",
        null,
      ]
      for (const ghost of foreign) {
        const rejected = await upload(
          app,
          ada.id,
          "first-secret",
          ghost,
          "Hacker",
        )
        expect(rejected.status).toBe(400)
        expect(await rejected.json()).toEqual({
          error: "invalid_ghost",
          field: "ghost",
        })
      }

      const single = (await (
        await request(app, "GET", `/trainers/${ada.id}/ghost`)
      ).json()) as { name: string }
      expect(single.name).toBe("Ada")
    } finally {
      db.close()
    }
  })

  test("an oversized bundle is rejected with its cap and the best is kept", async () => {
    const { db, app } = setup()
    try {
      const ada = await unlockedTrainer(app, "Ada", "first-secret")
      await upload(app, ada.id, "first-secret", validGhostBundle())
      const padded = {
        ...validGhostBundle(),
        events: [
          {
            tick: 1,
            kind: "impact",
            actor: "Ember Drake",
            hpAfter: {},
            line: "x".repeat(MAX_GHOST_BYTES),
          },
        ],
      }

      const rejected = await upload(app, ada.id, "first-secret", padded)
      expect(rejected.status).toBe(413)
      expect(await rejected.json()).toEqual({
        error: "ghost_too_large",
        field: "ghost",
        limitBytes: MAX_GHOST_BYTES,
      })

      const single = (await (
        await request(app, "GET", `/trainers/${ada.id}/ghost`)
      ).json()) as { name: string }
      expect(single.name).toBe("Ada")
    } finally {
      db.close()
    }
  })

  test("a future sim version is stored and listed: the reader skips the replay, not the entry", async () => {
    const { db, app } = setup()
    try {
      const ada = await unlockedTrainer(app, "Ada", "first-secret")
      const future = { ...validGhostBundle(), simVersion: 999 }
      const put = await upload(app, ada.id, "first-secret", future)
      expect(put.status).toBe(200)

      const board = (await (await request(app, "GET", "/ghosts")).json()) as {
        entries: { ghost: { simVersion: number } }[]
      }
      expect(board.entries).toHaveLength(1)
      expect(board.entries[0]?.ghost.simVersion).toBe(999)
    } finally {
      db.close()
    }
  })

  test("an empty name is rejected", async () => {
    const { db, app } = setup()
    try {
      const ada = await unlockedTrainer(app, "Ada", "first-secret")
      const put = await upload(
        app,
        ada.id,
        "first-secret",
        validGhostBundle(),
        "   ",
      )
      expect(put.status).toBe(400)
      expect(await put.json()).toEqual({
        error: "invalid_name",
        field: "name",
      })
      const board = (await (await request(app, "GET", "/ghosts")).json()) as {
        entries: unknown[]
      }
      expect(board.entries).toEqual([])
    } finally {
      db.close()
    }
  })

  test("uploads authenticate like save pushes", async () => {
    const { db, app } = setup()
    try {
      const ada = await unlockedTrainer(app, "Ada", "first-secret")
      const ghost = validGhostBundle()

      const wrong = await upload(app, ada.id, "wrong-secret", ghost)
      expect(wrong.status).toBe(401)
      expect(await wrong.json()).toEqual({ error: "wrong_passphrase" })

      const missing = await upload(app, ada.id, "", ghost)
      expect(missing.status).toBe(400)

      const unknown = await upload(app, "no-such-trainer", "whatever", ghost)
      expect(unknown.status).toBe(404)

      const board = (await (await request(app, "GET", "/ghosts")).json()) as {
        entries: unknown[]
      }
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
      const put = await upload(
        app,
        created.id,
        "anything",
        validGhostBundle(),
        "Nameless",
      )
      expect(put.status).toBe(409)
      expect(await put.json()).toEqual({
        error: "passphrase_required",
        field: "passphrase",
      })
    } finally {
      db.close()
    }
  })

  test("the board and the single download need no passphrase", async () => {
    const { db, app } = setup()
    try {
      const ada = await unlockedTrainer(app, "Ada", "first-secret")
      await upload(app, ada.id, "first-secret", validGhostBundle())

      const board = await request(app, "GET", "/ghosts")
      expect(board.status).toBe(200)
      const single = await request(app, "GET", `/trainers/${ada.id}/ghost`)
      expect(single.status).toBe(200)

      const missing = await request(
        app,
        "GET",
        "/trainers/no-such-trainer/ghost",
      )
      expect(missing.status).toBe(404)
      expect(await missing.json()).toEqual({ error: "ghost_not_found" })
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
      await upload(app, ada.id, "first-secret", validGhostBundle())
      await request(app, "GET", "/ghosts")
      expect(lines.join("\n")).not.toContain("Ada")
    } finally {
      console.log = original
      db.close()
    }
  })
})
