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
  TRAINING_PROGRAMS,
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

/** Day-1 state with a creature carrying hand-set training fields. */
function trainingState(
  fields: Partial<
    Pick<
      Creature,
      "trained" | "trainingProgram" | "trainingResult" | "trainingDays"
    >
  >,
  actionPoints = ACTION_POINTS_PER_DAY,
): GameState {
  const s = stateWith({}, actionPoints)
  if (!s.creature) throw new Error("starter not created")
  return { ...s, creature: { ...s.creature, ...fields } }
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

  test("feeding marks the creature fed for today", () => {
    const r = careAction(stateWith({ hunger: 30 }), "feed")
    if (!r.ok) throw new Error("unreachable")
    if (!r.state.creature) throw new Error("creature lost")
    expect(r.state.creature.fedToday).toBe(true)
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

  test("rest, treat, and play never mark the creature fed", () => {
    for (const action of ["rest", "treat", "play"] as const) {
      const s =
        action === "treat"
          ? stateWith({ health: 60 })
          : stateWith({ energy: 60 })
      const r = careAction(s, action)
      if (!r.ok) throw new Error(`unreachable: ${action} rejected`)
      expect(r.state.creature?.fedToday).toBe(false)
    }
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
  test("the first assignment of the day sets the program and spends 1 AP", () => {
    const r = assignTraining(trainingState({}), "power")
    expect(r.ok).toBe(true)
    if (!r.ok) throw new Error("unreachable")
    expect(r.state.creature?.trainingProgram).toBe("power")
    expect(r.state.creature?.trainingResult).toBeNull()
    expect(r.state.actionPoints).toBe(ACTION_POINTS_PER_DAY - 1)
  })

  test("every program can be assigned on a fresh day", () => {
    for (const program of TRAINING_PROGRAMS) {
      const r = assignTraining(trainingState({}), program.id)
      expect(r.ok).toBe(true)
      if (!r.ok) throw new Error(`rejected: ${program.id}`)
      expect(r.state.creature?.trainingProgram).toBe(program.id)
    }
  })

  test("re-pointing the same day is free and AP-neutral", () => {
    const r = assignTraining(
      trainingState({ trainingProgram: "power" }),
      "sprint",
    )
    expect(r.ok).toBe(true)
    if (!r.ok) throw new Error("unreachable")
    expect(r.state.creature?.trainingProgram).toBe("sprint")
    expect(r.state.actionPoints).toBe(ACTION_POINTS_PER_DAY)
  })

  test("a re-point resets tonight's training result", () => {
    const r = assignTraining(
      trainingState({ trainingProgram: "endurance", trainingResult: "gained" }),
      "ring",
    )
    if (!r.ok) throw new Error("unreachable")
    expect(r.state.creature?.trainingResult).toBeNull()
  })

  test("a capped primary is rejected before spending AP — at-cap", () => {
    // Power's primary is ATK.
    const s = trainingState({
      trained: { hp: 0, atk: TRAINING_CAP, def: 0, spd: 0 },
    })
    const r = assignTraining(s, "power")
    expect(r).toEqual({ ok: false, reason: "at-cap" })
    expect(s.actionPoints).toBe(ACTION_POINTS_PER_DAY)
  })

  test("Ring Craft shares ATK as its primary and rejects the same way", () => {
    const s = trainingState({
      trained: { hp: 0, atk: TRAINING_CAP, def: 0, spd: 0 },
    })
    expect(assignTraining(s, "ring")).toEqual({ ok: false, reason: "at-cap" })
  })

  test("a capped trickle never blocks its program", () => {
    // Power trickles DEF: a maxed DEF still accepts Power Lifting.
    const r = assignTraining(
      trainingState({
        trained: { hp: 0, atk: 0, def: TRAINING_CAP, spd: 0 },
      }),
      "power",
    )
    expect(r.ok).toBe(true)
    if (!r.ok) throw new Error("unreachable")
    expect(r.state.creature?.trainingProgram).toBe("power")
  })

  test("after a capped rejection other programs stay assignable", () => {
    const s = trainingState({
      trained: { hp: 0, atk: TRAINING_CAP, def: 0, spd: 0 },
    })
    const r = assignTraining(s, "endurance")
    expect(r.ok).toBe(true)
    if (!r.ok) throw new Error("unreachable")
    expect(r.state.creature?.trainingProgram).toBe("endurance")
  })

  test("picking the already-assigned program is a free no-op", () => {
    const r = assignTraining(trainingState({ trainingProgram: "ring" }), "ring")
    expect(r.ok).toBe(true)
    if (!r.ok) throw new Error("unreachable")
    expect(r.state.creature?.trainingProgram).toBe("ring")
    expect(r.state.actionPoints).toBe(ACTION_POINTS_PER_DAY)
  })

  test("assignment is allowed while sick, hungry, or exhausted", () => {
    for (const conditions of [{ health: 50 }, { hunger: 0 }, { energy: 10 }]) {
      const r = assignTraining(stateWith(conditions), "endurance")
      expect(r.ok).toBe(true)
      if (!r.ok) throw new Error("unreachable")
      expect(r.state.creature?.trainingProgram).toBe("endurance")
    }
  })

  test("the first assignment is rejected without AP — no-ap", () => {
    const r = assignTraining(trainingState({}, 0), "endurance")
    expect(r).toEqual({ ok: false, reason: "no-ap" })
  })

  test("a free re-point works even with no AP left", () => {
    const r = assignTraining(
      trainingState({ trainingProgram: "power" }, 0),
      "sprint",
    )
    expect(r.ok).toBe(true)
    if (!r.ok) throw new Error("unreachable")
    expect(r.state.creature?.trainingProgram).toBe("sprint")
    expect(r.state.actionPoints).toBe(0)
  })

  test("clearing the assignment is free and AP-neutral", () => {
    const r = assignTraining(
      trainingState({ trainingProgram: "power", trainingResult: "gained" }),
      null,
    )
    expect(r.ok).toBe(true)
    if (!r.ok) throw new Error("unreachable")
    expect(r.state.creature?.trainingProgram).toBeNull()
    expect(r.state.creature?.trainingResult).toBeNull()
    expect(r.state.actionPoints).toBe(ACTION_POINTS_PER_DAY)
  })

  test("clearing works with no AP left", () => {
    const r = assignTraining(
      trainingState({ trainingProgram: "sprint" }, 0),
      null,
    )
    expect(r.ok).toBe(true)
    if (!r.ok) throw new Error("unreachable")
    expect(r.state.creature?.trainingProgram).toBeNull()
    expect(r.state.actionPoints).toBe(0)
  })

  test("clearing an empty assignment is a free no-op", () => {
    const r = assignTraining(trainingState({ trainingDays: 2 }, 0), null)
    expect(r.ok).toBe(true)
    if (!r.ok) throw new Error("unreachable")
    expect(r.state.creature?.trainingProgram).toBeNull()
    expect(r.state.creature?.trainingDays).toBe(2)
  })

  test("assignment is rejected without a creature — no-creature", () => {
    expect(assignTraining(createInitialState(), "endurance")).toEqual({
      ok: false,
      reason: "no-creature",
    })
    expect(assignTraining(createInitialState(), null)).toEqual({
      ok: false,
      reason: "no-creature",
    })
  })

  test("success and clearing are pure — the input state is untouched", () => {
    const assigned = trainingState({ trainingProgram: "power" })
    const snapshot = structuredClone(assigned)
    assignTraining(assigned, "ring")
    assignTraining(assigned, null)
    expect(assigned).toEqual(snapshot)
  })
})

describe("assignTraining — trained days", () => {
  test("the first assignment of a day bumps trainingDays by exactly 1", () => {
    const r = assignTraining(trainingState({ trainingDays: 0 }), "power")
    expect(r.ok).toBe(true)
    if (!r.ok) throw new Error("unreachable")
    expect(r.state.creature?.trainingDays).toBe(1)
    expect(r.state.actionPoints).toBe(ACTION_POINTS_PER_DAY - 1)
  })

  test("a free same-day re-point never adds a trained day", () => {
    const r = assignTraining(
      trainingState({ trainingDays: 1, trainingProgram: "endurance" }),
      "sprint",
    )
    expect(r.ok).toBe(true)
    if (!r.ok) throw new Error("unreachable")
    expect(r.state.creature?.trainingDays).toBe(1)
    expect(r.state.actionPoints).toBe(ACTION_POINTS_PER_DAY)
  })

  test("clearing never adds a trained day", () => {
    const r = assignTraining(
      trainingState({ trainingDays: 3, trainingProgram: "ring" }),
      null,
    )
    expect(r.ok).toBe(true)
    if (!r.ok) throw new Error("unreachable")
    expect(r.state.creature?.trainingDays).toBe(3)
  })

  test("a capped-primary rejection never touches the counter", () => {
    const s = trainingState({
      trainingDays: 1,
      trained: { hp: 0, atk: TRAINING_CAP, def: 0, spd: 0 },
    })
    const r = assignTraining(s, "power")
    expect(r).toEqual({ ok: false, reason: "at-cap" })
    if (s.creature === null) throw new Error("unreachable")
    expect(s.creature.trainingDays).toBe(1)
  })

  test("separate assignment days accumulate", () => {
    // A later day: settlement has cleared the assignment, the ledger stays.
    const r = assignTraining(trainingState({ trainingDays: 3 }), "sprint")
    expect(r.ok).toBe(true)
    if (!r.ok) throw new Error("unreachable")
    expect(r.state.creature?.trainingDays).toBe(4)
  })

  test("a rejected assignment without AP never adds a trained day", () => {
    const s = trainingState({ trainingDays: 0 }, 0)
    const rejected = assignTraining(s, "endurance")
    expect(rejected).toEqual({ ok: false, reason: "no-ap" })
    if (s.creature === null) throw new Error("unreachable")
    expect(s.creature.trainingDays).toBe(0)
  })

  test("counter accounting is pure — rejections and successes both", () => {
    const s = trainingState({ trainingDays: 1 })
    const snapshot = structuredClone(s)
    assignTraining(s, "endurance")
    expect(s).toEqual(snapshot)
  })
})
