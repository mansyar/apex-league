import { describe, expect, test } from "bun:test"
import { createApp } from "./app"
import {
  CORS_ALLOWED_HEADERS,
  CORS_ALLOWED_METHODS,
  CORS_MAX_AGE_SECONDS,
  configuredOrigin,
  corsHeaders,
  preflightHeaders,
} from "./cors"
import { openDatabase } from "./db"
import { PASSPHRASE_HEADER } from "./saves/routes"

/**
 * FR-10's second half: the allowed origin comes from the environment, and the
 * rules are pure functions so they can be pinned without a port. The
 * integration cases below run the same rules through `app.handle`, which is
 * where a mistake in the wiring (a hook that sets headers too late, a
 * preflight Elysia answers itself) would show up.
 */
const CLIENT = "https://apex-league.pages.dev"

function app(allowedOrigin?: string) {
  return createApp({ db: openDatabase(":memory:"), allowedOrigin })
}

type Application = ReturnType<typeof app>

function request(
  application: Application,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  return application.handle(new Request(`http://localhost${path}`, init))
}

function withOrigin(origin: string, init: RequestInit = {}): RequestInit {
  return { ...init, headers: { ...init.headers, origin } }
}

describe("the configured origin", () => {
  test("an unset or blank variable allows nothing", () => {
    // Default deny: a missing variable is not permission to accept the world.
    expect(configuredOrigin(undefined)).toBeNull()
    expect(configuredOrigin("")).toBeNull()
    expect(configuredOrigin("   ")).toBeNull()
    expect(configuredOrigin("/")).toBeNull()
  })

  test("keeps the origin and drops a trailing slash", () => {
    // A browser never sends the trailing slash, so a value copied out of the
    // address bar would otherwise never match.
    expect(configuredOrigin(CLIENT)).toBe(CLIENT)
    expect(configuredOrigin(`${CLIENT}/`)).toBe(CLIENT)
    expect(configuredOrigin(`  ${CLIENT}/  `)).toBe(CLIENT)
  })
})

describe("the response headers", () => {
  test("echoes exactly the configured origin, never a wildcard", () => {
    // Echoing the request's own origin keeps `*` impossible: a wildcard is
    // not a value this function can produce.
    expect(corsHeaders(CLIENT, CLIENT)).toEqual({
      "access-control-allow-origin": CLIENT,
      vary: "Origin",
    })
  })

  test("a lookalike origin does not pass", () => {
    // The failure a `startsWith` or a substring check would let through.
    expect(corsHeaders(CLIENT, `${CLIENT}.evil.test`)).toEqual({})
    expect(corsHeaders(CLIENT, "https://evil.test")).toEqual({})
    expect(corsHeaders(CLIENT, CLIENT.replace("https", "http"))).toEqual({})
    expect(corsHeaders(CLIENT, `${CLIENT}/`)).toEqual({})
  })

  test("no request origin, or no configured origin, means no headers", () => {
    expect(corsHeaders(CLIENT, null)).toEqual({})
    expect(corsHeaders(null, CLIENT)).toEqual({})
    expect(corsHeaders(null, null)).toEqual({})
  })

  test("a configured wildcard is still not a wildcard", () => {
    // `ALLOWED_ORIGIN=*` is a misconfiguration, and the honest reading of it
    // is "allow no browser origin", not "allow every one".
    expect(corsHeaders("*", CLIENT)).toEqual({})
    expect(corsHeaders(CLIENT, "*")).toEqual({})
  })

  test("never asks the browser for credentials", () => {
    // The client sends its passphrase as a header, not a cookie, so the
    // credentials mode is not needed and would only widen a mistake.
    const headers = {
      ...corsHeaders(CLIENT, CLIENT),
      ...preflightHeaders(CLIENT, CLIENT),
    }
    expect(headers).not.toHaveProperty("access-control-allow-credentials")
  })
})

describe("the preflight", () => {
  test("names the methods the save routes use", () => {
    const headers = preflightHeaders(CLIENT, CLIENT)
    expect(headers["access-control-allow-methods"]).toBe(CORS_ALLOWED_METHODS)
    for (const method of ["GET", "POST", "PUT", "OPTIONS"]) {
      expect(CORS_ALLOWED_METHODS).toContain(method)
    }
    expect(headers["access-control-max-age"]).toBe(String(CORS_MAX_AGE_SECONDS))
    expect(Number(headers["access-control-max-age"])).toBeGreaterThan(0)
  })

  test("allows the passphrase header a pull sends", () => {
    // The client sets `x-trainer-passphrase` on GETs, which is not a simple
    // header, so without it every pull is blocked before it is sent.
    const allowed = CORS_ALLOWED_HEADERS.split(",").map((name) => name.trim())
    expect(allowed).toContain(PASSPHRASE_HEADER)
    expect(allowed).toContain("content-type")
    expect(preflightHeaders(CLIENT, CLIENT)).toMatchObject({
      "access-control-allow-headers": CORS_ALLOWED_HEADERS,
    })
  })

  test("a foreign origin gets an empty preflight", () => {
    expect(preflightHeaders(CLIENT, "https://evil.test")).toEqual({})
    expect(preflightHeaders(null, CLIENT)).toEqual({})
  })
})

describe("the app", () => {
  test("echoes the configured origin on a real response", async () => {
    const response = await request(app(CLIENT), "/health", withOrigin(CLIENT))

    expect(response.status).toBe(200)
    expect(response.headers.get("access-control-allow-origin")).toBe(CLIENT)
    // Vary is what stops a cache handing one origin's response to another.
    expect(response.headers.get("vary")).toContain("Origin")
    expect(response.headers.get("access-control-allow-credentials")).toBeNull()
  })

  test("a foreign origin gets no cors header at all", async () => {
    const response = await request(
      app(CLIENT),
      "/health",
      withOrigin("https://apex-league.pages.dev.evil.test"),
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("access-control-allow-origin")).toBeNull()
  })

  test("an unset allowed origin denies every request", async () => {
    // The default the brief calls for: no variable means no CORS headers,
    // not `*`. This is the state a container is in when Coolify has not been
    // given ALLOWED_ORIGIN yet.
    for (const allowed of [undefined, "", "  "]) {
      const response = await request(
        app(allowed),
        "/health",
        withOrigin(CLIENT),
      )
      expect(response.headers.get("access-control-allow-origin")).toBeNull()
      expect(response.headers.get("vary")).toBeNull()
    }
  })

  test("answers a preflight with 204 and the passphrase header", async () => {
    const response = await request(
      app(CLIENT),
      "/trainers/trn_demo/save",
      withOrigin(CLIENT, {
        method: "OPTIONS",
        headers: {
          "access-control-request-method": "GET",
          "access-control-request-headers": PASSPHRASE_HEADER,
        },
      }),
    )

    expect(response.status).toBe(204)
    expect(response.headers.get("access-control-allow-origin")).toBe(CLIENT)
    expect(response.headers.get("access-control-allow-methods")).toContain(
      "PUT",
    )
    expect(response.headers.get("access-control-allow-headers")).toContain(
      PASSPHRASE_HEADER,
    )
    expect(
      Number(response.headers.get("access-control-max-age")),
    ).toBeGreaterThan(0)
    expect(response.headers.get("access-control-allow-credentials")).toBeNull()
  })

  test("a preflight from a foreign origin is denied", async () => {
    const response = await request(
      app(CLIENT),
      "/trainers/trn_demo/save",
      withOrigin("https://evil.test", { method: "OPTIONS" }),
    )

    expect(response.headers.get("access-control-allow-origin")).toBeNull()
  })

  test("cors headers ride on an error response too", async () => {
    // A 404 without the header is indistinguishable from a network failure in
    // the browser, and the client's "the cloud is behind" status would hide a
    // real bug behind a CORS block.
    const response = await request(
      app(CLIENT),
      "/trainers/trn_missing",
      withOrigin(CLIENT),
    )

    expect(response.status).toBe(404)
    expect(response.headers.get("access-control-allow-origin")).toBe(CLIENT)
  })
})
