import { describe, expect, test } from "bun:test"

import {
  advanceDay,
  type Creature,
  chooseStarter,
  createInitialState,
  type GameState,
  makeRng,
  type Rng,
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
  test("well-fed healthy creature recovers a full night of energy", () => {
    const s = advanceDay(
      stateWith({ hunger: 80, energy: 30, health: 100 }),
      fixedRng(0.99),
    )
    expect(s.creature?.conditions.energy).toBe(30 + 60)
  })

  test("recovery clamps at 100", () => {
    const s = advanceDay(
      stateWith({ hunger: 80, energy: 70, health: 100 }),
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
