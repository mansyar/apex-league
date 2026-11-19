/**
 * The live protocol's contract (FR-1, AC-1): one versioned vocabulary, shared
 * by the server and both clients, with hard bounds on everything that crosses
 * the wire. This suite pins those bounds as the single source of truth.
 */

import { describe, expect, test } from "bun:test"
import {
  isValidRoomCode,
  LIVE_ERROR_CODES,
  LIVE_KIND,
  LIVE_PROTOCOL_VERSION,
  MAX_CODE_CHARS,
  MAX_MESSAGE_CHARS,
  MAX_PASSPHRASE_CHARS,
  MAX_TRIGGERS,
  MIN_CODE_CHARS,
} from "./types"

describe("live protocol constants", () => {
  test("the version and message kinds are frozen and complete", () => {
    expect(LIVE_PROTOCOL_VERSION).toBe(1)
    expect(Object.isFrozen(LIVE_KIND)).toBe(true)
    expect(Object.values(LIVE_KIND).sort()).toEqual([
      "create",
      "error",
      "intent",
      "join",
      "ready",
      "snapshot",
      "verdict",
    ])
  })

  test("the error codes cover every rejection the server can produce", () => {
    expect(Object.isFrozen(LIVE_ERROR_CODES)).toBe(true)
    for (const code of [
      "bad_code",
      "bad_intent",
      "bad_passphrase",
      "bad_version",
      "duplicate_join",
      "malformed",
      "match_over",
      "not_ready",
      "oversized",
      "room_full",
      "room_not_found",
      "stale_intent",
      "unknown_kind",
    ]) {
      expect(Object.values(LIVE_ERROR_CODES) as string[]).toContain(code)
    }
  })

  test("the wire bounds are ordered so validation can be tiered", () => {
    expect(MIN_CODE_CHARS).toBeLessThan(MAX_CODE_CHARS)
    expect(MAX_PASSPHRASE_CHARS).toBeGreaterThan(0)
    expect(MAX_TRIGGERS).toBeGreaterThan(0)
    expect(MAX_MESSAGE_CHARS).toBeGreaterThan(MAX_CODE_CHARS)
  })
})

describe("room codes", () => {
  test("accepts upper-case alphanumeric codes in the bounded length", () => {
    expect(isValidRoomCode("A".repeat(MIN_CODE_CHARS))).toBe(true)
    expect(isValidRoomCode("A1B2C3D4")).toBe(true)
    expect(isValidRoomCode("A".repeat(MAX_CODE_CHARS))).toBe(true)
  })

  test("rejects lower case, symbols, and out-of-range lengths", () => {
    expect(isValidRoomCode("abcd")).toBe(false)
    expect(isValidRoomCode("A-1B2")).toBe(false)
    expect(isValidRoomCode("A".repeat(MIN_CODE_CHARS - 1))).toBe(false)
    expect(isValidRoomCode("A".repeat(MAX_CODE_CHARS + 1))).toBe(false)
    expect(isValidRoomCode(null)).toBe(false)
    expect(isValidRoomCode(1234)).toBe(false)
  })
})
