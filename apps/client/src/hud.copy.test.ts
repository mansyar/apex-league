import { describe, expect, test } from "bun:test"
import { type Creature, createCreature } from "@apex/sim"
import { flavorCallout, unlockCallout } from "./hud"

describe("unlockCallout", () => {
  const drake = createCreature("fire_drake", 42)
  const ox = createCreature("plant_ox", 42)

  const cases: Array<{
    days: number
    expected: string
    creature?: Creature
  }> = [
    {
      days: 3,
      expected:
        "New move available: Cinder Shot. Train 3 more days for the next tier.",
    },
    { days: 6, expected: "New move available: Blaze Bolt." },
    { days: 2, expected: "" },
    { days: 4, expected: "" },
    { days: 5, expected: "" },
    { days: 7, expected: "" },
    {
      days: 3,
      expected:
        "New move available: Spore Burst. Train 3 more days for the next tier.",
      creature: ox,
    },
  ]

  for (const { days: trainingDays, expected, creature = drake } of cases) {
    test(`trainingDays ${trainingDays} → "${expected}"`, () => {
      expect(unlockCallout({ ...creature, trainingDays })).toBe(expected)
    })
  }
})

describe("flavorCallout", () => {
  const drake = createCreature("fire_drake", 42)
  const axolotl = createCreature("water_axolotl", 42)

  test("a healthy water partner gets a water-flavored idle line", () => {
    expect(flavorCallout(axolotl)).toBe(
      "Tide Axolotl hums a contented bubble song.",
    )
  })

  test("partners of other elements stay quiet — the line is water-only", () => {
    expect(flavorCallout(drake)).toBe("")
  })
})
