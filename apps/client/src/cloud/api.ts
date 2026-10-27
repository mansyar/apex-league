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

/** A leaderboard board, mirrored from the server's category union. */
export type ScoreCategory = "cups" | "ladder" | "ap" | "collection"

/** One board entry as the client submits it. */
export interface ScoreSubmission {
  category: ScoreCategory
  value: number
  name: string
}

/** What the server answers a submit with: whether a best fell, and the entry. */
export interface SubmitReceipt {
  updated: boolean
  entry: {
    category: ScoreCategory
    value: number
    name: string
    updatedAt: number
  }
}

/**
 * One ranked row as the ranked-list endpoint serves it. The client renders
 * `rank` verbatim — ties already share a rank — and never recomputes it.
 */
export interface BoardEntry {
  rank: number
  trainerId: string
  name: string
  value: number
}

/** What the ranked-list endpoint answers per category (public: no passphrase). */
export interface BoardPayload {
  category: ScoreCategory
  entries: BoardEntry[]
}

/**
 * One ghost board row as `GET /ghosts` serves it. The client renders `rank`
 * verbatim — recency already orders the board — and never recomputes it.
 * The bundle stays opaque here; the spar reader decides replayability.
 */
export interface GhostBoardEntry {
  rank: number
  trainerId: string
  name: string
  updatedAt: number
  ghost: unknown
}

/** What the public ghost board answers: the top-100, newest first. */
export interface GhostBoardPayload {
  entries: GhostBoardEntry[]
}

/** One trainer's stored ghost as the public single download serves it. */
export interface GhostRecord {
  trainerId: string
  name: string
  updatedAt: number
  ghost: unknown
}

/** What a ghost upload answers: the stored row. */
export interface GhostReceipt {
  stored: boolean
  entry: {
    name: string
    payload: string
    updatedAt: number
  }
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
  submitScore(
    id: string,
    passphrase: string,
    submission: ScoreSubmission,
  ): Promise<ApiResult<SubmitReceipt>>
  /**
   * Read one board's ranked list. Public like the endpoint: no passphrase,
   * never in the URL — there is nothing secret to send.
   */
  readBoard(category: ScoreCategory): Promise<ApiResult<BoardPayload>>
  /**
   * Upload this trainer's best ghost. Authenticates like a save push (the
   * passphrase rides the body, never the URL). A 4xx/5xx is a value, never
   * a throw — the caller stays quiet.
   */
  submitGhost(
    id: string,
    passphrase: string,
    ghost: unknown,
    name: string,
  ): Promise<ApiResult<GhostReceipt>>
  /** Read one trainer's stored ghost. Public like the board. */
  readGhost(id: string): Promise<ApiResult<GhostRecord>>
  /** Read the top-100 ghost board. Public: no passphrase, never in the URL. */
  readGhosts(): Promise<ApiResult<GhostBoardPayload>>
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

    // A score submit authenticates exactly like a save push (the passphrase
    // rides the body, never the URL) and answers with the server's receipt.
    // A 4xx/5xx is a value, never a throw — the caller stays quiet.
    submitScore: (id, passphrase, submission) =>
      call(
        `${trainerPath(id)}/scores`,
        json("POST", { passphrase, ...submission }),
      ),

    // The board is public: a plain GET on the ranked-list endpoint, the same
    // one-request-one-deadline shape as every other call above.
    readBoard: (category) =>
      call(`/leaderboard/${encodeURIComponent(category)}`, {
        method: "GET",
      }),

    // The ghost upload authenticates like a save push; the board and the
    // single download are public like the leaderboard — reading a ghost
    // reveals nothing the board does not.
    submitGhost: (id, passphrase, ghost, name) =>
      call(
        `${trainerPath(id)}/ghost`,
        json("PUT", { passphrase, ghost, name }),
      ),

    readGhost: (id) =>
      call(`${trainerPath(id)}/ghost`, {
        method: "GET",
      }),

    readGhosts: () =>
      call("/ghosts", {
        method: "GET",
      }),
  }
}
