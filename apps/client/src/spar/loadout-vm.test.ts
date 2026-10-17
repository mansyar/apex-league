import { describe, expect, test } from "bun:test"
import { createCreature, defaultLoadout, getSpecies } from "@apex/sim"
import {
  kitHintMessage,
  kitProgress,
  loadoutOf,
  statLine,
  toggleKit,
} from "./loadout-vm"

const drake = createCreature("fire_drake", 42)
const drakeSpecies = getSpecies("fire_drake")
if (!drakeSpecies) throw new Error("fire_drake species missing in fixture")

describe("statLine", () => {
  test("golden: base stats join with middots and uppercase keys", () => {
    expect(statLine({ hp: 80, atk: 13, def: 8, spd: 9 })).toBe(
      "HP 80 · ATK 13 · DEF 8 · SPD 9",
    )
  })

  test("golden: trained bonuses appear as (+N) chips", () => {
    expect(
      statLine(
        { hp: 80, atk: 13, def: 8, spd: 9 },
        { hp: 2, atk: 0, def: 0, spd: 1 },
      ),
    ).toBe("HP 80 (+2) · ATK 13 · DEF 8 · SPD 9 (+1)")
  })

  test("golden: zero bonuses stay quiet", () => {
    expect(
      statLine(
        { hp: 10, atk: 10, def: 10, spd: 10 },
        { hp: 0, atk: 0, def: 0, spd: 0 },
      ),
    ).toBe("HP 10 · ATK 10 · DEF 10 · SPD 10")
  })
})

describe("kitProgress", () => {
  test("golden: a fresh baby reads the next tier's day cost", () => {
    expect(kitProgress(drake, drakeSpecies)).toBe(
      "Unlocked 2 of 4 moves — train 3 more days for Cinder Shot.",
    )
  })

  test("golden: a freshly evolved juvenile reads the evolution line", () => {
    const juvenile = { ...drake, stage: "juvenile" as const, trainingDays: 0 }
    const text = kitProgress(juvenile, drakeSpecies)
    expect(text).toMatch(
      /^Evolution unlocked move 3 — train \d+ more days? for /,
    )
  })

  test("golden: a fully unlocked kit reads as quiet", () => {
    const complete = { ...drake, trainingDays: 99, stage: "champion" as const }
    expect(kitProgress(complete, drakeSpecies)).toBe("")
  })
})

describe("toggleKit", () => {
  test("golden: adding a move appends it", () => {
    expect(toggleKit(["m1"], "m2")).toEqual(["m1", "m2"])
  })

  test("golden: removing a move filters it out", () => {
    expect(toggleKit(["m1", "m2"], "m1")).toEqual(["m2"])
  })

  test("golden: removing from a singleton empties the kit", () => {
    expect(toggleKit(["m1"], "m1")).toEqual([])
  })
})

describe("kitHintMessage", () => {
  test("golden: an Error surfaces its message", () => {
    expect(kitHintMessage(new Error("boom"))).toBe("boom")
  })

  test("golden: anything else falls back to the coach line", () => {
    expect(kitHintMessage("nope")).toBe("That kit is not allowed")
    expect(kitHintMessage(undefined)).toBe("That kit is not allowed")
  })
})

describe("loadoutOf", () => {
  test("golden: a saved loadout wins", () => {
    expect(loadoutOf({ ...drake, loadout: ["m9"] }, drakeSpecies)).toEqual([
      "m9",
    ])
  })

  test("golden: no loadout falls back to the default slicing", () => {
    expect(loadoutOf(drake, drakeSpecies)).toEqual(
      defaultLoadout(drake, drakeSpecies),
    )
  })
})
