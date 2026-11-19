/**
 * Pure protocol parsing (FR-1, AC-1). Every helper returns a typed outcome and
 * never throws: a hostile frame must become a rejection the room loop can
 * answer, never an exception that takes the connection down.
 */

import { DOCTRINE_IDS } from "../battle"
import type { LiveErrorCode, LiveIntent } from "./types"
import {
  isValidRoomCode,
  LIVE_ERROR_CODES,
  LIVE_KIND,
  LIVE_PROTOCOL_VERSION,
  type LiveMessage,
  MAX_MESSAGE_CHARS,
  MAX_PASSPHRASE_CHARS,
  MAX_TRAINER_ID_CHARS,
  MAX_TRIGGER_CHARS,
  MAX_TRIGGERS,
} from "./types"

export type ParseOutcome =
  | { readonly ok: true; readonly message: LiveMessage }
  | { readonly ok: false; readonly error: LiveErrorCode }

const DOCTRINES: ReadonlySet<string> = new Set<string>(DOCTRINE_IDS)

function reject(error: LiveErrorCode): ParseOutcome {
  return { ok: false, error }
}

function accept(message: LiveMessage): ParseOutcome {
  return { ok: true, message }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isBoundedString(
  value: unknown,
  min: number,
  max: number,
): value is string {
  return typeof value === "string" && value.length >= min && value.length <= max
}

function validIntent(value: unknown): value is LiveIntent {
  if (!isRecord(value)) return false
  const doctrine = value.doctrine
  if (
    doctrine !== null &&
    !(typeof doctrine === "string" && DOCTRINES.has(doctrine))
  ) {
    return false
  }
  const triggers = value.triggers
  if (!Array.isArray(triggers) || triggers.length > MAX_TRIGGERS) return false
  for (const trigger of triggers) {
    if (!isBoundedString(trigger, 1, MAX_TRIGGER_CHARS)) return false
  }
  return true
}

function validStream(value: unknown): boolean {
  if (!isRecord(value)) return false
  const steps = value.steps
  const stepMs = value.stepMs
  const data = value.data
  if (typeof steps !== "number" || !Number.isInteger(steps) || steps < 0) {
    return false
  }
  if (typeof stepMs !== "number" || !Number.isInteger(stepMs) || stepMs <= 0) {
    return false
  }
  return isRecord(data) && typeof data.length === "number"
}

function validClaim(value: Record<string, unknown>): boolean {
  return (
    isValidRoomCode(value.code) &&
    isBoundedString(value.trainerId, 1, MAX_TRAINER_ID_CHARS) &&
    isBoundedString(value.passphrase, 1, MAX_PASSPHRASE_CHARS)
  )
}

/** Validate an already-decoded value against the versioned union. */
export function validateMessage(value: unknown): ParseOutcome {
  if (!isRecord(value)) return reject(LIVE_ERROR_CODES.malformed)
  if (value.v !== LIVE_PROTOCOL_VERSION) {
    return reject(LIVE_ERROR_CODES.badVersion)
  }
  const kind = value.kind
  if (typeof kind !== "string" || !(kind in LIVE_KIND)) {
    return reject(LIVE_ERROR_CODES.unknownKind)
  }

  switch (kind) {
    case LIVE_KIND.create:
    case LIVE_KIND.join:
      if (!validClaim(value)) return reject(LIVE_ERROR_CODES.malformed)
      return accept(
        kind === LIVE_KIND.create
          ? {
              v: LIVE_PROTOCOL_VERSION,
              kind: "create",
              code: value.code as string,
              trainerId: value.trainerId as string,
              passphrase: value.passphrase as string,
            }
          : {
              v: LIVE_PROTOCOL_VERSION,
              kind: "join",
              code: value.code as string,
              trainerId: value.trainerId as string,
              passphrase: value.passphrase as string,
            },
      )
    case LIVE_KIND.ready:
      if (
        !isValidRoomCode(value.code) ||
        !isBoundedString(value.trainerId, 1, MAX_TRAINER_ID_CHARS)
      ) {
        return reject(LIVE_ERROR_CODES.malformed)
      }
      return accept({
        v: LIVE_PROTOCOL_VERSION,
        kind: "ready",
        code: value.code as string,
        trainerId: value.trainerId as string,
      })
    case LIVE_KIND.intent: {
      const seq = value.seq
      if (
        typeof seq !== "number" ||
        !Number.isInteger(seq) ||
        seq < 0 ||
        !validIntent(value.intent)
      ) {
        return reject(LIVE_ERROR_CODES.badIntent)
      }
      return accept({
        v: LIVE_PROTOCOL_VERSION,
        kind: "intent",
        seq,
        intent: value.intent as LiveIntent,
      })
    }
    case LIVE_KIND.snapshot:
      if (
        !isValidRoomCode(value.code) ||
        typeof value.step !== "number" ||
        !Number.isInteger(value.step) ||
        value.step < 0 ||
        typeof value.elapsedMs !== "number" ||
        !Number.isInteger(value.elapsedMs) ||
        value.elapsedMs < 0 ||
        !validStream(value.stream)
      ) {
        return reject(LIVE_ERROR_CODES.malformed)
      }
      return accept(value as unknown as LiveMessage)
    case LIVE_KIND.verdict: {
      const reasons = ["ko", "double_ko", "time", "forfeit"]
      const seat = value.winnerSeat
      if (
        !isValidRoomCode(value.code) ||
        typeof value.reason !== "string" ||
        !reasons.includes(value.reason) ||
        (seat !== null && seat !== 0 && seat !== 1) ||
        (value.result !== null && !isRecord(value.result))
      ) {
        return reject(LIVE_ERROR_CODES.malformed)
      }
      return accept(value as unknown as LiveMessage)
    }
    case LIVE_KIND.error:
      if (
        typeof value.code !== "string" ||
        !(Object.values(LIVE_ERROR_CODES) as string[]).includes(value.code) ||
        typeof value.detail !== "string"
      ) {
        return reject(LIVE_ERROR_CODES.malformed)
      }
      return accept(value as unknown as LiveMessage)
    default:
      return reject(LIVE_ERROR_CODES.unknownKind)
  }
}

/** Parse a wire string. Oversized frames are refused before `JSON.parse`. */
export function parseMessage(raw: string): ParseOutcome {
  if (typeof raw !== "string") return reject(LIVE_ERROR_CODES.malformed)
  if (raw.length > MAX_MESSAGE_CHARS) return reject(LIVE_ERROR_CODES.oversized)
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return reject(LIVE_ERROR_CODES.malformed)
  }
  return validateMessage(value)
}
