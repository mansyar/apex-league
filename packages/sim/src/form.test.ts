import { describe, expect, test } from "bun:test"

import {
  battleStats,
  type Creature,
  createCreature,
  effectiveStats,
  FORM_COPY,
  FORM_DELTAS,
  type FormTier,
  formModifier,
  formScore,
  formTier,
  SICK_HEALTH,
  STARTER_SPECIES,
} from "./index"

const TIERS: readonly FormTier[] = ["sharp", "steady", "flat", "sluggish"]

/** A freshly created creature with hand-set care conditions. */
function creatureWith(
  conditions: Partial<Creature["conditions"]>,
  speciesId = "fire_drake",
): Creature {
  const fresh = createCreature(speciesId, 42)
  return {
    ...fresh,
    conditions: { ...fresh.conditions, ...conditions },
  }
}

/** The documented score formula, so tests compare the raw float it defines. */
const scoreOf = (mood: number, bond: number) => 0.6 * mood + 0.4 * bond

describe("formScore", () => {
  test("weighs mood 0.6 and bond 0.4", () => {
    expect(formScore(creatureWith({ mood: 60, bond: 10 }))).toBeCloseTo(40, 10)
    expect(formScore(creatureWith({ mood: 100, bond: 100 }))).toBeCloseTo(
      100,
      10,
    )
    expect(formScore(creatureWith({ mood: 20, bond: 0 }))).toBeCloseTo(12, 10)
  })

  test("is exactly the raw weighted sum, not a rounded display value", () => {
    const creature = creatureWith({ mood: 73, bond: 41 })
    expect(formScore(creature)).toBe(scoreOf(73, 41))
  })

  test("reads conditions only — same creature, same score, no RNG", () => {
    const creature = creatureWith({ mood: 55, bond: 35 })
    expect(formScore(creature)).toBe(formScore(creature))
  })
})

describe("formTier — starting conditions stay neutral", () => {
  test("is steady for a fresh creature of every starter species", () => {
    for (const species of STARTER_SPECIES) {
      const fresh = createCreature(species.id, 42)
      expect(fresh.conditions).toEqual({
        hunger: 80,
        energy: 80,
        health: 100,
        mood: 60,
        bond: 10,
      })
      expect(formScore(fresh)).toBeCloseTo(40, 10)
      expect(formTier(fresh)).toBe("steady")
    }
  })

  test("a fresh creature's battle stats deep-equal effectiveStats (AC-1)", () => {
    for (const species of STARTER_SPECIES) {
      const fresh = createCreature(species.id, 42)
      expect(formModifier(fresh)).toEqual({
        hp: 0,
        atk: 0,
        def: 0,
        spd: 0,
      })
      expect(battleStats(fresh)).toEqual(effectiveStats(fresh))
    }
  })
})

describe("formTier — thresholds", () => {
  test("score exactly 65 is sharp", () => {
    const creature = creatureWith({ mood: 75, bond: 50 })
    expect(formScore(creature)).toBeCloseTo(65, 10)
    expect(formTier(creature)).toBe("sharp")
  })

  test("score just below 65 is steady", () => {
    const creature = creatureWith({ mood: 80, bond: 42 })
    expect(formScore(creature)).toBeLessThan(65)
    expect(formTier(creature)).toBe("steady")
  })

  test("score exactly 40 is steady", () => {
    const creature = creatureWith({ mood: 40, bond: 40 })
    expect(formScore(creature)).toBeCloseTo(40, 10)
    expect(formTier(creature)).toBe("steady")
  })

  test("score just below 40 is flat", () => {
    const creature = creatureWith({ mood: 33, bond: 50 })
    expect(formScore(creature)).toBeLessThan(40)
    expect(formScore(creature)).toBeGreaterThanOrEqual(20)
    expect(formTier(creature)).toBe("flat")
  })

  test("score exactly 20 is flat", () => {
    const creature = creatureWith({ mood: 20, bond: 20 })
    expect(formScore(creature)).toBeCloseTo(20, 10)
    expect(formTier(creature)).toBe("flat")
  })

  test("score below 20 is sluggish", () => {
    const creature = creatureWith({ mood: 23, bond: 15 })
    expect(formScore(creature)).toBeLessThan(20)
    expect(formTier(creature)).toBe("sluggish")
    expect(formTier(creatureWith({ mood: 20, bond: 0 }))).toBe("sluggish")
  })

  test("a high-bond, low-mood creature still lands steady", () => {
    const creature = creatureWith({ mood: 30, bond: 80 })
    expect(formScore(creature)).toBeCloseTo(50, 10)
    expect(formTier(creature)).toBe("steady")
  })

  test("mood 100 / bond 100 is sharp and mood 20 / bond 0 is sluggish (AC-2)", () => {
    expect(formTier(creatureWith({ mood: 100, bond: 100 }))).toBe("sharp")
    expect(formTier(creatureWith({ mood: 20, bond: 0 }))).toBe("sluggish")
  })
})

/** Conditions that land each tier through the score alone (health healthy). */
function tierConditions(tier: FormTier): Creature["conditions"] {
  const base = createCreature("fire_drake", 42).conditions
  switch (tier) {
    case "sharp":
      return { ...base, mood: 100, bond: 100 }
    case "steady":
      return { ...base, mood: 60, bond: 10 }
    case "flat":
      return { ...base, mood: 20, bond: 20 }
    case "sluggish":
      return { ...base, mood: 20, bond: 0 }
  }
}

describe("formModifier and FORM_DELTAS", () => {
  test("sharp pays +1 ATK only — never SPD, never HP", () => {
    const modifier = formModifier(creatureWith({ mood: 100, bond: 100 }))
    expect(modifier).toEqual({ hp: 0, atk: 1, def: 0, spd: 0 })
  })

  test("steady is all zeros", () => {
    expect(formModifier(creatureWith({ mood: 60, bond: 10 }))).toEqual({
      hp: 0,
      atk: 0,
      def: 0,
      spd: 0,
    })
  })

  test("flat pays -1 ATK only", () => {
    expect(formModifier(creatureWith({ mood: 20, bond: 20 }))).toEqual({
      hp: 0,
      atk: -1,
      def: 0,
      spd: 0,
    })
  })

  test("sluggish pays -2 ATK only", () => {
    expect(formModifier(creatureWith({ mood: 20, bond: 0 }))).toEqual({
      hp: 0,
      atk: -2,
      def: 0,
      spd: 0,
    })
  })

  test("FORM_DELTAS carries the same table and never touches HP", () => {
    for (const tier of TIERS) {
      expect(FORM_DELTAS[tier]).toEqual(
        formModifier(creatureWith(tierConditions(tier))),
      )
      expect(FORM_DELTAS[tier].hp).toBe(0)
    }
    expect(FORM_DELTAS.sharp).toEqual({ hp: 0, atk: 1, def: 0, spd: 0 })
    expect(FORM_DELTAS.steady).toEqual({ hp: 0, atk: 0, def: 0, spd: 0 })
    expect(FORM_DELTAS.flat).toEqual({ hp: 0, atk: -1, def: 0, spd: 0 })
    expect(FORM_DELTAS.sluggish).toEqual({ hp: 0, atk: -2, def: 0, spd: 0 })
  })
})

describe("formTier — sickness pins the tier", () => {
  test("health below SICK_HEALTH is sluggish even at mood 100 / bond 100", () => {
    const sick = creatureWith({
      health: SICK_HEALTH - 1,
      mood: 100,
      bond: 100,
    })
    expect(formScore(sick)).toBeCloseTo(100, 10)
    expect(formTier(sick)).toBe("sluggish")
    expect(formModifier(sick)).toEqual({ hp: 0, atk: -2, def: 0, spd: 0 })
    expect(battleStats(sick)).toEqual({
      hp: effectiveStats(sick).hp,
      atk: effectiveStats(sick).atk - 2,
      def: effectiveStats(sick).def,
      spd: effectiveStats(sick).spd,
    })
  })

  test("health exactly SICK_HEALTH is not sick and scores normally", () => {
    const creature = creatureWith({
      health: SICK_HEALTH,
      mood: 100,
      bond: 100,
    })
    expect(formTier(creature)).toBe("sharp")
  })
})

describe("battleStats", () => {
  test("applies the form delta on top of effectiveStats, trained HP included", () => {
    const creature: Creature = {
      ...creatureWith({ mood: 100, bond: 100 }),
      trained: { hp: 2, atk: 3, def: 1, spd: 4 },
    }
    const effective = effectiveStats(creature)
    expect(battleStats(creature)).toEqual({
      hp: effective.hp,
      atk: effective.atk + 1,
      def: effective.def,
      spd: effective.spd,
    })
  })

  test("SPD, DEF and HP are effectiveStats at every tier (FR-9, AC-2)", () => {
    for (const species of STARTER_SPECIES) {
      for (const tier of TIERS) {
        const creature: Creature = {
          ...creatureWith(tierConditions(tier), species.id),
          trained: { hp: 2, atk: 3, def: 1, spd: 4 },
        }
        const effective = effectiveStats(creature)
        const stats = battleStats(creature)
        expect(stats.spd, `${species.id} ${tier} spd`).toBe(effective.spd)
        expect(stats.hp, `${species.id} ${tier} hp`).toBe(effective.hp)
        expect(stats.def, `${species.id} ${tier} def`).toBe(effective.def)
      }
    }
  })

  test("is pure — it does not mutate the creature", () => {
    const creature = creatureWith({ mood: 20, bond: 0 })
    const before = {
      ...creature,
      conditions: { ...creature.conditions },
      stats: { ...creature.stats },
      trained: { ...creature.trained },
    }
    battleStats(creature)
    formModifier(creature)
    formTier(creature)
    expect(creature).toEqual(before)
  })

  test("floors the ATK penalty at 1 and passes SPD through untouched", () => {
    const feeble: Creature = {
      ...creatureWith({ mood: 20, bond: 0 }),
      stats: { hp: 0, atk: 0, def: 0, spd: 0 },
      trained: { hp: 0, atk: 0, def: 0, spd: 0 },
    }
    expect(battleStats(feeble)).toEqual({ hp: 1, atk: 1, def: 1, spd: 0 })

    const edge: Creature = {
      ...creatureWith({ mood: 20, bond: 0 }),
      stats: { hp: 4, atk: 2, def: 3, spd: 2 },
      trained: { hp: 0, atk: 0, def: 0, spd: 0 },
    }
    expect(battleStats(edge)).toEqual({ hp: 4, atk: 1, def: 3, spd: 2 })
  })
})

describe("FORM_COPY", () => {
  test("has a label and one consequence line for every tier", () => {
    const labels = TIERS.map((tier) => FORM_COPY[tier].label.trim())
    expect(labels.every((label) => label.length > 0)).toBe(true)
    expect(new Set(labels).size).toBe(TIERS.length)
    for (const tier of TIERS) {
      expect(FORM_COPY[tier].line.trim().length).toBeGreaterThan(0)
    }
  })

  test("every line names ATK and promises nothing else, so copy stands alone", () => {
    for (const tier of TIERS) {
      expect(FORM_COPY[tier].line).toContain("ATK")
      expect(FORM_COPY[tier].line).not.toContain("SPD")
      expect(FORM_COPY[tier].line.trim().endsWith(".")).toBe(true)
      expect(FORM_COPY[tier].line.length).toBeLessThanOrEqual(80)
    }
  })

  test("the delta-carrying lines quote the actual modifier", () => {
    expect(FORM_COPY.sharp.line).toContain("+1 ATK")
    expect(FORM_COPY.flat.line).toContain("-1 ATK")
    expect(FORM_COPY.sluggish.line).toContain("-2 ATK")
  })
})
