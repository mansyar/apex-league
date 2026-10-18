import { describe, expect, test } from "bun:test"

import {
  advanceDay,
  type Creature,
  careAction,
  chooseStarter,
  createInitialState,
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
function focusState(
  conditions: Partial<Creature["conditions"]>,
  training: Partial<
    Pick<Creature, "trained" | "trainingFocus" | "trainingResult">
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

describe("settlement — training gain", () => {
  test("a full-rest night adds +1 to the focused stat only; the rolled base never changes", () => {
    const s = advanceDay(
      focusState(
        { hunger: 80, health: 100, energy: 60 },
        { trainingFocus: "atk", trained: { hp: 0, atk: 0, def: 0, spd: 0 } },
      ),
      fixedRng(0.99),
    )
    const c = s.creature
    if (!c) throw new Error("creature lost")
    expect(c.trained).toEqual({ hp: 0, atk: 1, def: 0, spd: 0 })
    expect(c.trainingResult).toBe("gained")
    expect(c.trainingFocus).toBeNull()
  })

  test("the rolled base stats are untouched by training", () => {
    const before = focusState(
      { hunger: 80, health: 100 },
      { trainingFocus: "atk" },
    )
    const base = before.creature?.stats.atk
    const s = advanceDay(before, fixedRng(0.99))
    expect(s.creature?.stats.atk).toBe(base)
  })

  test("the trained bonus never exceeds the cap, even for a focus already at it", () => {
    const s = advanceDay(
      focusState(
        { hunger: 80, health: 100 },
        {
          trainingFocus: "atk",
          trained: { hp: 0, atk: TRAINING_CAP, def: 0, spd: 0 },
        },
      ),
      fixedRng(0.99),
    )
    expect(s.creature?.trained.atk).toBe(TRAINING_CAP)
  })

  test("sick at lights-out pays 0 and records the result", () => {
    const s = advanceDay(
      focusState({ hunger: 80, health: 60 }, { trainingFocus: "atk" }),
      fixedRng(0.99),
    )
    expect(s.creature?.trained.atk).toBe(0)
    expect(s.creature?.trainingResult).toBe("sick")
    expect(s.creature?.trainingFocus).toBeNull()
  })

  test("waking starving pays 0 and records the result", () => {
    const s = advanceDay(
      focusState({ hunger: 10, health: 100 }, { trainingFocus: "def" }),
      fixedRng(0.99),
    )
    expect(s.creature?.trained.def).toBe(0)
    expect(s.creature?.trainingResult).toBe("hungry")
  })

  test("sickness wins when the creature is both sick and starving", () => {
    const s = advanceDay(
      focusState({ hunger: 10, health: 60 }, { trainingFocus: "hp" }),
      fixedRng(0.99),
    )
    expect(s.creature?.trainingResult).toBe("sick")
  })

  test("exhaustion does not waste a night that otherwise meets the rested predicate", () => {
    const s = advanceDay(
      focusState(
        { hunger: 80, health: 100, energy: 20 },
        { trainingFocus: "spd" },
      ),
      fixedRng(0.99),
    )
    expect(s.creature?.trained.spd).toBe(1)
    expect(s.creature?.trainingResult).toBe("gained")
  })

  test("the sickness roll does not claw back a granted gain, and draws no rng", () => {
    // fixedRng(0.01) falls under the base chance — the creature falls sick —
    // yet the training step must already have granted its +1 without
    // consuming any rolls, so the sickness onset still happens exactly as
    // it did before training existed.
    const s = advanceDay(
      focusState({ hunger: 80, health: 100 }, { trainingFocus: "atk" }),
      fixedRng(0.01),
    )
    expect(s.creature?.trained.atk).toBe(1)
    expect(s.creature?.trainingResult).toBe("gained")
    expect(s.creature?.conditions.health).toBe(SICKNESS_ONSET_HEALTH)
  })

  test("a night with no focus clears the result and grants nothing", () => {
    const s = advanceDay(
      focusState(
        { hunger: 80, health: 100 },
        {
          trainingResult: "gained",
          trained: { hp: 2, atk: 0, def: 0, spd: 0 },
        },
      ),
      fixedRng(0.99),
    )
    expect(s.creature?.trainingResult).toBeNull()
    expect(s.creature?.trained.hp).toBe(2)
  })
})

describe("previewTraining", () => {
  test("a well-fed healthy focused creature expects a gain", () => {
    const s = focusState({ hunger: 80, health: 100 }, { trainingFocus: "atk" })
    if (!s.creature) throw new Error("no creature")
    expect(previewTraining(s.creature)).toBe("gained")
  })

  test("a sick focused creature expects a wasted night", () => {
    const s = focusState({ hunger: 80, health: 60 }, { trainingFocus: "atk" })
    if (!s.creature) throw new Error("no creature")
    expect(previewTraining(s.creature)).toBe("sick")
  })

  test("a creature that will wake starving expects a wasted night", () => {
    const s = focusState({ hunger: 10, health: 100 }, { trainingFocus: "atk" })
    if (!s.creature) throw new Error("no creature")
    expect(previewTraining(s.creature)).toBe("hungry")
  })

  test("no focus means no preview", () => {
    const s = focusState({ hunger: 80, health: 100 }, {})
    if (!s.creature) throw new Error("no creature")
    expect(previewTraining(s.creature)).toBeNull()
  })

  test("the preview is pure — it does not mutate the creature", () => {
    const s = focusState({ hunger: 80, health: 60 }, { trainingFocus: "atk" })
    if (!s.creature) throw new Error("no creature")
    const snapshot = structuredClone(s.creature)
    previewTraining(s.creature)
    expect(s.creature).toEqual(snapshot)
  })

  test("feeding or treating after assigning turns a wasted preview into a gain", () => {
    const sick = focusState(
      { hunger: 80, health: 60 },
      { trainingFocus: "atk" },
    )
    if (!sick.creature) throw new Error("no creature")
    expect(previewTraining(sick.creature)).toBe("sick")
    const treated = careAction(sick, "treat")
    if (!treated.ok) throw new Error("treat rejected")
    if (!treated.state.creature) throw new Error("creature lost")
    expect(previewTraining(treated.state.creature)).toBe("gained")

    const starving = focusState(
      { hunger: 10, health: 100 },
      { trainingFocus: "atk" },
    )
    if (!starving.creature) throw new Error("no creature")
    expect(previewTraining(starving.creature)).toBe("hungry")
    const fed = careAction(starving, "feed")
    if (!fed.ok) throw new Error("feed rejected")
    if (!fed.state.creature) throw new Error("creature lost")
    expect(previewTraining(fed.state.creature)).toBe("gained")
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
