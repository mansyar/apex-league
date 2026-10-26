/**
 * The sync coordinator (FR-4, FR-5, FR-7, FR-8, AC-4, AC-7, AC-8): boot
 * pulls once, adoption is guarded, the first sign-in uploads only when the
 * trainer has no cloud save, and a failure is a quiet status rather than an
 * error state. The api, clock and scheduler are all injected.
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
  type SaveData,
  saveGame,
  serializeSave,
} from "@apex/sim"
import type { CloudApi, SaveRecord } from "./api"
import { readCredentials, TRAINER_KEY, writeCredentials } from "./credentials"
import { type CloudStatus, createCloudSync } from "./sync"

const TRAINER = { id: "trn_abc", name: "Ana", passphrase: "kestrel-42" }

/** A ranch that has lived a few days, so an adopted day is unmistakable. */
function stateOn(day: number): GameState {
  let state = chooseStarter(createInitialState(), "fire_drake", 42)
  while (state.day < day) state = advanceDay(state)
  return state
}

function saveOf(state: GameState, savedAt: number): SaveData {
  return { version: SAVE_VERSION, state, savedAt, session: null }
}

function rawOf(state: GameState, savedAt: number): string {
  return serializeSave(saveOf(state, savedAt))
}

/** A clock and the timers scheduled against it — no real waiting. */
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

interface PushCall {
  id: string
  payload: string
  savedAt: number
}

interface FakeApi extends CloudApi {
  calls: string[]
  pushes: PushCall[]
}

/** The api as the sync sees it: scripted answers, recorded calls. */
function fakeApi(overrides: Partial<CloudApi> = {}): FakeApi {
  const calls: string[] = []
  const pushes: PushCall[] = []
  const api: FakeApi = {
    calls,
    pushes,
    createTrainer: async () => {
      calls.push("createTrainer")
      return { ok: true, value: { id: "trn_new" } }
    },
    getTrainer: async (id) => {
      calls.push(`getTrainer:${id}`)
      return {
        ok: true,
        value: { id, name: "Ana", hasPassphrase: true },
      }
    },
    updateTrainer: async (id, body) => {
      calls.push(`updateTrainer:${id}:${JSON.stringify(body)}`)
      return {
        ok: true,
        value: { id, name: body.name ?? "", hasPassphrase: true },
      }
    },
    pull: async (id) => {
      calls.push(`pull:${id}`)
      return { ok: false, reason: "not-found", error: "save_not_found" }
    },
    push: async (id, _passphrase, payload, savedAt) => {
      calls.push(`push:${id}`)
      pushes.push({ id, payload, savedAt })
      return { ok: true, value: { stored: true, winner: savedAt } }
    },
  }
  return Object.assign(api, overrides)
}

function harness(options: {
  api: FakeApi
  local?: { state: GameState; savedAt: number } | null
  signedIn?: boolean
}) {
  const storage: SaveAdapter = createMemoryAdapter()
  if (options.local) {
    saveGame(storage, options.local.state, options.local.savedAt, null)
  }
  if (options.signedIn) writeCredentials(storage, TRAINER)
  const clock = manualClock()
  const adopted: SaveData[] = []
  const statuses: CloudStatus[] = []
  const sync = createCloudSync({
    api: options.api,
    storage,
    now: clock.now,
    schedule: clock.schedule,
    cancel: clock.cancel,
    debounceMs: 2000,
    capMs: 10_000,
  })
  sync.adoptWith((data) => {
    adopted.push(data)
  })
  sync.subscribe((status) => {
    statuses.push(status)
  })
  const last = () => statuses[statuses.length - 1]
  return { storage, clock, sync, adopted, statuses, last }
}

const cloudSave = (savedAt: number, day: number): SaveRecord => ({
  payload: rawOf(stateOn(day), savedAt),
  savedAt,
})

/** Let the api's promises drain: a push reports its status a tick later. */
async function settle(): Promise<void> {
  for (let hop = 0; hop < 5; hop++) await Promise.resolve()
}

describe("cloud sync — boot pull", () => {
  test("a newer cloud save is adopted at boot (AC-4)", async () => {
    const api = fakeApi({
      pull: async () => ({ ok: true, value: cloudSave(200, 4) }),
    })
    const h = harness({
      api,
      local: { state: stateOn(1), savedAt: 100 },
      signedIn: true,
    })
    await h.sync.start()
    expect(h.adopted).toHaveLength(1)
    expect(h.adopted[0]?.state.day).toBe(4)
    expect(h.last()?.kind).toBe("synced")
  })

  test("an older cloud save never replaces the local one", async () => {
    const api = fakeApi({
      pull: async () => ({ ok: true, value: cloudSave(200, 4) }),
    })
    const h = harness({
      api,
      local: { state: stateOn(6), savedAt: 300 },
      signedIn: true,
    })
    await h.sync.start()
    expect(h.adopted).toHaveLength(0)
    expect(api.pushes).toHaveLength(0)
  })

  test("a cloud save with no local save is adopted", async () => {
    const api = fakeApi({
      pull: async () => ({ ok: true, value: cloudSave(200, 3) }),
    })
    const h = harness({ api, local: null, signedIn: true })
    await h.sync.start()
    expect(h.adopted[0]?.state.day).toBe(3)
  })

  test("a corrupt cloud payload is refused and the local save stands", async () => {
    const api = fakeApi({
      pull: async () => ({
        ok: true,
        value: { payload: "{oops", savedAt: 900 },
      }),
    })
    const h = harness({
      api,
      local: { state: stateOn(2), savedAt: 100 },
      signedIn: true,
    })
    await h.sync.start()
    expect(h.adopted).toHaveLength(0)
    expect(h.storage.getItem(SAVE_KEY)).toBe(rawOf(stateOn(2), 100))
  })

  test("a future-version cloud payload is refused, never downgraded", async () => {
    const future = JSON.stringify({
      version: SAVE_VERSION + 1,
      state: stateOn(9),
      savedAt: 900,
      session: null,
    })
    const api = fakeApi({
      pull: async () => ({
        ok: true,
        value: { payload: future, savedAt: 900 },
      }),
    })
    const h = harness({
      api,
      local: { state: stateOn(2), savedAt: 100 },
      signedIn: true,
    })
    await h.sync.start()
    expect(h.adopted).toHaveLength(0)
    expect(h.last()?.kind).toBe("ahead")
  })

  test("an unreachable api at boot is a quiet status, not a throw (AC-8)", async () => {
    const api = fakeApi({
      pull: async () => ({ ok: false, reason: "offline" }),
    })
    const h = harness({ api, local: null, signedIn: true })
    await h.sync.start()
    expect(h.adopted).toHaveLength(0)
    expect(h.last()?.kind).toBe("offline")
  })

  test("signed out, boot makes no request at all", async () => {
    const api = fakeApi()
    const h = harness({ api, local: { state: stateOn(1), savedAt: 100 } })
    await h.sync.start()
    expect(api.calls).toEqual([])
    expect(h.last()?.kind).toBe("signed-out")
  })
})

describe("cloud sync — sign in and first upload (FR-7, AC-7)", () => {
  test("a trainer with no cloud save receives the local ranch", async () => {
    const api = fakeApi()
    const local = { state: stateOn(3), savedAt: 300 }
    const h = harness({ api, local })
    const result = await h.sync.signIn(TRAINER.id, TRAINER.passphrase)
    expect(result).toEqual({ ok: true })
    expect(api.pushes).toHaveLength(1)
    expect(api.pushes[0]?.payload).toBe(rawOf(local.state, local.savedAt))
    expect(api.pushes[0]?.savedAt).toBe(300)
    expect(readCredentials(h.storage)).toEqual(TRAINER)
  })

  test("an existing cloud save is never overwritten by signing in (AC-7)", async () => {
    const api = fakeApi({
      pull: async () => ({ ok: true, value: cloudSave(200, 4) }),
    })
    const h = harness({ api, local: { state: stateOn(6), savedAt: 300 } })
    const result = await h.sync.signIn(TRAINER.id, TRAINER.passphrase)
    expect(result).toEqual({ ok: true })
    expect(api.pushes).toHaveLength(0)
    expect(h.adopted).toHaveLength(0)
    expect(readCredentials(h.storage)).toEqual(TRAINER)
  })

  test("an existing, newer cloud save is adopted on sign-in", async () => {
    const api = fakeApi({
      pull: async () => ({ ok: true, value: cloudSave(900, 7) }),
    })
    const h = harness({ api, local: { state: stateOn(2), savedAt: 100 } })
    await h.sync.signIn(TRAINER.id, TRAINER.passphrase)
    expect(h.adopted[0]?.state.day).toBe(7)
  })

  test("a wrong passphrase is reported and changes nothing", async () => {
    const api = fakeApi({
      pull: async () => ({
        ok: false,
        reason: "unauthorized",
        error: "wrong_passphrase",
      }),
    })
    const h = harness({ api, local: { state: stateOn(2), savedAt: 100 } })
    const result = await h.sync.signIn(TRAINER.id, "not-the-one")
    expect(result).toEqual({ ok: false, reason: "wrong-passphrase" })
    expect(readCredentials(h.storage)).toBeNull()
    expect(h.storage.getItem(SAVE_KEY)).toBe(rawOf(stateOn(2), 100))
  })

  test("an unknown trainer id is reported as such", async () => {
    const api = fakeApi({
      getTrainer: async () => ({
        ok: false,
        reason: "not-found",
        error: "trainer_not_found",
      }),
    })
    const h = harness({ api })
    expect(await h.sync.signIn("trn_nope", "kestrel-42")).toEqual({
      ok: false,
      reason: "unknown-trainer",
    })
  })

  test("a trainer without a passphrase cannot be signed into yet", async () => {
    const api = fakeApi({
      getTrainer: async (id) => ({
        ok: true,
        value: { id, name: "", hasPassphrase: false },
      }),
    })
    const h = harness({ api })
    expect(await h.sync.signIn(TRAINER.id, "kestrel-42")).toEqual({
      ok: false,
      reason: "no-passphrase",
    })
  })

  test("an offline sign-in is quiet and keeps the player signed out", async () => {
    const api = fakeApi({
      getTrainer: async () => ({ ok: false, reason: "offline" }),
    })
    const h = harness({ api })
    expect(await h.sync.signIn(TRAINER.id, "kestrel-42")).toEqual({
      ok: false,
      reason: "offline",
    })
    expect(h.last()?.kind).toBe("offline")
  })

  test("creating a trainer names it, sets the passphrase and uploads the ranch", async () => {
    const api = fakeApi()
    const local = { state: stateOn(5), savedAt: 500 }
    const h = harness({ api, local })
    expect(await h.sync.createTrainer("Ana", "kestrel-42")).toEqual({
      ok: true,
    })
    expect(api.calls).toContain("createTrainer")
    expect(api.calls).toContain(
      'updateTrainer:trn_new:{"name":"Ana","passphrase":"kestrel-42"}',
    )
    expect(api.pushes[0]?.payload).toBe(rawOf(local.state, local.savedAt))
    expect(readCredentials(h.storage)).toEqual({
      id: "trn_new",
      name: "Ana",
      passphrase: "kestrel-42",
    })
  })

  test("a short passphrase is refused before any request", async () => {
    const api = fakeApi()
    const h = harness({ api })
    expect(await h.sync.createTrainer("Ana", "short")).toEqual({
      ok: false,
      reason: "invalid",
    })
    expect(api.calls).toEqual([])
  })

  test("credentials never enter the save (the save is exported and shared)", async () => {
    const api = fakeApi()
    const h = harness({ api, local: { state: stateOn(2), savedAt: 200 } })
    await h.sync.signIn(TRAINER.id, TRAINER.passphrase)
    const save = h.storage.getItem(SAVE_KEY) ?? ""
    expect(save).not.toContain(TRAINER.passphrase)
    expect(save).not.toContain(TRAINER.id)
    expect(h.storage.getItem(TRAINER_KEY)).toContain(TRAINER.passphrase)
  })
})

describe("cloud sync — push behind the autosave", () => {
  test("a local write while signed in is one push (AC-5)", async () => {
    const api = fakeApi()
    const h = harness({ api, signedIn: true })
    for (let write = 1; write <= 4; write++) {
      h.sync.noteLocalWrite(rawOf(stateOn(2), 100 + write))
      h.clock.advance(200)
    }
    expect(api.pushes).toHaveLength(0)
    h.clock.advance(2000)
    expect(api.pushes).toHaveLength(1)
    expect(api.pushes[0]?.savedAt).toBe(104)
    await settle()
    expect(h.last()?.kind).toBe("synced")
  })

  test("a local write while signed out makes no request", async () => {
    const api = fakeApi()
    const h = harness({ api })
    h.sync.noteLocalWrite(rawOf(stateOn(2), 100))
    h.clock.advance(10_000)
    expect(api.calls).toEqual([])
  })

  test("a failed push is offline, and the local save is untouched", async () => {
    const api = fakeApi({
      push: async () => ({ ok: false, reason: "offline" }),
    })
    const local = { state: stateOn(2), savedAt: 100 }
    const h = harness({ api, local, signedIn: true })
    h.sync.noteLocalWrite(rawOf(local.state, local.savedAt))
    h.clock.advance(2000)
    await settle()
    expect(h.last()?.kind).toBe("offline")
    expect(h.storage.getItem(SAVE_KEY)).toBe(rawOf(local.state, local.savedAt))
  })

  test("a cloud copy that is newer than the push is reported as ahead", async () => {
    const api = fakeApi({
      push: async () => ({ ok: true, value: { stored: false, winner: 999 } }),
    })
    const h = harness({ api, signedIn: true })
    h.sync.noteLocalWrite(rawOf(stateOn(2), 100))
    h.clock.advance(2000)
    await settle()
    expect(h.last()?.kind).toBe("ahead")
  })

  test("the adopted payload is not echoed straight back", async () => {
    const api = fakeApi({
      pull: async () => ({ ok: true, value: cloudSave(900, 4) }),
    })
    const h = harness({ api, local: null, signedIn: true })
    await h.sync.start()
    expect(h.adopted).toHaveLength(1)
    // The store re-persists the adopted state (fresh savedAt) right after
    // adoption: that write must not become a push of the same content.
    h.sync.noteLocalWrite(rawOf(stateOn(4), 950))
    h.clock.advance(2000)
    expect(api.pushes).toHaveLength(0)
    h.sync.noteLocalWrite(rawOf(stateOn(5), 960))
    h.clock.advance(2000)
    expect(api.pushes).toHaveLength(1)
  })

  test("signing out forgets the trainer and keeps the ranch", async () => {
    const local = { state: stateOn(2), savedAt: 100 }
    const h = harness({ api: fakeApi(), local, signedIn: true })
    h.sync.signOut()
    expect(readCredentials(h.storage)).toBeNull()
    expect(h.storage.getItem(SAVE_KEY)).toBe(rawOf(local.state, local.savedAt))
    expect(h.last()?.kind).toBe("signed-out")
  })
})
