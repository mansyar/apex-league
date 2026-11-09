import { describe, expect, test } from "bun:test"

import {
  type CupSession,
  completeCup,
  defaultLoadout,
  getSpecies,
  prepareCup,
  resolvePlayerMatch,
} from "../index"
import { chooseStarter, createInitialState } from "../state"
import { migrate } from "./migrate"
import { SAVE_VERSION } from "./schema"
import {
  createMemoryAdapter,
  loadGame,
  loadSave,
  SAVE_KEY,
  saveGame,
} from "./storage"

describe("save schema cup fields (v5 origin)", () => {
  test("current version matches the schema", () => {
    expect(SAVE_VERSION).toBe(25)
  })

  test("a v4 save migrates to v5 with cupsWon 0 and lastCupDay null", () => {
    const v4 = {
      version: 4,
      state: {
        day: 7,
        phase: "cup" as const,
        actionPoints: 3,
        creature: chooseStarter(createInitialState(), "fire_drake", 42)
          .creature,
      },
      savedAt: 55,
    }
    const migrated = migrate(v4)
    expect(migrated.version).toBe(SAVE_VERSION)
    expect(migrated.savedAt).toBe(55)
    expect(migrated.state.day).toBe(7)
    expect(migrated.state.cupsWon).toBe(0)
    expect(migrated.state.lastCupDay).toBeNull()
  })

  test("a v4 save round-trips training/loadout through to current", () => {
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    if (!owned.creature) throw new Error("no creature")
    const v4 = {
      version: 4,
      state: {
        day: 3,
        phase: "day" as const,
        actionPoints: 1,
        creature: { ...owned.creature, trainingDays: 4 },
      },
      savedAt: 9,
    }
    const migrated = migrate(v4)
    expect(migrated.state.creature?.trainingDays).toBe(4)
    expect(migrated.state.creature?.loadout).toBeNull()
  })

  test("cupsWon and lastCupDay round-trip on a current save", () => {
    const adapter = createMemoryAdapter()
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    const state = { ...owned, cupsWon: 3, lastCupDay: 14 }
    saveGame(adapter, state, 1)
    const loaded = loadGame(adapter)
    expect(loaded?.cupsWon).toBe(3)
    expect(loaded?.lastCupDay).toBe(14)
  })

  test("loadGame rejects corrupt cup fields", () => {
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    const cases: unknown[] = [
      { ...owned, cupsWon: -1 },
      { ...owned, cupsWon: 1.5 },
      { ...owned, cupsWon: "three" },
      { ...owned, lastCupDay: 0 },
      { ...owned, lastCupDay: 3.5 },
      { ...owned, lastCupDay: "seven" },
    ]
    for (const bad of cases) {
      const adapter = createMemoryAdapter()
      saveGame(adapter, bad as typeof owned, 1)
      expect(loadGame(adapter)).toBeNull()
    }
  })

  test("old chain still reaches current: a v1 save walks to v5 with cup defaults", () => {
    const migrated = migrate({
      version: 1,
      state: { day: 2, phase: "day", actionPoints: 3 },
      savedAt: 0,
    })
    expect(migrated.version).toBe(SAVE_VERSION)
    expect(migrated.state.cupsWon).toBe(0)
    expect(migrated.state.lastCupDay).toBeNull()
  })
})

/**
 * FR-16 / AC-16: continuous-arena-battle changes the simulator, not the save.
 * A build from before the track wrote a v25 payload, and nothing in that
 * payload moved — no field was added, so no migration was added either. The
 * fixture below is written by hand for exactly that reason: it is the bytes
 * the old build left behind, not what today's `saveGame` would produce.
 */
describe("pre-track save compatibility (FR-16, AC-16)", () => {
  /** The old build's payload: a cup day, one match played, one still pends. */
  function preTrackPayload(): {
    raw: string
    loadout: readonly string[]
  } {
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    const creature = owned.creature
    if (!creature) throw new Error("no creature")
    const species = getSpecies(creature.speciesId)
    if (!species) throw new Error("unknown species")
    const loadout = defaultLoadout(creature, species)
    const fresh = prepareCup(owned)
    if (!fresh) throw new Error("no session")
    const inFlight = resolvePlayerMatch(fresh, loadout, "balanced").session
    const raw = JSON.stringify({
      version: 25,
      state: owned,
      session: inFlight,
      savedAt: 1234,
    })
    return { raw, loadout }
  }

  /**
   * Play out whatever the restored walk still owes: the player's remaining
   * rounds, then (on an exit) the rival subtree. Outcome-agnostic — the
   * seeded bracket decides whether the player is live, out, or champion.
   */
  function finish(session: CupSession, loadout: readonly string[]): CupSession {
    let s = session
    for (let round = 0; round < 4 && s.status === "player-turn"; round++) {
      s = resolvePlayerMatch(s, loadout, "balanced").session
    }
    return s.status === "eliminated" ? completeCup(s) : s
  }

  test("a pre-track save loads and its in-flight cup resumes", () => {
    const { raw } = preTrackPayload()
    const adapter = createMemoryAdapter()
    adapter.setItem(SAVE_KEY, raw)

    const loaded = loadSave(adapter)
    if (!loaded?.session) throw new Error("the session did not load")
    // No migration ran: the payload was already current.
    expect(loaded.version).toBe(25)
    expect(loaded.savedAt).toBe(1234)
    expect(loaded.state.creature?.speciesId).toBe("fire_drake")
    // The cup is mid-flight: one verdict filed, no champion crowned.
    expect(loaded.session.playerVerdicts).toHaveLength(1)
    expect(loaded.session.championName).toBeNull()
  })

  test("the loaded session resolves to completion", () => {
    const { raw, loadout } = preTrackPayload()
    const adapter = createMemoryAdapter()
    adapter.setItem(SAVE_KEY, raw)
    const loaded = loadSave(adapter)
    if (!loaded?.session) throw new Error("the session did not load")

    const finished = finish(loaded.session, loadout)
    expect(finished.status).not.toBe("player-turn")
    // Complete means the bracket crowned someone — the player or a rival.
    expect(finished.championName).not.toBeNull()
  })
})
