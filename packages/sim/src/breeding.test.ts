/**
 * Dynasty breeding tests — Phase 1: traits, the breeding pool, and dual-parent
 * inheritance. Table-driven per the workflow (success + failure cases).
 *
 * Phase 2 (succession + save v15) is tested in legacySave.test.ts / save.test.ts.
 */

import { describe, expect, it } from "bun:test"
import {
  breedingPool,
  canBreed,
  createBredCreature,
  deriveTrait,
  effectiveTraits,
  inheritedFloorFromPair,
  pairFor,
  retireeRecord,
  speciesOptions,
  traitBonus,
  validatePair,
} from "./breeding"
import { type CreatureStats, createCreature, effectiveStats } from "./creature"
import { GRADUATION_DAY, type RetiredRecord } from "./legacy"
import { getSpecies } from "./species"
import { chooseStarter, createInitialState, type GameState } from "./state"

const STAT_KEYS = ["hp", "atk", "def", "spd"] as const
const ZERO: CreatureStats = { hp: 0, atk: 0, def: 0, spd: 0 }

/** A champion-ready founder state (day 60, champion, full AP). */
function championState(): GameState {
  const owned = chooseStarter(createInitialState(), "fire_drake", 42)
  const creature = owned.creature
  if (!creature) throw new Error("expected a starter creature")
  return {
    ...owned,
    day: GRADUATION_DAY,
    creature: { ...creature, stage: "champion" },
  }
}

function creatureOf(state: GameState) {
  const creature = state.creature
  if (!creature) throw new Error("expected a creature")
  return creature
}

/** A Hall of Fame record with sane defaults; override per case. */
function record(overrides: Partial<RetiredRecord> = {}): RetiredRecord {
  return {
    name: "Rolo",
    speciesId: "fire_drake",
    archetypeId: "draconic",
    element: "fire",
    stats: { hp: 100, atk: 20, def: 14, spd: 16 },
    trained: { ...ZERO },
    cupsWon: 0,
    generation: 0,
    retiredOnDay: 60,
    traits: [],
    parents: [],
    ...overrides,
  }
}

const DRAKE = (() => {
  const s = getSpecies("fire_drake")
  if (!s) throw new Error("expected fire_drake")
  return s
})()

const OX = (() => {
  const s = getSpecies("plant_ox")
  if (!s) throw new Error("expected plant_ox")
  return s
})()

describe("deriveTrait — trained-stat precedence", () => {
  it("maps the highest trained stat to its trait", () => {
    const cases = [
      { key: "hp", trait: "sturdy" },
      { key: "atk", trait: "fierce" },
      { key: "def", trait: "guarded" },
      { key: "spd", trait: "quick" },
    ] as const
    for (const c of cases) {
      const trained = { ...ZERO, [c.key]: 3 }
      expect(
        deriveTrait({
          trained,
          effective: { hp: 80, atk: 20, def: 15, spd: 12 },
        }),
      ).toBe(c.trait)
    }
  })

  it("breaks a trained tie in HP > ATK > DEF > SPD order", () => {
    expect(
      deriveTrait({
        trained: { ...ZERO, hp: 2, atk: 2 },
        effective: { hp: 80, atk: 20, def: 10, spd: 9 },
      }),
    ).toBe("sturdy")
    expect(
      deriveTrait({
        trained: { ...ZERO, atk: 2, spd: 2 },
        effective: { hp: 80, atk: 20, def: 10, spd: 9 },
      }),
    ).toBe("fierce")
  })

  it("falls back to effective stats when nothing was trained", () => {
    expect(
      deriveTrait({
        trained: { ...ZERO },
        effective: { hp: 10, atk: 20, def: 19, spd: 9 },
      }),
    ).toBe("fierce")
  })

  it("breaks an effective-stat tie in HP > ATK > DEF > SPD order", () => {
    expect(
      deriveTrait({
        trained: { ...ZERO },
        effective: { hp: 80, atk: 80, def: 80, spd: 80 },
      }),
    ).toBe("sturdy")
  })
})

describe("effectiveTraits — stored traits win, legacy records derive", () => {
  it("returns stored traits without re-deriving", () => {
    expect(
      effectiveTraits({
        traits: ["quick"],
        trained: { ...ZERO, atk: 6 },
        stats: { hp: 80, atk: 20, def: 10, spd: 9 },
      }),
    ).toEqual(["quick"])
  })

  it("derives a trait when the record predates traits (empty array)", () => {
    expect(
      effectiveTraits({
        traits: [],
        trained: { ...ZERO },
        stats: { hp: 10, atk: 20, def: 9, spd: 8 },
      }),
    ).toEqual(["fierce"])
  })
})

describe("traitBonus — floor modifiers", () => {
  it("sums one bonus per trait", () => {
    expect(traitBonus(["sturdy", "fierce"])).toEqual({
      hp: 2,
      atk: 1,
      def: 0,
      spd: 0,
    })
    expect(traitBonus(["guarded", "quick"])).toEqual({
      hp: 0,
      atk: 0,
      def: 1,
      spd: 1,
    })
  })

  it("counts a duplicate trait once", () => {
    expect(traitBonus(["sturdy", "sturdy"])).toEqual({
      hp: 2,
      atk: 0,
      def: 0,
      spd: 0,
    })
  })
})

describe("breedingPool", () => {
  it("contains the retiring champion even before it is archived", () => {
    const state = championState()
    const pool = breedingPool(state)
    expect(pool).toHaveLength(1)
    expect(pool[0]).toMatchObject({
      name: creatureOf(state).name,
      speciesId: "fire_drake",
      archetypeId: "draconic",
      element: "fire",
      stats: effectiveStats(creatureOf(state)),
      trained: creatureOf(state).trained,
      cupsWon: 0,
      generation: 0,
      retiredOnDay: GRADUATION_DAY,
      traits: ["sturdy"],
      parents: [],
    })
  })

  it("appends the retiree after the archived Hall of Fame records", () => {
    const base = championState()
    const archived = record({ generation: 0, name: "Old Rolo" })
    const state: GameState = {
      ...base,
      lineage: { generation: 1, hallOfFame: [archived] },
      creature: { ...creatureOf(base), parents: [0] },
    }
    const pool = breedingPool(state)
    expect(pool.map((r) => r.generation)).toEqual([0, 1])
    expect(pool[0]).toBe(archived)
    expect(pool[1]?.parents).toEqual([0])
  })

  it("keeps a retiring bred champion's own parentage", () => {
    const base = championState()
    const state: GameState = {
      ...base,
      creature: {
        ...creatureOf(base),
        traits: ["quick"],
        parents: [0, 2],
      },
    }
    const retiree = retireeRecord(state)
    expect(retiree?.traits).toEqual(["quick"])
    expect(retiree?.parents).toEqual([0, 2])
  })
})

describe("canBreed", () => {
  it("is false at the first graduation (only the retiree is in the pool)", () => {
    expect(canBreed(championState())).toBe(false)
  })

  it("is true once one record is archived", () => {
    const base = championState()
    expect(
      canBreed({
        ...base,
        lineage: { generation: 1, hallOfFame: [record({ generation: 0 })] },
      }),
    ).toBe(true)
  })

  it("is false when the active creature cannot graduate", () => {
    const base = championState()
    expect(
      canBreed({
        ...base,
        creature: { ...creatureOf(base), stage: "juvenile" },
        lineage: { generation: 1, hallOfFame: [record({ generation: 0 })] },
      }),
    ).toBe(false)
  })
})

describe("validatePair / pairFor", () => {
  const a = record({ generation: 0, name: "A" })
  const b = record({
    generation: 1,
    name: "B",
    speciesId: "plant_ox",
    archetypeId: "bovine",
    element: "plant",
  })
  const pool = [a, b]

  it("accepts two distinct known generations", () => {
    expect(validatePair(pool, [0, 1])).toEqual({ ok: true, pair: [a, b] })
    expect(pairFor(pool, [0, 1])).toEqual([a, b])
  })

  it("rejects a wrong selection size", () => {
    expect(validatePair(pool, [0])).toEqual({
      ok: false,
      reason: "need-two",
    })
    expect(validatePair(pool, [0, 1, 0])).toEqual({
      ok: false,
      reason: "need-two",
    })
  })

  it("rejects the same record twice", () => {
    expect(validatePair(pool, [0, 0])).toEqual({
      ok: false,
      reason: "duplicate",
    })
  })

  it("rejects a retired generation that is not in the pool", () => {
    expect(validatePair(pool, [0, 9])).toEqual({
      ok: false,
      reason: "unknown",
    })
    expect(pairFor(pool, [0, 9])).toBeNull()
  })
})

describe("speciesOptions", () => {
  it("returns one option when both parents share a species", () => {
    expect(
      speciesOptions([record({ generation: 0 }), record({ generation: 1 })]),
    ).toEqual(["fire_drake"])
  })

  it("returns both parent species in selection order", () => {
    const a = record({ generation: 0 })
    const b = record({
      generation: 1,
      speciesId: "plant_ox",
      archetypeId: "bovine",
      element: "plant",
    })
    expect(speciesOptions([a, b])).toEqual(["fire_drake", "plant_ox"])
    expect(speciesOptions([b, a])).toEqual(["plant_ox", "fire_drake"])
  })
})

describe("inheritedFloorFromPair", () => {
  const strong: CreatureStats = { hp: 100, atk: 20, def: 14, spd: 16 }
  const weak: CreatureStats = { hp: 80, atk: 12, def: 8, spd: 10 }

  it("uses 50% of the stronger parent plus 10% of the weaker, then clamps", () => {
    expect(inheritedFloorFromPair(strong, weak, DRAKE, 0, [])).toEqual({
      hp: 76,
      atk: 11,
      def: 8,
      spd: 9,
    })
  })

  it("is symmetric in parent order", () => {
    expect(inheritedFloorFromPair(weak, strong, DRAKE, 0, [])).toEqual(
      inheritedFloorFromPair(strong, weak, DRAKE, 0, []),
    )
  })

  it("adds trait bonuses after the weighted roll", () => {
    expect(
      inheritedFloorFromPair(strong, weak, DRAKE, 0, ["sturdy", "fierce"]),
    ).toEqual({ hp: 78, atk: 12, def: 8, spd: 9 })
  })

  it("adds the established-line +1 to every stat", () => {
    expect(
      inheritedFloorFromPair(strong, weak, DRAKE, 5, ["sturdy", "fierce"]),
    ).toEqual({ hp: 79, atk: 13, def: 9, spd: 10 })
  })

  it("clamps a huge pair down to the species maximums", () => {
    const huge: CreatureStats = { hp: 500, atk: 500, def: 500, spd: 500 }
    expect(inheritedFloorFromPair(huge, huge, DRAKE, 0, [])).toEqual({
      hp: 92,
      atk: 13,
      def: 10,
      spd: 12,
    })
  })

  it("clamps a weak pair up to the species minimums", () => {
    const tiny: CreatureStats = { hp: 2, atk: 2, def: 2, spd: 2 }
    expect(inheritedFloorFromPair(tiny, tiny, DRAKE, 0, [])).toEqual({
      hp: 76,
      atk: 9,
      def: 7,
      spd: 9,
    })
  })
})

describe("createBredCreature", () => {
  const parents = [
    record({
      generation: 0,
      name: "Sire",
      stats: { hp: 100, atk: 20, def: 14, spd: 16 },
      traits: ["sturdy"],
    }),
    record({
      generation: 1,
      name: "Dam",
      speciesId: "plant_ox",
      archetypeId: "bovine",
      element: "plant",
      stats: { hp: 90, atk: 18, def: 16, spd: 8 },
      traits: ["fierce"],
    }),
  ] as const

  it("is seed-reproducible", () => {
    expect(createBredCreature("plant_ox", 7, [...parents], 0)).toEqual(
      createBredCreature("plant_ox", 7, [...parents], 0),
    )
  })

  it("inherits the deduplicated trait union and sorted parentage", () => {
    const egg = createBredCreature("plant_ox", 7, [...parents].reverse(), 0)
    expect(egg.traits).toEqual(["sturdy", "fierce"])
    expect(egg.parents).toEqual([0, 1])
  })

  it("rolls at or above the dual-parent floor and within species bounds", () => {
    const floor = inheritedFloorFromPair(
      parents[0].stats,
      parents[1].stats,
      OX,
      0,
      ["sturdy", "fierce"],
    )
    for (let seed = 0; seed < 40; seed++) {
      const egg = createBredCreature("plant_ox", seed, [...parents], 0)
      for (const key of STAT_KEYS) {
        expect(egg.stats[key]).toBeGreaterThanOrEqual(floor[key])
        expect(egg.stats[key]).toBeLessThanOrEqual(OX.statBounds[key][1])
        expect(egg.stats[key]).toBeGreaterThanOrEqual(OX.statBounds[key][0])
      }
    }
  })

  it("applies at most one +1..+2 mutation, deterministically", () => {
    let sawMutation = false
    for (let seed = 0; seed < 40; seed++) {
      const base = createCreature("plant_ox", seed).stats
      const floor = inheritedFloorFromPair(
        parents[0].stats,
        parents[1].stats,
        OX,
        0,
        ["sturdy", "fierce"],
      )
      const egg = createBredCreature("plant_ox", seed, [...parents], 0)
      let mutations = 0
      for (const key of STAT_KEYS) {
        const delta = egg.stats[key] - Math.max(base[key], floor[key])
        expect(delta).toBeGreaterThanOrEqual(0)
        expect(delta).toBeLessThanOrEqual(2)
        if (delta > 0) {
          mutations += 1
          expect(delta).toBeGreaterThanOrEqual(1)
          sawMutation = true
        }
      }
      expect(mutations).toBeLessThanOrEqual(1)
    }
    expect(sawMutation).toBe(true)
  })

  it("raises the starting bond under the warm-bloodline perk", () => {
    const cold = createBredCreature("plant_ox", 3, [...parents], 0)
    expect(cold.conditions.bond).toBe(10)
    const warm = createBredCreature("plant_ox", 3, [...parents], 3)
    expect(warm.conditions.bond).toBe(20)
  })

  it("throws on an unknown or unavailable species", () => {
    expect(() => createBredCreature("nope", 1, [...parents], 0)).toThrow()
  })
})

describe("retireeRecord", () => {
  it("captures effective stats, cups, day and derived trait", () => {
    const base = championState()
    const state: GameState = { ...base, cupsWon: 2, day: 70 }
    const retiree = retireeRecord(state)
    expect(retiree).toMatchObject({
      name: creatureOf(state).name,
      speciesId: "fire_drake",
      stats: effectiveStats(creatureOf(state)),
      cupsWon: 2,
      generation: 0,
      retiredOnDay: 70,
      traits: ["sturdy"],
      parents: [],
    })
  })

  it("returns null when there is no active creature", () => {
    expect(retireeRecord(createInitialState())).toBeNull()
  })
})
