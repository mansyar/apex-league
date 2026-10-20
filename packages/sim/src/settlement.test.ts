import { describe, expect, test } from "bun:test"

import {
  advanceDay,
  type Creature,
  careAction,
  chooseStarter,
  createInitialState,
  EXHAUSTED_ENERGY,
  type GameState,
  makeRng,
  previewTraining,
  type Rng,
  SICKNESS_ONSET_HEALTH,
  TRAINING_CAP,
} from "./index"

/** Build a day-1 state with an owned creature and hand-set conditions. */
function stateWith(conditions: Partial<Creature["conditions"]>): GameState {
  const s = chooseStarter(createInitialState(), "fire_drake", 42)
  if (!s.creature) throw new Error("starter not created")
  return {
    ...s,
    creature: {
      ...s.creature,
      conditions: { ...s.creature.conditions, ...conditions },
    },
  }
}

/** Fixed rng whose next() always returns `value`. */
function fixedRng(value: number): Rng {
  return { next: () => value, int: () => 0 }
}

/** Day-1 state with an owned creature, hand-set conditions and training fields. */
function programState(
  conditions: Partial<Creature["conditions"]>,
  training: Partial<
    Pick<
      Creature,
      "trained" | "trainingProgram" | "trainingResult" | "trainingDays"
    >
  >,
): GameState {
  const s = stateWith(conditions)
  if (!s.creature) throw new Error("starter not created")
  return { ...s, creature: { ...s.creature, ...training } }
}

describe("settlement — hunger", () => {
  test("hunger falls each night", () => {
    const s = advanceDay(stateWith({ hunger: 80 }), fixedRng(0.99))
    expect(s.creature?.conditions.hunger).toBe(80 - 15)
  })

  test("hunger clamps at zero (starving)", () => {
    const s = advanceDay(stateWith({ hunger: 10 }), fixedRng(0.99))
    expect(s.creature?.conditions.hunger).toBe(0)
  })
})

describe("settlement — night energy recovery", () => {
  test("healthy night restores no energy — Rest is the way (tuning 2026-10-18)", () => {
    const s = advanceDay(
      stateWith({ hunger: 80, energy: 30, health: 100 }),
      fixedRng(0.99),
    )
    expect(s.creature?.conditions.energy).toBe(30)
  })

  test("relief tiers still clamp at 100 (sick creature at high energy)", () => {
    const s = advanceDay(
      stateWith({ hunger: 80, energy: 80, health: 40 }),
      fixedRng(0.99),
    )
    expect(s.creature?.conditions.energy).toBe(100)
  })

  test("starving creature sleeps poorly — reduced recovery", () => {
    const s = advanceDay(
      stateWith({ hunger: 0, energy: 30, health: 100 }),
      fixedRng(0.99),
    )
    expect(s.creature?.conditions.energy).toBe(30 + 20)
  })

  test("sick creature sleeps poorly — reduced recovery", () => {
    const s = advanceDay(
      stateWith({ hunger: 80, energy: 30, health: 40 }),
      fixedRng(0.99),
    )
    expect(s.creature?.conditions.energy).toBe(30 + 30)
  })

  test("starving and sick — smallest recovery", () => {
    const s = advanceDay(
      stateWith({ hunger: 0, energy: 30, health: 40 }),
      fixedRng(0.99),
    )
    expect(s.creature?.conditions.energy).toBe(30 + 10)
  })
})

describe("settlement — sickness", () => {
  test("a roll under the base chance makes a healthy creature sick", () => {
    const s = advanceDay(
      stateWith({ hunger: 80, energy: 80, health: 100 }),
      fixedRng(0.01),
    )
    expect(s.creature?.conditions.health).toBeLessThan(100)
  })

  test("a good roll keeps a well-cared-for creature healthy", () => {
    const s = advanceDay(
      stateWith({ hunger: 80, energy: 80, health: 100 }),
      fixedRng(0.99),
    )
    expect(s.creature?.conditions.health).toBe(100)
  })

  test("starving raises the sickness chance above the base", () => {
    // Threshold between base and starving chance: falls ill only when starving.
    const threshold = 0.1
    const fed = advanceDay(stateWith({ hunger: 80 }), fixedRng(threshold))
    const starving = advanceDay(stateWith({ hunger: 0 }), fixedRng(threshold))
    expect(fed.creature?.conditions.health).toBe(100)
    expect(starving.creature?.conditions.health).toBeLessThan(100)
  })

  test("existing sickness worsens instead of re-rolling", () => {
    const sick = stateWith({ health: 60 })
    const before = structuredClone(sick)
    const s = advanceDay(sick, fixedRng(0.99))
    expect(sick).toEqual(before)
    expect(s.creature?.conditions.health).toBe(60 - 15)
  })

  test("worsening never reaches lethal health — misery floor", () => {
    let s = stateWith({ health: 20 })
    for (let i = 0; i < 10; i++) s = advanceDay(s, fixedRng(0.99))
    expect(s.creature?.conditions.health).toBeGreaterThanOrEqual(10)
  })
})

describe("settlement — mood", () => {
  test("well-cared-for creature gains mood overnight", () => {
    const s = advanceDay(
      stateWith({ hunger: 80, energy: 60, health: 100, mood: 50 }),
      fixedRng(0.99),
    )
    expect(s.creature?.conditions.mood).toBe(55)
  })

  test("waking starving drains mood", () => {
    const s = advanceDay(
      stateWith({ hunger: 0, energy: 60, health: 100, mood: 50 }),
      fixedRng(0.99),
    )
    expect(s.creature?.conditions.mood).toBe(50 - 15)
  })

  test("sickness drains mood", () => {
    const s = advanceDay(
      stateWith({ hunger: 80, energy: 60, health: 40, mood: 50 }),
      fixedRng(0.99),
    )
    expect(s.creature?.conditions.mood).toBe(50 - 10)
  })

  test("mood clamps within 0-100", () => {
    const up = advanceDay(
      stateWith({ hunger: 80, energy: 60, health: 100, mood: 99 }),
      fixedRng(0.99),
    )
    expect(up.creature?.conditions.mood).toBe(100)
    const down = advanceDay(
      stateWith({ hunger: 0, energy: 60, health: 100, mood: 3 }),
      fixedRng(0.99),
    )
    expect(down.creature?.conditions.mood).toBe(0)
  })
})

describe("settlement — bond", () => {
  test("bond decays when no bonding happened that day", () => {
    const s = advanceDay(stateWith({ bond: 50 }), fixedRng(0.99))
    expect(s.creature?.conditions.bond).toBe(47)
  })

  test("bond does not decay on a day the creature was played with", () => {
    const s = stateWith({ bond: 50 })
    if (!s.creature) throw new Error("no creature")
    const played = { ...s, creature: { ...s.creature, bondedToday: true } }
    const next = advanceDay(played, fixedRng(0.99))
    expect(next.creature?.conditions.bond).toBe(50)
    expect(next.creature?.bondedToday).toBe(false)
  })

  test("bond clamps at zero", () => {
    const s = advanceDay(stateWith({ bond: 2 }), fixedRng(0.99))
    expect(s.creature?.conditions.bond).toBe(0)
  })
})

describe("settlement — frame mechanics", () => {
  test("day, phase, and AP mechanics still work with a creature present", () => {
    let s = stateWith({})
    for (let i = 0; i < 6; i++) s = advanceDay(s, fixedRng(0.99))
    expect(s.day).toBe(7)
    expect(s.phase).toBe("cup")
    expect(s.actionPoints).toBe(3)
  })

  test("is pure — does not mutate the input state", () => {
    const s = stateWith({})
    const snapshot = structuredClone(s)
    advanceDay(s, fixedRng(0.5))
    expect(s).toEqual(snapshot)
  })

  test("is deterministic — same state and seed produce the same outcome", () => {
    const a = advanceDay(stateWith({ health: 55 }), makeRng(7))
    const b = advanceDay(stateWith({ health: 55 }), makeRng(7))
    expect(a.creature?.conditions).toEqual(b.creature?.conditions)
  })

  test("works without an explicit rng when no creature exists", () => {
    const s = advanceDay(createInitialState())
    expect(s.day).toBe(2)
    expect(s.creature).toBeNull()
  })
})

describe("settlement — training payout", () => {
  /** A rested, fed, well creature: every paying gate is satisfied. */
  const rested = { hunger: 80, health: 100, energy: 60, mood: 60 }

  test("a rested fed creature gains +1 primary, pays 10 energy, and consumes the program", () => {
    const s = advanceDay(
      programState(rested, {
        trainingProgram: "power",
        trainingDays: 1,
        trained: { hp: 0, atk: 0, def: 0, spd: 0 },
      }),
      fixedRng(0.99),
    )
    const c = s.creature
    if (!c) throw new Error("creature lost")
    expect(c.trained).toEqual({ hp: 0, atk: 1, def: 0, spd: 0 })
    expect(c.trainingResult).toBe("gained")
    expect(c.trainingProgram).toBeNull()
    expect(c.conditions.energy).toBe(60 - 10)
  })

  test("every program pays its own primary", () => {
    const primaries = {
      power: "atk",
      endurance: "hp",
      sprint: "spd",
      ring: "atk",
    } as const
    for (const [program, stat] of Object.entries(primaries)) {
      const s = advanceDay(
        programState(rested, {
          trainingProgram: program as keyof typeof primaries,
          trainingDays: 1,
        }),
        fixedRng(0.99),
      )
      const gained = (["hp", "atk", "def", "spd"] as const).filter(
        (key) => s.creature && s.creature.trained[key] > 0,
      )
      expect(gained).toEqual([stat])
      expect(s.creature?.trainingResult).toBe("gained")
    }
  })

  test("the rolled base stats are untouched by the payout", () => {
    const before = programState(rested, { trainingProgram: "power" })
    const base = before.creature?.stats.atk
    const s = advanceDay(before, fixedRng(0.99))
    expect(s.creature?.stats.atk).toBe(base)
  })

  test("energy exactly at the exhausted threshold still pays (AC-4)", () => {
    const s = advanceDay(
      programState({ ...rested, energy: 30 }, { trainingProgram: "power" }),
      fixedRng(0.99),
    )
    expect(s.creature?.trained.atk).toBe(1)
    expect(s.creature?.trainingResult).toBe("gained")
    expect(s.creature?.conditions.energy).toBe(30 - 10)
  })

  test("energy one below the threshold pays nothing and costs no energy (AC-4)", () => {
    const s = advanceDay(
      programState({ ...rested, energy: 29 }, { trainingProgram: "power" }),
      fixedRng(0.99),
    )
    expect(s.creature?.trained.atk).toBe(0)
    expect(s.creature?.trainingResult).toBe("exhausted")
    expect(s.creature?.trainingProgram).toBeNull()
    // The rested recovery tier is 0, so the unspent energy survives whole.
    expect(s.creature?.conditions.energy).toBe(29)
  })

  test("sick at lights-out pays 0, records sick, and costs no energy", () => {
    const s = advanceDay(
      programState({ ...rested, health: 60 }, { trainingProgram: "power" }),
      fixedRng(0.99),
    )
    expect(s.creature?.trained.atk).toBe(0)
    expect(s.creature?.trainingResult).toBe("sick")
    expect(s.creature?.conditions.energy).toBe(60 + 30)
  })

  test("waking starving pays 0 and records hungry", () => {
    const s = advanceDay(
      programState({ ...rested, hunger: 10 }, { trainingProgram: "endurance" }),
      fixedRng(0.99),
    )
    expect(s.creature?.trained.hp).toBe(0)
    expect(s.creature?.trainingResult).toBe("hungry")
    expect(s.creature?.conditions.energy).toBe(60 + 20)
  })

  test("result precedence is sick, then hungry, then exhausted", () => {
    const sick = advanceDay(
      programState(
        { hunger: 10, health: 60, energy: 10 },
        { trainingProgram: "power" },
      ),
      fixedRng(0.99),
    )
    expect(sick.creature?.trainingResult).toBe("sick")
    expect(sick.creature?.trained.atk).toBe(0)

    const hungry = advanceDay(
      programState(
        { hunger: 10, health: 100, energy: 10 },
        { trainingProgram: "power" },
      ),
      fixedRng(0.99),
    )
    expect(hungry.creature?.trainingResult).toBe("hungry")

    const exhausted = advanceDay(
      programState(
        { hunger: 80, health: 100, energy: 10 },
        { trainingProgram: "power" },
      ),
      fixedRng(0.99),
    )
    expect(exhausted.creature?.trainingResult).toBe("exhausted")
  })

  test("the third trained night pays the trickle on top of the primary (AC-5)", () => {
    const s = advanceDay(
      programState(rested, {
        trainingProgram: "power",
        trainingDays: 3,
        trained: { hp: 0, atk: 1, def: 0, spd: 0 },
      }),
      fixedRng(0.99),
    )
    expect(s.creature?.trained).toEqual({ hp: 0, atk: 2, def: 1, spd: 0 })
  })

  test("nights that are not a multiple of three pay no trickle", () => {
    for (const trainingDays of [1, 2, 4, 5, 7]) {
      const s = advanceDay(
        programState(rested, {
          trainingProgram: "power",
          trainingDays,
          trained: { hp: 0, atk: 0, def: 0, spd: 0 },
        }),
        fixedRng(0.99),
      )
      expect(s.creature?.trained.def).toBe(0)
      expect(s.creature?.trained.atk).toBe(1)
    }
  })

  test("a hand-built assignment with no trained day behind it pays no trickle", () => {
    const s = advanceDay(
      programState(rested, { trainingProgram: "power", trainingDays: 0 }),
      fixedRng(0.99),
    )
    expect(s.creature?.trained).toEqual({ hp: 0, atk: 1, def: 0, spd: 0 })
  })

  test("a night that does not pay never fires the trickle", () => {
    const s = advanceDay(
      programState(
        { ...rested, energy: 10 },
        { trainingProgram: "power", trainingDays: 3 },
      ),
      fixedRng(0.99),
    )
    expect(s.creature?.trainingResult).toBe("exhausted")
    expect(s.creature?.trained).toEqual({ hp: 0, atk: 0, def: 0, spd: 0 })
  })

  test("both components clamp at the training cap", () => {
    const s = advanceDay(
      programState(rested, {
        trainingProgram: "power",
        trainingDays: 3,
        trained: {
          hp: 0,
          atk: TRAINING_CAP,
          def: TRAINING_CAP,
          spd: 0,
        },
      }),
      fixedRng(0.99),
    )
    expect(s.creature?.trained.atk).toBe(TRAINING_CAP)
    expect(s.creature?.trained.def).toBe(TRAINING_CAP)
  })

  test("a trickle already at the cap leaves the primary's gain intact", () => {
    const s = advanceDay(
      programState(rested, {
        trainingProgram: "power",
        trainingDays: 3,
        trained: { hp: 0, atk: 0, def: TRAINING_CAP, spd: 0 },
      }),
      fixedRng(0.99),
    )
    expect(s.creature?.trained.atk).toBe(1)
    expect(s.creature?.trained.def).toBe(TRAINING_CAP)
  })

  test("ring lifts mood and bond on a paying night (FR-6)", () => {
    const ring = advanceDay(
      programState(rested, { trainingProgram: "ring", trainingDays: 1 }),
      fixedRng(0.99),
    )
    const plain = advanceDay(
      programState(rested, { trainingProgram: "power", trainingDays: 1 }),
      fixedRng(0.99),
    )
    const ringCreature = ring.creature
    const plainCreature = plain.creature
    if (!ringCreature || !plainCreature) throw new Error("creature lost")
    expect(ringCreature.conditions.mood).toBe(plainCreature.conditions.mood + 5)
    expect(ringCreature.conditions.bond).toBe(plainCreature.conditions.bond + 2)
  })

  test("ring's mood and bond bonus never applies on a night that does not pay", () => {
    const ring = advanceDay(
      programState(
        { ...rested, energy: 10 },
        { trainingProgram: "ring", trainingDays: 1 },
      ),
      fixedRng(0.99),
    )
    const plain = advanceDay(
      programState(
        { ...rested, energy: 10 },
        { trainingProgram: "power", trainingDays: 1 },
      ),
      fixedRng(0.99),
    )
    expect(ring.creature?.trainingResult).toBe("exhausted")
    expect(ring.creature?.conditions).toEqual(plain.creature?.conditions)
  })

  test("the payout consumes no rng draw beyond the night's single sickness roll", () => {
    let withProgram = 0
    let withoutProgram = 0
    advanceDay(
      programState(rested, { trainingProgram: "power", trainingDays: 1 }),
      {
        next: () => {
          withProgram += 1
          return 0.99
        },
        int: () => 0,
      },
    )
    advanceDay(programState(rested, {}), {
      next: () => {
        withoutProgram += 1
        return 0.99
      },
      int: () => 0,
    })
    expect(withProgram).toBe(withoutProgram)
    expect(withProgram).toBe(1)
  })

  test("the sickness roll cannot claw back a paid gain", () => {
    // fixedRng(0.01) falls under the base chance — the creature falls sick —
    // yet the payout already ran without consuming a roll, so the onset
    // happens exactly as it did before programs existed.
    const s = advanceDay(
      programState(rested, { trainingProgram: "power", trainingDays: 1 }),
      fixedRng(0.01),
    )
    expect(s.creature?.trained.atk).toBe(1)
    expect(s.creature?.trainingResult).toBe("gained")
    expect(s.creature?.conditions.health).toBe(SICKNESS_ONSET_HEALTH)
  })

  test("a night with no program clears the result and grants nothing", () => {
    const s = advanceDay(
      programState(rested, {
        trainingResult: "gained",
        trained: { hp: 2, atk: 0, def: 0, spd: 0 },
      }),
      fixedRng(0.99),
    )
    expect(s.creature?.trainingResult).toBeNull()
    expect(s.creature?.trained.hp).toBe(2)
    expect(s.creature?.conditions.energy).toBe(60)
  })
})

describe("previewTraining", () => {
  const rested = { hunger: 80, health: 100, energy: 60 }

  test("a well-fed rested program expects the primary gain", () => {
    const s = programState(rested, {
      trainingProgram: "power",
      trainingDays: 1,
    })
    if (!s.creature) throw new Error("no creature")
    expect(previewTraining(s.creature)).toEqual({
      result: "gained",
      gains: { atk: 1 },
    })
  })

  test("a third trained night previews both components", () => {
    const s = programState(rested, {
      trainingProgram: "sprint",
      trainingDays: 3,
    })
    if (!s.creature) throw new Error("no creature")
    expect(previewTraining(s.creature)).toEqual({
      result: "gained",
      gains: { spd: 1, atk: 1 },
    })
  })

  test("a sick creature expects a wasted night", () => {
    const s = programState(
      { ...rested, health: 60 },
      { trainingProgram: "power" },
    )
    if (!s.creature) throw new Error("no creature")
    expect(previewTraining(s.creature)).toEqual({ result: "sick", gains: {} })
  })

  test("a creature that will wake starving expects a wasted night", () => {
    const s = programState(
      { ...rested, hunger: 10 },
      { trainingProgram: "power" },
    )
    if (!s.creature) throw new Error("no creature")
    expect(previewTraining(s.creature)).toEqual({
      result: "hungry",
      gains: {},
    })
  })

  test("an exhausted creature expects the exhausted night", () => {
    const low = programState(
      { ...rested, energy: EXHAUSTED_ENERGY - 1 },
      { trainingProgram: "power" },
    )
    if (!low.creature) throw new Error("no creature")
    expect(previewTraining(low.creature)).toEqual({
      result: "exhausted",
      gains: {},
    })

    const edge = programState(
      { ...rested, energy: EXHAUSTED_ENERGY },
      { trainingProgram: "power" },
    )
    if (!edge.creature) throw new Error("no creature")
    expect(previewTraining(edge.creature)).toEqual({
      result: "gained",
      gains: { atk: 1 },
    })
  })

  test("no program means no preview", () => {
    const s = programState(rested, {})
    if (!s.creature) throw new Error("no creature")
    expect(previewTraining(s.creature)).toEqual({ result: null, gains: {} })
  })

  test("the preview does not offer a gain past the cap", () => {
    const s = programState(rested, {
      trainingProgram: "power",
      trainingDays: 3,
      trained: { hp: 0, atk: TRAINING_CAP, def: TRAINING_CAP, spd: 0 },
    })
    if (!s.creature) throw new Error("no creature")
    expect(previewTraining(s.creature)).toEqual({ result: "gained", gains: {} })
  })

  test("the preview is exact — its gains match what settlement pays", () => {
    for (const trainingDays of [1, 2, 3, 4]) {
      const state = programState(
        { hunger: 50, health: 100, energy: 45, mood: 60 },
        {
          trainingProgram: "endurance",
          trainingDays,
          trained: { hp: 2, atk: 0, def: 1, spd: 0 },
        },
      )
      const before = state.creature
      if (!before) throw new Error("no creature")
      const preview = previewTraining(before)
      const after = advanceDay(state, fixedRng(0.99)).creature
      if (!after) throw new Error("creature lost")
      for (const key of ["hp", "atk", "def", "spd"] as const) {
        expect(after.trained[key] - before.trained[key]).toBe(
          preview.gains[key] ?? 0,
        )
      }
      expect(after.trainingResult).toBe(preview.result)
    }
  })

  test("the preview is pure — it does not mutate the creature", () => {
    const s = programState(
      { ...rested, health: 60 },
      { trainingProgram: "power" },
    )
    if (!s.creature) throw new Error("no creature")
    const snapshot = structuredClone(s.creature)
    previewTraining(s.creature)
    expect(s.creature).toEqual(snapshot)
  })

  test("feeding or treating after assigning turns a wasted preview into a gain", () => {
    const sick = programState(
      { ...rested, health: 60 },
      { trainingProgram: "power", trainingDays: 1 },
    )
    if (!sick.creature) throw new Error("no creature")
    expect(previewTraining(sick.creature).result).toBe("sick")
    const treated = careAction(sick, "treat")
    if (!treated.ok) throw new Error("treat rejected")
    if (!treated.state.creature) throw new Error("creature lost")
    expect(previewTraining(treated.state.creature)).toEqual({
      result: "gained",
      gains: { atk: 1 },
    })

    const starving = programState(
      { ...rested, hunger: 10 },
      { trainingProgram: "power", trainingDays: 1 },
    )
    if (!starving.creature) throw new Error("no creature")
    expect(previewTraining(starving.creature).result).toBe("hungry")
    const fed = careAction(starving, "feed")
    if (!fed.ok) throw new Error("feed rejected")
    if (!fed.state.creature) throw new Error("creature lost")
    expect(previewTraining(fed.state.creature).result).toBe("gained")
  })

  test("exhaustion's preview flips on a rest", () => {
    const tired = programState(
      { ...rested, energy: 20 },
      { trainingProgram: "power", trainingDays: 1 },
    )
    if (!tired.creature) throw new Error("no creature")
    expect(previewTraining(tired.creature).result).toBe("exhausted")
    const restedAgain = careAction(tired, "rest")
    if (!restedAgain.ok) throw new Error("rest rejected")
    if (!restedAgain.state.creature) throw new Error("creature lost")
    expect(previewTraining(restedAgain.state.creature).result).toBe("gained")
  })
})

describe("settlement — fedToday", () => {
  test("a fed creature wakes unfed — the pile is gone in the morning", () => {
    const s = stateWith({ hunger: 30 })
    if (!s.creature) throw new Error("no creature")
    const fed = careAction(s, "feed")
    if (!fed.ok) throw new Error("feed rejected")
    expect(fed.state.creature?.fedToday).toBe(true)
    const morning = advanceDay(fed.state)
    if (!morning.creature) throw new Error("creature lost")
    expect(morning.creature.fedToday).toBe(false)
  })

  test("an unfed creature stays unfed across the night", () => {
    const morning = advanceDay(stateWith({ hunger: 60 }))
    if (!morning.creature) throw new Error("creature lost")
    expect(morning.creature.fedToday).toBe(false)
  })
})
