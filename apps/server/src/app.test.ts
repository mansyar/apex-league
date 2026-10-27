import { describe, expect, test } from "bun:test"
import { createApp } from "./app"
import { openDatabase } from "./db"

/**
 * Route tests drive the app through `app.handle(new Request(...))`, which
 * dispatches in-process and returns a Response. Nothing binds a port and
 * nothing touches the network, which is what NFR-4 asks for.
 */
function testApp() {
  return createApp({ db: openDatabase(":memory:") })
}

async function get(app: ReturnType<typeof testApp>, path: string) {
  return app.handle(new Request(`http://localhost${path}`))
}

describe("GET /health", () => {
  test("reports ok with the applied schema version", async () => {
    const app = testApp()
    const response = await get(app, "/health")

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toContain("application/json")
    expect(await response.json()).toEqual({
      status: "ok",
      schemaVersion: "0002_leaderboard.sql",
    })
  })

  test("answers repeatedly without writing anything", async () => {
    const app = testApp()
    const first = await (await get(app, "/health")).json()
    const second = await (await get(app, "/health")).json()

    expect(second).toEqual(first)
  })

  test("is the only thing exposed, and leaks no configuration", async () => {
    const app = testApp()
    const body = await (await get(app, "/health")).text()

    expect(body).not.toContain("DATABASE_PATH")
    expect(body).not.toContain("apex.sqlite")
    expect((await get(app, "/saves")).status).toBe(404)
  })
})
