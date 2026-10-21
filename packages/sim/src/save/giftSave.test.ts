/**
 * Save v21 — the Silver tier-reward bookkeeping (electric species line
 * FR-8). The save gains two persisted fields: the one-time claim flag
 * (`stormGiftClaimed`) and the gift-egg lineage marker (`giftEgg`) on the
 * creature and every Hall record. The migration stamps defaults — no
 * pre-v21 save has received the gift, and no hatched career predates it.
 * Everything else, including the live cup session, forwards untouched.
 *
 * Structure follows save.test.ts and branchesSave.test.ts: migrate a raw
 * fixture at the previous version, pin the defaults, refuse corrupt fields,
 * and round-trip the new fields through export/import.
 */

import { describe, expect, test } from "bun:test"
import {
  type CupSession,
  chooseStarter,
  createGiftEgg,
  createInitialState,
  type GameState,
  migrate,
  type RetiredRecord,
  SAVE_VERSION,
  type SaveData,
  serializeSave,
} from "@apex/sim"
import {
  createMemoryAdapter,
  isValidSaveState,
  loadGame,
  loadSave,
  SAVE_KEY,
  saveGame,
} from "./storage"
import { buildSaveExport, inspectSaveImport } from "./transfer"

/**
 * A v20 payload: a real starter downgraded by hand (v21 fields removed),
 * with per-case creature and state overrides for corrupt-field cases.
 */
function v20(
  creatureFields: Partial<Record<string, unknown>> = {},
  stateFields: Partial<Record<string, unknown>> = {},
  session: unknown = null,
): Record<string, unknown> {
  const owned = chooseStarter(createInitialState(), "fire_drake", 42)
  if (!owned.creature) throw new Error("no creature")
  const creature = structuredClone(owned.creature) as unknown as Record<
    string,
    unknown
  >
  delete creature.giftEgg
  Object.assign(creature, creatureFields)
  const state = {
    ...owned,
    creature,
    ...stateFields,
  } as unknown as Record<string, unknown>
  delete state.stormGiftClaimed
  return { version: 20, savedAt: 99, session, state }
}

function adapterFor(raw: unknown) {
  const adapter = createMemoryAdapter()
  adapter.setItem(SAVE_KEY, JSON.stringify(raw))
  return adapter
}

/**
 * A v21 payload: the claim flag exists, the pending egg does not. v21
 * stamped the flag but never stored the egg itself — the gap review round 1
 * found.
 */
function v21(
  stateFields: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  const owned = chooseStarter(createInitialState(), "fire_drake", 42)
  const state = {
    ...owned,
    ...stateFields,
  } as unknown as Record<string, unknown>
  delete state.pendingGift
  return { version: 21, savedAt: 99, session: null, state }
}

describe("save v22 — the pending Storm Gift", () => {
  test("a v21 save that never claimed waits for its next non-forfeit finalize", () => {
    const migrated = migrate(v21())
    expect(migrated.version).toBe(23)
    expect(migrated.state.stormGiftClaimed).toBe(false)
    expect(migrated.state.pendingGift).toBeNull()
  })

  test("a v21 save that claimed the gift receives the egg it was promised", () => {
    const migrated = migrate(v21({ stormGiftClaimed: true }))
    expect(migrated.state.stormGiftClaimed).toBe(true)
    expect(migrated.state.pendingGift?.speciesId).toBe("electric_hound")
    expect(typeof migrated.state.pendingGift?.seed).toBe("number")
  })

  test("a v21 save whose gift career is already hatched gets no second egg", () => {
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    const hatched = {
      ...owned,
      stormGiftClaimed: true,
      creature: { ...owned.creature, giftEgg: true },
    } as unknown as Record<string, unknown>
    delete hatched.pendingGift
    const migrated = migrate({
      version: 21,
      savedAt: 99,
      session: null,
      state: hatched,
    })
    expect(migrated.state.pendingGift).toBeNull()
  })

  test("the pending egg survives a save round trip", () => {
    const adapter = createMemoryAdapter()
    const state = {
      ...chooseStarter(createInitialState(), "fire_drake", 42),
      stormGiftClaimed: true,
      pendingGift: { speciesId: "electric_hound", seed: 4242 },
    }
    saveGame(adapter, state, 7)
    const loaded = loadGame(adapter)
    expect(loaded?.pendingGift).toEqual({
      speciesId: "electric_hound",
      seed: 4242,
    })
  })
})

describe("save v21 — the Storm Gift bookkeeping", () => {
  test("the schema version is 21", () => {
    expect(SAVE_VERSION).toBe(23)
  })

  test("a v20 creature and state migrate with the gift defaults stamped", () => {
    const raw = v20()
    const migrated = migrate(raw)
    expect(migrated.version).toBe(23)
    expect(migrated.state.stormGiftClaimed).toBe(false)
    expect(migrated.state.creature?.giftEgg).toBe(false)
  })

  test("migration preserves every pre-v21 number", () => {
    const raw = v20()
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    if (!owned.creature) throw new Error("no creature")
    const before = structuredClone(owned.creature)
    const migrated = migrate(raw)
    if (!migrated.state.creature) throw new Error("no creature")
    expect(migrated.state.creature.stats).toEqual(before.stats)
    expect(migrated.state.creature.trained).toEqual(before.trained)
    expect(migrated.state.creature.conditions).toEqual(before.conditions)
    expect(migrated.savedAt).toBe(99)
  })

  test("migration is deterministic and idempotent at v20", () => {
    const raw = v20()
    const first = migrate(raw)
    expect(migrate(raw)).toEqual(first)
    expect(migrate(JSON.parse(JSON.stringify(first)))).toEqual(first)
  })

  test("a v20 Hall record migrates with the gift marker stamped false", () => {
    const record: Omit<RetiredRecord, "giftEgg"> = {
      name: "Rolo",
      speciesId: "fire_drake",
      archetypeId: "draconic",
      element: "fire",
      affinity: null,
      stats: { hp: 100, atk: 20, def: 14, spd: 16 },
      trained: { hp: 0, atk: 0, def: 0, spd: 0 },
      cupsWon: 2,
      generation: 0,
      retiredOnDay: 60,
      traits: [],
      parents: [],
      branch: "legacy",
    }
    const raw = v20({}, { lineage: { generation: 1, hallOfFame: [record] } })
    const migrated = migrate(raw)
    expect(migrated.state.lineage.hallOfFame[0]).toEqual({
      ...record,
      giftEgg: false,
    })
  })

  test("the live cup session forwards untouched through the v21 step", () => {
    const session = { status: "player-turn", rounds: 1 }
    const raw = v20({}, {}, session)
    const migrated = migrate(raw)
    expect(migrated.session).toEqual(session as unknown as CupSession)
  })

  test("the serialized payload carries the claim flag", () => {
    const data: SaveData = {
      version: SAVE_VERSION,
      state: chooseStarter(createInitialState(), "fire_drake", 42),
      session: null,
      savedAt: 1,
    }
    expect(JSON.parse(serializeSave(data)).state.stormGiftClaimed).toBe(false)
  })
})

describe("v21 validation", () => {
  test("accepts a current save whose creature carries the gift marker", () => {
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    if (!owned.creature) throw new Error("no creature")
    const state: GameState = {
      ...owned,
      creature: { ...owned.creature, giftEgg: true },
      stormGiftClaimed: true,
    }
    expect(isValidSaveState(state)).toBe(true)
  })

  test("a gift-hatched creature loads and hatches identically", () => {
    const adapter = adapterFor({
      version: SAVE_VERSION,
      session: null,
      savedAt: 1,
      state: {
        ...chooseStarter(createInitialState(), "fire_drake", 42),
        creature: createGiftEgg(42),
        stormGiftClaimed: true,
      },
    })
    const loaded = loadGame(adapter)
    expect(loaded?.creature?.giftEgg).toBe(true)
    expect(loaded?.creature?.element).toBe("electric")
    expect(loaded?.creature?.affinity).toBeNull()
    expect(loadSave(adapter)?.state.creature?.giftEgg).toBe(true)
  })

  test("rejects a v21 creature with no gift marker at all", () => {
    const adapter = adapterFor({
      version: SAVE_VERSION,
      session: null,
      savedAt: 1,
      state: {
        ...chooseStarter(createInitialState(), "fire_drake", 42),
        creature: (() => {
          const creature = {
            ...createGiftEgg(42),
          } as unknown as Record<string, unknown>
          delete creature.giftEgg
          return creature
        })(),
        stormGiftClaimed: false,
      },
    })
    const raw = adapter.getItem(SAVE_KEY)
    expect(loadGame(adapter)).toBeNull()
    expect(adapter.getItem(SAVE_KEY)).toBe(raw)
  })

  test("rejects a Hall record with a non-boolean gift marker", () => {
    const record: Record<string, unknown> = {
      name: "Rolo",
      speciesId: "fire_drake",
      archetypeId: "draconic",
      element: "fire",
      affinity: null,
      stats: { hp: 100, atk: 20, def: 14, spd: 16 },
      trained: { hp: 0, atk: 0, def: 0, spd: 0 },
      cupsWon: 2,
      generation: 0,
      retiredOnDay: 60,
      traits: [],
      parents: [],
      branch: "legacy",
      giftEgg: "yes",
    }
    const adapter = adapterFor({
      version: SAVE_VERSION,
      session: null,
      savedAt: 1,
      state: {
        ...chooseStarter(createInitialState(), "fire_drake", 42),
        lineage: { generation: 1, hallOfFame: [record] },
        stormGiftClaimed: false,
      },
    })
    expect(loadGame(adapter)).toBeNull()
  })

  test("rejects a save with no claim flag at all", () => {
    const adapter = adapterFor({
      version: SAVE_VERSION,
      session: null,
      savedAt: 1,
      state: (() => {
        const state = {
          ...chooseStarter(createInitialState(), "fire_drake", 42),
        } as unknown as Record<string, unknown>
        delete state.stormGiftClaimed
        return state
      })(),
    })
    const raw = adapter.getItem(SAVE_KEY)
    expect(loadGame(adapter)).toBeNull()
    expect(adapter.getItem(SAVE_KEY)).toBe(raw)
  })

  test("rejects a non-boolean claim flag", () => {
    const adapter = adapterFor({
      version: SAVE_VERSION,
      session: null,
      savedAt: 1,
      state: {
        ...chooseStarter(createInitialState(), "fire_drake", 42),
        stormGiftClaimed: 1,
      },
    })
    expect(loadGame(adapter)).toBeNull()
  })

  test("rejects an invalid save without mutating the stored payload", () => {
    // The corruption must sit on a v21 payload: a v20 flag is not corrupt,
    // the migration stamps over it by design.
    const adapter = adapterFor({
      version: SAVE_VERSION,
      session: null,
      savedAt: 99,
      state: {
        ...(v20().state as Record<string, unknown>),
        stormGiftClaimed: "once",
      },
    })
    const raw = adapter.getItem(SAVE_KEY)
    expect(loadGame(adapter)).toBeNull()
    expect(adapter.getItem(SAVE_KEY)).toBe(raw)
  })
})

describe("v21 export and import", () => {
  test("the claim flag and gift marker survive the export/import round trip", () => {
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    if (!owned.creature) throw new Error("no creature")
    const state: GameState = {
      ...owned,
      creature: { ...owned.creature, giftEgg: true },
      stormGiftClaimed: true,
    }
    const exported = buildSaveExport(state)
    const result = inspectSaveImport(exported.json)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.version).toBe(23)
      expect(result.data.state.stormGiftClaimed).toBe(true)
      expect(result.data.state.creature?.giftEgg).toBe(true)
    }
  })

  test("importing a v20 payload migrates to the gift defaults", () => {
    const result = inspectSaveImport(JSON.stringify(v20()))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.state.stormGiftClaimed).toBe(false)
      expect(result.data.state.creature?.giftEgg).toBe(false)
    }
  })

  test("an import whose claim flag is corrupt is refused with no write", () => {
    const adapter = createMemoryAdapter()
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    saveGame(adapter, owned, 5)
    const live = adapter.getItem(SAVE_KEY)
    const result = inspectSaveImport(
      JSON.stringify({
        version: SAVE_VERSION,
        session: null,
        savedAt: 1,
        state: { ...owned, stormGiftClaimed: "already" },
      }),
    )
    expect(result).toEqual({ ok: false, reason: "invalid" })
    expect(adapter.getItem(SAVE_KEY)).toBe(live)
    expect(loadGame(adapter)?.stormGiftClaimed).toBe(false)
  })
})
