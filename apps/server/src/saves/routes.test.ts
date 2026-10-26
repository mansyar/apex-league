import type { Database } from "bun:sqlite"
import { describe, expect, spyOn, test } from "bun:test"
import { createApp } from "../app"
import { openDatabase } from "../db"
import { MAX_PAYLOAD_BYTES, payloadBytes } from "./limits"
import { PASSPHRASE_HEADER } from "./routes"

/**
 * The save routes are driven through `app.handle(new Request(...))` over an
 * in-memory database, exactly as the identity suite is, so nothing binds a port
 * and nothing touches the network (NFR-4). Two apps over one `db` stand in for
 * two devices.
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
  headers: Record<string, string> = {},
): Promise<Response> {
  const init: RequestInit = { method, headers }
  if (body !== undefined) {
    init.headers = { ...headers, "content-type": "application/json" }
    init.body = typeof body === "string" ? body : JSON.stringify(body)
  }
  return app.handle(new Request(`http://localhost${path}`, init))
}

const PASSPHRASE = "correct horse battery"

/** A trainer that can hold a cloud save, because it has a passphrase. */
async function unlockedTrainer(app: App): Promise<string> {
  const created = await send(app, "POST", "/trainers")
  const { id } = (await created.json()) as { id: string }
  await send(app, "PUT", `/trainers/${id}`, { passphrase: PASSPHRASE })
  return id
}

/** A trainer that exists but has never set a passphrase. */
async function lockedTrainer(app: App): Promise<string> {
  const created = await send(app, "POST", "/trainers")
  return ((await created.json()) as { id: string }).id
}

const auth = { [PASSPHRASE_HEADER]: PASSPHRASE }

/** A payload shaped like the client's, with a marker that must survive a round trip. */
function payloadAt(savedAt: number, marker: string): string {
  return JSON.stringify({
    version: 25,
    state: { marker },
    session: null,
    savedAt,
  })
}

function push(
  app: App,
  id: string,
  payload: string,
  savedAt: number,
  passphrase: string = PASSPHRASE,
): Promise<Response> {
  return send(app, "PUT", `/trainers/${id}/save`, {
    passphrase,
    payload,
    savedAt,
  })
}

function pull(
  app: App,
  id: string,
  headers: Record<string, string> = auth,
): Promise<Response> {
  return send(app, "GET", `/trainers/${id}/save`, undefined, headers)
}

function pullDisplaced(app: App, id: string): Promise<Response> {
  return send(app, "GET", `/trainers/${id}/save/displaced`, undefined, auth)
}

type SaveBody = { payload: string; savedAt: number }

describe("PUT /trainers/:id/save", () => {
  test("stores the first push and returns it from a pull", async () => {
    const app = testApp()
    const id = await unlockedTrainer(app)
    const payload = payloadAt(1_000, "first")

    const response = await push(app, id, payload, 1_000)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ stored: true, winner: "incoming" })
    const pulled = await pull(app, id)
    expect(pulled.status).toBe(200)
    expect(await pulled.json()).toEqual({ payload, savedAt: 1_000 })
  })

  test("a newer push replaces the stored save", async () => {
    const app = testApp()
    const id = await unlockedTrainer(app)
    const older = payloadAt(1_000, "alpha")
    const newer = payloadAt(2_000, "beta")

    await push(app, id, older, 1_000)
    const response = await push(app, id, newer, 2_000)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ stored: true, winner: "incoming" })
    expect(await (await pull(app, id)).json()).toEqual({
      payload: newer,
      savedAt: 2_000,
    })
  })

  test("an older push leaves the stored save untouched and reports which one won", async () => {
    const app = testApp()
    const id = await unlockedTrainer(app)
    const newer = payloadAt(2_000, "beta")
    const older = payloadAt(1_000, "alpha")

    await push(app, id, newer, 2_000)
    const response = await push(app, id, older, 1_000)

    // 200, not 409: nothing failed. The client's copy is simply behind, and it
    // keeps playing on its own copy without treating this as an error.
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ stored: false, winner: "stored" })
    expect(await (await pull(app, id)).json()).toEqual({
      payload: newer,
      savedAt: 2_000,
    })
  })

  test("a tie keeps the stored save and displaces nothing", async () => {
    const app = testApp()
    const id = await unlockedTrainer(app)
    const stored = payloadAt(5_000, "stored")
    const tied = payloadAt(5_000, "tied")

    await push(app, id, stored, 5_000)
    const response = await push(app, id, tied, 5_000)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ stored: false, winner: "stored" })
    expect(await (await pull(app, id)).json()).toEqual({
      payload: stored,
      savedAt: 5_000,
    })
    // A tie must not manufacture a conflict: that would overwrite a real
    // earlier loser in the displaced slot with a near-duplicate of the winner.
    expect((await pullDisplaced(app, id)).status).toBe(404)
  })

  test("a pull from a second client returns what the first pushed", async () => {
    const db = openDatabase(":memory:")
    const laptop = testApp(db)
    const phone = testApp(db)
    const id = await unlockedTrainer(laptop)
    const payload = payloadAt(1_000, "laptop")

    await push(laptop, id, payload, 1_000)

    expect(await (await pull(phone, id)).json()).toEqual({
      payload,
      savedAt: 1_000,
    })
  })
})

describe("GET /trainers/:id/save", () => {
  test("404s when the trainer has no stored save", async () => {
    const app = testApp()
    const id = await unlockedTrainer(app)

    const response = await pull(app, id)

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: "save_not_found" })
  })

  test("404s an id that was never issued", async () => {
    const app = testApp()

    const response = await pull(app, "trn_00000000000000000000")

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: "trainer_not_found" })
  })
})

describe("GET /trainers/:id/save/displaced", () => {
  test("the displaced save survives a conflict and is retrievable", async () => {
    const app = testApp()
    const id = await unlockedTrainer(app)
    const laptop = payloadAt(1_000, "laptop")
    const desktop = payloadAt(2_000, "desktop")

    await push(app, id, laptop, 1_000)
    await push(app, id, desktop, 2_000)

    const response = await pullDisplaced(app, id)
    const body = (await response.json()) as SaveBody & {
      displacedAt: number
    }

    expect(response.status).toBe(200)
    // The loser is preserved rather than discarded (FR-6)...
    expect(body.payload).toBe(laptop)
    expect(body.savedAt).toBe(1_000)
    expect(typeof body.displacedAt).toBe("number")
    // ...and the winner is still the newer copy, not the preserved one.
    expect((await (await pull(app, id)).json()) as SaveBody).toEqual({
      payload: desktop,
      savedAt: 2_000,
    })
  })

  test("404s before any conflict has happened", async () => {
    const app = testApp()
    const id = await unlockedTrainer(app)
    await push(app, id, payloadAt(1_000, "only"), 1_000)

    const response = await pullDisplaced(app, id)

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: "no_displaced_save" })
  })

  test("keeps exactly one displaced copy, replaced on the next conflict", async () => {
    const db = openDatabase(":memory:")
    const app = testApp(db)
    const id = await unlockedTrainer(app)

    await push(app, id, payloadAt(1_000, "a"), 1_000)
    await push(app, id, payloadAt(2_000, "b"), 2_000)
    await push(app, id, payloadAt(3_000, "c"), 3_000)

    expect(db.query("SELECT COUNT(*) AS n FROM displaced_saves").get()).toEqual(
      {
        n: 1,
      },
    )
    // The most recent loser, not the first one.
    expect(
      ((await (await pullDisplaced(app, id)).json()) as SaveBody).payload,
    ).toBe(payloadAt(2_000, "b"))
  })

  test("a push that loses does not disturb the displaced copy", async () => {
    const app = testApp()
    const id = await unlockedTrainer(app)
    const loser = payloadAt(1_000, "laptop")

    await push(app, id, loser, 1_000)
    await push(app, id, payloadAt(2_000, "desktop"), 2_000)
    const stale = await push(app, id, payloadAt(500, "stale"), 500)

    expect(stale.status).toBe(200)
    expect(
      ((await (await pullDisplaced(app, id)).json()) as SaveBody).payload,
    ).toBe(loser)
  })
})

describe("the payload is opaque", () => {
  test("stores a future-version payload and returns it byte for byte", async () => {
    const app = testApp()
    const id = await unlockedTrainer(app)
    // Version 99, a species this server has never heard of, and a field the
    // server has no column for. None of it is the server's business.
    const future =
      '{"version":99,"state":{"species":["voltaic","lumen"],"unicode":"🐉 é ✓"},"session":{"seed":12345},"savedAt":1700000000000,"unknownField":{"nested":[1,2,3]}}'

    const response = await push(app, id, future, 1_700_000_000_000)
    const pulled = (await (await pull(app, id)).json()) as SaveBody

    expect(response.status).toBe(200)
    expect(pulled.payload).toBe(future)
    expect(pulled.savedAt).toBe(1_700_000_000_000)
  })

  test("never parses the payload, so even non-JSON text round trips", async () => {
    const app = testApp()
    const id = await unlockedTrainer(app)
    const notJson = "{not json at all, and deliberately so"

    const response = await push(app, id, notJson, 1_000)

    expect(response.status).toBe(200)
    expect(((await (await pull(app, id)).json()) as SaveBody).payload).toBe(
      notJson,
    )
  })
})

describe("payload limits", () => {
  test("refuses an oversized body with 413 and stores nothing", async () => {
    const db = openDatabase(":memory:")
    const app = testApp(db)
    const id = await unlockedTrainer(app)
    const kept = payloadAt(1_000, "kept")
    await push(app, id, kept, 1_000)

    const huge = `{"version":25,"pad":"${"x".repeat(MAX_PAYLOAD_BYTES)}"}`
    expect(payloadBytes(huge)).toBeGreaterThan(MAX_PAYLOAD_BYTES)
    const response = await push(app, id, huge, 2_000)

    expect(response.status).toBe(413)
    expect(await response.json()).toEqual({
      error: "payload_too_large",
      field: "payload",
      limitBytes: MAX_PAYLOAD_BYTES,
    })
    // Refused, not truncated: the stored save is exactly what it was, and the
    // refused body did not displace it on its way out.
    expect(await (await pull(app, id)).json()).toEqual({
      payload: kept,
      savedAt: 1_000,
    })
    expect(db.query("SELECT COUNT(*) AS n FROM displaced_saves").get()).toEqual(
      {
        n: 0,
      },
    )
  })

  test("accepts a payload exactly at the limit", async () => {
    const app = testApp()
    const id = await unlockedTrainer(app)
    const exact = "x".repeat(MAX_PAYLOAD_BYTES)
    expect(payloadBytes(exact)).toBe(MAX_PAYLOAD_BYTES)

    const response = await push(app, id, exact, 1_000)

    expect(response.status).toBe(200)
    expect(((await (await pull(app, id)).json()) as SaveBody).payload).toBe(
      exact,
    )
  })

  test("counts bytes, not characters", async () => {
    const app = testApp()
    const id = await unlockedTrainer(app)
    // Half as many characters as the limit, twice the bytes: a character count
    // would let this through and then store more than the limit allows.
    const multibyte = "é".repeat(MAX_PAYLOAD_BYTES / 2 + 1)
    expect(multibyte.length).toBeLessThan(MAX_PAYLOAD_BYTES)
    expect(payloadBytes(multibyte)).toBeGreaterThan(MAX_PAYLOAD_BYTES)

    const response = await push(app, id, multibyte, 1_000)

    expect(response.status).toBe(413)
  })
})

describe("save routes are authenticated by the passphrase", () => {
  test("refuses a push with no passphrase in the body", async () => {
    const app = testApp()
    const id = await unlockedTrainer(app)

    const response = await send(app, "PUT", `/trainers/${id}/save`, {
      payload: payloadAt(1_000, "x"),
      savedAt: 1_000,
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: "invalid_passphrase",
      field: "passphrase",
    })
    expect((await pull(app, id)).status).toBe(404)
  })

  test("refuses a push with the wrong passphrase and stores nothing", async () => {
    const app = testApp()
    const id = await unlockedTrainer(app)

    const response = await push(app, id, payloadAt(1_000, "x"), 1_000, "wrong")

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: "wrong_passphrase" })
    expect((await pull(app, id)).status).toBe(404)
  })

  test("a pull without the passphrase header returns nothing", async () => {
    const app = testApp()
    const id = await unlockedTrainer(app)
    const payload = payloadAt(1_000, "secret")
    await push(app, id, payload, 1_000)

    const missing = await pull(app, id, {})
    const wrong = await pull(app, id, { [PASSPHRASE_HEADER]: "wrong" })

    expect(missing.status).toBe(401)
    expect(wrong.status).toBe(401)
    expect(await missing.text()).not.toContain("secret")
    expect(await wrong.text()).not.toContain("secret")
  })

  test("the displaced copy is behind the same passphrase as the save", async () => {
    const app = testApp()
    const id = await unlockedTrainer(app)
    const loser = payloadAt(1_000, "loser-secret")
    await push(app, id, loser, 1_000)
    await push(app, id, payloadAt(2_000, "winner"), 2_000)

    const missing = await send(
      app,
      "GET",
      `/trainers/${id}/save/displaced`,
      undefined,
      {},
    )
    const wrong = await send(
      app,
      "GET",
      `/trainers/${id}/save/displaced`,
      undefined,
      { [PASSPHRASE_HEADER]: "wrong" },
    )

    // The loser is a whole career too, so it is not a lesser secret.
    expect(missing.status).toBe(401)
    expect(wrong.status).toBe(401)
    expect(await missing.text()).not.toContain("loser-secret")
    expect(await wrong.text()).not.toContain("loser-secret")
  })

  test("a trainer with no passphrase cannot store a save, and is told why", async () => {
    const app = testApp()
    const id = await lockedTrainer(app)

    const response = await push(app, id, payloadAt(1_000, "x"), 1_000)

    // Distinct from 401 on purpose: the caller owns a trainer it just created,
    // so there is nothing to enumerate - it needs to be told to set one first.
    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({
      error: "passphrase_required",
      field: "passphrase",
    })
  })

  test("404s a push for an id that was never issued", async () => {
    const app = testApp()

    const response = await push(
      app,
      "trn_00000000000000000000",
      payloadAt(1_000, "x"),
      1_000,
    )

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: "trainer_not_found" })
  })

  test("a malformed savedAt is refused before anything is written", async () => {
    const app = testApp()
    const id = await unlockedTrainer(app)

    const response = await send(app, "PUT", `/trainers/${id}/save`, {
      passphrase: PASSPHRASE,
      payload: payloadAt(1_000, "x"),
      savedAt: "yesterday",
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: "invalid_saved_at",
      field: "savedAt",
    })
    expect((await pull(app, id)).status).toBe(404)
  })
})

describe("NFR-3 - the save payload is never logged", () => {
  test("nothing is written to the console while a payload is in flight", async () => {
    const app = testApp()
    const id = await unlockedTrainer(app)
    const sentinel = "PAYLOAD-SENTINEL-7c1f"
    const calls: unknown[][] = []
    const spies = (["log", "info", "warn", "error", "debug"] as const).map(
      (level) =>
        spyOn(console, level).mockImplementation((...args: unknown[]) => {
          calls.push(args)
        }),
    )

    try {
      await push(app, id, payloadAt(1_000, sentinel), 1_000)
      // A conflict is the interesting path: it handles two payloads at once.
      await push(app, id, payloadAt(2_000, sentinel), 2_000)
      await pull(app, id)
      await pullDisplaced(app, id)
      // Positive control: an unwired spy would pass the assertions below.
      console.info("control line")
    } finally {
      for (const spy of spies) spy.mockRestore()
    }

    const logged = JSON.stringify(calls)
    expect(logged).toContain("control line")
    expect(logged).not.toContain(sentinel)
  })
})
