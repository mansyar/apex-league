import { describe, expect, test } from "bun:test"
import { LIVE_PROTOCOL_VERSION, STREAM_FIELDS } from "@apex/sim"
import {
  basicIntent,
  decodeServerEvent,
  decodeStream,
  intentMessage,
  newRoomCode,
  normalizeRoomCode,
  openMessage,
  readyMessage,
  socketUrl,
} from "./protocol"

function frame(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const data: Record<string, number> = {}
  for (let i = 0; i < 2 * STREAM_FIELDS; i++) data[i] = i
  return {
    v: LIVE_PROTOCOL_VERSION,
    kind: "snapshot",
    code: "ABCD1234",
    step: 7,
    elapsedMs: 140,
    stream: {
      steps: 1,
      stepMs: 20,
      bounds: { minX: -4000, maxX: 4000, minZ: -3000, maxZ: 3000 },
      keys: ["A", "B"],
      data,
    },
    ...overrides,
  }
}

describe("socketUrl", () => {
  test("maps an http origin to ws and keeps only the live path", () => {
    expect(socketUrl("http://localhost:3457")).toBe("ws://localhost:3457/live")
    expect(socketUrl("https://api.example.test/")).toBe(
      "wss://api.example.test/live",
    )
  })

  test("never carries a credential", () => {
    expect(socketUrl("http://localhost:3457")).not.toContain("passphrase")
  })
})

describe("normalizeRoomCode", () => {
  test("trims, uppercases and drops separators", () => {
    expect(normalizeRoomCode(" ab-12 cd ")).toBe("AB12CD")
  })

  test("returns empty for punctuation-only input", () => {
    expect(normalizeRoomCode("---")).toBe("")
  })
})

describe("client messages", () => {
  test("create carries the claim in the body, never in a URL", () => {
    const raw = openMessage("create", "ABCD", {
      id: "trainer-1",
      passphrase: "secret",
    })
    const parsed = JSON.parse(raw)
    expect(parsed).toMatchObject({
      v: LIVE_PROTOCOL_VERSION,
      kind: "create",
      code: "ABCD",
      trainerId: "trainer-1",
      passphrase: "secret",
    })
    expect(raw).not.toContain("?")
  })

  test("join, ready and intent keep the version and their own shape", () => {
    expect(JSON.parse(readyMessage("ABCD", "trainer-1"))).toEqual({
      v: LIVE_PROTOCOL_VERSION,
      kind: "ready",
      code: "ABCD",
      trainerId: "trainer-1",
    })
    expect(JSON.parse(intentMessage(3, basicIntent()))).toEqual({
      v: LIVE_PROTOCOL_VERSION,
      kind: "intent",
      seq: 3,
      intent: { doctrine: null, triggers: ["basic"] },
    })
  })
})

describe("newRoomCode", () => {
  test("emits six unambiguous glyphs", () => {
    const code = newRoomCode(() => 0)
    expect(code).toHaveLength(6)
    expect(code).toMatch(/^[A-Z2-9]{6}$/)
  })
})

describe("decodeStream", () => {
  test("rebuilds an Int16Array from JSON numeric keys in index order", () => {
    const stream = decodeStream(frame().stream)
    expect(stream).not.toBeNull()
    expect(stream?.steps).toBe(1)
    expect(stream?.stepMs).toBe(20)
    expect(stream?.keys).toEqual(["A", "B"])
    expect(Array.from(stream?.data ?? [])).toEqual(
      Array.from({ length: 2 * STREAM_FIELDS }, (_, index) => index),
    )
  })

  test("rejects a stream whose data is too short", () => {
    expect(
      decodeStream({
        steps: 1,
        stepMs: 20,
        bounds: { minX: -4000, maxX: 4000, minZ: -3000, maxZ: 3000 },
        keys: ["A", "B"],
        data: { 0: 1 },
      }),
    ).toBeNull()
  })
})

describe("decodeServerEvent", () => {
  test("reads a snapshot, a verdict and an error from JSON text", () => {
    expect(decodeServerEvent(JSON.stringify(frame()))?.kind).toBe("snapshot")
    expect(
      decodeServerEvent(
        JSON.stringify({
          v: LIVE_PROTOCOL_VERSION,
          kind: "verdict",
          code: "ABCD",
          reason: "forfeit",
          winnerSeat: 1,
          result: null,
        }),
      ),
    ).toEqual({
      kind: "verdict",
      verdict: { code: "ABCD", reason: "forfeit", winnerSeat: 1 },
    })
    expect(
      decodeServerEvent(
        JSON.stringify({
          v: LIVE_PROTOCOL_VERSION,
          kind: "error",
          code: "room_full",
          detail: "seat not assigned",
        }),
      ),
    ).toEqual({
      kind: "error",
      code: "room_full",
      detail: "seat not assigned",
    })
  })

  test("drops malformed, unknown and stale-version frames without throwing", () => {
    expect(decodeServerEvent("not json")).toBeNull()
    expect(decodeServerEvent({ v: 999, kind: "snapshot" })).toBeNull()
    expect(
      decodeServerEvent({ v: LIVE_PROTOCOL_VERSION, kind: "hello" }),
    ).toBeNull()
    expect(
      decodeServerEvent({ v: LIVE_PROTOCOL_VERSION, kind: "snapshot" }),
    ).toBeNull()
  })
})
