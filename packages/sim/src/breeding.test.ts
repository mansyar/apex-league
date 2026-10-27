/**
 * Dynasty breeding tests — Phase 1: traits, the breeding pool, and dual-parent
 * inheritance. Table-driven per the workflow (success + failure cases).
 *
 * Phase 2 (succession + save v15) is tested in legacy.test.ts and
 * save/breedingSave.test.ts.
 */

import { describe, expect, it } from "bun:test"
import {
  AFFINITY_DRIFT_CHANCE,
  breedingPool,
  canBreed,
  createBredCreature,
  deriveTrait,
  driftSource,
  effectiveTraits,
  hatchGiftEgg,
  inheritedFloorFromPair,
  pairFor,
  retireeRecord,
  rollAffinityDrift,
  speciesOptions,
  traitBonus,
  validatePair,
} from "./breeding"
import {
  type CreatureStats,
  createCreature,
  type Element,
  effectiveStats,
} from "./creature"
import { GRADUATION_DAY, type RetiredRecord } from "./legacy"
import type { Rng } from "./rng"
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
    // The graduation gate reads the pet's own age (save v23).
    creature: { ...creature, stage: "champion", ageDays: GRADUATION_DAY },
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
    affinity: null,
    stats: { hp: 100, atk: 20, def: 14, spd: 16 },
    trained: { ...ZERO },
    cupsWon: 0,
    generation: 0,
    retiredOnDay: 60,
    traits: [],
    parents: [],
    branch: "legacy",
    giftEgg: false,
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

describe("createBredCreature — seeded golden", () => {
  it("reproduces the Phase 1 golden for the fixture pair", () => {
    const sire = record({})
    const dam = record({
      name: "Moss",
      speciesId: "plant_ox",
      archetypeId: "bovine",
      element: "plant",
      stats: { hp: 80, atk: 12, def: 8, spd: 10 },
      generation: 1,
    })
    const child = createBredCreature("fire_drake", 42, [sire, dam], 1)
    expect(child.stats).toEqual({ hp: 88, atk: 11, def: 10, spd: 11 })
    expect(child.traits).toEqual(["sturdy"])
    expect(child.parents).toEqual([0, 1])
  })

  it("a new egg starts unchosen even when both parents earned forms", () => {
    const sire = record({
      branch: "cinder_courser",
      generation: 0,
      parents: [],
    })
    const dam = record({ branch: "pyre_warden", generation: 1, parents: [] })
    const egg = createBredCreature("fire_drake", 42, [sire, dam], 2)
    expect(egg.branch).toBeNull()
  })
})

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
    // Fire × plant is the embercub recipe, so the discovered line follows.
    expect(speciesOptions([a, b])).toEqual([
      "fire_drake",
      "plant_ox",
      "embercub",
    ])
    expect(speciesOptions([b, a])).toEqual([
      "plant_ox",
      "fire_drake",
      "embercub",
    ])
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

  it("keeps the 0.5 stronger-parent share at prestige 6 (AC-4 below)", () => {
    expect(inheritedFloorFromPair(strong, weak, DRAKE, 6, [])).toEqual({
      hp: 77,
      atk: 12,
      def: 9,
      spd: 10,
    })
  })

  it("raises the stronger-parent share to 0.55 at prestige 7 (AC-4)", () => {
    // 0.55*20 + 0.1*12 = 12.2 -> 12 (+1 established line = 13); the 0.5
    // share would stop at 11 + 1 = 12. def: 0.55*14 + 0.8 = 8.5 -> 9 (+1);
    // spd: 0.55*16 + 1 = 9.8 -> 10 (+1). hp stays clamped at the species
    // minimum on both sides of the boundary.
    expect(inheritedFloorFromPair(strong, weak, DRAKE, 7, [])).toEqual({
      hp: 77,
      atk: 13,
      def: 10,
      spd: 11,
    })
  })

  it("keeps the refined share cumulative at higher prestige", () => {
    expect(inheritedFloorFromPair(strong, weak, DRAKE, 9, [])).toEqual(
      inheritedFloorFromPair(strong, weak, DRAKE, 7, []),
    )
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

  it("hatches every prestige-7 egg at or above the refined 0.55 floor", () => {
    // A pair whose weighted rolls stay inside the ox bounds on at least one
    // stat, so the 0.55 share is visible end-to-end instead of clamping away.
    const brawn = record({
      generation: 0,
      name: "Brawn",
      stats: { hp: 170, atk: 16, def: 18, spd: 14 },
      traits: ["sturdy"],
    })
    const steady = record({
      generation: 1,
      name: "Steady",
      speciesId: "plant_ox",
      archetypeId: "bovine",
      element: "plant",
      stats: { hp: 90, atk: 10, def: 10, spd: 4 },
      traits: ["guarded"],
    })
    const plainFloor = inheritedFloorFromPair(
      brawn.stats,
      steady.stats,
      OX,
      6,
      ["sturdy", "guarded"],
    )
    const refinedFloor = inheritedFloorFromPair(
      brawn.stats,
      steady.stats,
      OX,
      7,
      ["sturdy", "guarded"],
    )
    // The boundary really bites: at least one stat's refined floor exceeds
    // the prestige-6 floor.
    expect(STAT_KEYS.some((key) => refinedFloor[key] > plainFloor[key])).toBe(
      true,
    )
    for (let seed = 0; seed < 40; seed++) {
      const egg = createBredCreature("plant_ox", seed, [brawn, steady], 7)
      for (const key of STAT_KEYS) {
        expect(egg.stats[key]).toBeGreaterThanOrEqual(refinedFloor[key])
        expect(egg.stats[key]).toBeLessThanOrEqual(OX.statBounds[key][1])
      }
    }
  })

  it("widens the mutation band to +1..+3 at champion-stable prestige (AC-5)", () => {
    const floor = inheritedFloorFromPair(
      parents[0].stats,
      parents[1].stats,
      OX,
      9,
      ["sturdy", "fierce"],
    )
    let sawThree = false
    for (let seed = 0; seed < 80; seed++) {
      const base = createCreature("plant_ox", seed).stats
      const egg = createBredCreature("plant_ox", seed, [...parents], 9)
      let mutations = 0
      for (const key of STAT_KEYS) {
        const delta = egg.stats[key] - Math.max(base[key], floor[key])
        expect(delta).toBeGreaterThanOrEqual(0)
        expect(delta).toBeLessThanOrEqual(3)
        if (delta > 0) {
          mutations += 1
          sawThree = sawThree || delta === 3
        }
      }
      expect(mutations).toBeLessThanOrEqual(1)
    }
    expect(sawThree).toBe(true)
  })

  it("extends only the top of the band — a prestige-9 egg never rolls lower than its prestige-8 twin", () => {
    let widened = false
    for (let seed = 0; seed < 80; seed++) {
      const plain = createBredCreature("plant_ox", seed, [...parents], 8)
      const stable = createBredCreature("plant_ox", seed, [...parents], 9)
      for (const key of STAT_KEYS) {
        // Same seed: identical floor, base roll, and mutation stat, so the
        // widened band can only raise a stat, never lower one.
        expect(stable.stats[key]).toBeGreaterThanOrEqual(plain.stats[key])
        if (stable.stats[key] > plain.stats[key]) {
          // The +1..+3 roll widened this egg; the visible delta may sit
          // below 3 when the species clamp eats the top of the band.
          widened = true
        }
      }
      expect(stable).toEqual(
        createBredCreature("plant_ox", seed, [...parents], 9),
      )
    }
    expect(widened).toBe(true)
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

/**
 * A stub Rng that replays queued draws in order and counts how many were
 * consumed — the drift rule promises not to draw for a same-element pair.
 */
function stubRng(draws: number[]): Rng & { count(): number } {
  let index = 0
  let count = 0
  const next = (): number => {
    const value = draws[index]
    index += 1
    count += 1
    if (value === undefined) throw new Error(`unexpected draw #${index}`)
    return value
  }
  return {
    next,
    int: (maxExclusive: number) => Math.floor(next() * maxExclusive),
    count: () => count,
  }
}

describe("affinity drift — the seeded roll", () => {
  /** A fire drake sire paired with a plant ox dam: the egg may drift plant. */
  const mixed = [
    record({ generation: 0 }),
    record({
      generation: 1,
      name: "Moss",
      speciesId: "plant_ox",
      archetypeId: "bovine",
      element: "plant",
    }),
  ] as const
  /** A fire-on-fire pair: no differing parent, so no drift is possible. */
  const same = [
    record({ generation: 0 }),
    record({ generation: 1, name: "Ember" }),
  ] as const

  it("uses a 15% drift chance", () => {
    expect(AFFINITY_DRIFT_CHANCE).toBe(0.15)
  })

  it("sources the drift from the parent whose element differs from the egg species", () => {
    expect(driftSource("fire", mixed)).toBe("plant")
    expect(driftSource("plant", mixed)).toBe("fire")
  })

  it("names no source when both parents share the species element", () => {
    expect(driftSource("fire", same)).toBeNull()
  })

  it("fires exactly at the threshold and not below it", () => {
    const threshold = 1 - AFFINITY_DRIFT_CHANCE
    const at = stubRng([threshold])
    expect(rollAffinityDrift(DRAKE, mixed, at)).toBe<Element>("plant")
    const below = stubRng([threshold - 0.001])
    expect(rollAffinityDrift(DRAKE, mixed, below)).toBeNull()
  })

  it("consumes no draw when both parents share the species element", () => {
    const rng = stubRng([])
    expect(rollAffinityDrift(DRAKE, same, rng)).toBeNull()
    expect(rng.count()).toBe(0)
  })

  it("is seeded — same seed, same roll", () => {
    for (let seed = 0; seed < 20; seed++) {
      expect(rollAffinityDrift(DRAKE, mixed, seed)).toEqual(
        rollAffinityDrift(DRAKE, mixed, seed),
      )
    }
  })

  it("drifts toward the parent's primary element only — a secondary never chains", () => {
    const chained = [
      record({ generation: 0 }),
      record({
        generation: 1,
        name: "Moss",
        speciesId: "plant_ox",
        archetypeId: "bovine",
        element: "plant",
        affinity: "electric" as Element,
      }),
    ] as const
    const at = stubRng([1 - AFFINITY_DRIFT_CHANCE])
    expect(rollAffinityDrift(DRAKE, chained, at)).toBe<Element>("plant")
  })
})

describe("createBredCreature — the hatch age", () => {
  it("a bred egg hatches with one day of life (save v23)", () => {
    const egg = createBredCreature("fire_drake", 42, [record(), record()], 1)
    expect(egg.ageDays).toBe(1)
  })
})

describe("hatchGiftEgg — the hatch age", () => {
  it("the granted hound hatches with one day of life (save v23)", () => {
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    const granted: GameState = {
      ...owned,
      claimedTiers: ["silver"],
      pendingRewards: [{ speciesId: "electric_hound", seed: 4242 }],
    }
    const result = hatchGiftEgg(granted)
    if (!result.ok) throw new Error("hatch refused")
    expect(result.state.stable[0]?.ageDays).toBe(1)
  })
})

describe("createBredCreature — affinity drift", () => {
  const mixed = [
    record({ generation: 0 }),
    record({
      generation: 1,
      name: "Moss",
      speciesId: "plant_ox",
      archetypeId: "bovine",
      element: "plant",
    }),
  ] as const
  const same = [
    record({ generation: 0 }),
    record({ generation: 1, name: "Ember" }),
  ] as const

  it("threads the drift roll into the egg so previewed equals hatched", () => {
    for (let seed = 0; seed < 40; seed++) {
      const egg = createBredCreature("fire_drake", seed, [...mixed], 1)
      expect(egg.affinity).toBe(rollAffinityDrift(DRAKE, mixed, seed))
      expect(egg.affinity === null || egg.affinity === "plant").toBe(true)
    }
  })

  it("drifts some seeded eggs toward the differing parent's element", () => {
    let sawDrift = false
    for (let seed = 0; seed < 40; seed++) {
      if (createBredCreature("fire_drake", seed, [...mixed], 1).affinity) {
        sawDrift = true
      }
    }
    expect(sawDrift).toBe(true)
  })

  it("never drifts from a same-element pair", () => {
    for (let seed = 0; seed < 40; seed++) {
      expect(
        createBredCreature("fire_drake", seed, [...same], 1).affinity,
      ).toBeNull()
    }
  })

  it("keeps the stat stream byte-identical whether or not a drift is possible", () => {
    // The pairs carry identical stats; only the dam's element differs. The
    // drift roll must live on its own stream so the egg's base roll and
    // mutation never move.
    for (let seed = 0; seed < 40; seed++) {
      const pure = createBredCreature("fire_drake", seed, [...same], 1)
      const pair = createBredCreature("fire_drake", seed, [...mixed], 1)
      expect(pair.stats).toEqual(pure.stats)
      expect(pair.traits).toEqual(pure.traits)
      expect(pair.conditions).toEqual(pure.conditions)
      expect(pair.parents).toEqual(pure.parents)
    }
  })
})
