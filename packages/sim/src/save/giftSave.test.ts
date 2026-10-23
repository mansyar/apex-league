/**
 * The league-reward bookkeeping in the save (electric species line FR-8,
 * generalized per tier at save v25). The save carries the per-tier claim
 * record (`claimedTiers`), the pending-reward queue (`pendingRewards`),
 * and the gift-egg lineage marker (`giftEgg`) on the creature and every
 * Hall record. Migrations stamp defaults — no pre-v21 save has received a
 * reward, and no hatched career predates the marker — and the v24→v25 step
 * maps the old one-time Silver flag onto the per-tier record losslessly.
 *
 * Structure follows save.test.ts and branchesSave.test.ts: migrate a raw
 * fixture at a previous version, pin the defaults, refuse corrupt fields,
 * and round-trip the fields through export/import.
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
 * A v20 payload: a real starter downgraded by hand (the reward bookkeeping
 * removed — v20 predates all of it), with per-case creature and state
 * overrides for corrupt-field cases.
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
  delete state.claimedTiers
  delete state.pendingGift
  delete state.pendingRewards
  return { version: 20, savedAt: 99, session, state }
}

function adapterFor(raw: unknown) {
  const adapter = createMemoryAdapter()
  adapter.setItem(SAVE_KEY, JSON.stringify(raw))
  return adapter
}

/**
 * A v21 payload: the one-time claim flag exists, the pending egg does not.
 * v21 stamped the flag but never stored the egg itself — the gap review
 * round 1 found. The state fields are the historical v21 shape.
 */
function v21(
  stateFields: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  const owned = chooseStarter(createInitialState(), "fire_drake", 42)
  const state = {
    ...owned,
    ...stateFields,
  } as unknown as Record<string, unknown>
  delete state.claimedTiers
  delete state.pendingGift
  delete state.pendingRewards
  return { version: 21, savedAt: 99, session: null, state }
}

/**
 * A v24 payload: the single-gift bookkeeping (claim flag + optional
 * pending egg) plus the stable, before the per-tier generalization.
 */
function v24(
  stateFields: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  const owned = chooseStarter(createInitialState(), "fire_drake", 42)
  const state = {
    ...owned,
    ...stateFields,
  } as unknown as Record<string, unknown>
  delete state.claimedTiers
  delete state.pendingRewards
  return { version: 24, savedAt: 99, session: null, state }
}

describe("the legacy gift bookkeeping migrates into the reward record", () => {
  test("a v21 save that never claimed waits for its next non-forfeit finalize", () => {
    const migrated = migrate(v21())
    expect(migrated.version).toBe(SAVE_VERSION)
    expect(migrated.state.claimedTiers).toEqual([])
    expect(migrated.state.pendingRewards).toEqual([])
  })

  test("a v21 save that claimed the gift receives the egg it was promised", () => {
    const migrated = migrate(v21({ stormGiftClaimed: true }))
    expect(migrated.state.claimedTiers).toEqual(["silver"])
    expect(migrated.state.pendingRewards[0]?.speciesId).toBe("electric_hound")
    expect(typeof migrated.state.pendingRewards[0]?.seed).toBe("number")
  })

  test("a v21 save whose gift career is already hatched gets no second egg", () => {
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    if (!owned.creature) throw new Error("no creature")
    const migrated = migrate(
      v21({
        stormGiftClaimed: true,
        creature: { ...owned.creature, giftEgg: true },
      }),
    )
    expect(migrated.state.pendingRewards).toEqual([])
  })

  test("the pending reward queue survives a save round trip", () => {
    const adapter = createMemoryAdapter()
    const state = {
      ...chooseStarter(createInitialState(), "fire_drake", 42),
      claimedTiers: ["silver"] as GameState["claimedTiers"],
      pendingRewards: [{ speciesId: "electric_hound", seed: 4242 }],
    }
    saveGame(adapter, state, 7)
    const loaded = loadGame(adapter)
    expect(loaded?.pendingRewards).toEqual([
      { speciesId: "electric_hound", seed: 4242 },
    ])
  })
})

describe("save v21 — the gift bookkeeping defaults", () => {
  test("the schema version is 25", () => {
    expect(SAVE_VERSION).toBe(25)
  })

  test("a v20 creature and state migrate with the reward defaults stamped", () => {
    const raw = v20()
    const migrated = migrate(raw)
    expect(migrated.version).toBe(SAVE_VERSION)
    expect(migrated.state.claimedTiers).toEqual([])
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

  test("the serialized payload carries the claim record", () => {
    const data: SaveData = {
      version: SAVE_VERSION,
      state: chooseStarter(createInitialState(), "fire_drake", 42),
      session: null,
      savedAt: 1,
    }
    expect(JSON.parse(serializeSave(data)).state.claimedTiers).toEqual([])
  })
})

describe("save v25 — the per-tier league reward record (FR-8)", () => {
  test("a v24 save with the Silver claim maps onto the per-tier record", () => {
    const migrated = migrate(
      v24({
        stormGiftClaimed: true,
        pendingGift: { speciesId: "electric_hound", seed: 4242 },
      }),
    )
    expect(migrated.version).toBe(25)
    expect(migrated.state.claimedTiers).toEqual(["silver"])
    // The pending Storm Gift becomes the head of the queue — a pending
    // Silver reward, lowest tier first.
    expect(migrated.state.pendingRewards).toEqual([
      { speciesId: "electric_hound", seed: 4242 },
    ])
  })

  test("an unclaimed v24 save maps to an empty reward record", () => {
    const migrated = migrate(v24({ stormGiftClaimed: false }))
    expect(migrated.state.claimedTiers).toEqual([])
    expect(migrated.state.pendingRewards).toEqual([])
  })

  test("the mapping is lossless — the migrated state equals the equivalent v25 state", () => {
    const migrated = migrate(
      v24({
        stormGiftClaimed: true,
        pendingGift: { speciesId: "electric_hound", seed: 4242 },
      }),
    )
    const equivalent = {
      ...chooseStarter(createInitialState(), "fire_drake", 42),
      claimedTiers: ["silver"] as GameState["claimedTiers"],
      pendingRewards: [{ speciesId: "electric_hound", seed: 4242 }],
    }
    expect(migrated.state.claimedTiers).toEqual(equivalent.claimedTiers)
    expect(migrated.state.pendingRewards).toEqual(equivalent.pendingRewards)
  })

  test("the migration is deterministic and idempotent at v24", () => {
    const raw = v24({
      stormGiftClaimed: true,
      pendingGift: { speciesId: "electric_hound", seed: 4242 },
    })
    const first = migrate(raw)
    expect(migrate(raw)).toEqual(first)
    expect(migrate(JSON.parse(JSON.stringify(first)))).toEqual(first)
  })

  test("a migrated v24 save loads and keeps waiting for the player", () => {
    const adapter = adapterFor(
      v24({
        stormGiftClaimed: true,
        pendingGift: { speciesId: "electric_hound", seed: 4242 },
      }),
    )
    const loaded = loadGame(adapter)
    expect(loaded).not.toBeNull()
    expect(loaded?.claimedTiers).toEqual(["silver"])
    expect(loaded?.pendingRewards[0]?.seed).toBe(4242)
  })
})

describe("reward-record validation", () => {
  test("accepts a current save whose creature carries the gift marker", () => {
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    if (!owned.creature) throw new Error("no creature")
    const state: GameState = {
      ...owned,
      creature: { ...owned.creature, giftEgg: true },
      claimedTiers: ["silver"],
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
        creature: createGiftEgg("electric_hound", 42),
        claimedTiers: ["silver"],
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
            ...createGiftEgg("electric_hound", 42),
          } as unknown as Record<string, unknown>
          delete creature.giftEgg
          return creature
        })(),
        claimedTiers: [],
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
        claimedTiers: [],
      },
    })
    expect(loadGame(adapter)).toBeNull()
  })

  test("rejects a save with no claim record at all", () => {
    const adapter = adapterFor({
      version: SAVE_VERSION,
      session: null,
      savedAt: 1,
      state: (() => {
        const state = {
          ...chooseStarter(createInitialState(), "fire_drake", 42),
        } as unknown as Record<string, unknown>
        delete state.claimedTiers
        return state
      })(),
    })
    const raw = adapter.getItem(SAVE_KEY)
    expect(loadGame(adapter)).toBeNull()
    expect(adapter.getItem(SAVE_KEY)).toBe(raw)
  })

  test("rejects a non-array claim record", () => {
    const adapter = adapterFor({
      version: SAVE_VERSION,
      session: null,
      savedAt: 1,
      state: {
        ...chooseStarter(createInitialState(), "fire_drake", 42),
        claimedTiers: 1,
      },
    })
    expect(loadGame(adapter)).toBeNull()
  })

  test("rejects an unknown tier in the claim record", () => {
    const adapter = adapterFor({
      version: SAVE_VERSION,
      session: null,
      savedAt: 1,
      state: {
        ...chooseStarter(createInitialState(), "fire_drake", 42),
        claimedTiers: ["platinum"],
      },
    })
    expect(loadGame(adapter)).toBeNull()
  })

  test("rejects a duplicate tier in the claim record — it would double-grant", () => {
    const adapter = adapterFor({
      version: SAVE_VERSION,
      session: null,
      savedAt: 1,
      state: {
        ...chooseStarter(createInitialState(), "fire_drake", 42),
        claimedTiers: ["silver", "silver"],
      },
    })
    expect(loadGame(adapter)).toBeNull()
  })

  test("rejects a non-array reward queue", () => {
    const adapter = adapterFor({
      version: SAVE_VERSION,
      session: null,
      savedAt: 1,
      state: {
        ...chooseStarter(createInitialState(), "fire_drake", 42),
        claimedTiers: ["silver"],
        pendingRewards: { speciesId: "electric_hound", seed: 1 },
      },
    })
    expect(loadGame(adapter)).toBeNull()
  })

  test("rejects a queue egg naming an unknown species", () => {
    const adapter = adapterFor({
      version: SAVE_VERSION,
      session: null,
      savedAt: 1,
      state: {
        ...chooseStarter(createInitialState(), "fire_drake", 42),
        claimedTiers: ["silver"],
        pendingRewards: [{ speciesId: "no_such_species", seed: 1 }],
      },
    })
    expect(loadGame(adapter)).toBeNull()
  })

  test("rejects a queue egg with a non-integer seed", () => {
    const adapter = adapterFor({
      version: SAVE_VERSION,
      session: null,
      savedAt: 1,
      state: {
        ...chooseStarter(createInitialState(), "fire_drake", 42),
        claimedTiers: ["silver"],
        pendingRewards: [{ speciesId: "electric_hound", seed: 1.5 }],
      },
    })
    expect(loadGame(adapter)).toBeNull()
  })

  test("rejects an invalid save without mutating the stored payload", () => {
    // The corruption must sit on a current-version payload: a pre-v21 flag
    // is not corrupt, the migration stamps over it by design.
    const adapter = adapterFor({
      version: SAVE_VERSION,
      session: null,
      savedAt: 99,
      state: {
        ...(v20().state as Record<string, unknown>),
        claimedTiers: "once",
      },
    })
    const raw = adapter.getItem(SAVE_KEY)
    expect(loadGame(adapter)).toBeNull()
    expect(adapter.getItem(SAVE_KEY)).toBe(raw)
  })
})

describe("reward-record export and import", () => {
  test("the claim record and gift marker survive the export/import round trip", () => {
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    if (!owned.creature) throw new Error("no creature")
    const state: GameState = {
      ...owned,
      creature: { ...owned.creature, giftEgg: true },
      claimedTiers: ["silver"],
    }
    const exported = buildSaveExport(state)
    const result = inspectSaveImport(exported.json)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.version).toBe(25)
      expect(result.data.state.claimedTiers).toEqual(["silver"])
      expect(result.data.state.creature?.giftEgg).toBe(true)
    }
  })

  test("importing a v20 payload migrates to the reward defaults", () => {
    const result = inspectSaveImport(JSON.stringify(v20()))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.state.claimedTiers).toEqual([])
      expect(result.data.state.creature?.giftEgg).toBe(false)
    }
  })

  test("an import whose claim record is corrupt is refused with no write", () => {
    const adapter = createMemoryAdapter()
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    saveGame(adapter, owned, 5)
    const live = adapter.getItem(SAVE_KEY)
    const result = inspectSaveImport(
      JSON.stringify({
        version: SAVE_VERSION,
        session: null,
        savedAt: 1,
        state: { ...owned, claimedTiers: "already" },
      }),
    )
    expect(result).toEqual({ ok: false, reason: "invalid" })
    expect(adapter.getItem(SAVE_KEY)).toBe(live)
    expect(loadGame(adapter)?.claimedTiers).toEqual([])
  })
})
