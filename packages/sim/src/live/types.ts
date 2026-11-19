/**
 * The live-match protocol (FR-1): a versioned, DOM-free vocabulary shared by
 * the authoritative server and both clients. It carries only shapes and bounds
 * — no state, no I/O, no DOM. A snapshot's visual payload is the existing dense
 * `FightStream`, so there is deliberately no second visual protocol here.
 */

import type {
  BattleReason,
  BattleResult,
  DoctrineId,
  FightStream,
} from "../battle"

/** Bump on any incompatible change to a message shape. */
export const LIVE_PROTOCOL_VERSION = 1

/** A hard ceiling before `JSON.parse`, so a giant frame cannot become work. */
export const MAX_MESSAGE_CHARS = 16 * 1024

/** Room codes are short enough to say out loud and type on a phone. */
export const MIN_CODE_CHARS = 4
export const MAX_CODE_CHARS = 12

export const MAX_TRAINER_ID_CHARS = 64
export const MAX_PASSPHRASE_CHARS = 128
export const MAX_NAME_CHARS = 40
export const MAX_TRIGGER_CHARS = 64
export const MAX_TRIGGERS = 8

export const LIVE_KIND = Object.freeze({
  create: "create",
  join: "join",
  ready: "ready",
  intent: "intent",
  snapshot: "snapshot",
  verdict: "verdict",
  error: "error",
} as const)

export const LIVE_ERROR_CODES = Object.freeze({
  badVersion: "bad_version",
  malformed: "malformed",
  unknownKind: "unknown_kind",
  oversized: "oversized",
  badCode: "bad_code",
  badIntent: "bad_intent",
  roomNotFound: "room_not_found",
  roomFull: "room_full",
  duplicateJoin: "duplicate_join",
  badPassphrase: "bad_passphrase",
  notReady: "not_ready",
  staleIntent: "stale_intent",
  matchOver: "match_over",
} as const)

/** Every rejection reason the parser or the room state machine can produce. */
export type LiveErrorCode =
  (typeof LIVE_ERROR_CODES)[keyof typeof LIVE_ERROR_CODES]

/** A terminal fight reason extended with the disconnect case. */
export type LiveVerdictReason = BattleReason | "forfeit"

/** The two fixed seats in a room. */
export type SeatIndex = 0 | 1

/**
 * A high-level order, not positional steering (owner decision 2026-11-19).
 * The doctrine picks the controller profile that maps the order into movement
 * and commits; the triggers are move ids the fighter tries when legal.
 */
export interface LiveIntent {
  /** Doctrine to steer with, or null to keep the current one. */
  readonly doctrine: DoctrineId | null
  /** Move ids the trainer wants to trigger, tried in order. */
  readonly triggers: readonly string[]
}

interface MessageBase {
  readonly v: number
  readonly kind: string
}

/** Host opens a room under a chosen code with an identity claim. */
export interface CreateMessage extends MessageBase {
  readonly kind: "create"
  readonly code: string
  readonly trainerId: string
  readonly passphrase: string
}

/** A second trainer claims the other seat in an existing room. */
export interface JoinMessage extends MessageBase {
  readonly kind: "join"
  readonly code: string
  readonly trainerId: string
  readonly passphrase: string
}

/** A seated trainer declares ready; the match starts when both are. */
export interface ReadyMessage extends MessageBase {
  readonly kind: "ready"
  readonly code: string
  readonly trainerId: string
}

/** One 20 Hz order. `seq` is per-seat and strictly increasing. */
export interface IntentMessage extends MessageBase {
  readonly kind: "intent"
  readonly seq: number
  readonly intent: LiveIntent
}

/** One 20 Hz authoritative dense-stream snapshot. */
export interface SnapshotMessage extends MessageBase {
  readonly kind: "snapshot"
  readonly code: string
  readonly step: number
  readonly elapsedMs: number
  readonly stream: FightStream
}

/** Exactly one terminal message ends a match. */
export interface VerdictMessage extends MessageBase {
  readonly kind: "verdict"
  readonly code: string
  readonly reason: LiveVerdictReason
  readonly winnerSeat: SeatIndex | null
  readonly result: BattleResult | null
}

/** A typed rejection; `detail` never contains a passphrase. */
export interface ErrorMessage extends MessageBase {
  readonly kind: "error"
  readonly code: LiveErrorCode
  readonly detail: string
}

export type LiveClientMessage =
  | CreateMessage
  | JoinMessage
  | ReadyMessage
  | IntentMessage

export type LiveServerMessage = SnapshotMessage | VerdictMessage | ErrorMessage

export type LiveMessage = LiveClientMessage | LiveServerMessage

/** Upper-case room codes only, so a code is unambiguous when spoken or typed. */
export function isValidRoomCode(value: unknown): value is string {
  return (
    typeof value === "string" &&
    new RegExp(`^[A-Z0-9]{${MIN_CODE_CHARS},${MAX_CODE_CHARS}}$`).test(value)
  )
}
