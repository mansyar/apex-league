/**
 * Track branching_evolution_champion_forms_20261020 Phase 2: save v19.
 *
 * The earned branch becomes persisted state. A v18 payload must migrate with
 * every pre-v19 number intact — stats, training, loadout, conditions, lineage,
 * and the live cup session — gaining only the branch: `null` for a baby,
 * `legacy` for a juvenile, champion, or Hall record.
 */
import { describe, expect, test } from "bun:test"

import { BRANCHES } from "../branches"
import { type Creature, effectiveStats } from "../creature"
import type { CupSession } from "../cup"
import { evolveCreature } from "../evolution"
import type { RetiredRecord } from "../legacy"
import { getSpecies } from "../species"
import { chooseStarter, createInitialState } from "../state"
import { migrate } from "./migrate"
import { SAVE_VERSION, serializeSave } from "./schema"
import { createMemoryAdapter, loadGame, SAVE_KEY, saveGame } from "./storage"
import { buildSaveExport, inspectSaveImport } from "./transfer"

/** A Hall of Fame record as v18 wrote it (no branch, affinity, or gift marker yet). */
const HALL_RECORD: Omit<RetiredRecord, "branch" | "affinity" | "giftEgg"> = {
  name: "Rolo",
  speciesId: "fire_drake",
  archetypeId: "draconic",
  element: "fire",
  stats: { hp: 100, atk: 20, def: 14, spd: 16 },
  trained: { hp: 0, atk: 0, def: 0, spd: 0 },
  cupsWon: 2,
  generation: 0,
  retiredOnDay: 60,
  traits: [],
  parents: [],
}

/**
 * A v18 payload: a real starter downgraded by hand (branch field removed),
 * with per-case creature and state overrides.
 */
function v18(
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
  delete creature.branch
  Object.assign(creature, creatureFields)
  return {
    version: 18,
    savedAt: 99,
    session,
    state: { ...owned, creature, ...stateFields },
  }
}

/** A v19 raw save whose creature carries `branch` (undefined = missing). */
function v19Adapter(branch: unknown, stage: Creature["stage"] = "baby") {
  const adapter = createMemoryAdapter()
  const owned = chooseStarter(createInitialState(), "fire_drake", 42)
  if (!owned.creature) throw new Error("no creature")
  const creature = { ...owned.creature, stage, branch } as unknown as Creature
  const state = { ...owned, creature }
  adapter.setItem(
    SAVE_KEY,
    JSON.stringify({ version: 19, state, session: null, savedAt: 1 }),
  )
  return adapter
}

/** A v19 raw save with one Hall record carrying `branch` (undefined = missing). */
function hallAdapter(branch: unknown) {
  const adapter = createMemoryAdapter()
  const owned = chooseStarter(createInitialState(), "fire_drake", 42)
  const record = { ...HALL_RECORD, branch }
  adapter.setItem(
    SAVE_KEY,
    JSON.stringify({
      version: 19,
      session: null,
      savedAt: 1,
      state: {
        ...owned,
        lineage: { generation: 1, hallOfFame: [record] },
      },
    }),
  )
  return adapter
}

function speciesOf(id: string) {
  const species = getSpecies(id)
  if (!species) throw new Error(`species missing: ${id}`)
  return species
}

describe("save v19 — the earned branch", () => {
  test("the schema version is 19", () => {
    expect(SAVE_VERSION).toBe(22)
  })

  test("a v18 baby migrates with no branch and identical numbers", () => {
    const raw = v18({ trainingDays: 4, loadout: ["spark", "cinder_shot"] })
    const before = structuredClone(raw.state) as {
      creature: Creature
    }
    const migrated = migrate(raw)
    const creature = migrated.state.creature
    if (!creature) throw new Error("no creature")
    expect(migrated.version).toBe(22)
    expect(creature.branch).toBeNull()
    expect(creature.stats).toEqual(before.creature.stats)
    expect(creature.trained).toEqual(before.creature.trained)
    expect(creature.trainingDays).toBe(4)
    expect(creature.loadout).toEqual(["spark", "cinder_shot"])
    expect(creature.conditions).toEqual(before.creature.conditions)
    expect(migrated.savedAt).toBe(99)
  })

  test("a v18 juvenile migrates to the legacy form without a signature", () => {
    const raw = v18({ stage: "juvenile", trainingDays: 6 })
    const before = structuredClone(raw.state) as {
      creature: Creature
    }
    const migrated = migrate(raw)
    const creature = migrated.state.creature
    if (!creature) throw new Error("no creature")
    expect(creature.branch).toBe("legacy")
    expect(creature.stats).toEqual(before.creature.stats)
    expect(creature.trainingDays).toBe(6)
    // "legacy" owns no signature move: the known pool is the species kit.
    expect(creature.branch).not.toBe("cinder_courser")
  })

  test("a v18 champion migrates to legacy with identical effective stats", () => {
    const raw = v18({ stage: "champion", trainingDays: 6 })
    const before = structuredClone(raw.state) as { creature: Creature }
    const migrated = migrate(raw)
    const creature = migrated.state.creature
    if (!creature) throw new Error("no creature")
    expect(creature.branch).toBe("legacy")
    expect(creature.stats).toEqual(before.creature.stats)
    expect(effectiveStats(creature)).toEqual(effectiveStats(before.creature))
  })

  test("a v18 mid-cup save forwards its session untouched", () => {
    const raw = v18({ stage: "juvenile" })
    const session = {
      seed: 7,
      bracket: {
        day: 3,
        slots: [],
        finalRival: { name: "Hesse", speciesId: "plant_ox", stats: {} },
      },
      rivalResolutions: [],
      rivalVerdicts: [],
      playerVerdicts: [],
      completionVerdicts: [],
      status: "player-turn",
      nextPlayerRound: 1,
      nextOpponent: null,
      championName: null,
    } as unknown as CupSession
    const migrated = migrate({ ...raw, session })
    // The v18 step forwards whatever session it was handed; it never
    // reshapes the bracket or drops the walk.
    expect(migrated.session).toEqual(session)
    expect(migrated.state.creature?.branch).toBe("legacy")
  })

  test("a v18 Hall record migrates to legacy with its numbers intact", () => {
    const raw = v18(
      {},
      { lineage: { generation: 1, hallOfFame: [HALL_RECORD] } },
    )
    const migrated = migrate(raw)
    expect(migrated.state.lineage.hallOfFame[0]).toEqual({
      ...HALL_RECORD,
      branch: "legacy",
      affinity: null,
      giftEgg: false,
    })
  })

  test("migration is deterministic and idempotent at v19", () => {
    const raw = v18({ stage: "champion" })
    const first = migrate(raw)
    const second = migrate(v18({ stage: "champion" }))
    expect(first).toEqual(second)
    expect(migrate(first)).toEqual(first)
  })

  test("the migrated branch travels in the serialized payload", () => {
    const migrated = migrate(v18({ stage: "juvenile" }))
    const json = serializeSave(migrated)
    expect(json).toContain('"branch":"legacy"')
    const parsed = JSON.parse(json) as { state: { creature: Creature } }
    expect(parsed.state.creature.branch).toBe("legacy")
  })

  test("a migrated v18 baby still earns a real branch at its gate", () => {
    const migrated = migrate(v18())
    const baby = migrated.state.creature
    if (!baby) throw new Error("no creature")
    const juvenile = evolveCreature(baby)
    expect(juvenile.stage).toBe("juvenile")
    expect(juvenile.branch).not.toBeNull()
    expect(juvenile.branch).not.toBe("legacy")
    expect(BRANCHES.some((branch) => branch.id === juvenile.branch)).toBe(true)
    expect(speciesOf(juvenile.speciesId).kit.length).toBe(6)
  })
})

describe("v19 branch validation", () => {
  test("accepts a real branch that owns the creature's species", () => {
    const adapter = v19Adapter("cinder_courser", "juvenile")
    expect(loadGame(adapter)?.creature?.branch).toBe("cinder_courser")
  })

  test("accepts legacy on a juvenile and a champion", () => {
    for (const stage of ["juvenile", "champion"]) {
      const adapter = v19Adapter("legacy")
      const state = JSON.parse(adapter.getItem(SAVE_KEY) ?? "{}") as {
        state: { creature: Creature }
      }
      state.state.creature.stage = stage as Creature["stage"]
      adapter.setItem(SAVE_KEY, JSON.stringify(state))
      expect(loadGame(adapter)?.creature?.branch).toBe("legacy")
    }
  })

  test("rejects legacy on a baby without mutating the stored payload", () => {
    // A baby is always unchosen; legacy belongs to migrated older stages.
    const adapter = v19Adapter("legacy")
    const raw = adapter.getItem(SAVE_KEY)
    expect(loadGame(adapter)).toBeNull()
    expect(adapter.getItem(SAVE_KEY)).toBe(raw)
  })

  test("accepts null on every stage", () => {
    for (const stage of ["baby", "juvenile", "champion"]) {
      const adapter = v19Adapter(null)
      const state = JSON.parse(adapter.getItem(SAVE_KEY) ?? "{}") as {
        state: { creature: Creature }
      }
      state.state.creature.stage = stage as Creature["stage"]
      adapter.setItem(SAVE_KEY, JSON.stringify(state))
      expect(loadGame(adapter)?.creature?.branch).toBeNull()
    }
  })

  test("rejects an unknown branch id", () => {
    expect(loadGame(v19Adapter("ember_form"))).toBeNull()
  })

  test("rejects a real branch on a baby", () => {
    const adapter = v19Adapter("cinder_courser")
    const state = JSON.parse(adapter.getItem(SAVE_KEY) ?? "{}") as {
      state: { creature: Creature }
    }
    state.state.creature.stage = "baby"
    adapter.setItem(SAVE_KEY, JSON.stringify(state))
    expect(loadGame(adapter)).toBeNull()
  })

  test("rejects a branch owned by another species", () => {
    // thorn_ram is the plant ox's offense form, never a fire drake's.
    expect(loadGame(v19Adapter("thorn_ram", "juvenile"))).toBeNull()
  })

  test("rejects a missing branch field", () => {
    expect(loadGame(v19Adapter(undefined))).toBeNull()
  })

  test("rejects a Hall record with an unknown or missing branch", () => {
    for (const branch of ["ember_form", undefined]) {
      expect(loadGame(hallAdapter(branch))).toBeNull()
    }
  })

  test("accepts a Hall record whose real branch belongs to its species", () => {
    const loaded = loadGame(hallAdapter("cinder_courser"))
    expect(loaded?.lineage.hallOfFame[0]?.branch).toBe("cinder_courser")
  })

  test("rejects a Hall record whose real branch belongs to another species", () => {
    // thorn_ram is a plant ox form; HALL_RECORD is a fire drake career.
    expect(loadGame(hallAdapter("thorn_ram"))).toBeNull()
  })

  test("accepts a Hall record on the migration-only legacy line", () => {
    const loaded = loadGame(hallAdapter("legacy"))
    expect(loaded?.lineage.hallOfFame[0]?.branch).toBe("legacy")
  })

  test("rejects an invalid save without mutating the stored payload", () => {
    const adapter = v19Adapter("ember_form")
    const raw = adapter.getItem(SAVE_KEY)
    expect(loadGame(adapter)).toBeNull()
    expect(adapter.getItem(SAVE_KEY)).toBe(raw)
  })
})

describe("v19 export and import", () => {
  test("a real branch survives the export/import round trip", () => {
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    if (!owned.creature) throw new Error("no creature")
    const state = {
      ...owned,
      creature: {
        ...owned.creature,
        stage: "juvenile" as const,
        branch: "cinder_courser",
      },
    }
    const exported = buildSaveExport(state)
    const result = inspectSaveImport(exported.json)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.version).toBe(22)
      expect(result.data.state.creature?.branch).toBe("cinder_courser")
      expect(result.data.state.creature?.stage).toBe("juvenile")
    }
  })

  test("importing a v18 baby still migrates to no branch", () => {
    const result = inspectSaveImport(JSON.stringify(v18()))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.state.creature?.branch).toBeNull()
  })

  test("importing a v18 champion still migrates to legacy", () => {
    const result = inspectSaveImport(JSON.stringify(v18({ stage: "champion" })))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.state.creature?.branch).toBe("legacy")
  })

  test("a v19 import with an unknown branch is refused with no write", () => {
    const adapter = createMemoryAdapter()
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    saveGame(adapter, owned, 5)
    const live = adapter.getItem(SAVE_KEY)
    const result = inspectSaveImport(
      JSON.stringify({
        version: 19,
        session: null,
        savedAt: 1,
        state: {
          ...owned,
          creature: { ...owned.creature, branch: "ember_form" },
        },
      }),
    )
    expect(result).toEqual({ ok: false, reason: "invalid" })
    expect(adapter.getItem(SAVE_KEY)).toBe(live)
    expect(loadGame(adapter)?.creature?.branch).toBeNull()
  })

  test("a v19 import with a real branch on a baby is refused", () => {
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    const result = inspectSaveImport(
      JSON.stringify({
        version: 19,
        session: null,
        savedAt: 1,
        state: {
          ...owned,
          creature: { ...owned.creature, branch: "cinder_courser" },
        },
      }),
    )
    expect(result).toEqual({ ok: false, reason: "invalid" })
  })
})
