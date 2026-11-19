/**
 * The wire half of the live PvP slice (FR-6, NFR-4). Every function here is
 * pure: it either stamps a client message or decodes a server frame, so the
 * protocol can be tested with no socket and no DOM. The passphrase never
 * leaves the message body — the socket URL carries only the server origin and
 * the fixed `/live` path.
 */
import {
  type FightStream,
  LIVE_PROTOCOL_VERSION,
  type LiveIntent,
  STREAM_FIELDS,
} from "@apex/sim"

type ArenaBounds = FightStream["bounds"]

export type RoomAction = "create" | "join"

export interface TrainerClaim {
  readonly id: string
  readonly passphrase: string
}

/** The only server frames the client cares about. */
export type ServerEvent =
  | {
      readonly kind: "snapshot"
      readonly stream: FightStream
      readonly step: number
    }
  | { readonly kind: "verdict"; readonly verdict: LiveVerdict }
  | { readonly kind: "error"; readonly code: string; readonly detail: string }

/**
 * A verdict reduced to what the presentation layer needs. The full
 * `BattleResult` is deliberately not decoded: a live spike has no use for it
 * and rebuilding its nested shape from JSON would only invite drift.
 */
export interface LiveVerdict {
  readonly code: string
  readonly reason: string
  readonly winnerSeat: 0 | 1 | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function objectOf(raw: unknown): Record<string, unknown> | null {
  if (typeof raw === "string") {
    try {
      const parsed: unknown = JSON.parse(raw)
      return isRecord(parsed) ? parsed : null
    } catch {
      return null
    }
  }
  return isRecord(raw) ? raw : null
}

/** `http(s)` API origin → `ws(s)` live endpoint. No credential, ever. */
export function socketUrl(origin: string): string {
  return `${origin.replace(/^http/, "ws").replace(/\/+$/, "")}/live`
}

/** Free text → a stable uppercase code; empty when nothing usable remains. */
export function normalizeRoomCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

/** Six unambiguous glyphs; the server owns validity, the client owns surprise. */
export function newRoomCode(random: () => number): string {
  let code = ""
  for (let i = 0; i < 6; i++) {
    const roll = Math.min(0.999999, Math.max(0, random()))
    code += CODE_ALPHABET.charAt(Math.floor(roll * CODE_ALPHABET.length))
  }
  return code
}

export function openMessage(
  action: RoomAction,
  code: string,
  claim: TrainerClaim,
): string {
  return JSON.stringify({
    v: LIVE_PROTOCOL_VERSION,
    kind: action,
    code,
    trainerId: claim.id,
    passphrase: claim.passphrase,
  })
}

export function readyMessage(code: string, trainerId: string): string {
  return JSON.stringify({
    v: LIVE_PROTOCOL_VERSION,
    kind: "ready",
    code,
    trainerId,
  })
}

export function intentMessage(seq: number, intent: LiveIntent): string {
  return JSON.stringify({
    v: LIVE_PROTOCOL_VERSION,
    kind: "intent",
    seq,
    intent,
  })
}

/** The spike's high-level order: no doctrine override, one basic trigger. */
export function basicIntent(): LiveIntent {
  return { doctrine: null, triggers: ["basic"] }
}

function numberArray(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.filter(
      (entry): entry is number => finite(entry) && Number.isInteger(entry),
    )
  }
  if (isRecord(value)) {
    return Object.keys(value)
      .sort((a, b) => Number(a) - Number(b))
      .map((key) => value[key])
      .filter(
        (entry): entry is number => finite(entry) && Number.isInteger(entry),
      )
  }
  return []
}

function boundsOf(value: unknown): ArenaBounds | null {
  if (!isRecord(value)) return null
  const { minX, maxX, minZ, maxZ } = value
  if (!finite(minX) || !finite(maxX) || !finite(minZ) || !finite(maxZ)) {
    return null
  }
  return { minX, maxX, minZ, maxZ }
}

function keysOf(value: unknown): readonly [string, string] | null {
  if (!Array.isArray(value) || value.length < 2) return null
  const [owned, rival] = value
  if (typeof owned !== "string" || typeof rival !== "string") return null
  return [owned, rival]
}

/**
 * JSON turns the stream's `Int16Array` into an object with numeric keys (and
 * no `length`), so the strict sim parser cannot be reused on the wire. This
 * rebuilds the same flat array in key order and validates just enough to keep
 * a malformed frame away from the renderer.
 */
export function decodeStream(value: unknown): FightStream | null {
  if (!isRecord(value)) return null
  const { steps, stepMs, bounds, keys, data } = value
  if (!finite(steps) || !finite(stepMs)) return null
  if (!Number.isInteger(steps) || !Number.isInteger(stepMs)) return null
  if (steps <= 0 || stepMs <= 0) return null
  const box = boundsOf(bounds)
  const pair = keysOf(keys)
  const values = numberArray(data)
  if (!box || !pair || values.length < 2 * STREAM_FIELDS) return null
  return {
    steps,
    stepMs,
    bounds: box,
    keys: pair,
    data: Int16Array.from(values),
  }
}

/** One frame off the socket; unknown or stale versions are dropped silently. */
export function decodeServerEvent(raw: unknown): ServerEvent | null {
  const frame = objectOf(raw)
  if (!frame || frame.v !== LIVE_PROTOCOL_VERSION) return null

  if (frame.kind === "snapshot") {
    const stream = decodeStream(frame.stream)
    if (!stream || !finite(frame.step)) return null
    return { kind: "snapshot", stream, step: frame.step }
  }

  if (frame.kind === "verdict") {
    const { code, reason, winnerSeat } = frame
    if (typeof code !== "string" || typeof reason !== "string") return null
    if (winnerSeat !== 0 && winnerSeat !== 1 && winnerSeat !== null) return null
    return { kind: "verdict", verdict: { code, reason, winnerSeat } }
  }

  if (frame.kind === "error") {
    const { code, detail } = frame
    if (typeof code !== "string" || typeof detail !== "string") return null
    return { kind: "error", code, detail }
  }

  return null
}
