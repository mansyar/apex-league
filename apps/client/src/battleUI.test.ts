import { describe, expect, test } from "bun:test"
import type { BattleResult, MoveDef } from "@apex/sim"
import {
  moveStatLine,
  reasonLine,
  toggleKitChoice,
  winningSideKey,
} from "./battleUI"

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
      "A double down — both went out together.",
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

describe("moveStatLine", () => {
  const flameLash: MoveDef = {
    id: "flame_lash",
    displayName: "Flame Lash",
    element: "fire",
    power: 24,
    accuracy: 85,
    cooldown: 1,
    melee: false,
  }

  test("an unlocked move reads power, accuracy, cooldown", () => {
    expect(moveStatLine(flameLash)).toBe("Power 24 · Accuracy 85% · Cooldown 1")
  })

  test("the basic strike's stats read the same way", () => {
    const strike: MoveDef = {
      id: "basic",
      displayName: "Strike",
      power: 4,
      accuracy: 100,
      cooldown: 0,
      melee: true,
    }
    expect(moveStatLine(strike)).toBe("Power 4 · Accuracy 100% · Cooldown 0")
  })

  test("a locked move leads with the unlock day", () => {
    expect(moveStatLine(flameLash, 3)).toBe(
      "Unlocks in 3 days · Power 24 · Accuracy 85% · Cooldown 1",
    )
  })

  test("a one-day lock reads in the singular", () => {
    expect(moveStatLine(flameLash, 1)).toBe(
      "Unlocks in 1 day · Power 24 · Accuracy 85% · Cooldown 1",
    )
  })

  test("a lock that evolution also opens says so", () => {
    expect(moveStatLine(flameLash, 3, true)).toBe(
      "Unlocks in 3 days or on evolution · Power 24 · Accuracy 85% · Cooldown 1",
    )
  })
})
