import { describe, expect, test } from "bun:test"

import { createCreature } from "../creature"
import { type CupSession, resolvePlayerMatch } from "../cup"
import { applyCupPlacement } from "../ladder"
import { defaultLoadout } from "../loadout"
import { prepareCup } from "../machine"
import { getSpecies, type SpeciesDef } from "../species"
import {
  chooseStarter,
  createInitialState,
  type GameState,
  markHintSeen,
  setArenaCamera,
  setMuted,
  setReducedMotion,
} from "../state"
import { advanceDay } from "../ticker"
import { migrate, validateStateShape } from "./migrate"
import { SAVE_VERSION, type SaveData, serializeSave } from "./schema"
import {
  clearSave,
  createMemoryAdapter,
  loadBoot,
  loadGame,
  loadSave,
  SAVE_KEY,
  type SaveAdapter,
  saveGame,
} from "./storage"

describe("save schema", () => {
  test("current version matches the schema", () => {
    expect(SAVE_VERSION).toBe(19)
  })

  test("serializeSave wraps state with version metadata", () => {
    const data: SaveData = {
      version: SAVE_VERSION,
      state: createInitialState(),
      session: null,
      savedAt: 1000,
    }
    const json = serializeSave(data)
    const parsed = JSON.parse(json) as SaveData
    expect(parsed.version).toBe(SAVE_VERSION)
    expect(parsed.state.day).toBe(1)
    expect(parsed.savedAt).toBe(1000)
  })
})

describe("migration chain", () => {
  test("migrates a synthetic v0 save to current", () => {
    // v0 predates the versioned schema: flat shape, no phase/AP.
    const v0 = { version: 0, day: 7 }
    const migrated = migrate(v0)
    expect(migrated.version).toBe(SAVE_VERSION)
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
    expect(migrated.version).toBe(SAVE_VERSION)
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
      session: null,
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
    delete legacy.trainingProgram
    delete legacy.trainingResult
    const v2 = {
      version: 2,
      state: { day: 5, phase: "day", actionPoints: 2, creature: legacy },
      savedAt: 99,
    }
    const migrated = migrate(v2)
    expect(migrated.version).toBe(SAVE_VERSION)
    expect(migrated.savedAt).toBe(99)
    expect(migrated.state.day).toBe(5)
    expect(migrated.state.actionPoints).toBe(2)
    expect(migrated.state.creature?.trained).toEqual({
      hp: 0,
      atk: 0,
      def: 0,
      spd: 0,
    })
    expect(migrated.state.creature?.trainingProgram).toBeNull()
    expect(migrated.state.creature?.trainingResult).toBeNull()
    // v12 doubles the stored HP (old-scale save); the rest of the stats
    // pass through untouched.
    expect(migrated.state.creature?.stats).toEqual({
      ...creature.stats,
      hp: creature.stats.hp * 2,
    })
  })

  test("a v1 save walks v1→v5 with the credited trained days", () => {
    const migrated = migrate({
      version: 1,
      state: { day: 2, phase: "day", actionPoints: 3 },
      savedAt: 0,
    })
    expect(migrated.version).toBe(SAVE_VERSION)
    expect(migrated.state.creature?.trained).toEqual({
      hp: 0,
      atk: 0,
      def: 0,
      spd: 0,
    })
    expect(migrated.state.creature?.trainingProgram).toBeNull()
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
    expect(migrated.version).toBe(SAVE_VERSION)
    expect(migrated.savedAt).toBe(321)
    expect(migrated.state.day).toBe(9)
    expect(migrated.state.creature?.fedToday).toBe(false)
    expect(migrated.state.creature?.trainingDays).toBe(6)
    expect(migrated.state.creature?.loadout).toBeNull()
    // v12 doubles the stored HP (old-scale save); trained stays raw.
    expect(migrated.state.creature?.stats).toEqual({
      ...creature.stats,
      hp: creature.stats.hp * 2,
    })
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

  test("a champion-stage creature round-trips on the current save version", () => {
    const adapter = createMemoryAdapter()
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    if (!owned.creature) throw new Error("no creature")
    const state = {
      ...owned,
      creature: { ...owned.creature, stage: "champion" as const },
    }
    saveGame(adapter, state, 8)
    const loaded = loadGame(adapter)
    expect(loaded?.creature?.stage).toBe("champion")
  })

  test("an unknown stage still rejects the load", () => {
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    if (!owned.creature) throw new Error("no creature")
    const adapter: SaveAdapter = createMemoryAdapter()
    adapter.setItem(
      "apex.save",
      JSON.stringify({
        version: SAVE_VERSION,
        state: {
          ...owned,
          creature: { ...owned.creature, stage: "elder" },
        },
        savedAt: 8,
      }),
    )
    expect(loadGame(adapter)).toBeNull()
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
      removeItem: () => {},
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
        trainingProgram: "power" as const,
        trainingResult: "gained" as const,
        fedToday: true,
      },
    }
    saveGame(adapter, state, 1)
    const loaded = loadGame(adapter)
    expect(loaded?.creature?.trained).toEqual({ hp: 0, atk: 3, def: 0, spd: 1 })
    expect(loaded?.creature?.trainingProgram).toBe("power")
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

  test("loadGame rejects corrupt program, result, or missing trained", () => {
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
    saveGame(adapter, bad({ trainingProgram: "banana" }), 1)
    expect(loadGame(adapter)).toBeNull()
    saveGame(adapter, bad({ trainingResult: "banana" }), 1)
    expect(loadGame(adapter)).toBeNull()
    saveGame(adapter, bad({ trainingProgram: 3 }), 1)
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
    expect(migrated.version).toBe(SAVE_VERSION)
    expect(migrated.savedAt).toBe(321)
    expect(migrated.state.day).toBe(8)
    expect(migrated.state.creature?.sickCooldown).toBe(0)
    // Migration rewrites nothing about maturity: a v5 creature wakes as it
    // slept, and the next settlement's gate decides its stage. (v12 doubles
    // the stored HP — old-scale save.)
    expect(migrated.state.creature?.stage).toBe("baby")
    expect(migrated.state.creature?.stats).toEqual({
      ...creature.stats,
      hp: creature.stats.hp * 2,
    })
  })

  test("a chain-migrated save (v1 to v6) keeps a clean cooldown too", () => {
    const migrated = migrate({
      version: 1,
      state: { day: 2, phase: "day", actionPoints: 3 },
      savedAt: 0,
    })
    expect(migrated.version).toBe(SAVE_VERSION)
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

describe("save v7 — cup session, rename, hints", () => {
  test("current version matches the schema", () => {
    expect(SAVE_VERSION).toBe(19)
  })

  test("a v6 save migrates cleanly: null session + a clean hint ledger", () => {
    const state = chooseStarter(createInitialState(), "fire_drake", 42)
    const migrated = migrate({ version: 6, state, savedAt: 321 })
    expect(migrated.version).toBe(SAVE_VERSION)
    expect(migrated.savedAt).toBe(321)
    expect(migrated.session).toBeNull()
    expect(migrated.state.settings.seenHints).toEqual([])
  })

  test("a chain-migrated save carries the v7 defaults too", () => {
    const migrated = migrate({ version: 0, day: 7 })
    expect(migrated.version).toBe(SAVE_VERSION)
    expect(migrated.session).toBeNull()
    expect(migrated.state.settings.seenHints).toEqual([])
  })

  test("a fresh cup session round-trips through saveGame/loadSave", () => {
    const adapter = createMemoryAdapter()
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    const session = prepareCup(owned)
    if (!session) throw new Error("no session")
    saveGame(adapter, owned, 1000, session)
    const loaded = loadSave(adapter)
    expect(loaded).not.toBeNull()
    expect(loaded?.session).toEqual(session)
    // The restored session is live: the player's first match still pends.
    expect(loaded?.session?.status).toBe("player-turn")
    expect(loaded?.session?.nextPlayerRound).toBe(1)
  })

  test("a mid-cup session (one match played) survives the round-trip", () => {
    const adapter = createMemoryAdapter()
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    if (!owned.creature) throw new Error("no creature")
    const fresh = prepareCup(owned)
    if (!fresh) throw new Error("no session")
    const resolved = resolvePlayerMatch(
      fresh,
      defaultLoadout(
        owned.creature,
        getSpecies(owned.creature.speciesId) as SpeciesDef,
      ),
      "balanced",
    )
    saveGame(adapter, owned, 1000, resolved.session)
    const loaded = loadSave(adapter)
    // Outcome-agnostic: whatever the seeded bracket decided, the persisted
    // session must come back byte-identical so the walk can resume.
    expect(loaded?.session).toEqual(resolved.session)
    expect(loaded?.session?.status).toBe(resolved.session.status)
  })

  test("saveGame defaults the session to null when none is passed", () => {
    const adapter = createMemoryAdapter()
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    saveGame(adapter, owned, 1)
    expect(loadSave(adapter)?.session).toBeNull()
  })

  test("loadSave drops a corrupt session but keeps the state", () => {
    const adapter = createMemoryAdapter()
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    const session = prepareCup(owned)
    if (!session) throw new Error("no session")
    saveGame(adapter, owned, 1000, session)
    const data = JSON.parse(adapter.getItem("apex.save") ?? "{}") as Record<
      string,
      unknown
    >
    data.session = { bracket: 5 } // hand-corrupted payload
    adapter.setItem("apex.save", JSON.stringify(data))
    const loaded = loadSave(adapter)
    expect(loaded).not.toBeNull()
    expect(loaded?.state.day).toBe(owned.day)
    expect(loaded?.session).toBeNull()
  })

  test("loadGame still returns just the state", () => {
    const adapter = createMemoryAdapter()
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    const session = prepareCup(owned)
    if (!session) throw new Error("no session")
    saveGame(adapter, owned, 1000, session)
    const state = loadGame(adapter)
    expect(state).not.toBeNull()
    expect(state?.day).toBe(1)
  })

  test("seenHints round-trips through saveGame/loadGame", () => {
    const adapter = createMemoryAdapter()
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    const marked: GameState = {
      ...owned,
      settings: {
        reducedMotion: false,
        seenHints: ["ap"],
        arenaCamera: "cinematic",
        muted: false,
        musicVolume: 1,
        sfxVolume: 1,
      },
    }
    saveGame(adapter, marked, 1)
    expect(loadGame(adapter)?.settings.seenHints).toEqual(["ap"])
  })

  test("loadGame rejects a corrupt seenHints ledger", () => {
    const adapter = createMemoryAdapter()
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    const bad = (settings: unknown) => ({ ...owned, settings }) as GameState
    saveGame(
      adapter,
      bad({ reducedMotion: false, seenHints: "ap", arenaCamera: "cinematic" }),
      1,
    )
    expect(loadGame(adapter)).toBeNull()
    saveGame(
      adapter,
      bad({ reducedMotion: false, seenHints: [3], arenaCamera: "cinematic" }),
      1,
    )
    expect(loadGame(adapter)).toBeNull()
    saveGame(
      adapter,
      bad({
        reducedMotion: false,
        seenHints: undefined,
        arenaCamera: "cinematic",
      }),
      1,
    )
    expect(loadGame(adapter)).toBeNull()
  })
})

describe("loadBoot — absent vs corrupt", () => {
  const startState = (): GameState => {
    const state = advanceDay(createInitialState())
    return chooseStarter(state, "fire_drake", 42)
  }

  test("returns null when no save exists (fresh start, no notice)", () => {
    const adapter: SaveAdapter = createMemoryAdapter()
    expect(loadBoot(adapter)).toBeNull()
  })

  test("flags corrupt JSON as unreadable (notice-worthy)", () => {
    const adapter: SaveAdapter = createMemoryAdapter()
    adapter.setItem("apex.save", "{not valid json!!")
    expect(loadBoot(adapter)).toEqual({ corrupt: true })
  })

  test("flags a shape-corrupt state as unreadable (notice-worthy)", () => {
    const adapter: SaveAdapter = createMemoryAdapter()
    const good = startState()
    saveGame(adapter, good, 1)
    adapter.setItem(
      "apex.save",
      JSON.stringify({ version: SAVE_VERSION, state: { day: "seven" } }),
    )
    expect(loadBoot(adapter)).toEqual({ corrupt: true })
  })

  test("flags an unreadable future version as unreadable", () => {
    const adapter: SaveAdapter = createMemoryAdapter()
    adapter.setItem("apex.save", JSON.stringify({ version: 99, state: {} }))
    expect(loadBoot(adapter)).toEqual({ corrupt: true })
  })

  test("returns state + session when the save is healthy", () => {
    const adapter: SaveAdapter = createMemoryAdapter()
    const state = startState()
    const session = prepareCup(state)
    saveGame(adapter, state, 1000, session)
    expect(loadBoot(adapter)).toEqual({ state, session })
  })

  test("a healthy save with a dropped session still boots clean", () => {
    const adapter: SaveAdapter = createMemoryAdapter()
    const state = startState()
    saveGame(adapter, state, 1000, { bracket: 5 } as unknown as CupSession)
    const boot = loadBoot(adapter)
    expect(boot).toEqual({ state, session: null })
  })
})

const startState = (): GameState => {
  const state = advanceDay(createInitialState())
  return chooseStarter(state, "fire_drake", 42)
}

describe("clearSave + hint ledger (v7)", () => {
  test("clearSave wipes the save so boot reads as absent, not corrupt", () => {
    const adapter = createMemoryAdapter()
    saveGame(adapter, startState(), 500)
    clearSave(adapter)
    expect(adapter.getItem(SAVE_KEY)).toBe(null)
    expect(loadBoot(adapter)).toBe(null)
  })

  test("clearSave on an empty adapter is a no-op", () => {
    const adapter = createMemoryAdapter()
    expect(() => clearSave(adapter)).not.toThrow()
    expect(loadBoot(adapter)).toBe(null)
  })

  test("markHintSeen appends a hint id once (idempotent)", () => {
    const base = startState()
    const seen = markHintSeen(base, "ap-basics")
    expect(seen.settings.seenHints).toEqual(["ap-basics"])
    const again = markHintSeen(seen, "ap-basics")
    expect(again.settings.seenHints).toEqual(["ap-basics"])
    const more = markHintSeen(again, "cup-eve")
    expect(more.settings.seenHints).toEqual(["ap-basics", "cup-eve"])
  })

  test("markHintSeen is pure — the input state is untouched", () => {
    const base = startState()
    const snapshot = structuredClone(base)
    markHintSeen(base, "training-tier")
    expect(base).toEqual(snapshot)
  })

  test("seen hint ledger survives a save round-trip", () => {
    const adapter = createMemoryAdapter()
    const withHints = markHintSeen(
      markHintSeen(startState(), "ap-basics"),
      "cup-eve",
    )
    saveGame(adapter, withHints, 900)
    const loaded = loadSave(adapter)
    expect(loaded?.state.settings.seenHints).toEqual(["ap-basics", "cup-eve"])
  })
})

describe("save v8 — the ladder (bronze ladder)", () => {
  /** A genuine v7-shaped payload: today's state minus the ladder slice. */
  function v7Payload(): Record<string, unknown> {
    const state = structuredClone(createInitialState()) as unknown as Record<
      string,
      unknown
    >
    delete state.ladder
    return { version: 7, state, session: null, savedAt: 99 }
  }

  test("a v7 save migrates to the current version with a fresh ladder (no backfill)", () => {
    const migrated = migrate(v7Payload())
    expect(migrated.version).toBe(SAVE_VERSION)
    expect(migrated.state.ladder).toEqual({
      points: 0,
      tier: "bronze",
      subTier: "III",
    })
  })

  test("the migrated v8 save loads and plays a cup into the ladder", () => {
    const adapter = createMemoryAdapter()
    adapter.setItem(SAVE_KEY, JSON.stringify(v7Payload()))
    const state = loadGame(adapter)
    if (!state) throw new Error("the migrated v7 save failed to load")
    const laddered = applyCupPlacement(state, 1, false)
    expect(laddered.state.ladder).toEqual({
      points: 3,
      tier: "bronze",
      subTier: "III",
    })
  })

  test("saveGame then loadGame round-trips ladder points", () => {
    const adapter = createMemoryAdapter()
    const laddered = applyCupPlacement(createInitialState(), 1, false).state
    const climbed = applyCupPlacement(laddered, 1, false).state // 6 → Bronze II
    expect(saveGame(adapter, climbed, 123)).toBe(true)
    const loaded = loadGame(adapter)
    expect(loaded?.ladder).toEqual({ points: 6, tier: "bronze", subTier: "II" })
  })

  test("loadGame rejects a ladder with a negative point total", () => {
    const adapter = createMemoryAdapter()
    saveGame(adapter, createInitialState(), 1)
    const raw = JSON.parse(adapter.getItem(SAVE_KEY) as string) as Record<
      string,
      unknown
    >
    const state = raw.state as Record<string, unknown>
    state.ladder = { points: -1, subTier: "III" }
    adapter.setItem(SAVE_KEY, JSON.stringify(raw))
    expect(loadGame(adapter)).toBeNull()
  })

  test("loadGame rejects a ladder with a non-integer point total", () => {
    const adapter = createMemoryAdapter()
    saveGame(adapter, createInitialState(), 1)
    const raw = JSON.parse(adapter.getItem(SAVE_KEY) as string) as Record<
      string,
      unknown
    >
    const state = raw.state as Record<string, unknown>
    state.ladder = { points: 2.5, subTier: "II" }
    adapter.setItem(SAVE_KEY, JSON.stringify(raw))
    expect(loadGame(adapter)).toBeNull()
  })

  test("loadGame rejects a ladder with an unknown sub-tier", () => {
    const adapter = createMemoryAdapter()
    saveGame(adapter, createInitialState(), 1)
    const raw = JSON.parse(adapter.getItem(SAVE_KEY) as string) as Record<
      string,
      unknown
    >
    const state = raw.state as Record<string, unknown>
    state.ladder = { points: 6, subTier: "IV" }
    adapter.setItem(SAVE_KEY, JSON.stringify(raw))
    expect(loadGame(adapter)).toBeNull()
  })

  test("loadGame rejects a save whose ladder slice is missing entirely", () => {
    const adapter = createMemoryAdapter()
    saveGame(adapter, createInitialState(), 1)
    const raw = JSON.parse(adapter.getItem(SAVE_KEY) as string) as Record<
      string,
      unknown
    >
    const state = raw.state as Record<string, unknown>
    delete state.ladder
    adapter.setItem(SAVE_KEY, JSON.stringify(raw))
    expect(loadGame(adapter)).toBeNull()
  })
})

describe("save v11 — silver ladder tier + boss defeat ledger", () => {
  /**
   * A genuine v10-shaped payload: today's state with the v11 fields shaped
   * back — the ladder lacks `tier` (v10 ladder was bronze-only) and the
   * state lacks `bossDefeats`. Carries banked points to prove the migration
   * preserves ladder progress (unlike the fresh-ladder v7/v8 stamps).
   */
  function v10Payload(): Record<string, unknown> {
    const state = structuredClone(createInitialState()) as unknown as Record<
      string,
      unknown
    >
    state.ladder = { points: 14, subTier: "I" }
    delete state.bossDefeats
    return { version: 10, state, session: null, savedAt: 77 }
  }

  test("SAVE_VERSION is 18", () => {
    expect(SAVE_VERSION).toBe(19)
  })

  test("a v10 save migrates: the ladder keeps its points and gains tier bronze", () => {
    const migrated = migrate(v10Payload())
    expect(migrated.version).toBe(SAVE_VERSION)
    expect(migrated.state.ladder).toEqual({
      points: 14,
      tier: "bronze",
      subTier: "I",
    })
  })

  test("a v10 save migrates with an empty boss defeat ledger", () => {
    const migrated = migrate(v10Payload())
    expect(migrated.state.bossDefeats).toEqual([])
  })

  test("a migrated v10 save loads and stays playable", () => {
    const adapter = createMemoryAdapter()
    adapter.setItem(SAVE_KEY, JSON.stringify(v10Payload()))
    const state = loadGame(adapter)
    expect(state).not.toBeNull()
    expect(state?.ladder.tier).toBe("bronze")
    expect(state?.bossDefeats).toEqual([])
  })

  test("saveGame then loadGame round-trips a silver ladder and the ledger", () => {
    const adapter = createMemoryAdapter()
    const silver = {
      ...createInitialState(),
      ladder: { points: 22, tier: "silver" as const, subTier: "II" as const },
      bossDefeats: ["koda"],
    }
    expect(saveGame(adapter, silver, 123)).toBe(true)
    const loaded = loadGame(adapter)
    expect(loaded?.ladder).toEqual({
      points: 22,
      tier: "silver",
      subTier: "II",
    })
    expect(loaded?.bossDefeats).toEqual(["koda"])
  })

  test("loadGame rejects a ladder with an unknown tier", () => {
    const adapter = createMemoryAdapter()
    saveGame(adapter, createInitialState(), 1)
    const raw = JSON.parse(adapter.getItem(SAVE_KEY) as string) as Record<
      string,
      unknown
    >
    const state = raw.state as Record<string, unknown>
    const ladder = state.ladder as Record<string, unknown>
    ladder.tier = "platinum"
    adapter.setItem(SAVE_KEY, JSON.stringify(raw))
    expect(loadGame(adapter)).toBeNull()
  })

  test("loadGame rejects a non-array boss defeat ledger", () => {
    const adapter = createMemoryAdapter()
    saveGame(adapter, createInitialState(), 1)
    const raw = JSON.parse(adapter.getItem(SAVE_KEY) as string) as Record<
      string,
      unknown
    >
    const state = raw.state as Record<string, unknown>
    state.bossDefeats = "koda"
    adapter.setItem(SAVE_KEY, JSON.stringify(raw))
    expect(loadGame(adapter)).toBeNull()
  })

  test("loadGame rejects a ledger with non-string entries", () => {
    const adapter = createMemoryAdapter()
    saveGame(adapter, createInitialState(), 1)
    const raw = JSON.parse(adapter.getItem(SAVE_KEY) as string) as Record<
      string,
      unknown
    >
    const state = raw.state as Record<string, unknown>
    state.bossDefeats = ["koda", 7]
    adapter.setItem(SAVE_KEY, JSON.stringify(raw))
    expect(loadGame(adapter)).toBeNull()
  })

  test("loadGame rejects a save whose boss defeat ledger is missing", () => {
    const adapter = createMemoryAdapter()
    saveGame(adapter, createInitialState(), 1)
    const raw = JSON.parse(adapter.getItem(SAVE_KEY) as string) as Record<
      string,
      unknown
    >
    const state = raw.state as Record<string, unknown>
    delete state.bossDefeats
    adapter.setItem(SAVE_KEY, JSON.stringify(raw))
    expect(loadGame(adapter)).toBeNull()
  })
})

describe("save v12 - element chart HP scale (v11 -> v12)", () => {
  // element_chart_20261016 doubled every creature's HP scale. A v11 save
  // holds old-scale HP everywhere: the live creature, every cup-session
  // slot (rivals AND the player snapshot), the final rival, and every
  // Hall of Fame record. The migration doubles exactly the stored HP
  // magnitudes and touches nothing else - trained bonuses, atk/def/spd,
  // ladder, and the ledger are scale-free.
  test("SAVE_VERSION is 18", () => {
    expect(SAVE_VERSION).toBe(19)
  })

  /** A v11-shaped payload: fresh state with every stored HP halved to the
   * old scale, plus a real session snapshot and one Hall of Fame record. */
  const v11Payload = () => {
    const state = chooseStarter(createInitialState(), "fire_drake", 42)
    const creature = state.creature
    if (!creature) throw new Error("no creature")
    const halvedCreature = {
      ...creature,
      stats: { ...creature.stats, hp: Math.floor(creature.stats.hp / 2) },
    }
    const session = prepareCup(state)
    if (!session) throw new Error("no session")
    const halvedSlots = session.bracket.slots.map((slot) => ({
      ...slot,
      stats: { ...slot.stats, hp: Math.floor(slot.stats.hp / 2) },
    }))
    const finalRival = session.bracket.finalRival
    const halvedSession = {
      ...session,
      bracket: {
        ...session.bracket,
        slots: halvedSlots,
        finalRival: {
          ...finalRival,
          stats: {
            ...finalRival.stats,
            hp: Math.floor(finalRival.stats.hp / 2),
          },
        },
      },
    }
    const halvedState: GameState = {
      ...state,
      creature: halvedCreature,
      lineage: {
        generation: 1,
        hallOfFame: [
          {
            name: "Founder Ember",
            speciesId: "fire_drake",
            archetypeId: creature.archetypeId,
            element: "fire",
            stats: { ...creature.stats, hp: Math.floor(creature.stats.hp / 2) },
            trained: { hp: 4, atk: 2, def: 1, spd: 0 },
            cupsWon: 2,
            generation: 0,
            retiredOnDay: 60,
            traits: [],
            parents: [],
            branch: "legacy",
          },
        ],
      },
    }
    return {
      version: 11,
      state: halvedState,
      session: halvedSession,
      savedAt: 55,
    }
  }

  test("a v11 save migrates with every stored HP doubled", () => {
    const payload = v11Payload()
    const creatureHp = payload.state.creature?.stats.hp ?? 0
    const migrated = migrate(payload)
    expect(migrated.version).toBe(SAVE_VERSION)
    expect(migrated.state.creature?.stats.hp).toBe(creatureHp * 2)
    const session = migrated.session
    if (!session) throw new Error("session dropped")
    for (const [i, slot] of session.bracket.slots.entries()) {
      expect(slot.stats.hp, `slot ${i}`).toBe(
        Math.floor((payload.session?.bracket.slots[i]?.stats.hp ?? 0) * 2),
      )
    }
    expect(session.bracket.finalRival.stats.hp).toBe(
      (payload.session?.bracket.finalRival.stats.hp ?? 0) * 2,
    )
  })

  test("the Hall of Fame record doubles its stats but not its trained bonus", () => {
    const payload = v11Payload()
    const recordHp = payload.state.lineage.hallOfFame[0]?.stats.hp ?? 0
    const migrated = migrate(payload)
    const record = migrated.state.lineage.hallOfFame[0]
    if (!record) throw new Error("no record")
    expect(record.stats.hp).toBe(recordHp * 2)
    expect(record.trained).toEqual({ hp: 4, atk: 2, def: 1, spd: 0 })
    // Non-HP stats are scale-free and stay untouched.
    const fixtureRecord = payload.state.lineage.hallOfFame[0]
    if (!fixtureRecord) throw new Error("no fixture record")
    expect(record.stats.atk).toBe(fixtureRecord.stats.atk)
  })

  test("a migrated v11 save loads and stays playable", () => {
    const adapter = createMemoryAdapter()
    adapter.setItem(SAVE_KEY, JSON.stringify(v11Payload()))
    const state = loadGame(adapter)
    if (!state) throw new Error("load failed")
    expect(state.creature?.stats.hp).toBeGreaterThan(40)
  })

  test("a v12 save round-trips with the new-scale HP untouched", () => {
    const adapter = createMemoryAdapter()
    const fresh = chooseStarter(createInitialState(), "plant_ox", 7)
    saveGame(adapter, fresh, 123)
    const loaded = loadGame(adapter)
    expect(loaded?.creature?.stats.hp).toBe(fresh.creature?.stats.hp)
  })

  test("loadGame still rejects a fractional HP stat", () => {
    const adapter = createMemoryAdapter()
    saveGame(adapter, chooseStarter(createInitialState(), "fire_drake", 42), 1)
    const raw = JSON.parse(adapter.getItem(SAVE_KEY) as string) as Record<
      string,
      unknown
    >
    const state = raw.state as Record<string, unknown>
    const creature = state.creature as Record<string, unknown>
    creature.stats = {
      ...(creature.stats as Record<string, unknown>),
      hp: 80.5,
    }
    adapter.setItem(SAVE_KEY, JSON.stringify(raw))
    expect(loadGame(adapter)).toBeNull()
  })
})

describe("arena camera preference (v9)", () => {
  test("fresh state defaults to the cinematic director", () => {
    expect(createInitialState().settings.arenaCamera).toBe("cinematic")
  })

  test("a v8 save migrates with the arena-camera default", () => {
    const state = structuredClone(
      chooseStarter(createInitialState(), "fire_drake", 42),
    ) as unknown as Record<string, unknown>
    const settings = state.settings as Record<string, unknown>
    delete settings.arenaCamera
    const adapter = createMemoryAdapter()
    adapter.setItem(
      SAVE_KEY,
      JSON.stringify({ version: 8, state, session: null, savedAt: 55 }),
    )
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
    const state = structuredClone(
      chooseStarter(createInitialState(), "fire_drake", 42),
    ) as unknown as Record<string, unknown>
    const settings = state.settings as Record<string, unknown>
    settings.arenaCamera = "wall"
    adapter.setItem(
      SAVE_KEY,
      JSON.stringify({ version: SAVE_VERSION, state, savedAt: 0 }),
    )
    expect(loadGame(adapter)).toBeNull()
  })
})

/**
 * Save v13 (audio_foundation_20261017): settings gain the persisted audio
 * mute toggle. Sound is ON by default (`muted: false`); the v12 → v13
 * migration stamps the flag onto every migrated save, and load-time
 * validation rejects a non-boolean like every other settings field.
 */
describe("save v13 (audio_foundation_20261017)", () => {
  /** A v12-shaped payload: the current state minus the v13 muted flag. */
  const v12Payload = (): Record<string, unknown> => {
    const state = structuredClone(createInitialState()) as unknown as Record<
      string,
      unknown
    >
    const settings = { ...(state.settings as Record<string, unknown>) }
    delete settings.muted
    state.settings = settings
    return { version: 12, state, session: null, savedAt: 77 }
  }

  test("SAVE_VERSION is 18", () => {
    expect(SAVE_VERSION).toBe(19)
  })

  test("a v12 save migrates: settings gain the muted flag, default false", () => {
    const migrated = migrate(v12Payload())
    expect(migrated.version).toBe(SAVE_VERSION)
    expect(migrated.state.settings.muted).toBe(false)
    // Pre-existing preferences survive the stamp untouched.
    expect(migrated.state.settings.reducedMotion).toBe(false)
    expect(migrated.state.settings.arenaCamera).toBe("cinematic")
  })

  test("a migrated v12 save loads and stays playable", () => {
    const adapter = createMemoryAdapter()
    adapter.setItem(SAVE_KEY, JSON.stringify(v12Payload()))
    const state = loadGame(adapter)
    expect(state).not.toBeNull()
    expect(state?.settings.muted).toBe(false)
  })

  test("createInitialState starts with sound on", () => {
    expect(createInitialState().settings.muted).toBe(false)
  })

  test("setMuted turns the toggle both ways and round-trips", () => {
    const base = chooseStarter(createInitialState(), "fire_drake", 42)
    const silenced = setMuted(base, true)
    expect(silenced.settings.muted).toBe(true)
    const restored = setMuted(silenced, false)
    expect(restored.settings.muted).toBe(false)

    const adapter = createMemoryAdapter()
    expect(saveGame(adapter, silenced, 900)).toBe(true)
    expect(loadGame(adapter)?.settings.muted).toBe(true)
  })

  test("loadGame rejects a corrupt mute flag", () => {
    const adapter = createMemoryAdapter()
    const state = structuredClone(
      chooseStarter(createInitialState(), "fire_drake", 42),
    ) as unknown as Record<string, unknown>
    const settings = state.settings as Record<string, unknown>
    settings.muted = "loud"
    adapter.setItem(
      SAVE_KEY,
      JSON.stringify({ version: SAVE_VERSION, state, savedAt: 0 }),
    )
    expect(loadGame(adapter)).toBeNull()
  })
})

/**
 * Save v14 (gold_legend_ladder_20261017): the ladder grows the Gold and
 * Legend tiers and the state gains the legendTitles tally. The v13 → v14
 * migration is additive — it stamps `legendTitles: 0` onto every migrated
 * save (pre-plateau careers have none) and leaves the ladder untouched —
 * while load validation widens the accepted tiers to the full four-tier
 * ladder and strictly types the new field.
 */
describe("save v14 (gold_legend_ladder_20261017)", () => {
  /** A v13-shaped payload: the current state minus the v14 fields. */
  const v13Payload = (): Record<string, unknown> => {
    const state = structuredClone(createInitialState()) as unknown as Record<
      string,
      unknown
    >
    delete state.legendTitles
    return { version: 13, state, session: null, savedAt: 77 }
  }

  test("SAVE_VERSION is 18", () => {
    expect(SAVE_VERSION).toBe(19)
  })

  test("a v13 save migrates: legendTitles stamps at 0, ladder untouched", () => {
    const payload = v13Payload()
    const rawState = payload.state as Record<string, unknown>
    rawState.ladder = { points: 36, tier: "gold", subTier: "I" }
    const migrated = migrate(payload)
    expect(migrated.version).toBe(SAVE_VERSION)
    expect(migrated.state.legendTitles).toBe(0)
    expect(migrated.state.ladder).toEqual({
      points: 36,
      tier: "gold",
      subTier: "I",
    })
  })

  test("a migrated v13 save loads and stays playable", () => {
    const adapter = createMemoryAdapter()
    adapter.setItem(SAVE_KEY, JSON.stringify(v13Payload()))
    const state = loadGame(adapter)
    expect(state).not.toBeNull()
    expect(state?.legendTitles).toBe(0)
  })

  test("loadGame accepts a Gold-tier ladder", () => {
    const adapter = createMemoryAdapter()
    const state = structuredClone(createInitialState()) as GameState
    state.ladder = { points: 36, tier: "gold", subTier: "I" }
    expect(saveGame(adapter, state, 900)).toBe(true)
    expect(loadGame(adapter)?.ladder).toEqual({
      points: 36,
      tier: "gold",
      subTier: "I",
    })
  })

  test("loadGame accepts a Legend-tier ladder", () => {
    const adapter = createMemoryAdapter()
    const state = structuredClone(createInitialState()) as GameState
    state.ladder = { points: 39, tier: "legend", subTier: "I" }
    expect(saveGame(adapter, state, 900)).toBe(true)
    expect(loadGame(adapter)?.ladder).toEqual({
      points: 39,
      tier: "legend",
      subTier: "I",
    })
  })

  test("loadGame still rejects an unknown tier", () => {
    const adapter = createMemoryAdapter()
    const state = structuredClone(createInitialState()) as unknown as Record<
      string,
      unknown
    >
    state.ladder = { points: 36, tier: "platinum", subTier: "I" }
    adapter.setItem(
      SAVE_KEY,
      JSON.stringify({ version: SAVE_VERSION, state, savedAt: 0 }),
    )
    expect(loadGame(adapter)).toBeNull()
  })

  test("legendTitles round-trips through a save", () => {
    const adapter = createMemoryAdapter()
    const state = structuredClone(createInitialState()) as GameState
    state.ladder = { points: 40, tier: "legend", subTier: "I" }
    state.legendTitles = 2
    expect(saveGame(adapter, state, 900)).toBe(true)
    expect(loadGame(adapter)?.legendTitles).toBe(2)
  })

  test("loadGame rejects a non-integer legendTitles tally", () => {
    const adapter = createMemoryAdapter()
    const state = structuredClone(createInitialState()) as unknown as Record<
      string,
      unknown
    >
    state.legendTitles = 1.5
    adapter.setItem(
      SAVE_KEY,
      JSON.stringify({ version: SAVE_VERSION, state, savedAt: 0 }),
    )
    expect(loadGame(adapter)).toBeNull()
  })

  test("loadGame rejects a negative legendTitles tally", () => {
    const adapter = createMemoryAdapter()
    const state = structuredClone(createInitialState()) as unknown as Record<
      string,
      unknown
    >
    state.legendTitles = -1
    adapter.setItem(
      SAVE_KEY,
      JSON.stringify({ version: SAVE_VERSION, state, savedAt: 0 }),
    )
    expect(loadGame(adapter)).toBeNull()
  })

  test("loadGame rejects a save whose legendTitles is missing entirely", () => {
    const adapter = createMemoryAdapter()
    const state = structuredClone(createInitialState()) as unknown as Record<
      string,
      unknown
    >
    delete state.legendTitles
    adapter.setItem(
      SAVE_KEY,
      JSON.stringify({ version: SAVE_VERSION, state, savedAt: 0 }),
    )
    expect(loadGame(adapter)).toBeNull()
  })
})

describe("save v18 — training programs (training_programs_form_20261020)", () => {
  /** A v17 payload: the creature still carries the old single-stat focus. */
  function v17With(focus: string | null): Record<string, unknown> {
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    if (!owned.creature) throw new Error("no creature")
    const creature = structuredClone(owned.creature) as unknown as Record<
      string,
      unknown
    >
    delete creature.trainingProgram
    creature.trainingFocus = focus
    return {
      version: 17,
      savedAt: 77,
      session: null,
      state: { ...owned, creature },
    }
  }

  test("the schema version is 18", () => {
    expect(SAVE_VERSION).toBe(19)
  })

  test("every v17 focus maps to its program and the old key is dropped", () => {
    const mapping: Record<string, string> = {
      hp: "endurance",
      atk: "power",
      def: "power",
      spd: "sprint",
    }
    for (const [stat, program] of Object.entries(mapping)) {
      const migrated = migrate(v17With(stat))
      expect(migrated.version).toBe(19)
      expect(migrated.state.creature?.trainingProgram).toBe(
        program as "power" | "endurance" | "sprint" | "ring",
      )
      expect(
        "trainingFocus" in
          (migrated.state.creature as unknown as Record<string, unknown>),
      ).toBe(false)
      expect(migrated.savedAt).toBe(77)
    }
  })

  test("a v17 save with no focus migrates to no program", () => {
    const migrated = migrate(v17With(null))
    expect(migrated.state.creature?.trainingProgram).toBeNull()
  })

  test("the migration forwards the trained ledger, days and result untouched", () => {
    const raw = v17With("spd")
    const state = raw.state as Record<string, unknown>
    const creature = state.creature as Record<string, unknown>
    creature.trained = { hp: 0, atk: 2, def: 1, spd: 3 }
    creature.trainingDays = 4
    creature.trainingResult = "gained"
    const migrated = migrate(raw)
    expect(migrated.state.creature?.trained).toEqual({
      hp: 0,
      atk: 2,
      def: 1,
      spd: 3,
    })
    expect(migrated.state.creature?.trainingDays).toBe(4)
    expect(migrated.state.creature?.trainingResult).toBe("gained")
  })

  test("a v17 save with a null creature migrates to no creature", () => {
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    const migrated = migrate({
      version: 17,
      savedAt: 0,
      session: null,
      state: { ...owned, creature: null },
    })
    expect(migrated.version).toBe(19)
    expect(migrated.state.creature).toBeNull()
  })

  test("the v17 cup session is forwarded unchanged", () => {
    const raw = v17With("atk")
    const migrated = migrate({ ...raw, session: null })
    expect(migrated.session).toBeNull()
  })

  test("a v0 save walks the whole chain to v18 with no program", () => {
    const migrated = migrate({ version: 0, day: 3 })
    expect(migrated.version).toBe(19)
    expect(migrated.state.creature?.trainingProgram).toBeNull()
  })

  test("a v18 save round-trips its program", () => {
    const adapter = createMemoryAdapter()
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    if (!owned.creature) throw new Error("no creature")
    const state = {
      ...owned,
      creature: {
        ...owned.creature,
        trainingProgram: "ring" as const,
        trainingDays: 3,
      },
    }
    saveGame(adapter, state, 1)
    const loaded = loadGame(adapter)
    expect(loaded?.creature?.trainingProgram).toBe("ring")
    expect(loaded?.creature?.trainingDays).toBe(3)
  })

  test("a v18 save accepts an exhausted result", () => {
    const adapter = createMemoryAdapter()
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    if (!owned.creature) throw new Error("no creature")
    saveGame(
      adapter,
      {
        ...owned,
        creature: { ...owned.creature, trainingResult: "exhausted" as const },
      },
      1,
    )
    expect(loadGame(adapter)?.creature?.trainingResult).toBe("exhausted")
  })

  test("loadGame rejects a v18 save carrying the retired focus key value", () => {
    const adapter = createMemoryAdapter()
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    if (!owned.creature) throw new Error("no creature")
    const broken = structuredClone(owned) as unknown as {
      creature: Record<string, unknown>
    }
    broken.creature.trainingProgram = "atk"
    adapter.setItem(
      SAVE_KEY,
      JSON.stringify({ version: SAVE_VERSION, state: broken, savedAt: 0 }),
    )
    expect(loadGame(adapter)).toBeNull()
  })

  test("loadGame rejects a v18 save with no program field at all", () => {
    const adapter = createMemoryAdapter()
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    if (!owned.creature) throw new Error("no creature")
    const broken = structuredClone(owned) as unknown as {
      creature: Record<string, unknown>
    }
    delete broken.creature.trainingProgram
    adapter.setItem(
      SAVE_KEY,
      JSON.stringify({ version: SAVE_VERSION, state: broken, savedAt: 0 }),
    )
    expect(loadGame(adapter)).toBeNull()
  })
})
