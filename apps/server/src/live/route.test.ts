/**
 * WebSocket route integration (FR-4, AC-4). The exact Elysia-facing handlers
 * are driven through fake socket hosts over an in-memory registry and clock:
 * no port, no network, no timers, no background work (NFR-6).
 */

import { describe, expect, test } from "bun:test"
import {
  type ErrorMessage,
  LIVE_ERROR_CODES,
  LIVE_PROTOCOL_VERSION,
  type LiveServerMessage,
  type SnapshotMessage,
  type VerdictMessage,
} from "@apex/sim"
import { createApp } from "../app"
import { openDatabase } from "../db"
import { createTrainer, replacePassphrase } from "../identity/trainer"
import type { LiveClock } from "./loop"
import type { Authenticate } from "./room"
import {
  createLiveAdapter,
  dbAuthenticate,
  type LiveAdapter,
  type LiveSocketHost,
} from "./route"

const CODE = "PVP123"
const GOOD = "correct horse battery"
const BAD = "not the passphrase"

function fakeAuth(): Authenticate {
  const names: Record<string, string> = {
    host: "Ember",
    guest: "Brook",
    third: "Cinder",
  }
  return (claim) => {
    const name = names[claim.trainerId]
    return claim.passphrase === GOOD && name
      ? { trainerId: claim.trainerId, name }
      : undefined
  }
}

function fakeClock(start = 0): LiveClock & { set(ms: number): void } {
  let now = start
  return { now: () => now, set: (ms: number) => (now = ms) }
}

interface FakeHost extends LiveSocketHost {
  readonly sent: LiveServerMessage[]
  readonly closed: boolean
}

function fakeHost(raw: object = {}): FakeHost {
  const sent: LiveServerMessage[] = []
  let closed = false
  return {
    raw,
    sent,
    get closed() {
      return closed
    },
    send(message) {
      sent.push(message)
    },
    close() {
      closed = true
    },
  }
}

type Setup = { adapter: LiveAdapter; clock: ReturnType<typeof fakeClock> }

function setup(): Setup {
  const clock = fakeClock()
  const adapter = createLiveAdapter({ authenticate: fakeAuth(), clock })
  return { adapter, clock }
}

async function send(
  adapter: LiveAdapter,
  host: LiveSocketHost,
  payload: unknown,
): Promise<void> {
  await adapter.message(host, JSON.stringify(payload))
}

function createMsg(trainerId: string, code = CODE, passphrase = GOOD) {
  return {
    v: LIVE_PROTOCOL_VERSION,
    kind: "create",
    code,
    trainerId,
    passphrase,
  }
}

function joinMsg(trainerId: string, code = CODE, passphrase = GOOD) {
  return {
    v: LIVE_PROTOCOL_VERSION,
    kind: "join",
    code,
    trainerId,
    passphrase,
  }
}

function readyMsg(trainerId: string, code = CODE) {
  return { v: LIVE_PROTOCOL_VERSION, kind: "ready", code, trainerId }
}

function intentMsg(seq: number) {
  return {
    v: LIVE_PROTOCOL_VERSION,
    kind: "intent",
    seq,
    intent: { doctrine: null, triggers: [] },
  }
}

function errors(host: FakeHost): ErrorMessage[] {
  return host.sent.filter((m): m is ErrorMessage => m.kind === "error")
}

function snapshots(host: FakeHost): SnapshotMessage[] {
  return host.sent.filter((m): m is SnapshotMessage => m.kind === "snapshot")
}

function verdicts(host: FakeHost): VerdictMessage[] {
  return host.sent.filter((m): m is VerdictMessage => m.kind === "verdict")
}

async function seated(
  adapter: LiveAdapter,
): Promise<{ host: FakeHost; guest: FakeHost }> {
  const host = fakeHost()
  const guest = fakeHost()
  await send(adapter, host, createMsg("host"))
  await send(adapter, guest, joinMsg("guest"))
  await send(adapter, host, readyMsg("host"))
  await send(adapter, guest, readyMsg("guest"))
  return { host, guest }
}

describe("live WebSocket route", () => {
  test("create opens a room; bad claims do not echo the secret", async () => {
    const { adapter } = setup()
    const host = fakeHost()

    await send(adapter, host, createMsg("host", CODE, BAD))
    expect(errors(host).map((e) => e.code)).toEqual([
      LIVE_ERROR_CODES.badPassphrase,
    ])

    await send(adapter, host, createMsg("host"))
    expect(errors(host)).toHaveLength(1)
    expect(JSON.stringify(host.sent)).not.toContain(GOOD)
    expect(JSON.stringify(host.sent)).not.toContain(BAD)
  })

  test("join seats one guest; third and bad claims are rejected", async () => {
    const { adapter } = setup()
    const host = fakeHost()
    const guest = fakeHost()
    const third = fakeHost()
    await send(adapter, host, createMsg("host"))

    await send(adapter, guest, joinMsg("guest", CODE, BAD))
    expect(errors(guest).map((e) => e.code)).toEqual([
      LIVE_ERROR_CODES.badPassphrase,
    ])

    await send(adapter, guest, joinMsg("guest"))
    expect(errors(guest)).toHaveLength(1)

    await send(adapter, third, joinMsg("third"))
    expect(errors(third).map((e) => e.code)).toEqual([
      LIVE_ERROR_CODES.roomFull,
    ])
  })

  test("ready needs both seats, then streams dense snapshots", async () => {
    const { adapter, clock } = setup()
    const host = fakeHost()
    const guest = fakeHost()
    await send(adapter, host, createMsg("host"))
    await send(adapter, guest, joinMsg("guest"))

    await send(adapter, host, readyMsg("host"))
    expect(snapshots(host)).toHaveLength(0)
    expect(verdicts(host)).toHaveLength(0)

    await send(adapter, guest, readyMsg("guest"))
    expect(errors(host)).toEqual([])
    // Match start emits the step-0 bootstrap frame on its own; without it the
    // browser client never starts its intent timer.
    expect(snapshots(host)).toHaveLength(1)
    expect(snapshots(host)[0]?.step).toBe(0)

    clock.set(50)
    await send(adapter, host, intentMsg(0))
    expect(snapshots(host)).toHaveLength(2)
    expect(snapshots(guest)).toEqual(snapshots(host))
    expect(snapshots(host)[0]?.code).toBe(CODE)

    await send(adapter, host, readyMsg("host"))
    expect(errors(host).map((e) => e.code)).toEqual([LIVE_ERROR_CODES.notReady])
  })

  test("one dense stream ends in exactly one verdict", async () => {
    const { adapter, clock } = setup()
    const { host, guest } = await seated(adapter)

    clock.set(40000)
    await send(adapter, host, intentMsg(0))

    expect(snapshots(host).length).toBeGreaterThan(0)
    expect(verdicts(host)).toHaveLength(1)
    expect(verdicts(guest)).toEqual(verdicts(host))
    const reason = verdicts(host)[0]?.reason
    expect(reason).toBeDefined()
    if (reason === undefined) return
    expect(["ko", "double_ko", "time"]).toContain(reason)
    expect(verdicts(host)[0]?.code).toBe(CODE)

    await send(adapter, guest, intentMsg(0))
    expect(errors(guest).map((e) => e.code)).toEqual([
      LIVE_ERROR_CODES.matchOver,
    ])
    expect(verdicts(host)).toHaveLength(1)
  })

  test("a stale order is rejected and advances nothing", async () => {
    const { adapter, clock } = setup()
    const { host } = await seated(adapter)

    clock.set(50)
    await send(adapter, host, intentMsg(0))
    expect(snapshots(host)).toHaveLength(2)

    clock.set(100)
    await send(adapter, host, intentMsg(0))
    expect(errors(host).map((e) => e.code)).toEqual([
      LIVE_ERROR_CODES.staleIntent,
    ])
    expect(snapshots(host)).toHaveLength(3)
    expect(verdicts(host)).toHaveLength(0)
  })

  test("disconnect before ready frees the room code", async () => {
    const { adapter } = setup()
    const host = fakeHost()
    await send(adapter, host, createMsg("host"))

    adapter.close(host)
    expect(errors(host)).toEqual([])

    const again = fakeHost()
    await send(adapter, again, createMsg("host"))
    expect(errors(again)).toEqual([])
  })

  test("mid-match disconnect forfeits once, to the opponent", async () => {
    const { adapter, clock } = setup()
    const { host, guest } = await seated(adapter)
    clock.set(50)
    await send(adapter, host, intentMsg(0))
    expect(snapshots(guest)).toHaveLength(2)

    adapter.close(guest)

    expect(verdicts(host)).toHaveLength(1)
    expect(verdicts(host)[0]?.reason).toBe("forfeit")
    expect(verdicts(host)[0]?.winnerSeat).toBe(0)
    expect(verdicts(guest)).toHaveLength(0)

    await send(adapter, host, intentMsg(1))
    expect(errors(host).map((e) => e.code)).toEqual([
      LIVE_ERROR_CODES.matchOver,
    ])

    const again = fakeHost()
    await send(adapter, again, createMsg("third"))
    expect(errors(again)).toEqual([])
  })

  test("hostile frames get typed errors, never crash", async () => {
    const { adapter } = setup()
    const host = fakeHost()

    await adapter.message(host, "{")
    expect(errors(host).at(-1)?.code).toBe(LIVE_ERROR_CODES.malformed)

    await send(adapter, host, { v: LIVE_PROTOCOL_VERSION, kind: "nope" })
    expect(errors(host).at(-1)?.code).toBe(LIVE_ERROR_CODES.unknownKind)

    await send(adapter, host, { v: 99, kind: "create" })
    expect(errors(host).at(-1)?.code).toBe(LIVE_ERROR_CODES.badVersion)

    await adapter.message(host, "x".repeat(17 * 1024))
    expect(errors(host).at(-1)?.code).toBe(LIVE_ERROR_CODES.oversized)

    await send(adapter, host, {
      v: LIVE_PROTOCOL_VERSION,
      kind: "intent",
      seq: 0,
      intent: { doctrine: "not-a-doctrine", triggers: [] },
    })
    expect(errors(host).at(-1)?.code).toBe(LIVE_ERROR_CODES.badIntent)

    // A server-kind frame echoed by a client is syntactically valid, but not a
    // client message: it is rejected by the route rather than changing state.
    await send(adapter, host, {
      v: LIVE_PROTOCOL_VERSION,
      kind: "snapshot",
      code: CODE,
      step: 0,
      elapsedMs: 0,
      stream: {
        steps: 0,
        stepMs: 20,
        bounds: {},
        keys: ["a", "b"],
        data: { length: 0 },
      },
    })
    expect(errors(host).at(-1)?.code).toBe(LIVE_ERROR_CODES.malformed)

    // A decoded object takes the same path as a wire string, and the server is
    // still usable after all the rejections.
    const before = errors(host).length
    await adapter.message(host, createMsg("host"))
    expect(errors(host)).toHaveLength(before)
    expect(snapshots(host)).toHaveLength(0)
  })

  test("real passphrases authenticate without leaking", async () => {
    const db = openDatabase(":memory:")
    const hostTrainer = createTrainer(db)
    const guestTrainer = createTrainer(db)
    await replacePassphrase(db, hostTrainer.id, GOOD)
    await replacePassphrase(db, guestTrainer.id, GOOD)

    const adapter = createLiveAdapter({ authenticate: dbAuthenticate(db) })
    const host = fakeHost()
    const guest = fakeHost()

    await send(adapter, host, createMsg(hostTrainer.id, CODE, BAD))
    expect(errors(host).map((e) => e.code)).toEqual([
      LIVE_ERROR_CODES.badPassphrase,
    ])

    await send(adapter, host, createMsg(hostTrainer.id))
    await send(adapter, guest, joinMsg(guestTrainer.id))
    expect(errors(host)).toHaveLength(1)
    expect(errors(guest)).toEqual([])
    expect(JSON.stringify([...host.sent, ...guest.sent])).not.toContain(GOOD)
  })

  test("same code and clock give identical streams", async () => {
    const a = setup()
    const b = setup()
    const pairA = await seated(a.adapter)
    const pairB = await seated(b.adapter)

    a.clock.set(50)
    b.clock.set(50)
    await send(a.adapter, pairA.host, intentMsg(0))
    await send(b.adapter, pairB.host, intentMsg(0))

    expect(snapshots(pairA.host)).toEqual(snapshots(pairB.host))
    expect(verdicts(pairA.host)).toEqual(verdicts(pairB.host))
  })

  test("injectable app registers /live, keeps /health", async () => {
    const app = createApp({ db: openDatabase(":memory:") })
    const wsRoute = app.routes.find(
      (route) => route.path === "/live" && route.method === "WS",
    )

    expect(wsRoute).toBeDefined()
    expect(typeof wsRoute?.handler).toBe("function")

    const response = await app.handle(new Request("http://localhost/health"))
    expect(response.status).toBe(200)
  })
})
