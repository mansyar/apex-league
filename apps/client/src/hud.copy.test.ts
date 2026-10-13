import { describe, expect, test } from "bun:test"
import { type Creature, createCreature } from "@apex/sim"
import {
  evolveCallout,
  familyName,
  flavorCallout,
  graduationCallout,
  graduationHint,
  growthHint,
  romanNumeral,
  saveFailureNotice,
  spendFlashIndex,
  stageLabel,
  unlockCallout,
} from "./hud"

describe("saveFailureNotice", () => {
  test("speaks in coach voice, non-blocking, names the setback", () => {
    const line = saveFailureNotice()
    expect(line.length).toBeGreaterThan(0)
    expect(line.length).toBeLessThanOrEqual(120)
    // Coach voice: encouraging, no blame, no tech jargon.
    expect(line).toMatch(/save/i)
    expect(line).not.toMatch(/quota|exception|error|failed/i)
  })

  test("is stable — the same line every time (pinned copy)", () => {
    expect(saveFailureNotice()).toBe(saveFailureNotice())
  })
})

describe("spendFlashIndex", () => {
  test("returns the pip that just drained when AP goes down", () => {
    expect(spendFlashIndex(3, 2)).toBe(2)
    expect(spendFlashIndex(2, 1)).toBe(1)
    expect(spendFlashIndex(1, 0)).toBe(0)
  })

  test("no flash when AP is unchanged or restored", () => {
    expect(spendFlashIndex(3, 3)).toBe(null)
    expect(spendFlashIndex(0, 3)).toBe(null)
  })
})

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

describe("growthHint", () => {
  const baby = createCreature("fire_drake", 42)

  test("quiet before the hinted day", () => {
    expect(growthHint(4, baby)).toBe("")
  })

  test("teases growth from the hinted day on, without naming the threshold", () => {
    expect(growthHint(5, baby)).toContain(baby.name)
    expect(growthHint(5, baby)).toContain("filling out")
    expect(growthHint(9, baby)).not.toBe("")
  })

  test("stays quiet on and after the evolution day (the moment speaks)", () => {
    expect(growthHint(10, baby)).toBe("")
    expect(growthHint(12, baby)).toBe("")
  })

  test("juveniles get no hint before the champion tease window", () => {
    const juvenile = { ...baby, stage: "juvenile" as const }
    expect(growthHint(7, juvenile)).toBe("")
    expect(growthHint(19, juvenile)).toBe("")
  })

  test("teases the champion growth from the champion hinted day on", () => {
    const juvenile = { ...baby, stage: "juvenile" as const }
    const hint = growthHint(20, juvenile)
    expect(hint).toContain(juvenile.name)
    // Direction-only: points at bond and cups without naming thresholds.
    expect(hint).toContain("cup")
    expect(growthHint(24, juvenile)).not.toBe("")
  })

  test("past the gate age a still-juvenile creature keeps direction, never a dead end", () => {
    const juvenile = { ...baby, stage: "juvenile" as const }
    const hint = growthHint(25, juvenile)
    expect(hint).toContain(juvenile.name)
    // Direction-only: the prestige levers stay the pointers, no thresholds.
    expect(hint).toContain("champion")
    expect(hint).toContain("cup")
    expect(growthHint(31, juvenile)).not.toBe("")
  })

  test("champions get no hint — they are finished growing", () => {
    const champion = { ...baby, stage: "champion" as const }
    expect(growthHint(30, champion)).toBe("")
  })
})

describe("evolveCallout", () => {
  const drake = createCreature("fire_drake", 42)

  test("names the stage and the stat gains", () => {
    const juvenile = { ...drake, stage: "juvenile" as const }
    const line = evolveCallout(juvenile)
    expect(line).toContain(drake.name)
    expect(line).toContain("Juvenile")
    expect(line).toContain("+3 HP")
    expect(line).toContain("+2 ATK")
    expect(line).toContain("+2 DEF")
    expect(line).toContain("+1 SPD")
  })

  test("a champion callout announces the champion boost", () => {
    const champion = { ...drake, stage: "champion" as const }
    const line = evolveCallout(champion)
    expect(line).toContain("Champion")
    expect(line).toContain("+6 HP")
    expect(line).toContain("+4 ATK")
    expect(line).toContain("+4 DEF")
    expect(line).toContain("+2 SPD")
  })
})

describe("stageLabel", () => {
  test("display names per stage", () => {
    expect(stageLabel("baby")).toBe("Baby")
    expect(stageLabel("juvenile")).toBe("Juvenile")
    expect(stageLabel("champion")).toBe("Champion")
  })
})

describe("romanNumeral", () => {
  test("renders the classic numerals", () => {
    expect(romanNumeral(1)).toBe("I")
    expect(romanNumeral(2)).toBe("II")
    expect(romanNumeral(4)).toBe("IV")
    expect(romanNumeral(9)).toBe("IX")
    expect(romanNumeral(14)).toBe("XIV")
    expect(romanNumeral(3999)).toBe("MMMCMXCIX")
  })

  test("falls back to #n out of range (never NaN or a crash)", () => {
    expect(romanNumeral(0)).toBe("#0")
    expect(romanNumeral(-3)).toBe("#-3")
    expect(romanNumeral(4000)).toBe("#4000")
    expect(romanNumeral(1.5)).toBe("#1.5")
  })
})

describe("familyName", () => {
  test("the founder is unnumbered", () => {
    expect(familyName("Ember Drake", 0)).toBe("Ember Drake")
  })

  test("every successor carries its generation numeral (gen 1 → II)", () => {
    expect(familyName("Ember Drake", 1)).toBe("Ember Drake II")
    expect(familyName("Bramble Ox", 2)).toBe("Bramble Ox III")
  })
})

describe("graduationHint", () => {
  const champion = {
    ...createCreature("fire_drake", 42),
    stage: "champion" as const,
  }

  test("quiet for a non-champion", () => {
    expect(graduationHint(60, createCreature("fire_drake", 42))).toBe("")
  })

  test("quiet before the hinted day", () => {
    expect(graduationHint(54, champion)).toBe("")
  })

  test("teases the send-off from the hinted day on, direction-only", () => {
    const hint = graduationHint(55, champion)
    expect(hint).toContain(champion.name)
    expect(hint).toContain("stat floor")
    expect(graduationHint(90, champion)).not.toBe("")
  })
})

describe("graduationCallout", () => {
  test("names the retiree, the new generation, and the successor", () => {
    const line = graduationCallout("Ember Drake", "Bramble Ox", 1)
    expect(line).toContain("Ember Drake")
    expect(line).toContain("Bramble Ox")
    expect(line).toContain("generation 1")
  })
})
