import { describe, expect, test } from "bun:test"
import { pipStates } from "./kit"

describe("pipStates", () => {
  test("full pips up to ap, empty for the rest of the base slots", () => {
    expect(pipStates(3, 5)).toEqual(["full", "full", "full", "empty", "empty"])
  })

  test("zero ap means every base slot is empty", () => {
    expect(pipStates(0, 3)).toEqual(["empty", "empty", "empty"])
  })

  test("full ap means every base slot is full", () => {
    expect(pipStates(3, 3)).toEqual(["full", "full", "full"])
  })

  test("bonus pips append after the base slots", () => {
    expect(pipStates(1, 3, 2)).toEqual([
      "full",
      "empty",
      "empty",
      "bonus",
      "bonus",
    ])
  })

  test("no bonus appends nothing", () => {
    expect(pipStates(2, 4, 0)).toHaveLength(4)
  })
})
