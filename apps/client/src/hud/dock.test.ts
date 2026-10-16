import { describe, expect, test } from "bun:test"
import { createCreature, type GameState, TRAINING_CAP } from "@apex/sim"
import { pickerEntry, trainButtonState } from "./dock"

type Creature = NonNullable<GameState["creature"]>

const drake = createCreature("fire_drake", 42)
const fresh: Creature = { ...drake, trainingFocus: null }
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
  test("golden: a healthy creature with AP and no focus trains freely", () => {
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

  test("golden: 0 AP without a focus blocks training", () => {
    expect(trainButtonState(fresh, 0)).toEqual({
      disabled: true,
      reason: "No AP left today.",
      tag: "",
      focus: false,
    })
  })

  test("golden: 0 AP with a focus stays enabled — the swap is free", () => {
    expect(trainButtonState({ ...fresh, trainingFocus: "atk" }, 0)).toEqual({
      disabled: false,
      reason: null,
      tag: "Focus: ATK",
      focus: true,
    })
    expect(trainButtonState({ ...fresh, trainingFocus: "hp" }, 2)).toEqual({
      disabled: false,
      reason: null,
      tag: "Focus: HP",
      focus: true,
    })
  })

  test("golden: below the cap training stays available", () => {
    expect(trainButtonState(belowCap, 3).disabled).toBe(false)
  })
})

describe("pickerEntry", () => {
  test("golden: no focus and no preview reads the plain cost", () => {
    expect(pickerEntry(fresh, "hp", null)).toEqual({
      capped: false,
      isFocus: false,
      note: "costs 1 AP",
    })
  })

  test("golden: the focused stat reads tonight's preview", () => {
    expect(
      pickerEntry({ ...fresh, trainingFocus: "hp" }, "hp", "gained"),
    ).toEqual({
      capped: false,
      isFocus: true,
      note: "focused · +1 tonight",
    })
    expect(
      pickerEntry({ ...fresh, trainingFocus: "hp" }, "hp", "sick").note,
    ).toBe("focused · no gain — unwell")
    expect(
      pickerEntry({ ...fresh, trainingFocus: "hp" }, "hp", "hungry").note,
    ).toBe("focused · no gain — hungry")
  })

  test("golden: other stats read tonight's concrete gain while focused", () => {
    const focused: Creature = { ...fresh, trainingFocus: "hp" }
    const total = focused.stats.atk + focused.trained.atk
    expect(pickerEntry(focused, "atk", "gained")).toEqual({
      capped: false,
      isFocus: false,
      note: `ATK ${total} → ${total + 1}`,
    })
  })

  test("golden: a focused but non-previewed stat stays quiet about gains", () => {
    const focused: Creature = { ...fresh, trainingFocus: "hp" }
    expect(pickerEntry(focused, "atk", null).note).toBe("costs 1 AP")
  })

  test("golden: capped stats read the cap line and stay unfocusable", () => {
    expect(
      pickerEntry({ ...cappedAll, trainingFocus: "hp" }, "hp", "gained"),
    ).toEqual({
      capped: true,
      isFocus: true,
      note: "as sharp as it can get for now",
    })
  })
})
