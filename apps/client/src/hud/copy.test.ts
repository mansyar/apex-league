import { describe, expect, test } from "bun:test"
import {
  type Creature,
  type CreatureConditions,
  chooseStarter,
  createCreature,
  createInitialState,
  EXHAUSTED_ENERGY,
  type GameState,
} from "@apex/sim"
import {
  coachVoice,
  corruptSaveNotice,
  evolveCallout,
  familyName,
  flavorCallout,
  graduationCallout,
  graduationHint,
  growthHint,
  previewNote,
  romanNumeral,
  saveFailureNotice,
  selectHint,
  spendFlashIndex,
  stageLabel,
  statLabel,
  trainingStatus,
  unlockCallout,
} from "./copy"

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
    {
      days: 6,
      expected: "New moves available: Blaze Bolt, Flare Dart, Pyre Lance.",
    },
    {
      days: 3,
      expected: "",
      creature: { ...drake, stage: "juvenile" },
    },
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

  test("golden: exact send-off line", () => {
    expect(graduationCallout("Ember Drake", "Bramble Ox", 1)).toBe(
      "Ember Drake graduated to the Hall of Fame — generation 1 begins with Bramble Ox.",
    )
  })
})

describe("statLabel", () => {
  test("golden: display labels for the four trainable stats", () => {
    expect(statLabel("hp")).toBe("HP")
    expect(statLabel("atk")).toBe("ATK")
    expect(statLabel("def")).toBe("DEF")
    expect(statLabel("spd")).toBe("SPD")
  })

  test("golden: unknown keys pass through unchanged", () => {
    expect(statLabel("foo" as never)).toBe("foo")
  })
})

describe("previewNote", () => {
  test("golden: exact per-preview notes", () => {
    expect(previewNote("gained")).toBe("+1 tonight")
    expect(previewNote("sick")).toBe("no gain — unwell")
    expect(previewNote("hungry")).toBe("no gain — hungry")
  })
})

describe("coachVoice", () => {
  const healthy: CreatureConditions = {
    health: 100,
    energy: EXHAUSTED_ENERGY + 1,
    mood: 100,
    hunger: 100,
    bond: 100,
  }

  test("golden: unwell leads (highest precedence)", () => {
    expect(coachVoice({ ...healthy, health: 79 }, "Ember Drake")).toBe(
      "Ember Drake seems unwell — medicine would help.",
    )
  })

  test("golden: exhausted energy before mood and hunger", () => {
    expect(
      coachVoice({ ...healthy, energy: EXHAUSTED_ENERGY }, "Ember Drake"),
    ).toBe("Ember Drake seems sluggish today…")
  })

  test("golden: low mood before hunger", () => {
    expect(coachVoice({ ...healthy, mood: 29 }, "Ember Drake")).toBe(
      "Ember Drake seems a little down today.",
    )
  })

  test("golden: hunger line", () => {
    expect(coachVoice({ ...healthy, hunger: 20 }, "Ember Drake")).toBe(
      "Ember Drake looks hungry.",
    )
  })

  test("golden: a healthy partner says nothing", () => {
    expect(coachVoice(healthy, "Ember Drake")).toBe("")
  })
})

describe("trainingStatus", () => {
  const drake = createCreature("fire_drake", 42)

  test("golden: focus preview names the stat while conditions hold", () => {
    expect(trainingStatus({ ...drake, trainingFocus: "hp" }, null)).toBe(
      "A full night's rest will sharpen HP.",
    )
  })

  test("golden: focus preview warns when tonight would be a sick night", () => {
    const sick = {
      ...drake,
      trainingFocus: "hp" as const,
      conditions: { ...drake.conditions, health: 79 },
    }
    expect(trainingStatus(sick, null)).toBe(
      "Too unwell to gain from training — medicine would help.",
    )
  })

  test("golden: focus preview warns when tonight would be a hungry night", () => {
    const hungry = {
      ...drake,
      trainingFocus: "hp" as const,
      conditions: { ...drake.conditions, hunger: 15 },
    }
    expect(trainingStatus(hungry, null)).toBe(
      "Too hungry to gain from tonight's training.",
    )
  })

  test("golden: morning result with the remembered focus names the stat", () => {
    const creature = { ...drake, trainingResult: "gained" as const }
    expect(trainingStatus(creature, "atk")).toBe(
      "Last night's rest sharpened ATK.",
    )
  })

  test("golden: morning result without a remembered focus stays generic", () => {
    const creature = { ...drake, trainingResult: "gained" as const }
    expect(trainingStatus(creature, null)).toBe(
      "A night of rest paid off in training.",
    )
  })

  test("golden: morning result when the creature was too unwell", () => {
    const creature = { ...drake, trainingResult: "sick" as const }
    expect(trainingStatus(creature, "hp")).toBe(
      "Ember Drake was too unwell to gain from training.",
    )
  })

  test("golden: morning result when the creature was too hungry", () => {
    const creature = { ...drake, trainingResult: "hungry" as const }
    expect(trainingStatus(creature, "hp")).toBe(
      "Ember Drake was too hungry to gain from training.",
    )
  })

  test("golden: nothing to say with no focus and no result", () => {
    expect(trainingStatus(drake, null)).toBe("")
  })
})

describe("golden exact callout strings", () => {
  const drake = createCreature("fire_drake", 42)

  test("growthHint: exact baby fill-out line", () => {
    expect(growthHint(5, drake)).toBe(
      "Ember Drake is filling out — keep the routine steady and one morning soon it will surprise you.",
    )
  })

  test("growthHint: exact champion tease before the gate age", () => {
    const juvenile = { ...drake, stage: "juvenile" as const }
    expect(growthHint(20, juvenile)).toBe(
      "Ember Drake is growing into something grand — keep the bond strong and win another cup together.",
    )
  })

  test("growthHint: exact champion tease past the gate age", () => {
    const juvenile = { ...drake, stage: "juvenile" as const }
    expect(growthHint(25, juvenile)).toBe(
      "Ember Drake is ready to become a champion — keep the bond strong and win another cup.",
    )
  })

  test("graduationHint: exact send-off teaser", () => {
    const champion = { ...drake, stage: "champion" as const }
    expect(graduationHint(55, champion)).toBe(
      "Ember Drake has had a full career — graduating passes a stat floor to the next egg.",
    )
  })

  test("evolveCallout: exact juvenile line", () => {
    expect(evolveCallout({ ...drake, stage: "juvenile" as const })).toBe(
      "Evolution! Ember Drake grew into a Juvenile — +3 HP · +2 ATK · +2 DEF · +1 SPD. The ranch just got livelier.",
    )
  })

  test("evolveCallout: exact champion line", () => {
    expect(evolveCallout({ ...drake, stage: "champion" as const })).toBe(
      "Evolution! Ember Drake grew into a Champion — +6 HP · +4 ATK · +4 DEF · +2 SPD. The ranch just got livelier.",
    )
  })

  test("saveFailureNotice: exact line", () => {
    expect(saveFailureNotice()).toBe(
      "Heads up — that progress didn't save. Your partner's day carries on anyway.",
    )
  })

  test("corruptSaveNotice: exact line", () => {
    expect(corruptSaveNotice()).toBe(
      "That old save couldn't be read — starting fresh. Sorry about that.",
    )
  })
})

describe("selectHint — the four-tier ladder (gold_legend_ladder_20261017)", () => {
  const started = chooseStarter(createInitialState(), "fire_drake", 42)
  // Day 2 keeps the day-1 and day-5 onboarding hints quiet so the tier
  // teasers are the first unseen match.
  const at = (overrides: Partial<GameState>): GameState => ({
    ...started,
    day: 2,
    ...overrides,
  })

  test("a banked Silver I topside teases the Gold division", () => {
    const hint = selectHint(
      at({ ladder: { points: 25, tier: "silver", subTier: "I" } }),
      new Set(),
    )
    expect(hint?.id).toBe("gold-awaits")
    expect(hint?.text).toContain("Gold")
  })

  test("a banked Gold I topside points at the Legend gate", () => {
    const hint = selectHint(
      at({ ladder: { points: 37, tier: "gold", subTier: "I" } }),
      new Set(),
    )
    expect(hint?.id).toBe("legend-awaits")
    expect(hint?.text).toContain("Legend")
  })

  test("the Silver teaser still fires — it is real progression now", () => {
    const hint = selectHint(
      at({ ladder: { points: 13, tier: "bronze", subTier: "I" } }),
      new Set(),
    )
    expect(hint?.id).toBe("silver-awaits")
  })

  test("the new gatekeepers announce their scalps once each", () => {
    for (const boss of ["delmar", "fenn", "thessa"]) {
      const hint = selectHint(at({ bossDefeats: [boss] }), new Set())
      expect(hint?.id).toBe(`boss-${boss}`)
    }
  })

  test("Marlow's callout no longer promises a horizon — Gold is real", () => {
    const hint = selectHint(at({ bossDefeats: ["marlow"] }), new Set())
    expect(hint?.id).toBe("boss-marlow")
    expect(hint?.text).not.toContain("horizon")
  })
})
