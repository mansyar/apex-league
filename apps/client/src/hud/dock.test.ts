import { describe, expect, test } from "bun:test"
import {
  type Creature,
  createCreature,
  TRAINING_CAP,
  type TrainingProgram,
} from "@apex/sim"
import { REJECTION_COPY } from "./copy"
import { trainButtonState } from "./dock"

const fresh = createCreature("fire_drake", 42)

function trained(overrides: Partial<Creature["trained"]>): Creature {
  return { ...fresh, trained: { ...fresh.trained, ...overrides } }
}

function assigned(program: TrainingProgram | null): Creature {
  return { ...fresh, trainingProgram: program }
}

describe("the train control", () => {
  test("invites a pick when nothing is assigned", () => {
    expect(trainButtonState(fresh, 3)).toEqual({
      disabled: false,
      reason: null,
      label: "Choose tonight's training",
      cost: "1 AP",
      focus: false,
    })
  })

  test("names the assigned program in its own label", () => {
    expect(trainButtonState(assigned("sprint"), 3).label).toBe(
      "Training: Sprint Work",
    )
    expect(trainButtonState(assigned("ring"), 3).label).toBe(
      "Training: Ring Craft",
    )
  })

  test("drops the AP badge once a program is set: a re-point is free", () => {
    expect(trainButtonState(assigned("power"), 0)).toEqual({
      disabled: false,
      reason: null,
      label: "Training: Power Lifting",
      cost: null,
      focus: true,
    })
  })

  test("closes at 0 AP only when nothing is assigned", () => {
    expect(trainButtonState(fresh, 0)).toEqual({
      disabled: true,
      reason: REJECTION_COPY["no-ap"],
      label: "Choose tonight's training",
      cost: null,
      focus: false,
    })
  })

  test("closes only when every program's primary is capped", () => {
    const capped = trained({
      hp: TRAINING_CAP,
      atk: TRAINING_CAP,
      def: TRAINING_CAP,
      spd: TRAINING_CAP,
    })
    expect(trainButtonState(capped, 3)).toEqual({
      disabled: true,
      reason: "Nothing left to train for now.",
      label: "Choose tonight's training",
      cost: null,
      focus: false,
    })
  })

  test("a capped primary keeps the picker open while a trickle has room", () => {
    expect(trainButtonState(trained({ atk: TRAINING_CAP }), 3).disabled).toBe(
      false,
    )
  })
})
