import { describe, expect, test } from "bun:test"
import {
  type CupSession,
  chooseStarter,
  createInitialState,
  type GameState,
  prepareCup,
  type SaveAdapter,
} from "@apex/sim"
import { createGameStore } from "./store"

/** A deterministic starting state (no DOM, no randomness beyond the seed). */
function startState(): GameState {
  return chooseStarter(createInitialState(), "fire_drake", 42)
}

/** A fake adapter that records writes and can be made to fail. */
function fakeAdapter(): SaveAdapter & { writes: string[]; failNext: boolean } {
  const map = new Map<string, string>()
  const adapter = {
    writes: [] as string[],
    failNext: false,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (adapter.failNext) {
        adapter.failNext = false
        throw new Error("quota exceeded (fake)")
      }
      adapter.writes.push(value)
      map.set(key, value)
    },
  }
  return adapter
}

describe("createGameStore", () => {
  test("get returns the initial state", () => {
    const s = startState()
    const store = createGameStore(s, fakeAdapter(), { now: () => 0 })
    expect(store.get()).toBe(s)
  })

  test("commit adopts the new state and persists it through the adapter", () => {
    const adapter = fakeAdapter()
    const store = createGameStore(startState(), adapter, { now: () => 0 })
    const next = { ...store.get(), day: 9 }
    store.commit(next)
    expect(store.get()).toBe(next)
    expect(adapter.writes).toHaveLength(1)
    const saved = JSON.parse(adapter.writes[0] ?? "{}") as {
      version: number
      savedAt: number
      state: { day: number }
    }
    expect(saved.version).toBe(7)
    expect(saved.savedAt).toBe(0)
    expect(saved.state.day).toBe(9)
  })

  test("commit uses the injected clock for the save stamp", () => {
    const adapter = fakeAdapter()
    const store = createGameStore(startState(), adapter, { now: () => 4242 })
    store.commit({ ...store.get(), day: 2 })
    const saved = JSON.parse(adapter.writes[0] ?? "{}") as { savedAt: number }
    expect(saved.savedAt).toBe(4242)
  })

  test("commit notifies subscribers in registration order with the new state", () => {
    const store = createGameStore(startState(), fakeAdapter(), { now: () => 0 })
    const order: string[] = []
    store.subscribe((state) => order.push(`hud:${state.day}`))
    store.subscribe((state) => order.push(`spar:${state.day}`))
    store.subscribe((state) => order.push(`cup:${state.day}`))
    store.subscribe((state) => order.push(`scene:${state.day}`))
    store.commit({ ...store.get(), day: 3 })
    expect(order).toEqual(["hud:3", "spar:3", "cup:3", "scene:3"])
  })

  test("subscribe returns an unsubscribe that stops notifications", () => {
    const store = createGameStore(startState(), fakeAdapter(), { now: () => 0 })
    const seen: number[] = []
    const stop = store.subscribe((state) => seen.push(state.day))
    store.commit({ ...store.get(), day: 2 })
    stop()
    store.commit({ ...store.get(), day: 3 })
    expect(seen).toEqual([2])
  })

  test("a persist failure does not break notification", () => {
    const adapter = fakeAdapter()
    const errors: unknown[] = []
    const store = createGameStore(startState(), adapter, {
      now: () => 0,
      onPersistError: (err) => errors.push(err),
    })
    const seen: number[] = []
    store.subscribe((state) => seen.push(state.day))
    adapter.failNext = true
    store.commit({ ...store.get(), day: 5 })
    // The state was adopted and the HUD was still told — the save failing
    // must never freeze the game loop.
    expect(store.get().day).toBe(5)
    expect(seen).toEqual([5])
    expect(errors).toHaveLength(1)
  })

  test("a subscriber throwing does not starve the later subscribers", () => {
    const store = createGameStore(startState(), fakeAdapter(), { now: () => 0 })
    const seen: string[] = []
    store.subscribe(() => {
      throw new Error("boom")
    })
    store.subscribe((state) => seen.push(`second:${state.day}`))
    expect(() => store.commit({ ...store.get(), day: 4 })).toThrow("boom")
    expect(seen).toEqual(["second:4"])
  })
})

describe("game store — cup session persistence", () => {
  /** A live session fixture for a fresh cup. */
  function liveSession(): CupSession {
    const session = prepareCup(startState())
    if (!session) throw new Error("no session")
    return session
  }

  test("getSession returns null by default", () => {
    const store = createGameStore(startState(), fakeAdapter(), { now: () => 0 })
    expect(store.getSession()).toBeNull()
  })

  test("boot options can seed the session from a restored save", () => {
    const session = liveSession()
    const store = createGameStore(startState(), fakeAdapter(), {
      now: () => 0,
      initialSession: session,
    })
    expect(store.getSession()).toEqual(session)
  })

  test("setSession stores the session, persists it, and notifies nobody", () => {
    const adapter = fakeAdapter()
    const store = createGameStore(startState(), adapter, { now: () => 7 })
    const calls: number[] = []
    store.subscribe(() => calls.push(1))
    const session = liveSession()
    store.setSession(session)
    expect(calls).toHaveLength(0)
    const saved = JSON.parse(adapter.writes[0] ?? "{}") as {
      session: CupSession | null
      savedAt: number
    }
    expect(saved.session).toEqual(session)
    expect(saved.savedAt).toBe(7)
  })

  test("commit persists the live session attached to the save", () => {
    const adapter = fakeAdapter()
    const store = createGameStore(startState(), adapter, { now: () => 0 })
    const session = liveSession()
    store.setSession(session)
    store.commit({ ...store.get(), day: 2 })
    const saved = JSON.parse(
      adapter.writes[adapter.writes.length - 1] ?? "{}",
    ) as { session: CupSession | null }
    expect(saved.session).toEqual(session)
    expect(store.getSession()).toEqual(session)
  })

  test("commit keeps riding a previously set session until it is cleared", () => {
    const adapter = fakeAdapter()
    const store = createGameStore(startState(), adapter, { now: () => 0 })
    const session = liveSession()
    store.setSession(session)
    store.commit({ ...store.get(), day: 2 })
    store.commit({ ...store.get(), day: 3 })
    for (const write of adapter.writes) {
      const saved = JSON.parse(write) as { session: CupSession | null }
      expect(saved.session).toEqual(session)
    }
  })

  test("setSession(null) clears the session from the store and the save", () => {
    const adapter = fakeAdapter()
    const store = createGameStore(startState(), adapter, { now: () => 0 })
    store.setSession(liveSession())
    store.setSession(null)
    expect(store.getSession()).toBeNull()
    const saved = JSON.parse(
      adapter.writes[adapter.writes.length - 1] ?? "{}",
    ) as { session: CupSession | null }
    expect(saved.session).toBeNull()
  })

  test("a finalized session does not resurrect: cleared, later commits stay clean", () => {
    const adapter = fakeAdapter()
    const store = createGameStore(startState(), adapter, { now: () => 0 })
    store.setSession(liveSession())
    // The finalize handler calls setSession(null) before its commit.
    store.setSession(null)
    store.commit({ ...store.get(), day: 9 })
    const saved = JSON.parse(
      adapter.writes[adapter.writes.length - 1] ?? "{}",
    ) as { session: CupSession | null }
    expect(saved.session).toBeNull()
    expect(store.getSession()).toBeNull()
  })
})
