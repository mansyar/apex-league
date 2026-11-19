/**
 * Protocol parsing is the first line of defence (FR-1, AC-1): malformed,
 * unknown, stale-version and oversized frames must be rejected as typed errors
 * and must never throw. Every case here drives the pure helpers directly.
 */

import { describe, expect, test } from "bun:test"
import { DOCTRINE_IDS } from "../battle"
import { parseMessage, validateMessage } from "./parse"
import {
  LIVE_ERROR_CODES,
  LIVE_PROTOCOL_VERSION,
  MAX_MESSAGE_CHARS,
  MAX_PASSPHRASE_CHARS,
  MAX_TRIGGERS,
} from "./types"

function json(value: unknown): string {
  return JSON.stringify(value)
}

const CREATE = {
  v: LIVE_PROTOCOL_VERSION,
  kind: "create",
  code: "APEX19",
  trainerId: "trainer-1",
  passphrase: "correct horse battery",
}

describe("parseMessage", () => {
  test("accepts every valid client message kind", () => {
    const frames: unknown[] = [
      CREATE,
      {
        v: 1,
        kind: "join",
        code: "APEX19",
        trainerId: "t2",
        passphrase: "long enough",
      },
      { v: 1, kind: "ready", code: "APEX19", trainerId: "t2" },
      {
        v: 1,
        kind: "intent",
        seq: 3,
        intent: { doctrine: DOCTRINE_IDS[0], triggers: ["basic"] },
      },
      {
        v: 1,
        kind: "intent",
        seq: 4,
        intent: { doctrine: null, triggers: [] },
      },
    ]
    for (const frame of frames) {
      const outcome = parseMessage(json(frame))
      expect(outcome.ok).toBe(true)
    }
  })

  test("accepts the server message kinds too", () => {
    const stream = {
      steps: 1,
      stepMs: 20,
      bounds: { minX: -1, maxX: 1, minZ: -1, maxZ: 1 },
      keys: ["a", "b"],
      data: { length: 18, 0: 0 },
    }
    expect(
      parseMessage(
        json({
          v: 1,
          kind: "snapshot",
          code: "APEX19",
          step: 2,
          elapsedMs: 40,
          stream,
        }),
      ).ok,
    ).toBe(true)
    expect(
      parseMessage(
        json({
          v: 1,
          kind: "verdict",
          code: "APEX19",
          reason: "ko",
          winnerSeat: 0,
          result: null,
        }),
      ).ok,
    ).toBe(true)
    expect(
      parseMessage(
        json({ v: 1, kind: "error", code: "room_full", detail: "no seat" }),
      ).ok,
    ).toBe(true)
  })

  test("rejects a stale or wrong version", () => {
    const outcome = parseMessage(
      json({ ...CREATE, v: LIVE_PROTOCOL_VERSION + 1 }),
    )
    expect(outcome.ok).toBe(false)
    if (!outcome.ok) expect(outcome.error).toBe(LIVE_ERROR_CODES.badVersion)
  })

  test("rejects unknown kinds without throwing", () => {
    const outcome = parseMessage(json({ ...CREATE, kind: "teleport" }))
    expect(outcome.ok).toBe(false)
    if (!outcome.ok) expect(outcome.error).toBe(LIVE_ERROR_CODES.unknownKind)
  })

  test("rejects malformed JSON and non-objects", () => {
    for (const raw of ["{", "null", "[]", '"hello"', "42"]) {
      const outcome = parseMessage(raw)
      expect(outcome.ok).toBe(false)
      if (!outcome.ok) expect(outcome.error).toBe(LIVE_ERROR_CODES.malformed)
    }
  })

  test("rejects oversized frames before parsing them", () => {
    const raw = `"${"x".repeat(MAX_MESSAGE_CHARS)}"`
    const outcome = parseMessage(raw)
    expect(outcome.ok).toBe(false)
    if (!outcome.ok) expect(outcome.error).toBe(LIVE_ERROR_CODES.oversized)
  })

  test("rejects oversized or missing claim fields", () => {
    expect(
      parseMessage(
        json({ ...CREATE, passphrase: "x".repeat(MAX_PASSPHRASE_CHARS + 1) }),
      ).ok,
    ).toBe(false)
    expect(parseMessage(json({ ...CREATE, code: "abc" })).ok).toBe(false)
    expect(parseMessage(json({ ...CREATE, trainerId: "" })).ok).toBe(false)
  })

  test("rejects bad intents: negative seq, unknown doctrine, oversized triggers", () => {
    const good = {
      v: 1,
      kind: "intent",
      seq: 1,
      intent: { doctrine: null, triggers: [] },
    }
    expect(parseMessage(json({ ...good, seq: -1 })).ok).toBe(false)
    expect(parseMessage(json({ ...good, seq: 1.5 })).ok).toBe(false)
    expect(
      parseMessage(
        json({ ...good, intent: { doctrine: "not-a-doctrine", triggers: [] } }),
      ).ok,
    ).toBe(false)
    expect(
      parseMessage(
        json({
          ...good,
          intent: {
            doctrine: null,
            triggers: Array.from({ length: MAX_TRIGGERS + 1 }, () =>
              "x".repeat(10),
            ),
          },
        }),
      ).ok,
    ).toBe(false)
  })

  test("validateMessage never throws on hostile inputs", () => {
    const hostile: unknown[] = [
      undefined,
      null,
      0,
      "x",
      [],
      {},
      { v: 1 },
      { v: 1, kind: "intent" },
      { v: 1, kind: "create", code: {}, trainerId: [], passphrase: null },
      { v: 1, kind: "error", code: "unknown", detail: "" },
      {
        v: 1,
        kind: "verdict",
        code: "APEX19",
        reason: "nuke",
        winnerSeat: 0,
        result: null,
      },
    ]
    for (const value of hostile) {
      expect(() => validateMessage(value)).not.toThrow()
      expect(validateMessage(value).ok).toBe(false)
    }
  })
})
