/**
 * The composition seam (FR-5, FR-8, FR-11, AC-5, AC-8, AC-11, NFR-2,
 * NFR-6): `createCloudSave` is the one place the client decides whether a
 * cloud exists at all, and the store it feeds is the real store — so these
 * tests prove the day still completes while the api is down or unset.
 */
import { describe, expect, test } from "bun:test"
import {
  advanceDay,
  chooseStarter,
  createInitialState,
  createMemoryAdapter,
  type GameState,
  SAVE_KEY,
  SAVE_VERSION,
  type SaveAdapter,
  saveGame,
  serializeSave,
} from "@apex/sim"
import { createGameStore } from "../store"
import type { FetchLike } from "./api"
import { createCloudSave } from "./cloud-save"
import { writeCredentials } from "./credentials"

const TRAINER = { id: "trn_abc", name: "Ana", passphrase: "kestrel-42" }

function stateOn(day: number): GameState {
  let state = chooseStarter(createInitialState(), "fire_drake", 42)
  while (state.day < day) state = advanceDay(state)
  return state
}

function clock() {
  let at = 1000
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

interface Request {
  method: string
  url: string
  body: string
}

/** A fetch double: records every request and answers through `answer`. */
function fakeFetch(answer: (request: Request) => Promise<Response>): {
  fetch: FetchLike
  requests: Request[]
} {
  const requests: Request[] = []
  return {
    requests,
    fetch: async (url, init) => {
      const request: Request = {
        method: init?.method ?? "GET",
        url,
        body: String(init?.body ?? ""),
      }
      requests.push(request)
      return answer(request)
    },
  }
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })
}

function localSave(state: GameState, savedAt: number): SaveAdapter {
  const storage = createMemoryAdapter()
  saveGame(storage, state, savedAt, null)
  return storage
}

function mount(options: {
  origin: string | undefined
  storage: SaveAdapter
  fetch: FetchLike
  clock: ReturnType<typeof clock>
}) {
  const cloud = createCloudSave({
    origin: options.origin,
    local: options.storage,
    now: options.clock.now,
    schedule: options.clock.schedule,
    cancel: options.clock.cancel,
    fetch: options.fetch,
    signal: () => undefined,
  })
  const store = createGameStore(stateOn(1), cloud?.adapter ?? options.storage, {
    now: options.clock.now,
  })
  return { cloud, store }
}

describe("the cloud save seam", () => {
  test("no origin means no cloud object and zero requests (AC-11, NFR-6)", async () => {
    const { fetch, requests } = fakeFetch(async () =>
      json(200, { stored: true, winner: 0 }),
    )
    const storage = localSave(stateOn(1), 100)
    const { cloud, store } = mount({
      origin: undefined,
      storage,
      fetch,
      clock: clock(),
    })
    expect(cloud).toBeNull()
    store.commit(advanceDay(store.get()))
    expect(store.get().day).toBe(2)
    expect(requests).toEqual([])
  })

  test("an empty origin is the same as unset (AC-11)", () => {
    const storage = createMemoryAdapter()
    expect(
      createCloudSave({
        origin: "  ",
        local: storage,
        now: () => 0,
        schedule: () => 0,
        cancel: () => {},
        fetch: async () => json(200, {}),
        signal: () => undefined,
      }),
    ).toBeNull()
  })

  test("constructing the cloud makes no request (NFR-2)", () => {
    const { fetch, requests } = fakeFetch(async () => json(200, {}))
    const storage = localSave(stateOn(1), 100)
    mount({
      origin: "https://api.example.test",
      storage,
      fetch,
      clock: clock(),
    })
    expect(requests).toEqual([])
  })

  test("a day completes while the api is unreachable (AC-8, NFR-2)", async () => {
    const { fetch, requests } = fakeFetch(async () => {
      throw new Error("connect ECONNREFUSED")
    })
    const clockRef = clock()
    const storage = localSave(stateOn(1), 100)
    writeCredentials(storage, TRAINER)
    const { cloud, store } = mount({
      origin: "https://api.example.test",
      storage,
      fetch,
      clock: clockRef,
    })
    const statuses: string[] = []
    cloud?.sync.subscribe((status) => {
      statuses.push(status.kind)
    })
    // The boot pull runs in the background and is never awaited.
    const started = cloud?.sync.start()
    // A day is played to completion while the pull is still failing.
    store.commit(advanceDay(store.get()))
    expect(store.get().day).toBe(2)
    expect(storage.getItem(SAVE_KEY)).not.toBeNull()
    await started
    expect(statuses[statuses.length - 1]).toBe("offline")
    expect(requests.length).toBeGreaterThan(0)
  })

  test("a hanging api cannot hold boot or a day (NFR-2)", () => {
    const { fetch } = fakeFetch(() => new Promise<Response>(() => {}))
    const storage = localSave(stateOn(1), 100)
    writeCredentials(storage, TRAINER)
    const { cloud, store } = mount({
      origin: "https://api.example.test",
      storage,
      fetch,
      clock: clock(),
    })
    // `start()` returns a promise the composition root drops; boot and the
    // day below must not depend on it ever settling.
    void cloud?.sync.start()
    store.commit(advanceDay(store.get()))
    expect(store.get().day).toBe(2)
  })

  test("a burst of autosaves is one push on the wire (AC-5)", async () => {
    const { fetch, requests } = fakeFetch(async (request) => {
      if (request.method === "GET") {
        return json(404, { error: "save_not_found" })
      }
      return json(200, { stored: true, winner: 1 })
    })
    const clockRef = clock()
    const storage = localSave(stateOn(1), 100)
    writeCredentials(storage, TRAINER)
    const { cloud, store } = mount({
      origin: "https://api.example.test",
      storage,
      fetch,
      clock: clockRef,
    })
    await cloud?.sync.start()
    const before = requests.length
    for (let day = 0; day < 4; day++) {
      store.commit(advanceDay(store.get()))
      clockRef.advance(200)
    }
    const pushes = () =>
      requests.filter((request) => request.method === "PUT").length
    expect(pushes()).toBe(0)
    clockRef.advance(2000)
    expect(pushes()).toBe(1)
    expect(requests.length - before).toBe(1)
    const push = requests[requests.length - 1]
    expect(JSON.parse(push?.body ?? "{}")).toMatchObject({
      passphrase: TRAINER.passphrase,
      // The payload's own clock, not the clock at flush time.
      savedAt: 1600,
    })
  })

  test("the first sign-in uploads the local save, and the round trip matches", async () => {
    const local = stateOn(3)
    const storage = localSave(local, 300)
    const uploaded: string[] = []
    const { fetch } = fakeFetch(async (request) => {
      if (request.method === "PUT") {
        uploaded.push(JSON.parse(request.body).payload)
        return json(200, { stored: true, winner: 300 })
      }
      // The trainer exists and has a passphrase; it just has no save yet.
      if (request.url.endsWith("/save")) {
        return json(404, { error: "save_not_found" })
      }
      return json(200, { id: TRAINER.id, name: "Ana", hasPassphrase: true })
    })
    const { cloud } = mount({
      origin: "https://api.example.test",
      storage,
      fetch,
      clock: clock(),
    })
    await cloud?.sync.signIn(TRAINER.id, TRAINER.passphrase)
    expect(uploaded).toHaveLength(1)
    expect(uploaded[0]).toBe(
      serializeSave({
        version: SAVE_VERSION,
        state: local,
        savedAt: 300,
        session: null,
      }),
    )
  })
})
