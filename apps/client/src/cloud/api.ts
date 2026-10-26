/**
 * The cloud api, as the client speaks it (FR-4, FR-5, NFR-3).
 *
 * Two rules are structural here rather than conventional:
 *
 * - The passphrase never enters a URL. A push carries it in the body (a push
 *   already has a body); a pull carries it in `x-trainer-passphrase`. A query
 *   string would be written to every proxy and CDN access log on the way.
 * - Every request has a deadline. `signal` is injected so tests leave no
 *   timer behind; the composition root passes `AbortSignal.timeout`.
 *
 * Failures are values, not exceptions: a refused connection and a 401 are
 * both things the caller must report quietly, so neither may throw through
 * the boot path.
 */
import { CLOUD_TIMEOUT_MS } from "./config"

/** The header a pull carries its passphrase in (mirrors the server). */
export const PASSPHRASE_HEADER = "x-trainer-passphrase"

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

/** Why a call failed, in the terms the sync reasons about. */
export type ApiFailure =
  | "offline"
  | "unauthorized"
  | "not-found"
  | "conflict"
  | "rejected"

export type ApiResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: ApiFailure; error?: string }

/** One stored save as the server returns it. */
export interface SaveRecord {
  payload: string
  savedAt: number
}

export interface TrainerRecord {
  id: string
  name: string
  hasPassphrase: boolean
}

export interface PushReceipt {
  stored: boolean
  winner: "incoming" | "stored"
}

export interface CloudApi {
  createTrainer(): Promise<ApiResult<{ id: string }>>
  getTrainer(id: string): Promise<ApiResult<TrainerRecord>>
  updateTrainer(
    id: string,
    body: { name?: string; passphrase?: string; currentPassphrase?: string },
  ): Promise<ApiResult<TrainerRecord>>
  pull(id: string, passphrase: string): Promise<ApiResult<SaveRecord>>
  push(
    id: string,
    passphrase: string,
    payload: string,
    savedAt: number,
  ): Promise<ApiResult<PushReceipt>>
}

/** The default deadline: a request that hangs is a request that failed. */
export const timeoutSignal = (): AbortSignal =>
  AbortSignal.timeout(CLOUD_TIMEOUT_MS)

function reasonFor(status: number): ApiFailure {
  if (status === 401) return "unauthorized"
  if (status === 404) return "not-found"
  if (status === 409) return "conflict"
  return "rejected"
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function createCloudApi(opts: {
  origin: string
  fetch: FetchLike
  /** The deadline factory; injected so tests schedule no timers. */
  signal: () => AbortSignal | undefined
}): CloudApi {
  const { origin, fetch, signal } = opts

  /**
   * One request. A thrown fetch (refused connection, abort, DNS) is
   * `offline`; a non-2xx status keeps its error code so the caller can say
   * "wrong passphrase" rather than "something went wrong".
   */
  async function call<T>(
    path: string,
    init: RequestInit,
  ): Promise<ApiResult<T>> {
    const deadline = signal()
    let response: Response
    try {
      response = await fetch(`${origin}${path}`, {
        ...init,
        signal: deadline,
      })
    } catch {
      return { ok: false, reason: "offline" }
    }
    let body: unknown
    try {
      body = await response.json()
    } catch {
      return { ok: false, reason: reasonFor(response.status) }
    }
    if (!response.ok) {
      const error =
        isRecord(body) && typeof body.error === "string"
          ? body.error
          : undefined
      return { ok: false, reason: reasonFor(response.status), error }
    }
    return { ok: true, value: body as T }
  }

  const json = (method: string, body: unknown): RequestInit => ({
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })

  const trainerPath = (id: string) => `/trainers/${encodeURIComponent(id)}`

  return {
    createTrainer: () => call("/trainers", { method: "POST" }),

    getTrainer: (id) => call(trainerPath(id), { method: "GET" }),

    updateTrainer: (id, body) => call(trainerPath(id), json("PUT", body)),

    // The passphrase rides a header, never the URL (see the module comment).
    pull: (id, passphrase) =>
      call(`${trainerPath(id)}/save`, {
        method: "GET",
        headers: { [PASSPHRASE_HEADER]: passphrase },
      }),

    push: (id, passphrase, payload, savedAt) =>
      call(
        `${trainerPath(id)}/save`,
        json("PUT", { passphrase, payload, savedAt }),
      ),
  }
}
