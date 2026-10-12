import { describe, expect, test } from "bun:test"
import type { BattleResult } from "@apex/sim"
import { reasonLine, toggleKitChoice, winningSideKey } from "./battleUI"

/** A minimal BattleResult with only the fields the helpers read. */
function result(
  finalHp: Record<string, number>,
  reason: BattleResult["reason"] = "ko",
): BattleResult {
  return { winner: null, reason, finalHp, events: [] }
}

describe("reasonLine", () => {
  test("the clock line covers a time-out", () => {
    expect(reasonLine(result({}, "time"))).toBe(
      "The clock ran out on this one.",
    )
  })

  test("the double-down line covers a double knockout", () => {
    expect(reasonLine(result({}, "double_ko"))).toBe(
      "A double down - both went out together.",
    )
  })

  test("a plain knockout gets the knockout line", () => {
    expect(reasonLine(result({}, "ko"))).toBe("A knockout finish.")
  })
})

describe("winningSideKey", () => {
  test("returns the side with the most remaining hp", () => {
    expect(winningSideKey(result({ alpha: 3, beta: 12 }))).toBe("beta")
  })

  test("both sides down still resolves to the first side (original scan)", () => {
    expect(winningSideKey(result({ alpha: 0, beta: 0 }))).toBe("alpha")
  })

  test("an exact tie resolves to the first side (existing iteration order)", () => {
    expect(winningSideKey(result({ alpha: 5, beta: 5 }))).toBe("alpha")
  })

  test("a single-side record resolves to that side", () => {
    expect(winningSideKey(result({ solo: 1 }))).toBe("solo")
  })

  test("an empty record resolves to null", () => {
    expect(winningSideKey(result({}))).toBeNull()
  })
})

describe("toggleKitChoice", () => {
  test("adds an unchosen move below the cap", () => {
    expect(toggleKitChoice(["a", "b"], "c", 2, 4)).toEqual(["a", "b", "c"])
  })

  test("refuses to add at the cap", () => {
    expect(toggleKitChoice(["a", "b", "c", "d"], "e", 2, 4)).toBeNull()
  })

  test("removes a chosen move above the floor", () => {
    expect(toggleKitChoice(["a", "b", "c"], "b", 2, 4)).toEqual(["a", "c"])
  })

  test("refuses to drop below the floor", () => {
    expect(toggleKitChoice(["a", "b"], "a", 2, 4)).toBeNull()
  })

  test("exact floor removal is refused (min-2 rule)", () => {
    expect(toggleKitChoice(["a"], "a", 2, 4)).toBeNull()
  })
})
