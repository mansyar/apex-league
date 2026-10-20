import { describe, expect, test } from "bun:test"
import {
  createCreature,
  type GameState,
  TRAINING_CAP,
  type TrainingPreview,
} from "@apex/sim"
import { pickerEntry, trainButtonState } from "./dock"

type Creature = NonNullable<GameState["creature"]>

const drake = createCreature("fire_drake", 42)
const fresh: Creature = { ...drake, trainingProgram: null }
const quiet: TrainingPreview = { result: null, gains: {} }
const gained: TrainingPreview = { result: "gained", gains: { atk: 1 } }
const cappedAll: Creature = {
  ...fresh,
  trained: {
    hp: TRAINING_CAP,
    atk: TRAINING_CAP,
    def: TRAINING_CAP,
    spd: TRAINING_CAP,
  },
}
const belowCap: Creature = {
  ...fresh,
  trained: { hp: TRAINING_CAP - 1, atk: 0, def: 0, spd: 0 },
}

describe("trainButtonState", () => {
  test("golden: a healthy creature with AP and no program trains freely", () => {
    expect(trainButtonState(fresh, 3)).toEqual({
      disabled: false,
      reason: null,
      tag: "",
      focus: false,
    })
  })

  test("golden: everything capped closes training for now", () => {
    expect(trainButtonState(cappedAll, 3)).toEqual({
      disabled: true,
      reason: "Nothing left to train for now.",
      tag: "",
      focus: false,
    })
  })

  test("golden: 0 AP without a program blocks training", () => {
    expect(trainButtonState(fresh, 0)).toEqual({
      disabled: true,
      reason: "No AP left today.",
      tag: "",
      focus: false,
    })
  })

  test("golden: 0 AP with a program stays enabled — the swap is free", () => {
    expect(trainButtonState({ ...fresh, trainingProgram: "power" }, 0)).toEqual(
      {
        disabled: false,
        reason: null,
        tag: "Power Lifting",
        focus: true,
      },
    )
    expect(
      trainButtonState({ ...fresh, trainingProgram: "endurance" }, 2),
    ).toEqual({
      disabled: false,
      reason: null,
      tag: "Endurance Circuit",
      focus: true,
    })
  })

  test("golden: below the cap training stays available", () => {
    expect(trainButtonState(belowCap, 3).disabled).toBe(false)
  })
})

describe("pickerEntry", () => {
  test("golden: no program and no preview reads the plain cost", () => {
    expect(pickerEntry(fresh, "hp", quiet)).toEqual({
      capped: false,
      isFocus: false,
      note: "costs 1 AP",
    })
  })

  test("golden: the program's primary stat reads tonight's preview", () => {
    const powered: Creature = { ...fresh, trainingProgram: "power" }
    expect(pickerEntry(powered, "atk", gained)).toEqual({
      capped: false,
      isFocus: true,
      note: "focused · +1 tonight",
    })
    expect(
      pickerEntry(powered, "atk", { result: "sick", gains: {} }).note,
    ).toBe("focused · no gain — unwell")
    expect(
      pickerEntry(powered, "atk", { result: "hungry", gains: {} }).note,
    ).toBe("focused · no gain — hungry")
    expect(
      pickerEntry(powered, "atk", { result: "exhausted", gains: {} }).note,
    ).toBe("focused · no gain — too tired")
  })

  test("golden: a trickle stat reads tonight's concrete gain", () => {
    const powered: Creature = { ...fresh, trainingProgram: "power" }
    const total = powered.stats.def + powered.trained.def
    expect(
      pickerEntry(powered, "def", {
        result: "gained",
        gains: { atk: 1, def: 1 },
      }),
    ).toEqual({
      capped: false,
      isFocus: false,
      note: `DEF ${total} → ${total + 1}`,
    })
  })

  test("golden: an unpreviewed stat stays quiet about gains", () => {
    const powered: Creature = { ...fresh, trainingProgram: "power" }
    expect(pickerEntry(powered, "spd", quiet).note).toBe("costs 1 AP")
  })

  test("golden: capped stats read the cap line and stay unfocusable", () => {
    expect(
      pickerEntry({ ...cappedAll, trainingProgram: "power" }, "atk", {
        result: "gained",
        gains: {},
      }),
    ).toEqual({
      capped: true,
      isFocus: true,
      note: "as sharp as it can get for now",
    })
  })
})
