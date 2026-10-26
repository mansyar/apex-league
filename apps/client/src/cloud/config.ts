/**
 * Cloud configuration (FR-11, AC-11, NFR-6).
 *
 * The origin is a build-time constant: `import.meta.env.VITE_API_ORIGIN` is
 * `string | undefined`, so an unset value is knowable before a single request
 * is constructed. That is the whole point — "unset" must mean "this build has
 * no cloud", not "the cloud is down". A runtime catch would still pay for a
 * failed connection on every boot and would show a status the player never
 * asked for.
 */
export const API_ORIGIN_VAR = "VITE_API_ORIGIN"

/** A request that has not answered in this long has failed (NFR-2). */
export const CLOUD_TIMEOUT_MS = 5000

/**
 * The quiet period after the last autosave write (FR-5). An autosave burst —
 * a care action, a day advance, the ceremony commits around them — settles in
 * well under this, so it leaves the client as one request.
 */
export const PUSH_DEBOUNCE_MS = 2000

/**
 * The ceiling on waiting (FR-5): a player who keeps committing forever still
 * ships their ranch every ten seconds, because "debounced" must not become
 * "never while you are playing".
 */
export const PUSH_CAP_MS = 10_000

/**
 * The server's floor for a passphrase (`apps/server/src/identity/passphrase`).
 * Duplicated rather than imported: the client must not depend on the server
 * package, and the check exists here only to refuse an obviously short secret
 * before a round trip. The server still decides.
 */
export const MIN_PASSPHRASE_LENGTH = 8

/**
 * The configured origin, or null when this build has no cloud. Trailing
 * slashes are trimmed so a request path never doubles its separator.
 */
export function cloudOrigin(raw: string | undefined): string | null {
  if (raw === undefined) return null
  const trimmed = raw.trim().replace(/\/+$/, "")
  return trimmed.length === 0 ? null : trimmed
}
