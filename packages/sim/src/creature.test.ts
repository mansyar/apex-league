import { describe, expect, test } from "bun:test"

import {
  CONDITION_MAX,
  CONDITION_START,
  type Creature,
  chooseStarter,
  createCreature,
  createInitialState,
  effectiveStats,
  getSpecies,
  renameCreature,
  STARTER_SPECIES,
} from "./index"

describe("createCreature", () => {
  test("is deterministic — same seed produces identical stats", () => {
    const a = createCreature("fire_drake", 1234)
    const b = createCreature("fire_drake", 1234)
    expect(a.stats).toEqual(b.stats)
  })

  test("rolls stats within the species bounds", () => {
    const drake = getSpecies("fire_drake")
    if (!drake) throw new Error("fire_drake species missing")
    for (let seed = 0; seed < 20; seed++) {
      const c = createCreature("fire_drake", seed)
      expect(c.stats.hp).toBeGreaterThanOrEqual(drake.statBounds.hp[0])
      expect(c.stats.hp).toBeLessThanOrEqual(drake.statBounds.hp[1])
      expect(c.stats.atk).toBeGreaterThanOrEqual(drake.statBounds.atk[0])
      expect(c.stats.atk).toBeLessThanOrEqual(drake.statBounds.atk[1])
      expect(c.stats.def).toBeGreaterThanOrEqual(drake.statBounds.def[0])
      expect(c.stats.def).toBeLessThanOrEqual(drake.statBounds.def[1])
      expect(c.stats.spd).toBeGreaterThanOrEqual(drake.statBounds.spd[0])
      expect(c.stats.spd).toBeLessThanOrEqual(drake.statBounds.spd[1])
    }
  })

  test("has the species identity — archetype, element, stage, name", () => {
    const c = createCreature("fire_drake", 42)
    expect(c.archetypeId).toBe("draconic")
    expect(c.element).toBe("fire")
    expect(c.stage).toBe("baby")
    expect(c.name).toBe("Ember Drake")
  })

  test("starts with fresh conditions — all within 0-100", () => {
    const c = createCreature("fire_drake", 42)
    expect(c.conditions).toEqual(CONDITION_START)
    for (const value of Object.values(c.conditions)) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(CONDITION_MAX)
    }
  })

  test("is pure — creation never mutates shared state", () => {
    const a = createCreature("fire_drake", 7)
    const snapshot = structuredClone(a)
    createCreature("fire_drake", 7)
    expect(a).toEqual(snapshot)
  })

  test("throws on an unknown species id", () => {
    expect(() => createCreature("no_such_species", 1)).toThrow()
  })

  test("creates the newly unlocked Tide Axolotl from its species data", () => {
    const c = createCreature("water_axolotl", 42)
    expect(c.name).toBe("Tide Axolotl")
    expect(c.element).toBe("water")
    expect(c.archetypeId).toBe("axolotl")
    expect(c.stage).toBe("baby")
  })
})

describe("starter catalog", () => {
  test("offers exactly three starters", () => {
    expect(STARTER_SPECIES).toHaveLength(3)
  })

  test("fire drake is an available Fire starter on the draconic archetype", () => {
    const s = getSpecies("fire_drake")
    if (!s) throw new Error("fire_drake species missing")
    expect(s.available).toBe(true)
    expect(s.element).toBe("fire")
    expect(s.archetypeId).toBe("draconic")
  })

  test("plant ox is an available Plant starter on the bovine archetype", () => {
    const s = getSpecies("plant_ox")
    if (!s) throw new Error("plant_ox species missing")
    expect(s.available).toBe(true)
    expect(s.element).toBe("plant")
    expect(s.archetypeId).toBe("bovine")
  })

  test("water axolotl is an available Water starter on the axolotl archetype", () => {
    const s = getSpecies("water_axolotl")
    if (!s) throw new Error("water_axolotl species missing")
    expect(s.available).toBe(true)
    expect(s.element).toBe("water")
    expect(s.archetypeId).toBe("axolotl")
  })

  test("the trio is fully playable — every starter is available", () => {
    expect(STARTER_SPECIES.every((s) => s.available)).toBe(true)
  })

  test("the trio covers three distinct elements and archetypes", () => {
    expect(new Set(STARTER_SPECIES.map((s) => s.element)).size).toBe(3)
    expect(new Set(STARTER_SPECIES.map((s) => s.archetypeId)).size).toBe(3)
  })

  test("getSpecies returns undefined for unknown ids", () => {
    expect(getSpecies("no_such_species")).toBeUndefined()
  })
})

describe("Creature type invariants", () => {
  test("every starter's element is one of the six league elements", () => {
    const valid = new Set([
      "fire",
      "water",
      "plant",
      "electric",
      "earth",
      "wind",
    ])
    for (const s of STARTER_SPECIES) {
      expect(valid.has(s.element)).toBe(true)
    }
  })

  test("creatures carry their condition set of exactly five keys", () => {
    const c: Creature = createCreature("plant_ox", 3)
    expect(Object.keys(c.conditions).sort()).toEqual([
      "bond",
      "energy",
      "health",
      "hunger",
      "mood",
    ])
  })
})

describe("GameState creature integration", () => {
  test("a fresh state has no creature yet (starter choice pending)", () => {
    const s = createInitialState()
    expect(s.creature).toBeNull()
  })

  test("chooseStarter writes the creature into a new state", () => {
    const s = createInitialState()
    const next = chooseStarter(s, "fire_drake", 42)
    expect(next.creature).not.toBeNull()
    expect(next.creature?.speciesId).toBe("fire_drake")
    expect(next.creature?.element).toBe("fire")
    expect(next.creature?.stage).toBe("baby")
  })

  test("chooseStarter keeps the rest of the state intact", () => {
    const s = createInitialState()
    const next = chooseStarter(s, "plant_ox", 42)
    expect(next.day).toBe(s.day)
    expect(next.phase).toBe(s.phase)
    expect(next.actionPoints).toBe(s.actionPoints)
  })

  test("chooseStarter is pure — does not mutate the input state", () => {
    const s = createInitialState()
    const snapshot = structuredClone(s)
    chooseStarter(s, "fire_drake", 42)
    expect(s).toEqual(snapshot)
  })

  test("chooseStarter accepts every starter in the trio", () => {
    for (const species of STARTER_SPECIES) {
      const s = chooseStarter(createInitialState(), species.id, 42)
      expect(s.creature?.speciesId).toBe(species.id)
    }
  })

  test("chooseStarter rejects an unknown species", () => {
    const s = createInitialState()
    expect(() => chooseStarter(s, "no_such_species", 1)).toThrow()
  })

  test("chooseStarter rejects a state that already has a creature", () => {
    const s = chooseStarter(createInitialState(), "fire_drake", 42)
    expect(() => chooseStarter(s, "plant_ox", 42)).toThrow()
  })
})

describe("training fields", () => {
  test("a new creature has zero trained bonuses, no focus, and no result", () => {
    const c = createCreature("fire_drake", 42)
    expect(c.trained).toEqual({ hp: 0, atk: 0, def: 0, spd: 0 })
    expect(c.trainingFocus).toBeNull()
    expect(c.trainingResult).toBeNull()
  })

  test("every starter gets neutral training fields", () => {
    for (const species of STARTER_SPECIES) {
      if (!species.available) continue
      const c = createCreature(species.id, 5)
      expect(c.trained).toEqual({ hp: 0, atk: 0, def: 0, spd: 0 })
      expect(c.trainingFocus).toBeNull()
      expect(c.trainingResult).toBeNull()
    }
  })

  test("training fields do not change the rolled stats", () => {
    const drake = getSpecies("fire_drake")
    if (!drake) throw new Error("fire_drake species missing")
    for (let seed = 0; seed < 20; seed++) {
      const c = createCreature("fire_drake", seed)
      expect(c.stats.hp).toBeGreaterThanOrEqual(drake.statBounds.hp[0])
      expect(c.stats.hp).toBeLessThanOrEqual(drake.statBounds.hp[1])
      expect(c.stats.atk).toBeGreaterThanOrEqual(drake.statBounds.atk[0])
      expect(c.stats.atk).toBeLessThanOrEqual(drake.statBounds.atk[1])
      expect(c.stats.def).toBeGreaterThanOrEqual(drake.statBounds.def[0])
      expect(c.stats.def).toBeLessThanOrEqual(drake.statBounds.def[1])
      expect(c.stats.spd).toBeGreaterThanOrEqual(drake.statBounds.spd[0])
      expect(c.stats.spd).toBeLessThanOrEqual(drake.statBounds.spd[1])
    }
  })

  test("creatures carry exactly the four training fields", () => {
    const c: Creature = createCreature("fire_drake", 42)
    expect("trained" in c).toBe(true)
    expect("trainingFocus" in c).toBe(true)
    expect("trainingResult" in c).toBe(true)
    expect("trainingDays" in c).toBe(true)
  })

  test("a new creature has zero trained days", () => {
    const c = createCreature("fire_drake", 42)
    expect(c.trainingDays).toBe(0)
  })

  test("every starter starts the move pool with zero trained days", () => {
    for (const species of STARTER_SPECIES) {
      if (!species.available) continue
      const c = createCreature(species.id, 7)
      expect(c.trainingDays).toBe(0)
    }
  })
})

describe("effectiveStats", () => {
  test("returns stats + trained per stat", () => {
    const c = createCreature("fire_drake", 42)
    const trained: Creature["trained"] = { hp: 2, atk: 5, def: 1, spd: 3 }
    const withTrained = { ...c, trained }
    expect(effectiveStats(withTrained)).toEqual({
      hp: c.stats.hp + 2,
      atk: c.stats.atk + 5,
      def: c.stats.def + 1,
      spd: c.stats.spd + 3,
    })
  })

  test("an untrained creature's effective stats equal its rolled stats", () => {
    const c = createCreature("plant_ox", 9)
    expect(effectiveStats(c)).toEqual(c.stats)
  })

  test("effectiveStats is pure — reading never mutates the creature", () => {
    const c = createCreature("fire_drake", 4)
    const snapshot = structuredClone(c)
    effectiveStats(c)
    expect(c).toEqual(snapshot)
  })

  test("a new creature has fedToday false", () => {
    const c = createCreature("fire_drake", 42)
    expect(c.fedToday).toBe(false)
  })

  test("every available starter starts unfed", () => {
    for (const species of STARTER_SPECIES) {
      if (!species.available) continue
      expect(createCreature(species.id, 5).fedToday).toBe(false)
    }
  })
})

describe("renameCreature", () => {
  const started = chooseStarter(createInitialState(), "fire_drake", 42)

  test("trims surrounding whitespace and persists the name", () => {
    const next = renameCreature(started, "  Blaze  ")
    expect(next.ok).toBe(true)
    if (next.ok) expect(next.state.creature?.name).toBe("Blaze")
  })

  test("clamps a too-long name to 16 characters", () => {
    const next = renameCreature(started, "Countess Emberflame")
    expect(next.ok).toBe(true)
    if (next.ok) expect(next.state.creature?.name).toHaveLength(16)
  })

  test("an empty name resets to the species default", () => {
    const renamed = renameCreature(started, "Blaze")
    if (!renamed.ok) throw new Error("rename should succeed")
    const reset = renameCreature(renamed.state, "   ")
    expect(reset.ok).toBe(true)
    if (reset.ok) {
      expect(reset.state.creature?.name).toBe("Ember Drake")
    }
  })

  test("rejects during the cup phase and leaves the state untouched", () => {
    const cupState = { ...started, phase: "cup" as const }
    const snapshot = structuredClone(cupState)
    const next = renameCreature(cupState, "Blaze")
    expect(next).toEqual({ ok: false, reason: "cup-phase" })
    expect(cupState).toEqual(snapshot)
  })

  test("rejects when there is no creature yet", () => {
    const next = renameCreature(createInitialState(), "Blaze")
    expect(next).toEqual({ ok: false, reason: "no-creature" })
  })

  test("is pure — does not mutate the input state", () => {
    const snapshot = structuredClone(started)
    renameCreature(started, "Blaze")
    expect(started).toEqual(snapshot)
  })
})
