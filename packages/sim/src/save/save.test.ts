import { describe, expect, test } from "bun:test"

import { createCreature } from "../creature"
import {
  chooseStarter,
  createInitialState,
  type GameState,
  setArenaCamera,
  setReducedMotion,
} from "../state"
import { advanceDay } from "../ticker"
import { migrate, validateStateShape } from "./migrate"
import { SAVE_VERSION, type SaveData, serializeSave } from "./schema"
import {
  createMemoryAdapter,
  loadGame,
  type SaveAdapter,
  saveGame,
} from "./storage"

describe("save schema", () => {
  test("current version is 7", () => {
    expect(SAVE_VERSION).toBe(7)
  })

  test("serializeSave wraps state with version metadata", () => {
    const data: SaveData = {
      version: SAVE_VERSION,
      state: createInitialState(),
      savedAt: 1000,
    }
    const json = serializeSave(data)
    const parsed = JSON.parse(json) as SaveData
    expect(parsed.version).toBe(7)
    expect(parsed.state.day).toBe(1)
    expect(parsed.savedAt).toBe(1000)
  })
})

describe("migration chain", () => {
  test("migrates a synthetic v0 save to current", () => {
    // v0 predates the versioned schema: flat shape, no phase/AP.
    const v0 = { version: 0, day: 7 }
    const migrated = migrate(v0)
    expect(migrated.version).toBe(7)
    expect(migrated.state.day).toBe(7)
    expect(migrated.state.phase).toBe("cup")
    expect(migrated.state.cupsWon).toBe(0)
    expect(migrated.state.lastCupDay).toBeNull()
    expect(migrated.state.actionPoints).toBeGreaterThan(0)
  })

  test("v0 day 3 lands in the day phase", () => {
    const migrated = migrate({ version: 0, day: 3 })
    expect(migrated.state.phase).toBe("day")
  })

  test("migrates a v1 save through to v5, granting the default Fire drake starter", () => {
    // v1 shape: GameState without a creature (pre-care-loop saves).
    const v1 = {
      version: 1,
      state: { day: 4, phase: "day", actionPoints: 2 },
      savedAt: 1234,
    }
    const migrated = migrate(v1)
    expect(migrated.version).toBe(7)
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

  test("migrates a v2 save through to v5, granting neutral training fields", () => {
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
    expect(migrated.version).toBe(7)
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

  test("a v1 save walks v1→v5 with the credited trained days", () => {
    const migrated = migrate({
      version: 1,
      state: { day: 2, phase: "day", actionPoints: 3 },
      savedAt: 0,
    })
    expect(migrated.version).toBe(7)
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
    expect(migrated.state.creature?.fedToday).toBe(false)
  })

  test("a v3 save migrates to v5: fedToday false, 6 trained days, null loadout, stats intact", () => {
    // v3 creatures predate the v4 fields — strip all of them.
    const creature = createCreature("fire_drake", 42)
    const legacy = structuredClone(creature) as unknown as Record<
      string,
      unknown
    >
    delete legacy.fedToday
    delete legacy.trainingDays
    delete legacy.loadout
    const v3 = {
      version: 3,
      state: { day: 9, phase: "day", actionPoints: 1, creature: legacy },
      savedAt: 321,
    }
    const migrated = migrate(v3)
    expect(migrated.version).toBe(7)
    expect(migrated.savedAt).toBe(321)
    expect(migrated.state.day).toBe(9)
    expect(migrated.state.creature?.fedToday).toBe(false)
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

describe("validateStateShape — shared migration validator", () => {
  const good = { day: 3, phase: "day", actionPoints: 2 }

  const badCases: Array<[string, Record<string, unknown>]> = [
    ["missing state", {}],
    ["negative day", { day: -1, phase: "day", actionPoints: 2 }],
    ["fractional day", { day: 1.5, phase: "day", actionPoints: 2 }],
    ["bad phase", { day: 1, phase: "banana", actionPoints: 2 }],
    ["negative AP", { day: 1, phase: "day", actionPoints: -2 }],
    ["fractional AP", { day: 1, phase: "day", actionPoints: 1.5 }],
    ["missing AP", { day: 1, phase: "day" }],
  ]

  test("accepts a well-shaped state and returns the validated scalars", () => {
    const out = validateStateShape({ state: good }, 4)
    expect(out).toEqual({ day: 3, phase: "day", actionPoints: 2, state: good })
  })

  for (const [label, state] of badCases) {
    test(`rejects: ${label} (version-tagged message)`, () => {
      try {
        validateStateShape({ state }, 4)
        throw new Error(`expected rejection for ${label}`)
      } catch (err) {
        expect((err as Error).message).toContain("invalid v4 save")
        expect((err as Error).message).not.toContain("expected rejection")
      }
    })
  }

  test("the version tag follows the migration step, not the payload", () => {
    try {
      validateStateShape({ state: { day: -1 } }, 5)
      throw new Error("expected rejection")
    } catch (err) {
      expect((err as Error).message).toContain("invalid v5 save")
    }
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

  test("saveGame reports failure instead of throwing when the adapter rejects writes", () => {
    const state = chooseStarter(createInitialState(), "fire_drake", 42)
    const boom: SaveAdapter = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota exceeded")
      },
    }
    expect(saveGame(boom, state, 1)).toBe(false)
    expect(saveGame(createMemoryAdapter(), state, 1)).toBe(true)
  })

  test("loadGame rejects a save referencing an unknown species", () => {
    // Hand-edited save: everything else is well-formed, but the speciesId
    // does not exist in the catalog. The client would crash on first render
    // ("Unknown species") — the load must reject it instead.
    const adapter: SaveAdapter = createMemoryAdapter()
    const state = advanceDay(
      chooseStarter(createInitialState(), "fire_drake", 42),
    )
    saveGame(adapter, state, 500)
    const data = JSON.parse(adapter.getItem("apex.save") ?? "{}") as {
      state: { creature: { speciesId: string } }
    }
    data.state.creature.speciesId = "shadow_dragon"
    adapter.setItem("apex.save", JSON.stringify(data))
    expect(loadGame(adapter)).toBeNull()
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

  test("round-trips training fields on a current save", () => {
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
        fedToday: true,
      },
    }
    saveGame(adapter, state, 1)
    const loaded = loadGame(adapter)
    expect(loaded?.creature?.trained).toEqual({ hp: 0, atk: 3, def: 0, spd: 1 })
    expect(loaded?.creature?.trainingFocus).toBe("atk")
    expect(loaded?.creature?.trainingResult).toBe("gained")
    expect(loaded?.creature?.fedToday).toBe(true)
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
    saveGame(adapter, bad({ fedToday: "yes" }), 1)
    expect(loadGame(adapter)).toBeNull()
    saveGame(adapter, bad({ fedToday: undefined }), 1)
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

describe("reduced motion preference (v5)", () => {
  test("fresh state defaults to full motion", () => {
    expect(createInitialState().settings.reducedMotion).toBe(false)
  })

  test("a v4 save migrates with the reduced-motion default", () => {
    const state = chooseStarter(createInitialState(), "fire_drake", 42)
    const v4 = JSON.stringify({ version: 4, state, savedAt: 55 })
    const adapter = createMemoryAdapter()
    adapter.setItem("apex.save", v4)
    const loaded = loadGame(adapter)
    expect(loaded).not.toBeNull()
    expect(loaded?.settings.reducedMotion).toBe(false)
  })

  test("the preference round-trips through saveGame/loadGame", () => {
    const adapter = createMemoryAdapter()
    const enabled = setReducedMotion(
      chooseStarter(createInitialState(), "fire_drake", 42),
      true,
    )
    saveGame(adapter, enabled, 900)
    const loaded = loadGame(adapter)
    expect(loaded?.settings.reducedMotion).toBe(true)
  })

  test("setReducedMotion turns the toggle both ways", () => {
    const base = chooseStarter(createInitialState(), "fire_drake", 42)
    const on = setReducedMotion(base, true)
    const off = setReducedMotion(on, false)
    expect(on.settings.reducedMotion).toBe(true)
    expect(off.settings.reducedMotion).toBe(false)
  })

  test("loadGame rejects a corrupt settings object", () => {
    const adapter = createMemoryAdapter()
    const state = chooseStarter(createInitialState(), "fire_drake", 42)
    const wrong = {
      day: state.day,
      phase: state.phase,
      actionPoints: state.actionPoints,
      creature: state.creature,
      settings: { reducedMotion: "yes" },
    }
    adapter.setItem(
      "apex.save",
      JSON.stringify({ version: 4, state: wrong, savedAt: 0 }),
    )
    expect(loadGame(adapter)).toBeNull()
  })
})

describe("evolution stage (v6)", () => {
  /** Rng stub that never rolls a sickness onset (see evolution.test.ts). */
  const CALM_RNG = { next: () => 0.99, int: () => 0 }

  test("a v5 save migrates to v6 with the sickness cooldown stamped clean", () => {
    // v5 creatures predate the cooldown field — strip it from a fresh one.
    const creature = createCreature("fire_drake", 42)
    const legacy = structuredClone(creature) as unknown as Record<
      string,
      unknown
    >
    delete legacy.sickCooldown
    const v5 = {
      version: 5,
      state: { day: 8, phase: "day", actionPoints: 2, creature: legacy },
      savedAt: 321,
    }
    const migrated = migrate(v5)
    expect(migrated.version).toBe(7)
    expect(migrated.savedAt).toBe(321)
    expect(migrated.state.day).toBe(8)
    expect(migrated.state.creature?.sickCooldown).toBe(0)
    // Migration rewrites nothing about maturity: a v5 creature wakes as it
    // slept, and the next settlement's gate decides its stage.
    expect(migrated.state.creature?.stage).toBe("baby")
    expect(migrated.state.creature?.stats).toEqual(creature.stats)
  })

  test("a chain-migrated save (v1 to v6) keeps a clean cooldown too", () => {
    const migrated = migrate({
      version: 1,
      state: { day: 2, phase: "day", actionPoints: 3 },
      savedAt: 0,
    })
    expect(migrated.version).toBe(7)
    expect(migrated.state.creature?.sickCooldown).toBe(0)
  })

  test("a migrated v5 creature at day 10 evolves on its next settled night", () => {
    const creature = createCreature("fire_drake", 42)
    const legacy = structuredClone(creature) as unknown as Record<
      string,
      unknown
    >
    delete legacy.sickCooldown
    const v5 = {
      version: 5,
      state: {
        day: 10,
        phase: "day",
        actionPoints: 2,
        creature: legacy,
        settings: { reducedMotion: false },
        cupsWon: 0,
        lastCupDay: null,
      },
      savedAt: 0,
    }
    const adapter = createMemoryAdapter()
    adapter.setItem("apex.save", JSON.stringify(v5))
    const loaded = loadGame(adapter)
    expect(loaded).not.toBeNull()
    const next = advanceDay(
      loaded as Parameters<typeof advanceDay>[0],
      CALM_RNG,
    )
    expect(next.creature?.stage).toBe("juvenile")
  })

  test("sickCooldown round-trips through saveGame/loadGame", () => {
    const adapter = createMemoryAdapter()
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    if (!owned.creature) throw new Error("no creature")
    saveGame(
      adapter,
      { ...owned, creature: { ...owned.creature, sickCooldown: 2 } },
      1,
    )
    const loaded = loadGame(adapter)
    expect(loaded?.creature?.sickCooldown).toBe(2)
  })

  test("loadGame rejects a corrupt sickCooldown", () => {
    const adapter = createMemoryAdapter()
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    if (!owned.creature) throw new Error("no creature")
    // Ill-typed on purpose: the corrupt payload is a hand-edited save, and
    // literal types cannot express what JSON allows.
    const bad = (extra: Record<string, unknown>) =>
      ({
        ...owned,
        creature: { ...owned.creature, ...extra },
      }) as GameState
    saveGame(adapter, bad({ sickCooldown: 4 }), 1)
    expect(loadGame(adapter)).toBeNull()
    saveGame(adapter, bad({ sickCooldown: -1 }), 1)
    expect(loadGame(adapter)).toBeNull()
    saveGame(adapter, bad({ sickCooldown: "soon" }), 1)
    expect(loadGame(adapter)).toBeNull()
    saveGame(adapter, bad({ sickCooldown: undefined }), 1)
    expect(loadGame(adapter)).toBeNull()
  })
})

describe("arena camera preference (v7)", () => {
  test("fresh state defaults to the cinematic director", () => {
    expect(createInitialState().settings.arenaCamera).toBe("cinematic")
  })

  test("a v6 save migrates with the arena-camera default", () => {
    const state = chooseStarter(createInitialState(), "fire_drake", 42)
    const v6 = {
      version: 6,
      state: {
        ...state,
        settings: { reducedMotion: false },
      },
      savedAt: 55,
    }
    const adapter = createMemoryAdapter()
    adapter.setItem("apex.save", JSON.stringify(v6))
    const loaded = loadGame(adapter)
    expect(loaded).not.toBeNull()
    expect(loaded?.settings.arenaCamera).toBe("cinematic")
  })

  test("the camera preference round-trips through saveGame/loadGame", () => {
    const adapter = createMemoryAdapter()
    const tuned = setArenaCamera(
      chooseStarter(createInitialState(), "fire_drake", 42),
      "broadcast",
    )
    saveGame(adapter, tuned, 900)
    const loaded = loadGame(adapter)
    expect(loaded?.settings.arenaCamera).toBe("broadcast")
  })

  test("setArenaCamera turns the toggle both ways", () => {
    const base = chooseStarter(createInitialState(), "fire_drake", 42)
    const calm = setArenaCamera(base, "broadcast")
    const cine = setArenaCamera(calm, "cinematic")
    expect(calm.settings.arenaCamera).toBe("broadcast")
    expect(cine.settings.arenaCamera).toBe("cinematic")
  })

  test("loadGame rejects a corrupt camera preference", () => {
    const adapter = createMemoryAdapter()
    const state = chooseStarter(createInitialState(), "fire_drake", 42)
    const wrong = {
      day: state.day,
      phase: state.phase,
      actionPoints: state.actionPoints,
      creature: state.creature,
      cupsWon: 0,
      lastCupDay: null,
      settings: { reducedMotion: false, arenaCamera: "wall" },
    }
    adapter.setItem(
      "apex.save",
      JSON.stringify({ version: 7, state: wrong, savedAt: 0 }),
    )
    expect(loadGame(adapter)).toBeNull()
  })
})
