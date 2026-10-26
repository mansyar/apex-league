import type { Database } from "bun:sqlite"
import { describe, expect, spyOn, test } from "bun:test"
import { createApp } from "../app"
import { openDatabase } from "../db"
import { MAX_NAME_LENGTH } from "./name"
import { MAX_PASSPHRASE_LENGTH, MIN_PASSPHRASE_LENGTH } from "./passphrase"

/**
 * Identity routes are exercised through `app.handle(new Request(...))`, the same
 * in-process harness `app.test.ts` uses, so nothing binds a port or touches the
 * network (NFR-4). `app.test.ts`'s `get()` cannot express a method or a body,
 * so this file adds `send()` beside it over the same primitives.
 */
function testApp(db: Database = openDatabase(":memory:")) {
  return createApp({ db })
}

type App = ReturnType<typeof testApp>

async function send(
  app: App,
  method: string,
  path: string,
  body?: unknown,
): Promise<Response> {
  const init: RequestInit = { method }
  if (body !== undefined) {
    init.headers = { "content-type": "application/json" }
    init.body = typeof body === "string" ? body : JSON.stringify(body)
  }
  return app.handle(new Request(`http://localhost${path}`, init))
}

async function newTrainer(app: App): Promise<string> {
  const response = await send(app, "POST", "/trainers")
  const body = (await response.json()) as { id: string }
  return body.id
}

const PASSPHRASE = "correct horse battery"
/** A value that must never survive into a response, a log line or the database. */
const SENTINEL = "sentinel-passphrase-9f3a"

const ID_SHAPE = /^trn_[0-9a-hjkmnp-tv-z]{20}$/

describe("POST /trainers", () => {
  test("issues an opaque id and returns nothing else", async () => {
    const app = testApp()

    const response = await send(app, "POST", "/trainers")
    const body = (await response.json()) as Record<string, unknown>

    expect(response.status).toBe(201)
    expect(Object.keys(body)).toEqual(["id"])
    expect(body.id).toMatch(ID_SHAPE)
  })

  test("issues a fresh id on every call", async () => {
    const app = testApp()

    const ids: string[] = []
    for (let i = 0; i < 12; i += 1) ids.push(await newTrainer(app))

    expect(new Set(ids).size).toBe(12)
    // Not a counter: a counter's output is already in generation order, so
    // sorting it changes nothing. Twelve samples make an accidental match
    // about one in 479 million rather than one in six.
    expect([...ids].sort()).not.toEqual(ids)
  })

  test("collects no personal field, and accepts one without storing or refusing it", async () => {
    const app = testApp()

    // Refusing would tell an attacker which fields exist; storing would collect
    // data the spec forbids. Both are wrong, so the body is ignored outright.
    const response = await send(app, "POST", "/trainers", {
      email: "ada@example.com",
      name: "Ada",
      passphrase: PASSPHRASE,
      id: "trn_attackerchosen0000",
    })
    const body = (await response.json()) as { id: string }

    expect(response.status).toBe(201)
    expect(Object.keys(body)).toEqual(["id"])
    expect(body.id).not.toBe("trn_attackerchosen0000")

    const created = (await (
      await send(app, "GET", `/trainers/${body.id}`)
    ).json()) as {
      name: string
      hasPassphrase: boolean
    }
    expect(created.name).toBe("")
    expect(created.hasPassphrase).toBe(false)
    expect(
      (await send(app, "GET", "/trainers/trn_attackerchosen0000")).status,
    ).toBe(404)
  })
})

describe("GET /trainers/:id", () => {
  test("a second request with the id returns the same trainer", async () => {
    const app = testApp()
    const id = await newTrainer(app)

    const first = await send(app, "GET", `/trainers/${id}`)
    const second = await send(app, "GET", `/trainers/${id}`)

    expect(first.status).toBe(200)
    expect(await first.json()).toEqual({
      id,
      name: "",
      hasPassphrase: false,
    })
    expect(await second.json()).toEqual({ id, name: "", hasPassphrase: false })
  })

  test("404s an id that was never issued", async () => {
    const app = testApp()

    const response = await send(
      app,
      "GET",
      "/trainers/trn_00000000000000000000",
    )

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: "trainer_not_found" })
  })

  test("exposes no hash, salt or passphrase", async () => {
    const app = testApp()
    const id = await newTrainer(app)
    await send(app, "PUT", `/trainers/${id}`, { passphrase: SENTINEL })

    const response = await send(app, "GET", `/trainers/${id}`)
    const body = (await response.json()) as Record<string, unknown>
    const text = JSON.stringify(body)

    expect(Object.keys(body).sort()).toEqual(["hasPassphrase", "id", "name"])
    expect(body.hasPassphrase).toBe(true)
    expect(text).not.toContain(SENTINEL)
    expect(text).not.toContain("$argon2id$")
    expect(text).not.toContain("passphrase_hash")
    expect(text).not.toContain("passphrase_salt")
  })
})

describe("PUT /trainers/:id", () => {
  test("sets a display name, trimmed", async () => {
    const app = testApp()
    const id = await newTrainer(app)

    const response = await send(app, "PUT", `/trainers/${id}`, {
      name: "  Ada Lovelace  ",
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      id,
      name: "Ada Lovelace",
      hasPassphrase: false,
    })
    expect(
      (
        (await (await send(app, "GET", `/trainers/${id}`)).json()) as {
          name: string
        }
      ).name,
    ).toBe("Ada Lovelace")
  })

  test("refuses a blank name, naming the field and never the value", async () => {
    const app = testApp()
    const id = await newTrainer(app)

    const response = await send(app, "PUT", `/trainers/${id}`, {
      name: "   ",
    })
    const body = (await response.json()) as Record<string, unknown>

    expect(response.status).toBe(400)
    expect(body).toEqual({ error: "invalid_name", field: "name" })
  })

  test("refuses a name over the cap", async () => {
    const app = testApp()
    const id = await newTrainer(app)

    const response = await send(app, "PUT", `/trainers/${id}`, {
      name: "x".repeat(MAX_NAME_LENGTH + 1),
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: "invalid_name",
      field: "name",
    })
  })

  test("refuses a passphrase below the minimum without echoing it", async () => {
    const app = testApp()
    const id = await newTrainer(app)

    const response = await send(app, "PUT", `/trainers/${id}`, {
      passphrase: "short",
    })
    const text = await response.text()

    expect(response.status).toBe(400)
    expect(JSON.parse(text)).toEqual({
      error: "invalid_passphrase",
      field: "passphrase",
    })
    expect(text).not.toContain("short")
    expect(MIN_PASSPHRASE_LENGTH).toBeGreaterThan(7)
    expect(MIN_PASSPHRASE_LENGTH).toBeLessThan(MAX_PASSPHRASE_LENGTH)
  })

  test("refuses a request that changes nothing", async () => {
    const app = testApp()
    const id = await newTrainer(app)

    const response = await send(app, "PUT", `/trainers/${id}`, {})

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: "nothing_to_update" })
  })

  test("404s an unknown trainer", async () => {
    const app = testApp()

    const response = await send(
      app,
      "PUT",
      "/trainers/trn_00000000000000000000",
      {
        name: "Ada",
      },
    )

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: "trainer_not_found" })
  })

  test("sets a first passphrase with no current one", async () => {
    const app = testApp()
    const id = await newTrainer(app)

    const response = await send(app, "PUT", `/trainers/${id}`, {
      passphrase: PASSPHRASE,
    })

    expect(response.status).toBe(200)
    expect(
      ((await response.json()) as { hasPassphrase: boolean }).hasPassphrase,
    ).toBe(true)
  })

  test("requires the current passphrase before replacing one", async () => {
    const app = testApp()
    const id = await newTrainer(app)
    await send(app, "PUT", `/trainers/${id}`, { passphrase: PASSPHRASE })

    // Without this, anyone who learns an id could lock the owner out of a save.
    const noCurrent = await send(app, "PUT", `/trainers/${id}`, {
      passphrase: "an attacker passphrase",
    })
    const wrongCurrent = await send(app, "PUT", `/trainers/${id}`, {
      passphrase: "an attacker passphrase",
      currentPassphrase: "guess",
    })

    expect(noCurrent.status).toBe(401)
    expect(await noCurrent.json()).toEqual({
      error: "wrong_current_passphrase",
      field: "currentPassphrase",
    })
    expect(wrongCurrent.status).toBe(401)
    expect(
      await (
        await send(app, "POST", `/trainers/${id}/claim`, {
          passphrase: PASSPHRASE,
        })
      ).json(),
    ).toEqual({ ok: true })
  })

  test("replaces a passphrase when the current one is right", async () => {
    const app = testApp()
    const id = await newTrainer(app)
    await send(app, "PUT", `/trainers/${id}`, { passphrase: PASSPHRASE })

    const response = await send(app, "PUT", `/trainers/${id}`, {
      passphrase: "the replacement passphrase",
      currentPassphrase: PASSPHRASE,
    })

    expect(response.status).toBe(200)
    expect(
      (
        await send(app, "POST", `/trainers/${id}/claim`, {
          passphrase: "the replacement passphrase",
        })
      ).status,
    ).toBe(200)
    expect(
      (
        await send(app, "POST", `/trainers/${id}/claim`, {
          passphrase: PASSPHRASE,
        })
      ).status,
    ).toBe(401)
  })

  test("keeps the name when only the passphrase changes", async () => {
    const app = testApp()
    const id = await newTrainer(app)
    await send(app, "PUT", `/trainers/${id}`, { name: "Ada" })

    const response = await send(app, "PUT", `/trainers/${id}`, {
      passphrase: PASSPHRASE,
    })

    expect(await response.json()).toEqual({
      id,
      name: "Ada",
      hasPassphrase: true,
    })
  })
})

describe("POST /trainers/:id/claim", () => {
  test("reclaims the trainer from a second client with the right passphrase", async () => {
    const db = openDatabase(":memory:")
    const laptop = testApp(db)
    const phone = testApp(db)
    const id = await newTrainer(laptop)
    await send(laptop, "PUT", `/trainers/${id}`, {
      name: "Ada",
      passphrase: PASSPHRASE,
    })

    const response = await send(phone, "POST", `/trainers/${id}/claim`, {
      passphrase: PASSPHRASE,
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    // The same trainer, not a copy: the name set on the laptop is visible.
    expect(await (await send(phone, "GET", `/trainers/${id}`)).json()).toEqual({
      id,
      name: "Ada",
      hasPassphrase: true,
    })
  })

  test("rejects a wrong passphrase with 401 and retrieves nothing", async () => {
    const app = testApp()
    const id = await newTrainer(app)
    await send(app, "PUT", `/trainers/${id}`, { passphrase: PASSPHRASE })

    const response = await send(app, "POST", `/trainers/${id}/claim`, {
      passphrase: "correct horse batter",
    })

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ ok: false })
  })

  test("a wrong passphrase and an unknown trainer are indistinguishable", async () => {
    const app = testApp()
    const id = await newTrainer(app)
    await send(app, "PUT", `/trainers/${id}`, { passphrase: PASSPHRASE })

    // The whole point: if these two differ in status, body or content type, the
    // endpoint becomes an oracle for which ids exist.
    const wrongPassphrase = await send(app, "POST", `/trainers/${id}/claim`, {
      passphrase: "not the passphrase",
    })
    const unknownTrainer = await send(
      app,
      "POST",
      "/trainers/trn_00000000000000000000/claim",
      { passphrase: PASSPHRASE },
    )

    expect(wrongPassphrase.status).toBe(unknownTrainer.status)
    expect(wrongPassphrase.headers.get("content-type")).toBe(
      unknownTrainer.headers.get("content-type"),
    )
    expect(await wrongPassphrase.text()).toBe(await unknownTrainer.text())
    expect(unknownTrainer.status).toBe(401)
  })

  test("a malformed id is indistinguishable from an unknown one", async () => {
    const app = testApp()

    const malformed = await send(app, "POST", "/trainers/nonsense/claim", {
      passphrase: PASSPHRASE,
    })
    const unknown = await send(
      app,
      "POST",
      "/trainers/trn_00000000000000000000/claim",
      { passphrase: PASSPHRASE },
    )

    expect(malformed.status).toBe(unknown.status)
    expect(await malformed.text()).toBe(await unknown.text())
  })

  test("a trainer with no passphrase set is indistinguishable from an unknown one", async () => {
    const app = testApp()
    const id = await newTrainer(app)

    const noPassphrase = await send(app, "POST", `/trainers/${id}/claim`, {
      passphrase: PASSPHRASE,
    })
    const unknown = await send(
      app,
      "POST",
      "/trainers/trn_00000000000000000000/claim",
      { passphrase: PASSPHRASE },
    )

    expect(noPassphrase.status).toBe(unknown.status)
    expect(await noPassphrase.text()).toBe(await unknown.text())
  })

  test("a missing passphrase field is a 400 about the body, not a probe", async () => {
    const app = testApp()
    const id = await newTrainer(app)

    // Nothing was looked up, so this cannot report whether the trainer exists.
    const response = await send(app, "POST", `/trainers/${id}/claim`, {})

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: "passphrase_required",
      field: "passphrase",
    })
  })
})

describe("NFR-3 — the passphrase is never logged or echoed", () => {
  test("no response body on any path contains the passphrase", async () => {
    const app = testApp()
    const id = await newTrainer(app)

    const responses = [
      await send(app, "POST", "/trainers", { passphrase: SENTINEL }),
      await send(app, "PUT", `/trainers/${id}`, { passphrase: SENTINEL }),
      await send(app, "GET", `/trainers/${id}`),
      await send(app, "POST", `/trainers/${id}/claim`, {
        passphrase: SENTINEL,
      }),
      await send(app, "POST", `/trainers/${id}/claim`, {
        passphrase: `${SENTINEL}-wrong`,
      }),
      await send(app, "POST", `/trainers/${id}/claim`, {
        passphrase: "short",
      }),
      await send(app, "PUT", `/trainers/${id}`, { passphrase: "short" }),
      await send(app, "POST", "/trainers/trn_00000000000000000000/claim", {
        passphrase: SENTINEL,
      }),
      // A body Elysia cannot parse is the path most likely to echo its input.
      await send(
        app,
        "POST",
        `/trainers/${id}/claim`,
        `{"passphrase":"${SENTINEL}"`,
      ),
    ]

    for (const response of responses) {
      const text = await response.text()
      expect(text).not.toContain(SENTINEL)
    }
  })

  test("nothing is written to the console while a passphrase is in flight", async () => {
    const app = testApp()
    const id = await newTrainer(app)
    const calls: unknown[][] = []
    const spies = (["log", "info", "warn", "error", "debug"] as const).map(
      (level) =>
        spyOn(console, level).mockImplementation((...args: unknown[]) => {
          calls.push(args)
        }),
    )

    try {
      await send(app, "PUT", `/trainers/${id}`, { passphrase: SENTINEL })
      await send(app, "POST", `/trainers/${id}/claim`, { passphrase: SENTINEL })
      await send(app, "POST", `/trainers/${id}/claim`, {
        passphrase: `${SENTINEL}-wrong`,
      })
      await send(
        app,
        "POST",
        `/trainers/${id}/claim`,
        `{"passphrase":"${SENTINEL}"`,
      )
      // Positive control: if the spies were not wired, the assertions below
      // would pass against an empty log and prove nothing.
      console.info("control line")
    } finally {
      for (const spy of spies) spy.mockRestore()
    }

    const logged = JSON.stringify(calls)
    expect(logged).toContain("control line")
    // Even a partial log is a leak: one line in a Coolify log viewer is enough.
    expect(logged).not.toContain(SENTINEL)
    expect(logged).not.toContain("$argon2id$")
  })

  test("the database holds no plaintext copy of the passphrase", async () => {
    const db = openDatabase(":memory:")
    const app = testApp(db)
    const id = await newTrainer(app)

    await send(app, "PUT", `/trainers/${id}`, { passphrase: SENTINEL })

    const rows = db.query("SELECT * FROM trainers").all()
    const stored = JSON.stringify(rows)

    expect(rows).toHaveLength(1)
    expect(stored).not.toContain(SENTINEL)
    expect(stored).toContain("$argon2id$")
  })
})
