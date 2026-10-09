import { describe, expect, test } from "bun:test"

import {
  ACTION_POINTS_PER_DAY,
  type Creature,
  careAction,
  chooseStarter,
  createInitialState,
  type GameState,
} from "./index"

/** Day-1 state with an owned creature and hand-set conditions/AP. */
function stateWith(
  conditions: Partial<Creature["conditions"]>,
  actionPoints = ACTION_POINTS_PER_DAY,
): GameState {
  const s = chooseStarter(createInitialState(), "fire_drake", 42)
  if (!s.creature) throw new Error("starter not created")
  return {
    ...s,
    actionPoints,
    creature: {
      ...s.creature,
      conditions: { ...s.creature.conditions, ...conditions },
    },
  }
}

describe("careAction — feed", () => {
  test("restores hunger, adds a little energy, spends 1 AP", () => {
    const r = careAction(stateWith({ hunger: 30, energy: 40 }), "feed")
    expect(r.ok).toBe(true)
    if (!r.ok) throw new Error("unreachable")
    expect(r.state.creature?.conditions.hunger).toBe(80)
    expect(r.state.creature?.conditions.energy).toBe(50)
    expect(r.state.actionPoints).toBe(ACTION_POINTS_PER_DAY - 1)
  })

  test("hunger clamps at 100", () => {
    const r = careAction(stateWith({ hunger: 90 }), "feed")
    if (!r.ok) throw new Error("unreachable")
    expect(r.state.creature?.conditions.hunger).toBe(100)
  })

  test("feeding a starving creature brings mood relief (care quality)", () => {
    const r = careAction(stateWith({ hunger: 0, mood: 50 }), "feed")
    if (!r.ok) throw new Error("unreachable")
    expect(r.state.creature?.conditions.mood).toBe(55)
  })

  test("feeding a well-fed creature grants no mood relief", () => {
    const r = careAction(stateWith({ hunger: 60, mood: 50 }), "feed")
    if (!r.ok) throw new Error("unreachable")
    expect(r.state.creature?.conditions.mood).toBe(50)
  })
})

describe("careAction — rest", () => {
  test("a nap restores energy and spends 1 AP", () => {
    const r = careAction(stateWith({ energy: 30 }), "rest")
    if (!r.ok) throw new Error("unreachable")
    expect(r.state.creature?.conditions.energy).toBe(70)
    expect(r.state.actionPoints).toBe(ACTION_POINTS_PER_DAY - 1)
  })

  test("energy clamps at 100", () => {
    const r = careAction(stateWith({ energy: 90 }), "rest")
    if (!r.ok) throw new Error("unreachable")
    expect(r.state.creature?.conditions.energy).toBe(100)
  })
})

describe("careAction — treat", () => {
  test("medicine heals a sick creature and spends 1 AP", () => {
    const r = careAction(stateWith({ health: 60 }), "treat")
    if (!r.ok) throw new Error("unreachable")
    expect(r.state.creature?.conditions.health).toBe(100)
    expect(r.state.actionPoints).toBe(ACTION_POINTS_PER_DAY - 1)
  })

  test("treating a healthy creature is rejected — not-sick", () => {
    const s = stateWith({ health: 100 })
    const r = careAction(s, "treat")
    expect(r).toEqual({ ok: false, reason: "not-sick" })
    expect(s.actionPoints).toBe(ACTION_POINTS_PER_DAY)
  })
})

describe("careAction — play", () => {
  test("play raises mood and bond, drains energy, spends 1 AP, marks the day bonded", () => {
    const r = careAction(stateWith({ energy: 60, mood: 40, bond: 20 }), "play")
    if (!r.ok) throw new Error("unreachable")
    expect(r.state.creature?.conditions.mood).toBe(50)
    expect(r.state.creature?.conditions.bond).toBe(30)
    expect(r.state.creature?.conditions.energy).toBe(40)
    expect(r.state.creature?.bondedToday).toBe(true)
    expect(r.state.actionPoints).toBe(ACTION_POINTS_PER_DAY - 1)
  })

  test("play is rejected while sick — too-sick", () => {
    const s = stateWith({ health: 60, energy: 60 })
    const r = careAction(s, "play")
    expect(r).toEqual({ ok: false, reason: "too-sick" })
  })

  test("play is rejected when exhausted — too-tired", () => {
    const s = stateWith({ energy: 15 })
    const r = careAction(s, "play")
    expect(r).toEqual({ ok: false, reason: "too-tired" })
  })
})

describe("careAction — rejections", () => {
  test("every action is rejected without AP — no-ap", () => {
    for (const action of ["feed", "rest", "treat", "play"] as const) {
      const s = stateWith({ health: 60, energy: 60 }, 0)
      const r = careAction(s, action)
      expect(r).toEqual({ ok: false, reason: "no-ap" })
    }
  })

  test("every action is rejected without a creature — no-creature", () => {
    for (const action of ["feed", "rest", "treat", "play"] as const) {
      const r = careAction(createInitialState(), action)
      expect(r).toEqual({ ok: false, reason: "no-creature" })
    }
  })

  test("rejections never mutate the state", () => {
    const s = stateWith({ health: 100, energy: 15 }, 0)
    const snapshot = structuredClone(s)
    careAction(s, "play")
    expect(s).toEqual(snapshot)
  })

  test("success is pure — does not mutate the input state", () => {
    const s = stateWith({ hunger: 30 })
    const snapshot = structuredClone(s)
    careAction(s, "feed")
    expect(s).toEqual(snapshot)
  })
})
