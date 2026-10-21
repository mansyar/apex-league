import { describe, expect, test } from "bun:test"
import {
  type Creature,
  type CreatureConditions,
  chooseStarter,
  createCreature,
  createInitialState,
  EXHAUSTED_ENERGY,
  FORM_COPY,
  type GameState,
  type RetiredRecord,
  TRAINING_PROGRAMS,
} from "@apex/sim"
import {
  breakthroughLine,
  cappedLine,
  coachVoice,
  corruptSaveNotice,
  dockHeadTraining,
  driftCallout,
  evolveCallout,
  FORM_SICK_NOTE,
  familyName,
  flavorCallout,
  formDeltaLine,
  formRead,
  formReadout,
  gainsLine,
  graduationCallout,
  graduationHint,
  graduationTickerLine,
  growthHint,
  hatchDayStatusLine,
  NO_GAIN_TONIGHT,
  NO_GAIN_TONIGHT_FALLBACK,
  previewNote,
  programTradeoff,
  romanNumeral,
  saveFailureNotice,
  selectHint,
  spendFlashIndex,
  stageLabel,
  statLabel,
  statusLine,
  TRAINING_EMPTY,
  TRAINING_EMPTY_POINTER,
  TRAINING_TAB_HEADINGS,
  tonightLine,
  trainButtonLabel,
  trainingStatus,
  unlockCallout,
} from "./copy"
import {
  branchPath,
  NATURE_LEAN_LINE,
  SIGNATURE_WITH_FORM,
  TRAINED_LEAN_LINE,
} from "./copy-branch"

/**
 * A creature at a given age. The growth gates and their hints read the pet's
 * OWN age (save v23), so the tests set the age on the pet, never a world day.
 */
const atAge = (creature: Creature, ageDays: number): Creature => ({
  ...creature,
  ageDays,
})

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
    expect(growthHint(atAge(baby, 4))).toBe("")
  })

  test("teases growth from the hinted day on, without naming the threshold", () => {
    expect(growthHint(atAge(baby, 5))).toContain(baby.name)
    expect(growthHint(atAge(baby, 5))).toContain("filling out")
    expect(growthHint(atAge(baby, 9))).not.toBe("")
  })

  test("stays quiet on and after the evolution day (the moment speaks)", () => {
    expect(growthHint(atAge(baby, 10))).toBe("")
    expect(growthHint(atAge(baby, 12))).toBe("")
  })

  test("juveniles get no hint before the champion tease window", () => {
    const juvenile = { ...baby, stage: "juvenile" as const }
    expect(growthHint(atAge(juvenile, 7))).toBe("")
    expect(growthHint(atAge(juvenile, 19))).toBe("")
  })

  test("teases the champion growth from the champion hinted day on", () => {
    const juvenile = { ...baby, stage: "juvenile" as const }
    const hint = growthHint(atAge(juvenile, 20))
    expect(hint).toContain(juvenile.name)
    // Direction-only: points at bond and cups without naming thresholds.
    expect(hint).toContain("cup")
    expect(growthHint(atAge(juvenile, 24))).not.toBe("")
  })

  test("past the gate age a still-juvenile creature keeps direction, never a dead end", () => {
    const juvenile = { ...baby, stage: "juvenile" as const }
    const hint = growthHint(atAge(juvenile, 25))
    expect(hint).toContain(juvenile.name)
    // Direction-only: the prestige levers stay the pointers, no thresholds.
    expect(hint).toContain("champion")
    expect(hint).toContain("cup")
    expect(growthHint(atAge(juvenile, 31))).not.toBe("")
  })

  test("champions get no hint — they are finished growing", () => {
    const champion = { ...baby, stage: "champion" as const }
    expect(growthHint(atAge(champion, 30))).toBe("")
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
    expect(graduationHint(atAge(createCreature("fire_drake", 42), 60))).toBe("")
  })

  test("quiet before the hinted day", () => {
    expect(graduationHint(atAge(champion, 54))).toBe("")
  })

  test("teases the send-off from the hinted day on, direction-only", () => {
    const hint = graduationHint(atAge(champion, 55))
    expect(hint).toContain(champion.name)
    expect(hint).toContain("stat floor")
    expect(graduationHint(atAge(champion, 90))).not.toBe("")
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
  const drake = {
    ...createCreature("fire_drake", 42),
    trainingProgram: null,
  }

  test("golden: program preview names the primary stat while conditions hold", () => {
    expect(
      trainingStatus({ ...drake, trainingProgram: "endurance" }, null),
    ).toBe("A full night's rest will sharpen HP.")
  })

  test("golden: program preview warns when tonight would be a sick night", () => {
    const sick = {
      ...drake,
      trainingProgram: "endurance" as const,
      conditions: { ...drake.conditions, health: 79 },
    }
    expect(trainingStatus(sick, null)).toBe(
      "Too unwell to gain from training — medicine would help.",
    )
  })

  test("golden: program preview warns when tonight would be a hungry night", () => {
    const hungry = {
      ...drake,
      trainingProgram: "endurance" as const,
      conditions: { ...drake.conditions, hunger: 15 },
    }
    expect(trainingStatus(hungry, null)).toBe(
      "Too hungry to gain from tonight's training.",
    )
  })

  test("golden: program preview warns when tonight would be an exhausted night", () => {
    const tired = {
      ...drake,
      trainingProgram: "endurance" as const,
      conditions: { ...drake.conditions, energy: 29 },
    }
    expect(trainingStatus(tired, null)).toBe(
      "Too tired to gain from tonight's training.",
    )
  })

  test("golden: morning result names the remembered program's primary", () => {
    const creature = { ...drake, trainingResult: "gained" as const }
    expect(trainingStatus(creature, "sprint")).toBe(
      "Last night's rest sharpened SPD.",
    )
  })

  test("golden: morning result without a remembered program stays generic", () => {
    const creature = { ...drake, trainingResult: "gained" as const }
    expect(trainingStatus(creature, null)).toBe(
      "A night of rest paid off in training.",
    )
  })

  test("golden: morning result when the creature was too unwell", () => {
    const creature = { ...drake, trainingResult: "sick" as const }
    expect(trainingStatus(creature, "endurance")).toBe(
      "Ember Drake was too unwell to gain from training.",
    )
  })

  test("golden: morning result when the creature was too hungry", () => {
    const creature = { ...drake, trainingResult: "hungry" as const }
    expect(trainingStatus(creature, "endurance")).toBe(
      "Ember Drake was too hungry to gain from training.",
    )
  })

  test("golden: morning result when the creature was too tired", () => {
    const creature = { ...drake, trainingResult: "exhausted" as const }
    expect(trainingStatus(creature, "endurance")).toBe(
      "Ember Drake was too tired to gain from training.",
    )
  })

  test("golden: nothing to say with no program and no result", () => {
    expect(trainingStatus(drake, null)).toBe("")
  })
})

describe("golden exact callout strings", () => {
  const drake = createCreature("fire_drake", 42)

  test("growthHint: exact baby fill-out line", () => {
    expect(growthHint(atAge(drake, 5))).toBe(
      "Ember Drake is filling out — keep the routine steady and one morning soon it will surprise you.",
    )
  })

  test("growthHint: exact champion tease before the gate age", () => {
    const juvenile = { ...drake, stage: "juvenile" as const }
    expect(growthHint(atAge(juvenile, 20))).toBe(
      "Ember Drake is growing into something grand — keep the bond strong and win another cup together.",
    )
  })

  test("growthHint: exact champion tease past the gate age", () => {
    const juvenile = { ...drake, stage: "juvenile" as const }
    expect(growthHint(atAge(juvenile, 25))).toBe(
      "Ember Drake is ready to become a champion — keep the bond strong and win another cup.",
    )
  })

  test("graduationHint: exact send-off teaser", () => {
    const champion = { ...drake, stage: "champion" as const }
    expect(graduationHint(atAge(champion, 55))).toBe(
      "Ember Drake has had a full career — graduating passes a stat floor to the next egg.",
    )
  })

  test("evolveCallout: exact juvenile line", () => {
    expect(evolveCallout({ ...drake, stage: "juvenile" as const })).toBe(
      "Evolution! Ember Drake grew into a Juvenile — +3 HP · +2 ATK · +2 DEF · +1 SPD. Legacy — the old line, no signature.",
    )
  })

  test("evolveCallout: exact champion line", () => {
    expect(evolveCallout({ ...drake, stage: "champion" as const })).toBe(
      "Evolution! Ember Drake grew into a Champion — +6 HP · +4 ATK · +4 DEF · +2 SPD. Legacy — the old line, no signature.",
    )
  })

  test("evolveCallout names the earned form in the same breath", () => {
    const line = evolveCallout({
      ...drake,
      stage: "juvenile" as const,
      branch: "cinder_courser",
    })
    expect(line).toContain("Cinder Courser")
    expect(line).toContain("signature included")
    // Two spoken sentences after the "Evolution!" beat: the stat leap, then
    // the form, never a third line.
    expect(line.match(/[.!?]\s/g)?.length).toBe(2)
  })

  test("evolveCallout announces the earned branch's own juvenile leap", () => {
    expect(
      evolveCallout({
        ...drake,
        stage: "juvenile" as const,
        branch: "cinder_courser",
      }),
    ).toBe(
      "Evolution! Ember Drake grew into a Juvenile — +2 HP · +4 ATK · +1 DEF · +2 SPD. Cinder Courser — the courser line, signature included.",
    )
  })

  test("evolveCallout announces the earned branch's own champion leap", () => {
    expect(
      evolveCallout({
        ...drake,
        stage: "champion" as const,
        branch: "cinder_courser",
      }),
    ).toBe(
      "Evolution! Ember Drake grew into a Champion — +5 HP · +7 ATK · +3 DEF · +2 SPD. Cinder Courser — the courser line, signature included.",
    )
  })

  test("evolveCallout keeps the legacy numbers for the old line", () => {
    const line = evolveCallout({
      ...drake,
      stage: "champion" as const,
      branch: "legacy",
    })
    expect(line).toContain("+6 HP · +4 ATK · +4 DEF · +2 SPD")
    expect(line).toContain("Legacy — the old line, no signature.")
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

describe("branchPath — the form reading every surface shares", () => {
  const drake = createCreature("fire_drake", 42)

  test("a baby before the hinted day has nothing to say", () => {
    expect(branchPath(atAge(drake, 4))).toBeNull()
  })

  test("a baby at the hinted day reads its natural lean", () => {
    const read = branchPath(atAge(drake, 5))
    expect(read?.title).toBe("Path lean")
    expect(read?.preview).toBe(true)
    expect(read?.line).toBe(NATURE_LEAN_LINE)
    // A direction, not a threshold or a signature.
    expect(read?.label).not.toMatch(/[0-9]/)
    expect(read?.signature).toBe(SIGNATURE_WITH_FORM)
  })

  test("a trained lean says so and names its form", () => {
    const trained = {
      ...drake,
      trained: { hp: 0, atk: 6, def: 0, spd: 6 },
    }
    const read = branchPath(atAge(trained, 6))
    expect(read?.label).toBe("Cinder Courser")
    expect(read?.line).toBe(TRAINED_LEAN_LINE)
    expect(read?.favored).toBe("ATK + SPD")
  })

  test("an earned form reads its label, favors and signature", () => {
    const juvenile = {
      ...drake,
      stage: "juvenile" as const,
      branch: "pyre_warden",
    }
    const read = branchPath(atAge(juvenile, 20))
    expect(read).toMatchObject({
      title: "Form",
      label: "Pyre Warden",
      favored: "HP + DEF",
      signature: "Pyre Wall",
      preview: false,
    })
    expect(read?.line).toContain("Plant your feet")
  })

  test("the legacy line claims no signature and no favored pair", () => {
    const champion = {
      ...drake,
      stage: "champion" as const,
      branch: "legacy",
    }
    const read = branchPath(atAge(champion, 40))
    expect(read?.label).toBe("Legacy")
    expect(read?.signature).toBe("No signature move")
    expect(read?.favored).toBe("—")
    expect(read?.line).toContain("no signature")
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

describe("training copy (2026-10-20)", () => {
  /** Sentences, counted the plain way the player reads them. */
  const sentenceCount = (line: string): number =>
    line.split(/[.!?]+(?:\s|$)/).filter((part) => part.trim().length > 0).length

  const clientLines = (): Array<[string, string]> => [
    ...(Object.entries(NO_GAIN_TONIGHT) as Array<[string, string]>),
    ["fallback", NO_GAIN_TONIGHT_FALLBACK],
    ["sick note", FORM_SICK_NOTE],
    ["breakthrough", breakthroughLine(2)],
    ["cap note", cappedLine("atk")],
    ["empty", TRAINING_EMPTY],
    ["empty pointer", TRAINING_EMPTY_POINTER],
    ["button pick", trainButtonLabel(null)],
    ["button set", trainButtonLabel("sprint")],
    ["head empty", dockHeadTraining(null)],
    ["head set", dockHeadTraining("ring")],
    ...Object.values(FORM_COPY).map(
      (entry) => [`form ${entry.label}`, entry.line] as [string, string],
    ),
    ...TRAINING_PROGRAMS.map(
      (program) => [`blurb ${program.id}`, program.blurb] as [string, string],
    ),
    ...TRAINING_PROGRAMS.map(
      (program) =>
        [`tradeoff ${program.id}`, programTradeoff(program.id)] as [
          string,
          string,
        ],
    ),
    ...(["sharp", "steady", "flat", "sluggish"] as const).map(
      (tier) => [`form delta ${tier}`, formDeltaLine(tier)] as [string, string],
    ),
    ...Object.keys(TRAINING_TAB_HEADINGS).map(
      (key) =>
        [
          `heading ${key}`,
          TRAINING_TAB_HEADINGS[key as keyof typeof TRAINING_TAB_HEADINGS],
        ] as [string, string],
    ),
  ]

  test("no line runs past two sentences", () => {
    for (const [, line] of clientLines()) {
      expect(sentenceCount(line)).toBeLessThanOrEqual(2)
    }
  })

  test("stat names are written out in full, never abbreviated", () => {
    for (const [, line] of clientLines()) {
      expect(line).not.toMatch(/\b(atk|hp|def|spd)\b/)
    }
  })

  test("the tradeoff names both stats of the program", () => {
    expect(programTradeoff("power")).toBe(
      "ATK +1/night — DEF on breakthrough nights",
    )
    expect(programTradeoff("endurance")).toBe(
      "HP +1/night — DEF on breakthrough nights",
    )
    expect(programTradeoff("sprint")).toBe(
      "SPD +1/night — ATK on breakthrough nights",
    )
  })

  test("the gains line reads as a payout, not a table", () => {
    expect(gainsLine({ atk: 1 })).toBe("+1 ATK")
    expect(gainsLine({ atk: 1, def: 1 })).toBe("+1 ATK, +1 DEF")
    expect(gainsLine({})).toBe("")
  })

  test("tonight's line prefers the reason over an empty payout", () => {
    expect(tonightLine({ result: "sick", gains: {} })).toBe(
      "Sick — no gain tonight",
    )
    expect(tonightLine({ result: "exhausted", gains: {} })).toBe(
      "Too tired to gain tonight",
    )
    expect(tonightLine({ result: "hungry", gains: {} })).toBe(
      "Hungry — no gain tonight",
    )
    expect(tonightLine({ result: null, gains: {} })).toBe("No gain tonight")
    expect(tonightLine({ result: "gained", gains: { spd: 1 } })).toBe("+1 SPD")
  })

  test("tonight's line appends a program's extra payoff", () => {
    expect(
      tonightLine({ result: "gained", gains: { atk: 1 } }, "+5 MOOD"),
    ).toBe("+1 ATK · +5 MOOD")
    // A night that pays nothing never advertises the extras.
    expect(tonightLine({ result: "sick", gains: {} }, "+5 MOOD")).toBe(
      "Sick — no gain tonight",
    )
  })

  test("the train button and the dock head name the program", () => {
    expect(trainButtonLabel(null)).toBe("Choose tonight's training")
    expect(trainButtonLabel("power")).toBe("Training: Power Lifting")
    expect(dockHeadTraining(null)).toBe("No training set")
    expect(dockHeadTraining("endurance")).toBe("Endurance Circuit")
  })

  test("the form delta is spelled out for every tier", () => {
    expect(formDeltaLine("sharp")).toBe("ATK +1")
    expect(formDeltaLine("steady")).toBe("ATK +0")
    expect(formDeltaLine("flat")).toBe("ATK -1")
    expect(formDeltaLine("sluggish")).toBe("ATK -2")
    // Every tier names the stat and carries a sign: a bare "0" reads as a bug.
    for (const tier of ["sharp", "steady", "flat", "sluggish"] as const) {
      expect(formDeltaLine(tier)).toMatch(/^ATK [+-]\d$/)
    }
  })

  test("the breakthrough countdown counts tonight when a program is set", () => {
    expect(breakthroughLine(0)).toBe("Breakthrough in 2 nights")
    expect(breakthroughLine(0, true)).toBe("Breakthrough in 3 nights")
    expect(breakthroughLine(1, true)).toBe("Breakthrough in 2 nights")
    expect(breakthroughLine(2, true)).toBe("Breakthrough in 1 night")
    // A counter already on a multiple of three pays the trickle tonight when a
    // program is set, and only reaches that night after tonight otherwise.
    expect(breakthroughLine(3, true)).toBe("Breakthrough tonight")
    expect(breakthroughLine(3)).toBe("Breakthrough in 2 nights")
  })

  test("form reads as one labelled line, never a bare colour", () => {
    for (const tier of ["sharp", "steady", "flat", "sluggish"] as const) {
      expect(formReadout(tier)).toBe(
        `${FORM_COPY[tier].label} — ${FORM_COPY[tier].line}`,
      )
    }
  })

  test("form read carries the pin note only below the sickness line", () => {
    const healthy = createCreature("fire_drake", 42)
    const read = formRead(healthy)
    expect(read.sickNote).toBeNull()
    expect(read.label).toBe(FORM_COPY.steady.label)
    expect(read.delta).toBe(formDeltaLine("steady"))

    const sick = createCreature("fire_drake", 42)
    sick.conditions = { ...sick.conditions, health: 50 }
    const pinned = formRead(sick)
    expect(pinned.label).toBe(FORM_COPY.sluggish.label)
    expect(pinned.sickNote).toBe(FORM_SICK_NOTE)
  })
})

describe("driftCallout — the drifted-hatch announcement (FR-6)", () => {
  const hallRecord = (retiredOnDay: number): RetiredRecord => ({
    name: "Rolo",
    speciesId: "fire_drake",
    archetypeId: "draconic",
    element: "fire",
    affinity: null,
    stats: { hp: 160, atk: 24, def: 16, spd: 18 },
    trained: { hp: 0, atk: 0, def: 0, spd: 0 },
    cupsWon: 1,
    generation: 0,
    retiredOnDay,
    traits: ["sturdy"],
    parents: [],
    branch: "legacy",
    giftEgg: false,
  })

  test("silent when the creature carries no secondary affinity", () => {
    const creature = createCreature("fire_drake", 42)
    expect(driftCallout(creature, createInitialState().lineage, 10)).toBe("")
  })

  test("names both types on the hatch day itself", () => {
    const drifted: Creature = {
      ...createCreature("fire_drake", 42),
      affinity: "water",
    }
    const lineage: GameState["lineage"] = {
      generation: 1,
      hallOfFame: [hallRecord(60)],
    }
    const line = driftCallout(drifted, lineage, 60)
    expect(line).toContain(drifted.name)
    expect(line).toContain("Water")
    expect(line).toContain("Fire")
  })

  test("silent on any other day", () => {
    const drifted: Creature = {
      ...createCreature("fire_drake", 42),
      affinity: "water",
    }
    const lineage: GameState["lineage"] = {
      generation: 1,
      hallOfFame: [hallRecord(60)],
    }
    expect(driftCallout(drifted, lineage, 61)).toBe("")
  })

  test("founder lineage announces on day 1", () => {
    const drifted: Creature = {
      ...createCreature("fire_drake", 42),
      affinity: "plant",
    }
    const line = driftCallout(drifted, createInitialState().lineage, 1)
    expect(line).toContain("Plant")
    expect(line).toContain("Fire")
  })
})

describe("graduationTickerLine — the graduation moment's ticker line", () => {
  test("a drifted graduation keeps the send-off and appends the drift beat", () => {
    const drifted: Creature = {
      ...createCreature("fire_drake", 42),
      affinity: "water",
    }
    const line = graduationTickerLine(
      "Ember Drake",
      "Bramble Ox",
      1,
      driftCallout(drifted, createInitialState().lineage, 1),
    )
    expect(line).toContain(graduationCallout("Ember Drake", "Bramble Ox", 1))
    expect(line).toContain("hatched with a Water streak")
  })

  test("a non-drifted graduation speaks the send-off only, no drift line", () => {
    expect(graduationTickerLine("Ember Drake", "Bramble Ox", 1, "")).toBe(
      graduationCallout("Ember Drake", "Bramble Ox", 1),
    )
  })
})

describe("hatchDayStatusLine — the hatch-day pass precedence", () => {
  test("the drift statement leads on the hatch day whatever the primary element", () => {
    for (const speciesId of ["water_axolotl", "fire_drake"] as const) {
      const drifted: Creature = {
        ...createCreature(speciesId, 42),
        affinity: "plant",
      }
      const state = createInitialState()
      expect(hatchDayStatusLine(drifted, state, null, null)).toBe(
        driftCallout(drifted, state.lineage, 1),
      )
    }
  })

  test("a water hatch without drift keeps its flavor line", () => {
    const plain = createCreature("water_axolotl", 42)
    expect(hatchDayStatusLine(plain, createInitialState(), null, null)).toBe(
      flavorCallout(plain),
    )
  })

  test("any other day runs the routine precedence untouched", () => {
    const drifted: Creature = {
      ...createCreature("fire_drake", 42),
      affinity: "water",
    }
    const state = { ...createInitialState(), day: 2 }
    expect(hatchDayStatusLine(drifted, state, null, null)).toBe(
      statusLine(drifted, null, null),
    )
  })
})
