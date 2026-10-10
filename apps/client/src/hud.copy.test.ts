import { describe, expect, test } from "bun:test"
import { createCreature, type Creature } from "@apex/sim"
import { unlockCallout } from "./hud"

describe("unlockCallout", () => {
  const drake = createCreature("fire_drake", 42) as Creature
  const ox = createCreature("plant_ox", 42) as Creature

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
