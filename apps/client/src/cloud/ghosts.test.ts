/**
 * Ghost sync alongside the save push (FR-2, FR-6, AC-2, AC-6, NFR-5).
 *
 * A cup-winning bundle queues beside the save and rides the next push,
 * fire-and-forget and quiet; the board loader serves the last snapshot when
 * the cloud is out of reach. The clock is injected, seeds are fixed, and no
 * test touches a real timer.
 */
import { describe, expect, test } from "bun:test"
import { createMemoryAdapter, type SaveAdapter } from "@apex/sim"
import type { CloudApi, GhostBoardPayload } from "./api"
import { writeCredentials } from "./credentials"
import {
  createGhostBoardLoader,
  createGhostSubmitter,
  GHOST_PENDING_KEY,
  GHOST_SNAPSHOT_KEY,
  readGhostSnapshot,
} from "./ghosts"
import { createCloudSync } from "./sync"

const TRAINER = { id: "trn_ghost", name: "Ana", passphrase: "kestrel-42" }

const GHOST_A = {
  simVersion: 1,
  seed: 17,
  day: 2,
  round: 1,
  player: { name: "Ana", kit: ["ember"], stats: { hp: 30 } },
  rival: { name: "Rook", kit: ["frost"], stats: { hp: 28 } },
  winner: "player",
  events: [{ tick: 0, kind: "hit", actor: "player", hpAfter: 20 }],
}

const GHOST_B = {
  simVersion: 1,
  seed: 101,
  day: 3,
  round: 2,
  player: { name: "Ana", kit: ["ember", "guard"], stats: { hp: 32 } },
  rival: { name: "Moss", kit: ["vine"], stats: { hp: 26 } },
  winner: "player",
  events: [{ tick: 0, kind: "hit", actor: "rival", hpAfter: 18 }],
}

function entry(
  over: Partial<{
    rank: number
    trainerId: string
    name: string
    updatedAt: number
    ghost: unknown
  }> = {},
) {
  return {
    rank: 1,
    trainerId: "trn_ghost",
    name: "Ana",
    updatedAt: 99,
    ghost: GHOST_A,
    ...over,
  }
}

/** Let fire-and-forget submits answer: the pending clears a tick later. */
async function settle(): Promise<void> {
  for (let hop = 0; hop < 5; hop++) await Promise.resolve()
}

describe("the ghost submitter", () => {
  test("a queued ghost submits with the trainer's name, then clears (AC-2)", async () => {
    const storage = createMemoryAdapter()
    writeCredentials(storage, TRAINER)
    const sent: Array<{ id: string; ghost: unknown; name: string }> = []
    const api = {
      submitGhost: async (
        id: string,
        _pw: string,
        ghost: unknown,
        name: string,
      ) => {
        sent.push({ id, ghost, name })
        return {
          ok: true as const,
          value: {
            stored: true,
            entry: {
              name,
              payload: JSON.stringify(ghost),
              updatedAt: 7,
            },
          },
        }
      },
    }
    const submitter = createGhostSubmitter({
      api,
      storage,
      credentials: () => TRAINER,
    })
    submitter.queueGhost(GHOST_A)
    expect(storage.getItem(GHOST_PENDING_KEY)).not.toBeNull()
    submitter.submitPending()
    await settle()
    expect(sent).toHaveLength(1)
    expect(sent[0]).toMatchObject({
      id: TRAINER.id,
      name: TRAINER.name,
      ghost: GHOST_A,
    })
    expect(storage.getItem(GHOST_PENDING_KEY)).toBeNull()
  })

  test("an offline submit keeps the pending bundle for the next push (NFR-5)", async () => {
    const storage = createMemoryAdapter()
    const api = {
      submitGhost: async () => ({
        ok: false as const,
        reason: "offline" as const,
      }),
    }
    const submitter = createGhostSubmitter({
      api,
      storage,
      credentials: () => TRAINER,
    })
    submitter.queueGhost(GHOST_A)
    submitter.submitPending()
    await settle()
    expect(storage.getItem(GHOST_PENDING_KEY)).not.toBeNull()
    let calls = 0
    const retrying = createGhostSubmitter({
      api: {
        submitGhost: async () => {
          calls++
          return {
            ok: true as const,
            value: {
              stored: true,
              entry: { name: "Ana", payload: "{}", updatedAt: 8 },
            },
          }
        },
      },
      storage,
      credentials: () => TRAINER,
    })
    retrying.submitPending()
    await settle()
    expect(calls).toBe(1)
    expect(storage.getItem(GHOST_PENDING_KEY)).toBeNull()
  })

  test("a rejected bundle never throws and stays queued for a rename (FR-2)", async () => {
    const storage = createMemoryAdapter()
    const api = {
      submitGhost: async () => ({
        ok: false as const,
        reason: "rejected" as const,
        error: "ghost_too_large",
      }),
    }
    const submitter = createGhostSubmitter({
      api,
      storage,
      credentials: () => TRAINER,
    })
    submitter.queueGhost(GHOST_A)
    let threw = false
    try {
      submitter.submitPending()
      await settle()
    } catch {
      threw = true
    }
    expect(threw).toBe(false)
    expect(storage.getItem(GHOST_PENDING_KEY)).not.toBeNull()
  })

  test("a corrupt pending entry drops quietly", async () => {
    const storage = createMemoryAdapter()
    storage.setItem(GHOST_PENDING_KEY, "{oops")
    let calls = 0
    const submitter = createGhostSubmitter({
      api: {
        submitGhost: async () => {
          calls++
          return {
            ok: true as const,
            value: {
              stored: true,
              entry: { name: "Ana", payload: "{}", updatedAt: 1 },
            },
          }
        },
      },
      storage,
      credentials: () => TRAINER,
    })
    submitter.submitPending()
    await settle()
    expect(calls).toBe(0)
    expect(storage.getItem(GHOST_PENDING_KEY)).toBeNull()
  })

  test("signed out never sends, and the bundle waits (NFR-5)", async () => {
    const storage = createMemoryAdapter()
    let calls = 0
    const submitter = createGhostSubmitter({
      api: {
        submitGhost: async () => {
          calls++
          return {
            ok: true as const,
            value: {
              stored: true,
              entry: { name: "Ana", payload: "{}", updatedAt: 1 },
            },
          }
        },
      },
      storage,
      credentials: () => null,
    })
    submitter.queueGhost(GHOST_A)
    submitter.submitPending()
    await settle()
    expect(calls).toBe(0)
    expect(storage.getItem(GHOST_PENDING_KEY)).not.toBeNull()
  })

  test("a quota refusal on queue never throws", () => {
    const local = createMemoryAdapter()
    const storage: SaveAdapter = {
      ...local,
      setItem: () => {
        throw new Error("quota")
      },
    }
    const submitter = createGhostSubmitter({
      api: {
        submitGhost: async () => ({
          ok: true as const,
          value: {
            stored: true,
            entry: { name: "Ana", payload: "{}", updatedAt: 1 },
          },
        }),
      },
      storage,
      credentials: () => TRAINER,
    })
    expect(() => submitter.queueGhost(GHOST_A)).not.toThrow()
  })
})

describe("the ghost board loader", () => {
  test("a live board returns live rows and refreshes the snapshot (FR-6)", async () => {
    const storage = createMemoryAdapter()
    const loader = createGhostBoardLoader({
      api: {
        readGhosts: async () => ({
          ok: true as const,
          value: {
            entries: [
              entry(),
              entry({
                rank: 2,
                trainerId: "trn_b",
                name: "Rook",
                ghost: GHOST_B,
              }),
            ],
          },
        }),
      },
      storage,
      now: () => 99,
    })
    const loaded = await loader.load()
    expect(loaded.kind).toBe("live")
    if (loaded.kind !== "live") throw new Error("unreachable")
    expect(loaded.entries).toHaveLength(2)
    expect(loaded.entries[0]).toMatchObject({ rank: 1, trainerId: "trn_ghost" })
    const snapshot = readGhostSnapshot(storage)
    expect(snapshot?.entries).toHaveLength(2)
    expect(snapshot?.fetchedAt).toBe(99)
  })

  test("offline serves the whole snapshot with its stamp (AC-6)", async () => {
    const storage = createMemoryAdapter()
    const live = createGhostBoardLoader({
      api: {
        readGhosts: async () => ({
          ok: true as const,
          value: { entries: [entry()] },
        }),
      },
      storage,
      now: () => 1,
    })
    expect((await live.load()).kind).toBe("live")
    const offline = createGhostBoardLoader({
      api: {
        readGhosts: async () => ({
          ok: false as const,
          reason: "offline" as const,
        }),
      },
      storage,
      now: () => 50,
    })
    const loaded = await offline.load()
    expect(loaded.kind).toBe("snapshot")
    if (loaded.kind !== "snapshot") throw new Error("unreachable")
    expect(loaded.entries).toHaveLength(1)
    expect(readGhostSnapshot(storage)?.fetchedAt).toBe(1)
  })

  test("no snapshot and offline is unavailable, never a throw (NFR-5)", async () => {
    const loader = createGhostBoardLoader({
      api: {
        readGhosts: async () => ({
          ok: false as const,
          reason: "offline" as const,
        }),
      },
      storage: createMemoryAdapter(),
      now: () => 3,
    })
    const loaded = await loader.load()
    expect(loaded).toEqual({ kind: "unavailable" })
  })

  test("malformed rows drop, a malformed body falls back whole", async () => {
    const storage = createMemoryAdapter()
    const primed = createGhostBoardLoader({
      api: {
        readGhosts: async () => ({
          ok: true as const,
          value: { entries: [entry()] },
        }),
      },
      storage,
      now: () => 4,
    })
    await primed.load()
    const badRows = createGhostBoardLoader({
      api: {
        readGhosts: async () => ({
          ok: true as const,
          value: {
            entries: [
              entry(),
              { rank: -1, trainerId: "", name: "", updatedAt: 0, ghost: null },
              {
                rank: "1",
                trainerId: "trn_x",
                name: "X",
                updatedAt: 5,
                ghost: GHOST_B,
              },
            ],
          } as unknown as GhostBoardPayload,
        }),
      },
      storage,
      now: () => 5,
    })
    const filtered = await badRows.load()
    expect(filtered.kind).toBe("live")
    if (filtered.kind !== "live") throw new Error("unreachable")
    expect(filtered.entries).toHaveLength(1)
    const badBody = createGhostBoardLoader({
      api: {
        readGhosts: async () => ({
          ok: true as const,
          value: { entries: "nobody yet" } as unknown as GhostBoardPayload,
        }),
      },
      storage,
      now: () => 6,
    })
    const fallen = await badBody.load()
    expect(fallen.kind).toBe("snapshot")
    if (fallen.kind !== "snapshot") throw new Error("unreachable")
    expect(fallen.entries).toHaveLength(1)
  })

  test("an empty board is live with no rows, not an error", async () => {
    const storage = createMemoryAdapter()
    const loader = createGhostBoardLoader({
      api: {
        readGhosts: async () => ({ ok: true as const, value: { entries: [] } }),
      },
      storage,
      now: () => 11,
    })
    const loaded = await loader.load()
    expect(loaded).toEqual({ kind: "live", entries: [] })
    expect(readGhostSnapshot(storage)?.entries).toEqual([])
  })

  test("an unwritable snapshot never fails the board, and the stamp stays", async () => {
    const local = createMemoryAdapter()
    const loader = createGhostBoardLoader({
      api: {
        readGhosts: async () => ({
          ok: true as const,
          value: { entries: [entry()] },
        }),
      },
      storage: {
        ...local,
        setItem: () => {
          throw new Error("quota")
        },
      },
      now: () => 12,
    })
    const loaded = await loader.load()
    expect(loaded.kind).toBe("live")
    local.setItem(
      GHOST_SNAPSHOT_KEY,
      JSON.stringify({ entries: [entry()], fetchedAt: 2 }),
    )
    const throwing: SaveAdapter = {
      ...local,
      setItem: () => {
        throw new Error("quota")
      },
    }
    const offline = createGhostBoardLoader({
      api: {
        readGhosts: async () => ({
          ok: false as const,
          reason: "offline" as const,
        }),
      },
      storage: throwing,
      now: () => 13,
    })
    const fallen = await offline.load()
    expect(fallen.kind).toBe("snapshot")
    expect(readGhostSnapshot(local)?.fetchedAt).toBe(2)
  })

  test("a corrupt snapshot reads as absent", async () => {
    const storage = createMemoryAdapter()
    storage.setItem(GHOST_SNAPSHOT_KEY, "{oops")
    const loader = createGhostBoardLoader({
      api: {
        readGhosts: async () => ({
          ok: false as const,
          reason: "offline" as const,
        }),
      },
      storage,
      now: () => 1,
    })
    expect(await loader.load()).toEqual({ kind: "unavailable" })
  })

  test("shared display names both list, server order verbatim", async () => {
    const storage = createMemoryAdapter()
    const loader = createGhostBoardLoader({
      api: {
        readGhosts: async () => ({
          ok: true as const,
          value: {
            entries: [
              entry({
                rank: 1,
                trainerId: "trn_a",
                name: "Sam",
                updatedAt: 10,
              }),
              entry({
                rank: 2,
                trainerId: "trn_b",
                name: "Sam",
                updatedAt: 20,
              }),
            ],
          },
        }),
      },
      storage,
      now: () => 21,
    })
    const loaded = await loader.load()
    expect(loaded.kind).toBe("live")
    if (loaded.kind !== "live") throw new Error("unreachable")
    expect(loaded.entries.map((row) => row.trainerId)).toEqual([
      "trn_a",
      "trn_b",
    ])
  })
})

describe("ghost sync alongside the save push", () => {
  function manualClock() {
    let at = 0
    let nextId = 1
    const timers = new Map<number, { due: number; fn: () => void }>()
    return {
      now: () => at,
      schedule: (fn: () => void, ms: number): number => {
        const id = nextId++
        timers.set(id, { due: at + ms, fn })
        return id
      },
      cancel: (handle: unknown): void => {
        timers.delete(handle as number)
      },
      advance(ms: number): void {
        at += ms
        for (const [id, timer] of [...timers]) {
          if (timer.due > at) continue
          timers.delete(id)
          timer.fn()
        }
      },
    }
  }

  function ghostApi(calls: string[]) {
    const api: CloudApi = {
      createTrainer: async () => ({ ok: true, value: { id: "trn_new" } }),
      getTrainer: async (id) => ({
        ok: true,
        value: { id, name: "Ana", hasPassphrase: true },
      }),
      updateTrainer: async (id, body) => ({
        ok: true,
        value: { id, name: body.name ?? "", hasPassphrase: true },
      }),
      pull: async () => ({ ok: false, reason: "not-found" }) as const,
      push: async (id) => {
        calls.push(`push:${id}`)
        return {
          ok: true,
          value: { stored: true, winner: "incoming" },
        } as const
      },
      submitScore: async () => ({
        ok: true,
        value: {
          updated: false,
          entry: { category: "cups", value: 0, name: "", updatedAt: 0 },
        },
      }),
      readBoard: async () => ({ ok: false, reason: "offline" }) as const,
      submitGhost: async (id) => {
        calls.push(`ghost:${id}`)
        return {
          ok: true,
          value: {
            stored: true,
            entry: { name: "Ana", payload: "{}", updatedAt: 1 },
          },
        } as const
      },
      readGhost: async (_id) =>
        ({
          ok: false,
          reason: "not-found",
        }) as const,
      readGhosts: async () => ({ ok: false, reason: "offline" }) as const,
    }
    return api
  }

  test("a queued ghost flushes after the save push, in order (AC-2)", async () => {
    const calls: string[] = []
    const api = ghostApi(calls)
    const storage = createMemoryAdapter()
    writeCredentials(storage, TRAINER)
    storage.setItem(
      "apex.save",
      JSON.stringify({ version: 9, state: {}, savedAt: 100, session: null }),
    )
    const clock = manualClock()
    const sync = createCloudSync({
      api,
      storage,
      now: clock.now,
      schedule: clock.schedule,
      cancel: clock.cancel,
      debounceMs: 2000,
      capMs: 10_000,
    })
    sync.queueGhost(GHOST_A)
    sync.noteLocalWrite(
      JSON.stringify({ version: 9, state: {}, savedAt: 100, session: null }),
    )
    clock.advance(2000)
    await settle()
    await settle()
    expect(calls).toEqual([`push:${TRAINER.id}`, `ghost:${TRAINER.id}`])
    expect(storage.getItem(GHOST_PENDING_KEY)).toBeNull()
  })

  test("an offline push keeps the ghost for the next flush", async () => {
    const calls: string[] = []
    let online = false
    const api = ghostApi(calls)
    api.push = (async (id: string) => {
      if (!online) return { ok: false, reason: "offline" } as const
      calls.push(`push:${id}`)
      return { ok: true, value: { stored: true, winner: "incoming" } } as const
    }) as CloudApi["push"]
    api.submitGhost = (async (id: string) => {
      if (!online) return { ok: false, reason: "offline" } as const
      calls.push(`ghost:${id}`)
      return {
        ok: true,
        value: {
          stored: true,
          entry: { name: "Ana", payload: "{}", updatedAt: 1 },
        },
      } as const
    }) as CloudApi["submitGhost"]
    const storage = createMemoryAdapter()
    writeCredentials(storage, TRAINER)
    storage.setItem(
      "apex.save",
      JSON.stringify({ version: 9, state: {}, savedAt: 100, session: null }),
    )
    const clock = manualClock()
    const sync = createCloudSync({
      api,
      storage,
      now: clock.now,
      schedule: clock.schedule,
      cancel: clock.cancel,
      debounceMs: 2000,
      capMs: 10_000,
    })
    sync.queueGhost(GHOST_A)
    sync.noteLocalWrite(
      JSON.stringify({ version: 9, state: {}, savedAt: 100, session: null }),
    )
    clock.advance(2000)
    await settle()
    expect(storage.getItem(GHOST_PENDING_KEY)).not.toBeNull()
    online = true
    sync.noteLocalWrite(
      JSON.stringify({ version: 9, state: {}, savedAt: 101, session: null }),
    )
    clock.advance(2000)
    await settle()
    await settle()
    expect(calls).toEqual([`push:${TRAINER.id}`, `ghost:${TRAINER.id}`])
  })
})
