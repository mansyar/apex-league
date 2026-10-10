import { describe, expect, test } from "bun:test"

import {
  ACTION_POINTS_PER_DAY,
  assignTraining,
  type Creature,
  careAction,
  chooseStarter,
  createInitialState,
  type GameState,
  TRAINING_CAP,
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

describe("assignTraining", () => {
  /** Day-1 state with a creature carrying hand-set training fields. */
  function trainingState(
    fields: Partial<
      Pick<Creature, "trained" | "trainingFocus" | "trainingResult">
    >,
    actionPoints = ACTION_POINTS_PER_DAY,
  ): GameState {
    const s = stateWith({}, actionPoints)
    if (!s.creature) throw new Error("starter not created")
    return { ...s, creature: { ...s.creature, ...fields } }
  }

  test("the first assignment sets the focus and spends 1 AP", () => {
    const r = assignTraining(trainingState({}), "atk")
    expect(r.ok).toBe(true)
    if (!r.ok) throw new Error("unreachable")
    expect(r.state.creature?.trainingFocus).toBe("atk")
    expect(r.state.creature?.trainingResult).toBeNull()
    expect(r.state.actionPoints).toBe(ACTION_POINTS_PER_DAY - 1)
  })

  test("swapping the focus the same day is free", () => {
    const r = assignTraining(trainingState({ trainingFocus: "hp" }), "def")
    expect(r.ok).toBe(true)
    if (!r.ok) throw new Error("unreachable")
    expect(r.state.creature?.trainingFocus).toBe("def")
    expect(r.state.actionPoints).toBe(ACTION_POINTS_PER_DAY)
  })

  test("a swap resets tonight's training result", () => {
    const r = assignTraining(
      trainingState({ trainingFocus: "hp", trainingResult: "gained" }),
      "spd",
    )
    if (!r.ok) throw new Error("unreachable")
    expect(r.state.creature?.trainingResult).toBeNull()
  })

  test("a capped stat is rejected before spending AP — at-cap", () => {
    const s = trainingState({
      trained: { hp: 0, atk: TRAINING_CAP, def: 0, spd: 0 },
    })
    const r = assignTraining(s, "atk")
    expect(r).toEqual({ ok: false, reason: "at-cap" })
    expect(s.actionPoints).toBe(ACTION_POINTS_PER_DAY)
  })

  test("after a capped rejection other stats stay assignable", () => {
    const s = trainingState({
      trained: { hp: 0, atk: TRAINING_CAP, def: 0, spd: 0 },
    })
    const r = assignTraining(s, "def")
    expect(r.ok).toBe(true)
    if (!r.ok) throw new Error("unreachable")
    expect(r.state.creature?.trainingFocus).toBe("def")
  })

  test("picking the already-focused stat is a free no-op", () => {
    const r = assignTraining(trainingState({ trainingFocus: "def" }), "def")
    expect(r.ok).toBe(true)
    if (!r.ok) throw new Error("unreachable")
    expect(r.state.creature?.trainingFocus).toBe("def")
    expect(r.state.actionPoints).toBe(ACTION_POINTS_PER_DAY)
  })

  test("assignment is allowed while sick, hungry, or exhausted", () => {
    for (const conditions of [{ health: 50 }, { hunger: 0 }, { energy: 10 }]) {
      const r = assignTraining(stateWith(conditions), "hp")
      expect(r.ok).toBe(true)
      if (!r.ok) throw new Error("unreachable")
      expect(r.state.creature?.trainingFocus).toBe("hp")
    }
  })

  test("the first assignment is rejected without AP — no-ap", () => {
    const r = assignTraining(trainingState({}, 0), "hp")
    expect(r).toEqual({ ok: false, reason: "no-ap" })
  })

  test("a free swap works even with no AP left", () => {
    const r = assignTraining(trainingState({ trainingFocus: "atk" }, 0), "hp")
    expect(r.ok).toBe(true)
    if (!r.ok) throw new Error("unreachable")
    expect(r.state.creature?.trainingFocus).toBe("hp")
    expect(r.state.actionPoints).toBe(0)
  })

  test("assignment is rejected without a creature — no-creature", () => {
    expect(assignTraining(createInitialState(), "hp")).toEqual({
      ok: false,
      reason: "no-creature",
    })
  })

  test("success is pure — does not mutate the input state", () => {
    const s = trainingState({})
    const snapshot = structuredClone(s)
    assignTraining(s, "hp")
    expect(s).toEqual(snapshot)
  })
})
