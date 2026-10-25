import { describe, expect, test } from "bun:test"
import {
  type CupSession,
  chooseStarter,
  completeCup,
  createCreature,
  createInitialState,
  defaultLoadout,
  EVOLUTION_DAY,
  EVOLUTION_MOOD,
  finalizeCup,
  type GameState,
  getSpecies,
  loadBoot,
  prepareCup,
  resolvePlayerMatch,
  SAVE_VERSION,
  type SaveAdapter,
  startCupSession,
} from "@apex/sim"
import { morningAfterDebriefGate } from "./hud/copy-morning-after"
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
    removeItem: (key: string) => {
      map.delete(key)
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
    expect(saved.version).toBe(SAVE_VERSION)
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

describe("game store — the morning-after ledger (postcup_morning_after FR-2)", () => {
  const CUP_DAY = 7

  /** A creature identical to the starter's (the sim fixtures' baseline). */
  function starterCreature() {
    return createCreature("fire_drake", 42)
  }

  /** Play a cup to a championship with the default picks — the established
   * derive-test baseline (the classifier reads only session facts). */
  function championSession(): CupSession {
    const c = starterCreature()
    const species = getSpecies(c.speciesId)
    if (!species) throw new Error("unknown species")
    let cur = startCupSession(c, CUP_DAY, 17)
    while (cur.status === "player-turn") {
      cur = resolvePlayerMatch(
        cur,
        defaultLoadout(c, species),
        "specials",
      ).session
    }
    if (cur.status === "eliminated") cur = completeCup(cur)
    return cur
  }

  test("no derivation is pending before any cup finalizes", () => {
    const store = createGameStore(startState(), fakeAdapter(), { now: () => 0 })
    expect(store.pendingMorningAfter()).toBeNull()
    expect(store.takeMorningAfterArrival()).toBeNull()
  })

  test("a stale (player-turn) session clear mints nothing", () => {
    const store = createGameStore(startState(), fakeAdapter(), { now: () => 0 })
    const live = prepareCup(startState())
    if (!live) throw new Error("no session")
    store.setSession(live)
    store.setSession(null)
    store.commit({ ...store.get(), day: 2 })
    expect(store.pendingMorningAfter()).toBeNull()
  })

  test("the finalize adjacency mints the derivation and the arrival consumes it once", () => {
    const store = createGameStore(startState(), fakeAdapter(), { now: () => 0 })
    const session = championSession()
    const pre = store.get()
    store.setSession(session)
    // The finalize handler calls setSession(null) before its finalize
    // commit — the store derives across exactly that adjacency.
    store.setSession(null)
    const post = finalizeCup(pre, session)
    store.commit(post)
    const pending = store.pendingMorningAfter()
    expect(pending?.class).toBe("title")
    // The champion's first cup crossed the persisted first-title milestone.
    expect(pending?.amplifiers).toEqual([{ kind: "first_title" }])
    // The arrival takes it exactly once.
    const taken = store.takeMorningAfterArrival()
    expect(taken).toEqual(pending)
    expect(store.takeMorningAfterArrival()).toBeNull()
    // The same ritual never replays on a later day either.
    store.commit({ ...store.get(), day: store.get().day + 1 })
    expect(store.takeMorningAfterArrival()).toBeNull()
  })

  test("the night settle drops a leftover pending (NFR-7)", () => {
    const store = createGameStore(startState(), fakeAdapter(), { now: () => 0 })
    const session = championSession()
    const pre = store.get()
    store.setSession(session)
    store.setSession(null)
    store.commit(finalizeCup(pre, session))
    expect(store.pendingMorningAfter()).not.toBeNull()
    // Sleeping past the ritual morning clears the bookkeeping.
    store.commit({ ...store.get(), day: store.get().day + 1 })
    expect(store.pendingMorningAfter()).toBeNull()
    expect(store.takeMorningAfterArrival()).toBeNull()
  })

  test("an evolution-reveal day yields: consumed silently, the derivation stays banked", () => {
    const store = createGameStore(startState(), fakeAdapter(), { now: () => 0 })
    const session = championSession()
    const pre = store.get()
    store.setSession(session)
    store.setSession(null)
    const post = finalizeCup(pre, session)
    const creature = post.creature
    if (!creature) throw new Error("no creature")
    const evolving = {
      ...post,
      creature: {
        ...creature,
        ageDays: EVOLUTION_DAY,
        sickCooldown: 0,
        conditions: { ...creature.conditions, mood: EVOLUTION_MOOD },
      },
    }
    store.commit(evolving)
    expect(store.takeMorningAfterArrival()).toBeNull()
    // Banked for the debrief path until the night settle drops it.
    expect(store.pendingMorningAfter()).not.toBeNull()
    // No resurrection on a second arrival the same day.
    expect(store.takeMorningAfterArrival()).toBeNull()
  })

  test("the ledger never rides the persisted save (NFR-1 — the schema stays v25)", () => {
    const adapter = fakeAdapter()
    const store = createGameStore(startState(), adapter, { now: () => 0 })
    const session = championSession()
    const pre = store.get()
    store.setSession(session)
    store.setSession(null)
    store.commit(finalizeCup(pre, session))
    expect(store.pendingMorningAfter()).not.toBeNull()
    for (const write of adapter.writes) {
      const saved = JSON.parse(write) as { state: Record<string, unknown> }
      expect(saved.state).not.toHaveProperty("morningAfter")
      expect(write).not.toContain("morningAfter")
    }
  })

  test("the yield morning still renders its debrief that day, then goes silent after the settle (FR-9 full flow)", () => {
    const store = createGameStore(startState(), fakeAdapter(), { now: () => 0 })
    const session = championSession()
    const pre = store.get()
    store.setSession(session)
    store.setSession(null)
    const post = finalizeCup(pre, session)
    const creature = post.creature
    if (!creature) throw new Error("no creature")
    const evolving = {
      ...post,
      creature: {
        ...creature,
        ageDays: EVOLUTION_DAY,
        sickCooldown: 0,
        conditions: { ...creature.conditions, mood: EVOLUTION_MOOD },
      },
    }
    store.commit(evolving)
    const day = store.get().day
    // The arrival consumes silently: a null return is the controller's
    // no-start signal — the pose ceremony never begins (screens.ts starts
    // the ceremony only on a derivation), and no second arrival revives it.
    expect(store.takeMorningAfterArrival()).toBeNull()
    expect(store.takeMorningAfterArrival()).toBeNull()
    // The debrief still renders that day — the gate reads the banked
    // derivation the yield left in place.
    const say = morningAfterDebriefGate(
      null,
      day,
      store.pendingMorningAfter(),
      creature.name,
    )
    expect(say.line).not.toBeNull()
    expect(say.nextDay).toBe(day)
    // The night settle drops the ledger; the latch now reads a null
    // derivation, so the ticker's own chain resumes and nothing survives
    // into the next day (FR-9, NFR-7).
    store.commit({ ...store.get(), day: day + 1 })
    expect(store.pendingMorningAfter()).toBeNull()
    expect(
      morningAfterDebriefGate(
        say.nextDay,
        day + 1,
        store.pendingMorningAfter(),
        creature.name,
      ),
    ).toEqual({ line: null, nextDay: say.nextDay })
  })

  test("a reload between finalize and arrival plays nothing (FR-9 — the derivation never persisted)", () => {
    const adapter = fakeAdapter()
    const store = createGameStore(startState(), adapter, { now: () => 0 })
    const session = championSession()
    const pre = store.get()
    store.setSession(session)
    store.setSession(null)
    store.commit(finalizeCup(pre, session))
    expect(store.pendingMorningAfter()).not.toBeNull()
    // The player reloads: boot re-reads exactly what persisted — and the
    // derivation lives only in the old store's client memory.
    const boot = loadBoot(adapter)
    if (!boot || !("state" in boot)) throw new Error("boot produced no state")
    const reloaded = createGameStore(boot.state, fakeAdapter(), {
      now: () => 0,
      initialSession: boot.session,
    })
    expect(reloaded.pendingMorningAfter()).toBeNull()
    expect(reloaded.takeMorningAfterArrival()).toBeNull()
  })
})
