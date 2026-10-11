import { describe, expect, test } from "bun:test"

import {
  advanceDay,
  type Creature,
  chooseStarter,
  createCreature,
  createInitialState,
  EVOLUTION_DAY,
  EVOLUTION_MOOD,
  evaluateEvolution,
  type GameState,
  SICK_COOLDOWN_NIGHTS,
  SICK_HEALTH,
  settleCreature,
} from "./index"

/**
 * Rng stub that never rolls a sickness onset (every roll lands above every
 * chance) and always rolls 0 for int(). Keeps multi-night integrations
 * deterministic without caring about mulberry32 sequences.
 */
const CALM_RNG = { next: () => 0.99, int: () => 0 }

/** A state whose creature is hand-tuned for evolution scenarios. */
function scenarioState(
  fields: Partial<Pick<Creature, "conditions" | "sickCooldown" | "stage">>,
  day: number,
): GameState {
  const s = chooseStarter(createInitialState(), "fire_drake", 42)
  if (!s.creature) throw new Error("starter not created")
  return {
    ...s,
    day,
    creature: { ...s.creature, ...fields },
  }
}

/** A creature for direct unit-level gate checks. */
function gateCreature(
  fields: Partial<Pick<Creature, "stage" | "sickCooldown" | "conditions">>,
): Creature {
  const c = createCreature("fire_drake", 42)
  return { ...c, ...fields }
}

describe("evaluateEvolution", () => {
  test("a baby with clean nights and good mood evolves at the day-10 night", () => {
    const v = evaluateEvolution(gateCreature({}), EVOLUTION_DAY)
    expect(v.evolved).toBe(true)
    expect(v.reason).toBe("ready")
  })

  test("day 9 is too young even with perfect care", () => {
    const v = evaluateEvolution(gateCreature({}), EVOLUTION_DAY - 1)
    expect(v.evolved).toBe(false)
    expect(v.reason).toBe("too_young")
  })

  test("a recent sickness night blocks evolution", () => {
    const v = evaluateEvolution(
      gateCreature({ sickCooldown: 1 }),
      EVOLUTION_DAY,
    )
    expect(v.evolved).toBe(false)
    expect(v.reason).toBe("recently_sick")
  })

  test("low mood blocks evolution", () => {
    const v = evaluateEvolution(
      gateCreature({ conditions: { mood: EVOLUTION_MOOD - 1 } as never }),
      EVOLUTION_DAY,
    )
    expect(v.evolved).toBe(false)
    expect(v.reason).toBe("low_mood")
  })

  test("mood exactly at the threshold passes (inclusive gate)", () => {
    const v = evaluateEvolution(
      gateCreature({ conditions: { mood: EVOLUTION_MOOD } as never }),
      EVOLUTION_DAY,
    )
    expect(v.evolved).toBe(true)
  })

  test("age is checked before mood and sickness (reason precedence)", () => {
    const v = evaluateEvolution(
      gateCreature({ sickCooldown: 2, conditions: { mood: 0 } as never }),
      EVOLUTION_DAY - 1,
    )
    expect(v.reason).toBe("too_young")
  })

  test("a juvenile never re-evolves", () => {
    const v = evaluateEvolution(gateCreature({ stage: "juvenile" }), 50)
    expect(v.evolved).toBe(false)
    expect(v.reason).toBe("not_baby")
  })
})

describe("settleCreature - sickness cooldown bookkeeping", () => {
  test("a night that starts sick stamps the full cooldown", () => {
    const c = gateCreature({
      conditions: { health: SICK_HEALTH - 1 } as never,
      sickCooldown: 0,
    })
    const settled = settleCreature(c, CALM_RNG, EVOLUTION_DAY)
    expect(settled.sickCooldown).toBe(SICK_COOLDOWN_NIGHTS)
  })

  test("a healthy night decrements the cooldown", () => {
    const c = gateCreature({ sickCooldown: 2 })
    const settled = settleCreature(c, CALM_RNG, EVOLUTION_DAY)
    expect(settled.sickCooldown).toBe(1)
  })

  test("the cooldown never drops below zero", () => {
    const c = gateCreature({ sickCooldown: 0 })
    const settled = settleCreature(c, CALM_RNG, EVOLUTION_DAY)
    expect(settled.sickCooldown).toBe(0)
  })
})

describe("advanceDay - evolution integration", () => {
  test("a well-cared baby evolves on the night of day 10", () => {
    const s = scenarioState({}, 10)
    const next = advanceDay(s, CALM_RNG)
    expect(next.day).toBe(11)
    expect(next.creature?.stage).toBe("juvenile")
  })

  test("a baby is still a baby after the night of day 9", () => {
    const s = scenarioState({}, 9)
    const next = advanceDay(s, CALM_RNG)
    expect(next.creature?.stage).toBe("baby")
  })

  test("a recently sick baby is delayed but evolves once the gate clears", () => {
    const s = scenarioState({ sickCooldown: 2 }, 10)
    const day11 = advanceDay(s, CALM_RNG)
    expect(day11.creature?.stage).toBe("baby")
    expect(day11.creature?.sickCooldown).toBe(1)
    const day12 = advanceDay(day11, CALM_RNG)
    expect(day12.creature?.stage).toBe("juvenile")
  })

  test("evolution is idempotent - a juvenile stays a juvenile", () => {
    const s = scenarioState({ stage: "juvenile" }, 10)
    const next = advanceDay(s, CALM_RNG)
    expect(next.creature?.stage).toBe("juvenile")
  })
})
