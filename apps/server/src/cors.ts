import { Elysia } from "elysia"
import { PASSPHRASE_HEADER } from "./saves/routes"

/**
 * FR-10's second half: the browser origin the API accepts is configuration, not
 * a constant. The release funnel removed the last hardcoded hostname, so this
 * module owns the only place an origin can be named - and the default is to
 * name none.
 *
 * Every rule here is a pure function of (configured origin, request origin), so
 * the behaviour is pinned by unit tests with no server and no network. The
 * Elysia wiring at the bottom is the only part that touches a request.
 */

/** The methods the save and identity routes actually answer. `OPTIONS` is the
 * preflight itself, and is named because a browser reads this list. */
export const CORS_ALLOWED_METHODS = "GET, POST, PUT, OPTIONS"

/**
 * A pull carries its passphrase in a header, which is not a "simple" header, so
 * a preflight is mandatory and this list decides whether it passes. Anything
 * missing here fails in the browser before the request is ever sent.
 */
export const CORS_ALLOWED_HEADERS = `content-type, ${PASSPHRASE_HEADER}`

/** Ten minutes: long enough that a session is not re-preflighted on every save
 * push, short enough that a changed origin takes effect the same day. */
export const CORS_MAX_AGE_SECONDS = 600

export type CorsHeaders = Record<string, string>

/**
 * The configured origin, normalised, or `null` when nothing usable is set.
 *
 * A trailing slash is dropped because a browser never sends one, so a value
 * pasted out of an address bar would otherwise never match. A blank value is a
 * misconfiguration and counts as unset. `*` is refused outright: the wildcard
 * is not a value this server is willing to produce, and reading it as "allow
 * everything" would quietly widen the API to every page on the internet.
 */
export function configuredOrigin(
  raw: string | null | undefined,
): string | null {
  const trimmed = raw?.trim().replace(/\/+$/, "") ?? ""
  if (trimmed === "" || trimmed === "*") return null
  return trimmed
}

/**
 * The headers a matching origin earns, or nothing at all.
 *
 * The comparison is exact. A `startsWith` or substring check would let
 * `https://apex-league.pages.dev.evil.test` through, which is the whole attack
 * this guard exists to stop. On a match the origin is echoed back rather than
 * replaced with `*`, so a response can only ever be readable by the one origin
 * that was configured.
 */
function echoOrigin(
  configured: string | null | undefined,
  requestOrigin: string | null,
): CorsHeaders {
  const allowed = configuredOrigin(configured)
  if (allowed === null || requestOrigin !== allowed) return {}
  // `Vary` keeps a cache from handing one origin's response to another.
  return { "access-control-allow-origin": allowed, vary: "Origin" }
}

/** The headers on a normal response. No configured origin, or no `Origin`
 * header, means no CORS headers: same-origin only. */
export function corsHeaders(
  configured: string | null | undefined,
  requestOrigin: string | null,
): CorsHeaders {
  return echoOrigin(configured, requestOrigin)
}

/**
 * The headers on a preflight. Deliberately no `access-control-allow-credentials`:
 * the client authenticates with a header, not a cookie, so credentials mode
 * buys nothing and only widens what a mistake could expose.
 */
export function preflightHeaders(
  configured: string | null | undefined,
  requestOrigin: string | null,
): CorsHeaders {
  const base = echoOrigin(configured, requestOrigin)
  if (Object.keys(base).length === 0) return {}
  return {
    ...base,
    "access-control-allow-methods": CORS_ALLOWED_METHODS,
    "access-control-allow-headers": CORS_ALLOWED_HEADERS,
    "access-control-max-age": String(CORS_MAX_AGE_SECONDS),
  }
}

/**
 * The Elysia plugin. `onRequest` runs before routing, which is what makes the
 * headers land on error responses too - a 404 without them reads as a network
 * failure in the browser, and a real bug would hide behind a CORS block.
 */
export function cors({ allowedOrigin }: { allowedOrigin?: string }) {
  return new Elysia({ name: "cors" }).onRequest(({ request, set }) => {
    const requestOrigin = request.headers.get("origin")
    Object.assign(set.headers, corsHeaders(allowedOrigin, requestOrigin))

    if (request.method !== "OPTIONS") return
    const headers = preflightHeaders(allowedOrigin, requestOrigin)
    // A foreign preflight falls through to the router's 404, unadorned.
    if (Object.keys(headers).length === 0) return
    return new Response(null, { status: 204, headers })
  })
}
