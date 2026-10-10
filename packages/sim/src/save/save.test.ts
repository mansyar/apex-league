import { describe, expect, test } from "bun:test"

import { createCreature } from "../creature"
import { chooseStarter, createInitialState, type GameState } from "../state"
import { advanceDay } from "../ticker"
import { migrate } from "./migrate"
import { SAVE_VERSION, type SaveData, serializeSave } from "./schema"
import {
  createMemoryAdapter,
  loadGame,
  type SaveAdapter,
  saveGame,
} from "./storage"

describe("save schema", () => {
  test("current version is 4", () => {
    expect(SAVE_VERSION).toBe(4)
  })

  test("serializeSave wraps state with version metadata", () => {
    const data: SaveData = {
      version: SAVE_VERSION,
      state: createInitialState(),
      savedAt: 1000,
    }
    const json = serializeSave(data)
    const parsed = JSON.parse(json) as SaveData
    expect(parsed.version).toBe(4)
    expect(parsed.state.day).toBe(1)
    expect(parsed.savedAt).toBe(1000)
  })
})

describe("migration chain", () => {
  test("migrates a synthetic v0 save to current", () => {
    // v0 predates the versioned schema: flat shape, no phase/AP.
    const v0 = { version: 0, day: 7 }
    const migrated = migrate(v0)
    expect(migrated.version).toBe(4)
    expect(migrated.state.day).toBe(7)
    expect(migrated.state.phase).toBe("cup")
    expect(migrated.state.actionPoints).toBeGreaterThan(0)
  })

  test("v0 day 3 lands in the day phase", () => {
    const migrated = migrate({ version: 0, day: 3 })
    expect(migrated.state.phase).toBe("day")
  })

  test("migrates a v1 save through to v3, granting the default Fire drake starter", () => {
    // v1 shape: GameState without a creature (pre-care-loop saves).
    const v1 = {
      version: 1,
      state: { day: 4, phase: "day", actionPoints: 2 },
      savedAt: 1234,
    }
    const migrated = migrate(v1)
    expect(migrated.version).toBe(4)
    expect(migrated.savedAt).toBe(1234)
    expect(migrated.state.day).toBe(4)
    expect(migrated.state.actionPoints).toBe(2)
    const creature = migrated.state.creature
    expect(creature).not.toBeNull()
    expect(creature?.speciesId).toBe("fire_drake")
    expect(creature?.element).toBe("fire")
    expect(creature?.stage).toBe("baby")
  })

  test("v1 migration is deterministic — same payload, same creature", () => {
    const v1 = () => ({
      version: 1,
      state: { day: 2, phase: "day", actionPoints: 3 },
      savedAt: 0,
    })
    const a = migrate(v1())
    const b = migrate(v1())
    expect(a).toEqual(b)
  })

  test("rejects a v1 save with a semantically broken state", () => {
    const v1 = {
      version: 1,
      state: { day: -1, phase: "day", actionPoints: 3 },
      savedAt: 0,
    }
    expect(() => migrate(v1)).toThrow()
  })

  test("migrates a current-version save through unchanged", () => {
    const v2: SaveData = {
      version: SAVE_VERSION,
      state: advanceDay(createInitialState()),
      savedAt: 42,
    }
    const migrated = migrate(v2)
    expect(migrated).toEqual(v2)
  })

  test("migrates a v2 save to v3, granting neutral training fields", () => {
    // v2 creatures carry no training fields — strip them from a fresh one.
    const creature = createCreature("fire_drake", 42)
    const legacy = structuredClone(creature) as unknown as Record<
      string,
      unknown
    >
    delete legacy.trained
    delete legacy.trainingFocus
    delete legacy.trainingResult
    const v2 = {
      version: 2,
      state: { day: 5, phase: "day", actionPoints: 2, creature: legacy },
      savedAt: 99,
    }
    const migrated = migrate(v2)
    expect(migrated.version).toBe(4)
    expect(migrated.savedAt).toBe(99)
    expect(migrated.state.day).toBe(5)
    expect(migrated.state.actionPoints).toBe(2)
    expect(migrated.state.creature?.trained).toEqual({
      hp: 0,
      atk: 0,
      def: 0,
      spd: 0,
    })
    expect(migrated.state.creature?.trainingFocus).toBeNull()
    expect(migrated.state.creature?.trainingResult).toBeNull()
    expect(migrated.state.creature?.stats).toEqual(creature.stats)
  })

  test("a v1 save walks v1→v2→v3→v4 with the credited trained days", () => {
    const migrated = migrate({
      version: 1,
      state: { day: 2, phase: "day", actionPoints: 3 },
      savedAt: 0,
    })
    expect(migrated.version).toBe(4)
    expect(migrated.state.creature?.trained).toEqual({
      hp: 0,
      atk: 0,
      def: 0,
      spd: 0,
    })
    expect(migrated.state.creature?.trainingFocus).toBeNull()
    expect(migrated.state.creature?.trainingResult).toBeNull()
    expect(migrated.state.creature?.trainingDays).toBe(6)
    expect(migrated.state.creature?.loadout).toBeNull()
  })

  test("a v3 save migrates to v4: 6 trained days, null loadout, stats intact", () => {
    // v3 creatures predate the move-kit ledger — strip the v4 fields.
    const creature = createCreature("fire_drake", 42)
    const legacy = structuredClone(creature) as unknown as Record<
      string,
      unknown
    >
    delete legacy.trainingDays
    delete legacy.loadout
    const v3 = {
      version: 3,
      state: { day: 9, phase: "day", actionPoints: 1, creature: legacy },
      savedAt: 321,
    }
    const migrated = migrate(v3)
    expect(migrated.version).toBe(4)
    expect(migrated.savedAt).toBe(321)
    expect(migrated.state.day).toBe(9)
    expect(migrated.state.creature?.trainingDays).toBe(6)
    expect(migrated.state.creature?.loadout).toBeNull()
    expect(migrated.state.creature?.stats).toEqual(creature.stats)
    expect(migrated.state.creature?.trained).toEqual(creature.trained)
  })

  test("a v4 save round-trips trainingDays and the chosen loadout", () => {
    const adapter = createMemoryAdapter()
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    if (!owned.creature) throw new Error("no creature")
    const state = {
      ...owned,
      creature: {
        ...owned.creature,
        trainingDays: 2,
        loadout: ["spark", "flame_charge"],
      },
    }
    saveGame(adapter, state, 8)
    const loaded = loadGame(adapter)
    expect(loaded?.creature?.trainingDays).toBe(2)
    expect(loaded?.creature?.loadout).toEqual(["spark", "flame_charge"])
  })

  test("rejects saves from an unknown future version", () => {
    expect(() => migrate({ version: 99, state: {} })).toThrow()
  })

  test("rejects saves without a version", () => {
    expect(() => migrate({ day: 5 })).toThrow()
  })
})

describe("storage adapter", () => {
  test("saveGame then loadGame round-trips the state", () => {
    const adapter: SaveAdapter = createMemoryAdapter()
    const state = advanceDay(createInitialState())
    saveGame(adapter, state, 777)
    const loaded = loadGame(adapter)
    expect(loaded).not.toBeNull()
    expect(loaded?.day).toBe(2)
    expect(loaded?.phase).toBe(state.phase)
    expect(loaded?.actionPoints).toBe(state.actionPoints)
  })

  test("loadGame returns null when no save exists", () => {
    const adapter: SaveAdapter = createMemoryAdapter()
    expect(loadGame(adapter)).toBeNull()
  })

  test("loadGame returns null on corrupt JSON", () => {
    const adapter: SaveAdapter = createMemoryAdapter()
    adapter.setItem("apex.save", "{not valid json!!")
    expect(loadGame(adapter)).toBeNull()
  })

  test("loadGame returns null on an unreadable future version", () => {
    const adapter: SaveAdapter = createMemoryAdapter()
    adapter.setItem("apex.save", JSON.stringify({ version: 99, state: {} }))
    expect(loadGame(adapter)).toBeNull()
  })

  test("loadGame returns null on a non-object payload", () => {
    const adapter: SaveAdapter = createMemoryAdapter()
    adapter.setItem("apex.save", JSON.stringify("just a string"))
    expect(loadGame(adapter)).toBeNull()
  })

  test("loadGame rejects semantically invalid states", () => {
    const cases: unknown[] = [
      {
        version: 1,
        state: { day: -5, phase: "day", actionPoints: 3 },
        savedAt: 0,
      },
      {
        version: 1,
        state: { day: 1, phase: "banana", actionPoints: 3 },
        savedAt: 0,
      },
      {
        version: 1,
        state: { day: 1, phase: "day", actionPoints: -2 },
        savedAt: 0,
      },
      {
        version: 1,
        state: { day: 1.5, phase: "day", actionPoints: 3 },
        savedAt: 0,
      },
    ]
    for (const payload of cases) {
      const adapter: SaveAdapter = createMemoryAdapter()
      adapter.setItem("apex.save", JSON.stringify(payload))
      expect(loadGame(adapter)).toBeNull()
    }
  })

  test("round-trips a save that owns a creature", () => {
    const adapter: SaveAdapter = createMemoryAdapter()
    const state = advanceDay(
      chooseStarter(createInitialState(), "fire_drake", 42),
    )
    saveGame(adapter, state, 500)
    const loaded = loadGame(adapter)
    expect(loaded).not.toBeNull()
    expect(loaded?.creature).not.toBeNull()
    expect(loaded?.creature?.speciesId).toBe("fire_drake")
    expect(loaded?.creature?.conditions).toEqual(state.creature?.conditions)
  })

  test("round-trips training fields on a v3 save", () => {
    const adapter: SaveAdapter = createMemoryAdapter()
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    if (!owned.creature) throw new Error("no creature")
    const state = {
      ...owned,
      creature: {
        ...owned.creature,
        trained: { hp: 0, atk: 3, def: 0, spd: 1 },
        trainingFocus: "atk" as const,
        trainingResult: "gained" as const,
      },
    }
    saveGame(adapter, state, 1)
    const loaded = loadGame(adapter)
    expect(loaded?.creature?.trained).toEqual({ hp: 0, atk: 3, def: 0, spd: 1 })
    expect(loaded?.creature?.trainingFocus).toBe("atk")
    expect(loaded?.creature?.trainingResult).toBe("gained")
  })

  test("loadGame rejects trained bonuses outside [0, TRAINING_CAP]", () => {
    const adapter: SaveAdapter = createMemoryAdapter()
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    if (!owned.creature) throw new Error("no creature")
    saveGame(
      adapter,
      {
        ...owned,
        creature: {
          ...owned.creature,
          trained: { hp: 0, atk: 99, def: 0, spd: 0 },
        },
      },
      1,
    )
    expect(loadGame(adapter)).toBeNull()
    saveGame(
      adapter,
      {
        ...owned,
        creature: {
          ...owned.creature,
          trained: { hp: 0, atk: -1, def: 0, spd: 0 },
        },
      },
      1,
    )
    expect(loadGame(adapter)).toBeNull()
  })

  test("loadGame rejects corrupt focus, result, or missing trained", () => {
    const adapter: SaveAdapter = createMemoryAdapter()
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    if (!owned.creature) throw new Error("no creature")
    // Ill-typed on purpose: the corrupt payload is a hand-edited save, and
    // literal types cannot express what JSON allows.
    const bad = (extra: Record<string, unknown>) =>
      ({
        ...owned,
        creature: { ...owned.creature, ...extra },
      }) as GameState
    saveGame(adapter, bad({ trained: undefined }), 1)
    expect(loadGame(adapter)).toBeNull()
    saveGame(adapter, bad({ trainingFocus: "banana" }), 1)
    expect(loadGame(adapter)).toBeNull()
    saveGame(adapter, bad({ trainingResult: "banana" }), 1)
    expect(loadGame(adapter)).toBeNull()
    saveGame(adapter, bad({ trainingFocus: 3 }), 1)
    expect(loadGame(adapter)).toBeNull()
  })

  test("loadGame rejects a creature with out-of-range conditions", () => {
    const adapter: SaveAdapter = createMemoryAdapter()
    const state = chooseStarter(createInitialState(), "fire_drake", 42)
    const broken = structuredClone(state)
    if (broken.creature) broken.creature.conditions.hunger = 150
    adapter.setItem(
      "apex.save",
      JSON.stringify({ version: 2, state: broken, savedAt: 0 }),
    )
    expect(loadGame(adapter)).toBeNull()
  })

  test("loadGame rejects a creature with non-positive stats", () => {
    const adapter: SaveAdapter = createMemoryAdapter()
    const state = chooseStarter(createInitialState(), "fire_drake", 42)
    const broken = structuredClone(state)
    if (broken.creature) broken.creature.stats.hp = 0
    adapter.setItem(
      "apex.save",
      JSON.stringify({ version: 2, state: broken, savedAt: 0 }),
    )
    expect(loadGame(adapter)).toBeNull()
  })

  test("loadGame rejects a creature with a bad element", () => {
    const adapter: SaveAdapter = createMemoryAdapter()
    const state = chooseStarter(createInitialState(), "fire_drake", 42)
    const broken = structuredClone(state)
    if (broken.creature) {
      // @ts-expect-error — deliberately corrupting the payload
      broken.creature.element = "shadow"
    }
    adapter.setItem(
      "apex.save",
      JSON.stringify({ version: 2, state: broken, savedAt: 0 }),
    )
    expect(loadGame(adapter)).toBeNull()
  })
})
