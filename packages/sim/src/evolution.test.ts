import { describe, expect, test } from "bun:test"

import {
  advanceDay,
  type Creature,
  chooseStarter,
  createCreature,
  createInitialState,
  CHAMPION_BOND,
  CHAMPION_CUPS,
  CHAMPION_EVOLUTION_DAY,
  EVOLUTION_DAY,
  EVOLUTION_MOOD,
  effectiveStats,
  evaluateEvolution,
  evolveCreature,
  type GameState,
  getSpecies,
  SICK_COOLDOWN_NIGHTS,
  SICK_HEALTH,
  setLoadout,
  settleCreature,
  unlockedKit,
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

  test("a juvenile is judged by the champion gate, not waved through", () => {
    const v = evaluateEvolution(gateCreature({ stage: "juvenile" }), 50)
    expect(v.evolved).toBe(false)
    expect(v.reason).toBe("low_bond")
  })
})

describe("evaluateEvolution - champion gate", () => {
  /** A qualified juvenile: day 25, great care, bonded, cup winner. */
  function championReady(fields?: {
    stage?: Creature["stage"]
    sickCooldown?: number
    conditions?: Partial<Creature["conditions"]>
  }): Creature {
    return gateCreature({
      stage: fields?.stage ?? "juvenile",
      sickCooldown: fields?.sickCooldown ?? 0,
      conditions: { mood: 80, bond: 80, ...fields?.conditions } as never,
    })
  }

  test("a qualified juvenile evolves on the night of day 25", () => {
    const v = evaluateEvolution(championReady(), CHAMPION_EVOLUTION_DAY, 1)
    expect(v.evolved).toBe(true)
    expect(v.reason).toBe("ready")
  })

  test("day 24 is too young", () => {
    const v = evaluateEvolution(championReady(), CHAMPION_EVOLUTION_DAY - 1, 1)
    expect(v.evolved).toBe(false)
    expect(v.reason).toBe("too_young")
  })

  test("a recent sickness night blocks the champion gate", () => {
    const v = evaluateEvolution(
      championReady({ sickCooldown: 1 }),
      CHAMPION_EVOLUTION_DAY,
      1,
    )
    expect(v.evolved).toBe(false)
    expect(v.reason).toBe("recently_sick")
  })

  test("low mood blocks the champion gate", () => {
    const v = evaluateEvolution(
      championReady({ conditions: { mood: EVOLUTION_MOOD - 1 } as never }),
      CHAMPION_EVOLUTION_DAY,
      1,
    )
    expect(v.evolved).toBe(false)
    expect(v.reason).toBe("low_mood")
  })

  test("low bond blocks the champion gate", () => {
    const v = evaluateEvolution(
      championReady({ conditions: { bond: CHAMPION_BOND - 1 } as never }),
      CHAMPION_EVOLUTION_DAY,
      1,
    )
    expect(v.evolved).toBe(false)
    expect(v.reason).toBe("low_bond")
  })

  test("bond exactly at the threshold passes (inclusive gate)", () => {
    const v = evaluateEvolution(
      championReady({ conditions: { bond: CHAMPION_BOND } as never }),
      CHAMPION_EVOLUTION_DAY,
      1,
    )
    expect(v.evolved).toBe(true)
  })

  test("no cup win blocks the champion gate", () => {
    const v = evaluateEvolution(
      championReady(),
      CHAMPION_EVOLUTION_DAY,
      CHAMPION_CUPS - 1,
    )
    expect(v.evolved).toBe(false)
    expect(v.reason).toBe("no_cup_win")
  })

  test("age is checked before bond and cups (reason precedence)", () => {
    const v = evaluateEvolution(
      championReady({ conditions: { bond: 0 } as never }),
      CHAMPION_EVOLUTION_DAY - 1,
      0,
    )
    expect(v.reason).toBe("too_young")
  })

  test("a champion never evolves again", () => {
    const v = evaluateEvolution(
      gateCreature({
        stage: "champion",
        conditions: { mood: 100, bond: 100 } as never,
      }),
      CHAMPION_EVOLUTION_DAY + 10,
      5,
    )
    expect(v.evolved).toBe(false)
    expect(v.reason).toBe("not_juvenile")
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

describe("evolveCreature - the maturation boost", () => {
  test("flips the stage and boosts the rolled base by +3/+2/+2/+1", () => {
    const baby = createCreature("fire_drake", 7)
    const juvenile = evolveCreature(baby)
    expect(juvenile.stage).toBe("juvenile")
    expect(juvenile.stats.hp).toBe(baby.stats.hp + 3)
    expect(juvenile.stats.atk).toBe(baby.stats.atk + 2)
    expect(juvenile.stats.def).toBe(baby.stats.def + 2)
    expect(juvenile.stats.spd).toBe(baby.stats.spd + 1)
  })

  test("leaves trained bonuses and conditions untouched", () => {
    const baby = createCreature("plant_ox", 9)
    baby.trained = { hp: 1, atk: 2, def: 0, spd: 3 }
    const juvenile = evolveCreature(baby)
    expect(juvenile.trained).toEqual(baby.trained)
    expect(juvenile.conditions).toEqual(baby.conditions)
    expect(juvenile.trainingDays).toBe(baby.trainingDays)
  })

  test("effectiveStats shows base + trained including the boost", () => {
    const baby = createCreature("water_axolotl", 11)
    baby.trained = { hp: 2, atk: 1, def: 1, spd: 1 }
    const juvenile = evolveCreature(baby)
    const before = effectiveStats(baby)
    const after = effectiveStats(juvenile)
    expect(after.hp).toBe(before.hp + 3)
    expect(after.atk).toBe(before.atk + 2)
    expect(after.def).toBe(before.def + 2)
    expect(after.spd).toBe(before.spd + 1)
  })

  test("an evolved settlement boosts stats, not just the stage", () => {
    const s = scenarioState({}, 10)
    const before = s.creature?.stats
    const next = advanceDay(s, CALM_RNG)
    const after = next.creature?.stats
    if (!before || !after) throw new Error("creature missing")
    expect(after.hp).toBe(before.hp + 3)
    expect(next.creature?.stage).toBe("juvenile")
  })
})

describe("evolveCreature - the champion boost", () => {
  test("a juvenile becomes a champion with the pinned +6/+4/+4/+2", () => {
    const juvenile = gateCreature({ stage: "juvenile" })
    const champion = evolveCreature(juvenile)
    expect(champion.stage).toBe("champion")
    expect(champion.stats.hp).toBe(juvenile.stats.hp + 6)
    expect(champion.stats.atk).toBe(juvenile.stats.atk + 4)
    expect(champion.stats.def).toBe(juvenile.stats.def + 4)
    expect(champion.stats.spd).toBe(juvenile.stats.spd + 2)
  })

  test("the baby path is untouched: +3/+2/+2/+1 to juvenile", () => {
    const baby = createCreature("fire_drake", 7)
    const juvenile = evolveCreature(baby)
    expect(juvenile.stage).toBe("juvenile")
    expect(juvenile.stats.hp).toBe(baby.stats.hp + 3)
    expect(juvenile.stats.atk).toBe(baby.stats.atk + 2)
    expect(juvenile.stats.def).toBe(baby.stats.def + 2)
    expect(juvenile.stats.spd).toBe(baby.stats.spd + 1)
  })

  test("the champion boost lands in effectiveStats too", () => {
    const juvenile = gateCreature({ stage: "juvenile" })
    juvenile.trained = { hp: 1, atk: 0, def: 2, spd: 0 }
    const champion = evolveCreature(juvenile)
    const before = effectiveStats(juvenile)
    const after = effectiveStats(champion)
    expect(after.hp).toBe(before.hp + 6)
    expect(after.atk).toBe(before.atk + 4)
    expect(after.def).toBe(before.def + 4)
    expect(after.spd).toBe(before.spd + 2)
  })
})

describe("advanceDay - champion evolution integration", () => {
  /** A qualified juvenile state: bonded, good mood, one cup won. */
  function championState(day: number, cupsWon = 1): GameState {
    const s = scenarioState(
      {
        stage: "juvenile",
        sickCooldown: 0,
        conditions: { mood: 80, bond: 80 } as never,
      },
      day,
    )
    return { ...s, cupsWon }
  }

  test("a qualified juvenile becomes a champion on the night of day 25", () => {
    const s = championState(CHAMPION_EVOLUTION_DAY)
    const next = advanceDay(s, CALM_RNG)
    expect(next.creature?.stage).toBe("champion")
  })

  test("the champion settlement applies the pinned boost", () => {
    const s = championState(CHAMPION_EVOLUTION_DAY)
    const before = s.creature?.stats
    const next = advanceDay(s, CALM_RNG)
    if (!before || !next.creature) throw new Error("creature missing")
    expect(next.creature.stats.hp).toBe(before.hp + 6)
    expect(next.creature.stats.atk).toBe(before.atk + 4)
    expect(next.creature.stats.def).toBe(before.def + 4)
    expect(next.creature.stats.spd).toBe(before.spd + 2)
  })

  test("a juvenile without a cup win waits at the champion gate", () => {
    const s = championState(CHAMPION_EVOLUTION_DAY, 0)
    const next = advanceDay(s, CALM_RNG)
    expect(next.creature?.stage).toBe("juvenile")
  })

  test("a juvenile below the bond floor waits", () => {
    const s = championState(CHAMPION_EVOLUTION_DAY)
    if (!s.creature) throw new Error("creature missing")
    const weak = {
      ...s,
      creature: {
        ...s.creature,
        conditions: { ...s.creature.conditions, bond: 20 },
      },
    }
    const next = advanceDay(weak, CALM_RNG)
    expect(next.creature?.stage).toBe("juvenile")
  })

  test("a young juvenile is untouched by the champion gate", () => {
    const s = championState(11)
    const next = advanceDay(s, CALM_RNG)
    expect(next.creature?.stage).toBe("juvenile")
  })
})

describe("kit gate at evolution", () => {
  const species = getSpecies("fire_drake")
  if (!species) throw new Error("species missing")

  test("a juvenile unlocks tier 3 with zero trained days", () => {
    const kit = unlockedKit(
      { trainingDays: 0, stage: "juvenile" } as Creature,
      species,
    )
    expect(kit).toEqual(species.kit.slice(0, 3))
  })

  test("a baby with zero trained days still knows only the birth kit", () => {
    const kit = unlockedKit(
      { trainingDays: 0, stage: "baby" } as Creature,
      species,
    )
    expect(kit).toEqual(species.kit.slice(0, 2))
  })

  test("tier 4 still requires six trained days even when juvenile", () => {
    const kit = unlockedKit(
      { trainingDays: 5, stage: "juvenile" } as Creature,
      species,
    )
    expect(kit).toEqual(species.kit.slice(0, 3))
    const full = unlockedKit(
      { trainingDays: 6, stage: "juvenile" } as Creature,
      species,
    )
    expect(full).toEqual(species.kit)
  })

  test("an evolved creature can equip its tier-3 move immediately", () => {
    const s = scenarioState({ stage: "juvenile" }, 11)
    const equipped = setLoadout(s, ["spark", "cinder_shot"])
    expect(equipped.creature?.loadout).toEqual(["spark", "cinder_shot"])
  })

  test("an evolved creature still waits six trained days for tier 4", () => {
    const s = scenarioState({ stage: "juvenile" }, 11)
    expect(() => setLoadout(s, ["spark", "blaze_bolt"])).toThrow(
      /Not unlocked yet/,
    )
  })
})
