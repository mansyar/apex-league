/**
 * Track evolution_discovery_20261020 Phase 1: per-gate evolution discovery.
 *
 * The sim remembers which evolution gate the player has already cleared once:
 * the field rides `GameState` (save v17), `advanceDay` flips it on a real
 * stage change, and v1-v16 saves infer it from the active creature's stage.
 */
import { describe, expect, test } from "bun:test"
import type { LifeStage } from "../creature"
import {
  chooseStarter,
  createInitialState,
  type GameState,
  initialEvolutionKnowledge,
  markEvolutionKnown,
} from "../state"
import { advanceDay } from "../ticker"
import { migrate } from "./migrate"
import { SAVE_VERSION } from "./schema"
import { createMemoryAdapter, loadGame, loadSave, saveGame } from "./storage"

describe("evolution discovery state (save v17)", () => {
  test("a fresh run knows neither gate", () => {
    expect(createInitialState().evolutionKnowledge).toEqual({
      juvenile: false,
      champion: false,
    })
    expect(initialEvolutionKnowledge()).toEqual({
      juvenile: false,
      champion: false,
    })
  })

  test("initialEvolutionKnowledge returns a fresh record each call", () => {
    const first = initialEvolutionKnowledge()
    first.juvenile = true
    expect(initialEvolutionKnowledge()).toEqual({
      juvenile: false,
      champion: false,
    })
  })

  test("marking a gate is pure — the input state is untouched", () => {
    const state = createInitialState()
    const next = markEvolutionKnown(state, "juvenile")

    expect(next).not.toBe(state)
    expect(next.evolutionKnowledge.juvenile).toBe(true)
    expect(next.evolutionKnowledge.champion).toBe(false)
    expect(state.evolutionKnowledge).toEqual({
      juvenile: false,
      champion: false,
    })
  })

  test("marking one gate never reveals the other", () => {
    const champion = markEvolutionKnown(createInitialState(), "champion")
    expect(champion.evolutionKnowledge).toEqual({
      juvenile: false,
      champion: true,
    })
  })

  test("marking is idempotent — a known gate returns the same state", () => {
    const once = markEvolutionKnown(createInitialState(), "champion")
    expect(markEvolutionKnown(once, "champion")).toBe(once)
  })
})

/** Rng stub that never rolls a sickness onset (mirrors save.test.ts). */
const CALM_RNG = { next: () => 0.99, int: () => 0 }

/** A well-cared-for creature at the requested stage, ready to settle. */
function caredFor(
  stage: LifeStage,
  day: number,
  extra: Partial<GameState> = {},
): GameState {
  const owned = chooseStarter(createInitialState(), "fire_drake", 7)
  if (!owned.creature) throw new Error("expected a creature")
  return {
    ...owned,
    day,
    ...extra,
    creature: {
      ...owned.creature,
      stage,
      conditions: {
        hunger: 100,
        energy: 100,
        health: 100,
        mood: 100,
        bond: 100,
      },
    },
  }
}

describe("advanceDay records discovery on a real stage change", () => {
  test("a baby → juvenile night reveals the juvenile gate only", () => {
    const next = advanceDay(caredFor("baby", 10), CALM_RNG)

    expect(next.creature?.stage).toBe("juvenile")
    expect(next.evolutionKnowledge).toEqual({
      juvenile: true,
      champion: false,
    })
  })

  test("a juvenile → champion night reveals both gates", () => {
    const next = advanceDay(caredFor("juvenile", 25, { cupsWon: 1 }), CALM_RNG)

    expect(next.creature?.stage).toBe("champion")
    expect(next.evolutionKnowledge).toEqual({
      juvenile: true,
      champion: true,
    })
  })

  test("a night without an evolution records nothing", () => {
    const next = advanceDay(caredFor("baby", 3), CALM_RNG)

    expect(next.creature?.stage).toBe("baby")
    expect(next.evolutionKnowledge).toEqual({
      juvenile: false,
      champion: false,
    })
  })

  test("a blocked champion gate records nothing", () => {
    // Old enough and well cared for, but the prestige gate is unmet.
    const next = advanceDay(caredFor("juvenile", 25), CALM_RNG)

    expect(next.creature?.stage).toBe("juvenile")
    expect(next.evolutionKnowledge).toEqual({
      juvenile: false,
      champion: false,
    })
  })

  test("a champion night never resets what the player learned", () => {
    const known: GameState = {
      ...caredFor("champion", 40),
      evolutionKnowledge: { juvenile: true, champion: true },
    }
    const next = advanceDay(known, CALM_RNG)

    expect(next.creature?.stage).toBe("champion")
    expect(next.evolutionKnowledge).toEqual({
      juvenile: true,
      champion: true,
    })
  })

  test("a known juvenile gate stays known when the champion gate unlocks", () => {
    const next = advanceDay(
      {
        ...caredFor("juvenile", 25, { cupsWon: 1 }),
        evolutionKnowledge: { juvenile: true, champion: false },
      },
      CALM_RNG,
    )

    expect(next.evolutionKnowledge).toEqual({
      juvenile: true,
      champion: true,
    })
  })

  test("a save with no creature records nothing and does not throw", () => {
    const next = advanceDay(createInitialState(), CALM_RNG)

    expect(next.creature).toBeNull()
    expect(next.evolutionKnowledge).toEqual({
      juvenile: false,
      champion: false,
    })
  })
})

/** A v16 payload (the discovery record did not exist yet) per stage. */
function v16Payload(stage: LifeStage | null): Record<string, unknown> {
  const owned = stage === null ? createInitialState() : caredFor(stage, 12)
  const state = JSON.parse(JSON.stringify(owned)) as Record<string, unknown>
  delete state.evolutionKnowledge
  return { version: 16, state, session: null, savedAt: 1234 }
}

describe("save v17 — discovery inferred from the persisted stage", () => {
  test("the schema version is 19", () => {
    expect(SAVE_VERSION).toBe(21)
  })

  test("a v16 juvenile save knows the juvenile gate only", () => {
    const migrated = migrate(v16Payload("juvenile"))

    expect(migrated.version).toBe(SAVE_VERSION)
    expect(migrated.savedAt).toBe(1234)
    expect(migrated.state.creature?.stage).toBe("juvenile")
    expect(migrated.state.evolutionKnowledge).toEqual({
      juvenile: true,
      champion: false,
    })
  })

  test("a v16 champion save knows both gates", () => {
    const migrated = migrate(v16Payload("champion"))

    expect(migrated.state.creature?.stage).toBe("champion")
    expect(migrated.state.evolutionKnowledge).toEqual({
      juvenile: true,
      champion: true,
    })
  })

  test("a v16 baby save knows neither gate", () => {
    expect(migrate(v16Payload("baby")).state.evolutionKnowledge).toEqual({
      juvenile: false,
      champion: false,
    })
  })

  test("a v16 save with no creature knows neither gate", () => {
    const migrated = migrate(v16Payload(null))

    expect(migrated.state.creature).toBeNull()
    expect(migrated.state.evolutionKnowledge).toEqual({
      juvenile: false,
      champion: false,
    })
  })

  test("a pre-existing discovery field on the payload is ignored", () => {
    const lying = v16Payload("baby")
    ;(lying.state as Record<string, unknown>).evolutionKnowledge = {
      juvenile: true,
      champion: true,
    }
    expect(migrate(lying).state.evolutionKnowledge).toEqual({
      juvenile: false,
      champion: false,
    })

    const modest = v16Payload("champion")
    ;(modest.state as Record<string, unknown>).evolutionKnowledge = {
      juvenile: false,
      champion: false,
    }
    expect(migrate(modest).state.evolutionKnowledge).toEqual({
      juvenile: true,
      champion: true,
    })
  })

  test("a v15 save infers discovery through the chain", () => {
    const migrated = migrate({ ...v16Payload("juvenile"), version: 15 })

    expect(migrated.version).toBe(SAVE_VERSION)
    expect(migrated.state.evolutionKnowledge).toEqual({
      juvenile: true,
      champion: false,
    })
  })

  test("a v1 save chain-migrates to a baby with neither gate known", () => {
    const migrated = migrate({
      version: 1,
      state: { day: 2, phase: "day", actionPoints: 3 },
      savedAt: 0,
    })

    expect(migrated.version).toBe(SAVE_VERSION)
    expect(migrated.state.creature?.stage).toBe("baby")
    expect(migrated.state.evolutionKnowledge).toEqual({
      juvenile: false,
      champion: false,
    })
  })

  test("the v16 → v17 step forwards settings, ladder, ledger, and session", () => {
    const payload = v16Payload("juvenile")
    const state = payload.state as Record<string, unknown>
    ;(state.settings as Record<string, unknown>).muted = true
    ;(state.ladder as Record<string, unknown>).points = 42
    state.bossDefeats = ["koda"]
    payload.session = { seed: 3 }

    const migrated = migrate(payload)

    expect(migrated.state.settings.muted).toBe(true)
    expect(migrated.state.ladder.points).toBe(42)
    expect(migrated.state.bossDefeats).toEqual(["koda"])
    expect(migrated.session as unknown).toEqual({ seed: 3 })
  })

  test("re-migrating a v17 save is a no-op", () => {
    const once = migrate(v16Payload("juvenile"))
    const twice = migrate(JSON.parse(JSON.stringify(once)))

    expect(twice.version).toBe(SAVE_VERSION)
    expect(twice.state).toEqual(once.state)
  })
})

describe("save v17 — discovery round-trips and validates", () => {
  test("both known gates round-trip through saveGame/loadSave", () => {
    const adapter = createMemoryAdapter()
    const state: GameState = {
      ...caredFor("champion", 30),
      evolutionKnowledge: { juvenile: true, champion: true },
    }

    expect(saveGame(adapter, state, 1)).toBe(true)
    expect(loadSave(adapter)?.state.evolutionKnowledge).toEqual({
      juvenile: true,
      champion: true,
    })
  })

  test("a migrated v16 save round-trips its inferred record", () => {
    const adapter = createMemoryAdapter()
    const migrated = migrate(v16Payload("juvenile"))

    expect(saveGame(adapter, migrated.state, 5)).toBe(true)
    expect(loadSave(adapter)?.state.evolutionKnowledge).toEqual({
      juvenile: true,
      champion: false,
    })
  })

  test("storage rejects a missing or malformed discovery record", () => {
    const owned = chooseStarter(createInitialState(), "fire_drake", 7)
    const cases: unknown[] = [
      { ...owned, evolutionKnowledge: undefined },
      { ...owned, evolutionKnowledge: null },
      { ...owned, evolutionKnowledge: { juvenile: true } },
      { ...owned, evolutionKnowledge: { juvenile: "yes", champion: false } },
      { ...owned, evolutionKnowledge: { juvenile: true, champion: 1 } },
    ]
    for (const bad of cases) {
      const adapter = createMemoryAdapter()
      saveGame(adapter, bad as GameState, 1)
      expect(loadGame(adapter)).toBeNull()
    }
  })
})
