/**
 * The authoritative loop's contract (FR-3, AC-3, NFR-6): 20 Hz intents drive
 * 50 Hz sim steps and 20 Hz dense-stream snapshots through a fake clock and
 * transport. Same seed + same orders replay byte-for-byte; one verdict ends it.
 */

import { describe, expect, test } from "bun:test"
import {
  type BattleSide,
  type LiveIntent,
  type SnapshotMessage,
  streamOf,
  type VerdictMessage,
} from "@apex/sim"
import { createMatchLoop, type LiveClock, type MatchTransport } from "./loop"
import type { TrainerIdentity } from "./room"

function fakeClock(start = 0): LiveClock & { set(ms: number): void } {
  let now = start
  return { now: () => now, set: (ms: number) => (now = ms) }
}

interface TestTransport extends MatchTransport {
  messages: (SnapshotMessage | VerdictMessage)[]
}

function fakeTransport(): TestTransport {
  const messages: (SnapshotMessage | VerdictMessage)[] = []
  return { messages, send: (message) => messages.push(message) }
}

function side(name: string, id: string): BattleSide {
  return {
    name,
    id,
    element: "fire",
    stats: { hp: 80, atk: 10, def: 8, spd: 10 },
    kit: ["basic", "spark", "flare_dart"],
    tactic: "balanced",
    temperament: "rush",
  }
}

const IDENTITIES: readonly [TrainerIdentity, TrainerIdentity] = [
  { trainerId: "host", name: "Ember" },
  { trainerId: "guest", name: "Brook" },
]

const ORDER: LiveIntent = { doctrine: null, triggers: [] }

function setup(seed = 12345) {
  const clock = fakeClock()
  const transport = fakeTransport()
  const game = createMatchLoop({
    code: "APEX19",
    seed,
    sides: [side("Ember", "host"), side("Brook", "guest")],
    identities: IDENTITIES,
    clock,
    transport,
  })
  return { clock, transport, game }
}

function snapshots(transport: TestTransport): SnapshotMessage[] {
  return transport.messages.filter(
    (message): message is SnapshotMessage => message.kind === "snapshot",
  )
}

function verdicts(transport: TestTransport): VerdictMessage[] {
  return transport.messages.filter(
    (message): message is VerdictMessage => message.kind === "verdict",
  )
}

describe("authoritative loop cadence", () => {
  test("50 ms advances two 20 ms sim steps and emits one snapshot", () => {
    const { clock, transport, game } = setup()
    clock.set(50)
    game.pump()

    expect(game.stepCount).toBe(2)
    const frames = snapshots(transport)
    expect(frames).toHaveLength(1)
    expect(frames[0]?.step).toBe(2)
    expect(frames[0]?.elapsedMs).toBe(40)
    expect(frames[0]?.stream.steps).toBe(1)
    expect(frames[0]?.v).toBe(1)
  })

  test("100 ms emits two snapshots at the 20 Hz cadence", () => {
    const { clock, transport, game } = setup()
    clock.set(100)
    game.pump()

    expect(game.stepCount).toBe(5)
    expect(snapshots(transport)).toHaveLength(2)
  })

  test("one second is 50 sim steps and 20 snapshots", () => {
    const { clock, transport, game } = setup()
    clock.set(1000)
    game.pump()

    expect(game.stepCount).toBe(50)
    expect(snapshots(transport)).toHaveLength(20)
  })
})

describe("intent hygiene", () => {
  test("stale and out-of-order sequences are counted and ignored", () => {
    const { clock, game } = setup()
    expect(game.intent(0, 5, ORDER)).toBe(true)
    expect(game.intent(0, 5, ORDER)).toBe(false)
    expect(game.intent(0, 3, ORDER)).toBe(false)
    expect(game.staleIntents).toBe(2)
    // A malformed sequence is refused without counting as a stale replay.
    expect(game.intent(0, -1, ORDER)).toBe(false)
    expect(game.staleIntents).toBe(2)

    clock.set(50)
    game.pump()
    expect(game.stepCount).toBe(2)
  })

  test("each seat has its own sequence counter", () => {
    const { game } = setup()
    expect(game.intent(0, 1, ORDER)).toBe(true)
    expect(game.intent(1, 1, ORDER)).toBe(true)
    expect(game.staleIntents).toBe(0)
  })

  test("pumping twice at the same time never double-steps", () => {
    const { clock, transport, game } = setup()
    clock.set(80)
    game.pump()
    const stepped = game.stepCount
    const emitted = transport.messages.length
    game.pump()

    expect(game.stepCount).toBe(stepped)
    expect(transport.messages.length).toBe(emitted)
  })
})

describe("terminal verdict", () => {
  test("the fight cap produces exactly one verdict with a dense trace", () => {
    const { clock, transport, game } = setup()
    clock.set(40_000)
    game.pump()

    const terminal = verdicts(transport)
    expect(terminal).toHaveLength(1)
    expect(game.verdictCount).toBe(1)
    expect(game.finished).toBe(true)
    const reason = terminal[0]?.reason
    if (!reason) throw new Error("the verdict has no reason")
    expect(["ko", "double_ko", "time"]).toContain(reason)
    const result = terminal[0]?.result
    if (!result) throw new Error("a normal verdict must carry the result")
    expect(streamOf(result)).toBeDefined()
  })

  test("a forfeit gives the opponent the win and freezes the loop", () => {
    const { clock, transport, game } = setup()
    game.forfeit(0)

    const terminal = verdicts(transport)
    expect(terminal).toHaveLength(1)
    expect(terminal[0]?.reason).toBe("forfeit")
    expect(terminal[0]?.winnerSeat).toBe(1)
    expect(terminal[0]?.result).toBeNull()

    game.forfeit(1)
    clock.set(1000)
    game.pump()
    expect(verdicts(transport)).toHaveLength(1)
    expect(transport.messages).toHaveLength(1)
    expect(game.finished).toBe(true)
  })
})

describe("determinism", () => {
  test("same seed and same intents replay byte-for-byte", () => {
    function run(seed: number): number[] {
      const { clock, transport, game } = setup(seed)
      game.intent(0, 1, ORDER)
      clock.set(500)
      game.pump()
      const frame = snapshots(transport)[0]
      if (!frame) throw new Error("no snapshot was emitted")
      return Array.from(frame.stream.data)
    }

    expect(run(7)).toEqual(run(7))
    expect(run(7)).not.toEqual(run(8))
  })
})
