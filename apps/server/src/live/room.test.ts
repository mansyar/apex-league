/**
 * The room machine's contract (FR-2, AC-2): rooms are created by code, seat
 * exactly two authenticated trainers, start one match, and tear down cleanly
 * on disconnect with a forfeit when a match is live. No clock, no I/O — the
 * authenticator is injected and every operation is deterministic.
 */

import { describe, expect, test } from "bun:test"
import {
  type Claim,
  createRoomRegistry,
  seedForCode,
  type TrainerIdentity,
} from "./room"

const GOOD = "correct horse battery"
const HOST: Claim = { trainerId: "host", passphrase: GOOD }
const GUEST: Claim = { trainerId: "guest", passphrase: GOOD }
const NAMES: Readonly<Record<string, string>> = {
  host: "Ember",
  guest: "Brook",
  third: "Cinder",
}

function registry() {
  return createRoomRegistry({
    authenticate: async (
      claim: Claim,
    ): Promise<TrainerIdentity | undefined> => {
      if (claim.passphrase !== GOOD) return undefined
      const name = NAMES[claim.trainerId]
      return name ? { trainerId: claim.trainerId, name } : undefined
    },
  })
}

describe("room creation", () => {
  test("creates a waiting room by code with the host seated", async () => {
    const rooms = registry()
    const outcome = await rooms.create("APEX19", HOST)

    expect(outcome.ok).toBe(true)
    if (outcome.ok) {
      expect(outcome.room.code).toBe("APEX19")
      expect(outcome.room.phase).toBe("waiting")
      expect(outcome.room.seats.map((s) => s.trainerId)).toEqual(["host"])
      expect(outcome.room.seats[0]?.seat).toBe(0)
      expect(outcome.room.seats[0]?.ready).toBe(false)
    }
    expect(rooms.get("APEX19")?.code).toBe("APEX19")
    expect(rooms.codes()).toEqual(["APEX19"])
  })

  test("rejects a duplicate code and a malformed one", async () => {
    const rooms = registry()
    await rooms.create("APEX19", HOST)

    const duplicate = await rooms.create("APEX19", GUEST)
    expect(duplicate.ok).toBe(false)
    if (!duplicate.ok) expect(duplicate.reason).toBe("duplicate_code")

    const badCode = await rooms.create("abc", GUEST)
    expect(badCode.ok).toBe(false)
    if (!badCode.ok) expect(badCode.reason).toBe("bad_code")
  })

  test("denies a bad passphrase before the room is created", async () => {
    const rooms = registry()
    const outcome = await rooms.create("APEX19", {
      trainerId: "host",
      passphrase: "wrong passphrase",
    })

    expect(outcome.ok).toBe(false)
    if (!outcome.ok) expect(outcome.reason).toBe("bad_passphrase")
    expect(rooms.get("APEX19")).toBeUndefined()
    expect(rooms.codes()).toEqual([])
  })

  test("the seed is a stable pure function of the code", () => {
    expect(seedForCode("APEX19")).toBe(seedForCode("APEX19"))
    expect(seedForCode("APEX19")).not.toBe(seedForCode("APEX20"))
  })
})

describe("joining and readiness", () => {
  async function twoSeatRoom() {
    const rooms = registry()
    await rooms.create("APEX19", HOST)
    await rooms.join("APEX19", GUEST)
    return rooms
  }

  test("joins exactly two authenticated trainers into seats 0 and 1", async () => {
    const rooms = registry()
    await rooms.create("APEX19", HOST)
    const joined = await rooms.join("APEX19", GUEST)

    expect(joined.ok).toBe(true)
    if (joined.ok) {
      expect(joined.seat).toBe(1)
      expect(joined.room.seats.map((s) => s.trainerId)).toEqual([
        "host",
        "guest",
      ])
      expect(joined.room.seats[1]?.name).toBe("Brook")
    }
  })

  test("rejects a third joiner, a duplicate trainer, and a bad passphrase", async () => {
    const rooms = await twoSeatRoom()

    const third = await rooms.join("APEX19", {
      trainerId: "third",
      passphrase: GOOD,
    })
    expect(third.ok).toBe(false)
    if (!third.ok) expect(third.reason).toBe("room_full")

    const duplicate = await rooms.join("APEX19", HOST)
    expect(duplicate.ok).toBe(false)
    if (!duplicate.ok) expect(duplicate.reason).toBe("duplicate_join")

    expect(rooms.get("APEX19")?.seats).toHaveLength(2)

    const open = registry()
    await open.create("OPEN19", HOST)
    const badPass = await open.join("OPEN19", {
      trainerId: "guest",
      passphrase: "nope nope nope",
    })
    expect(badPass.ok).toBe(false)
    if (!badPass.ok) expect(badPass.reason).toBe("bad_passphrase")
    expect(open.get("OPEN19")?.seats).toHaveLength(1)
  })

  test("a join to a missing room is rejected", async () => {
    const outcome = await registry().join("NOPE", GUEST)
    expect(outcome.ok).toBe(false)
    if (!outcome.ok) expect(outcome.reason).toBe("room_not_found")
  })

  test("a host disconnect before ready frees seat 0 for the next joiner", async () => {
    const rooms = registry()
    await rooms.create("APEX19", HOST)
    await rooms.join("APEX19", GUEST)
    rooms.disconnect("APEX19", "host")

    const third = await rooms.join("APEX19", {
      trainerId: "third",
      passphrase: GOOD,
    })
    expect(third.ok).toBe(true)
    if (!third.ok) return
    expect(third.seat).toBe(0)

    // The freed seat 0 is appended, so room seats stay in insertion order:
    // guest still holds seat 1, the third trainer was seated into seat 0.
    expect(third.room.seats.map((s) => s.seat)).toEqual([1, 0])
    expect(third.room.seats.map((s) => s.trainerId)).toEqual(["guest", "third"])

    // Both remaining seats keep their own sequence: each can ready and
    // together they start exactly one match. Identities are seat-index order
    // (seat 0 first), never insertion order — sides/intents index by seat.
    expect(rooms.ready("APEX19", "guest").ok).toBe(true)
    const started = rooms.ready("APEX19", "third")
    expect(started.ok).toBe(true)
    if (started.ok) {
      expect(started.start?.identities.map((i) => i.trainerId)).toEqual([
        "third",
        "guest",
      ])
    }
  })

  test("both ready starts exactly one match, with a fixed seed and identities", async () => {
    const rooms = await twoSeatRoom()
    expect(rooms.ready("APEX19", "guest").ok).toBe(true)
    if (rooms.get("APEX19")?.phase !== "waiting") {
      throw new Error("one ready must not start the match")
    }

    const started = rooms.ready("APEX19", "host")
    expect(started.ok).toBe(true)
    if (started.ok) {
      expect(started.room.phase).toBe("fighting")
      expect(started.start?.code).toBe("APEX19")
      expect(started.start?.seed).toBe(seedForCode("APEX19"))
      expect(started.start?.identities.map((i) => i.name)).toEqual([
        "Ember",
        "Brook",
      ])
    }
  })

  test("duplicate and post-start ready calls cannot restart the match", async () => {
    const rooms = await twoSeatRoom()
    rooms.ready("APEX19", "host")
    const duplicate = rooms.ready("APEX19", "host")
    expect(duplicate.ok).toBe(false)
    if (!duplicate.ok) expect(duplicate.reason).toBe("already_ready")

    const started = rooms.ready("APEX19", "guest")
    expect(started.ok).toBe(true)
    if (started.ok) expect(started.start).not.toBeNull()

    const afterStart = rooms.ready("APEX19", "host")
    expect(afterStart.ok).toBe(false)
    if (!afterStart.ok) expect(afterStart.reason).toBe("not_waiting")
  })

  test("only seated trainers can ready", async () => {
    const rooms = registry()
    await rooms.create("APEX19", HOST)
    const outcome = rooms.ready("APEX19", "third")
    expect(outcome.ok).toBe(false)
    if (!outcome.ok) expect(outcome.reason).toBe("not_seated")
  })
})

describe("disconnect and teardown", () => {
  test("before both ready, a disconnect removes the seat but keeps the room", async () => {
    const rooms = registry()
    await rooms.create("APEX19", HOST)
    await rooms.join("APEX19", GUEST)

    const outcome = rooms.disconnect("APEX19", "guest")
    expect(outcome.ok).toBe(true)
    if (outcome.ok) {
      expect(outcome.forfeitWinner).toBeNull()
      expect(outcome.room?.seats.map((s) => s.trainerId)).toEqual(["host"])
    }
    expect(rooms.get("APEX19")?.code).toBe("APEX19")
  })

  test("the last seat leaving deletes the room and releases its code", async () => {
    const rooms = registry()
    await rooms.create("APEX19", HOST)

    const outcome = rooms.disconnect("APEX19", "host")
    expect(outcome.ok).toBe(true)
    if (outcome.ok) expect(outcome.room).toBeNull()
    expect(rooms.get("APEX19")).toBeUndefined()
    expect(rooms.codes()).toEqual([])

    const recreated = await rooms.create("APEX19", GUEST)
    expect(recreated.ok).toBe(true)
  })

  test("mid-match disconnect forfeits to the opponent and tears down", async () => {
    const rooms = registry()
    await rooms.create("APEX19", HOST)
    await rooms.join("APEX19", GUEST)
    rooms.ready("APEX19", "host")
    rooms.ready("APEX19", "guest")

    const outcome = rooms.disconnect("APEX19", "guest")
    expect(outcome.ok).toBe(true)
    if (outcome.ok) {
      expect(outcome.forfeitWinner).toBe(0)
      expect(outcome.room).toBeNull()
    }
    expect(rooms.get("APEX19")).toBeUndefined()
    expect(rooms.codes()).toEqual([])
  })

  test("disconnecting a non-seat or missing room is rejected without a forfeit", async () => {
    const rooms = registry()
    await rooms.create("APEX19", HOST)

    const stranger = rooms.disconnect("APEX19", "third")
    expect(stranger.ok).toBe(false)
    if (!stranger.ok) expect(stranger.reason).toBe("not_seated")

    const missing = rooms.disconnect("NOPE", "host")
    expect(missing.ok).toBe(false)
    if (!missing.ok) expect(missing.reason).toBe("room_not_found")
  })
})
