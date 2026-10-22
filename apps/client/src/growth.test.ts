/**
 * Growth view-model contract (evolution discovery, Phase 2). Pins the row set
 * per gate, the per-gate discovery split, the digit-free undiscovered copy and
 * every met predicate at its boundary — against the same `@apex/sim`
 * constants `evaluateEvolution` reads, so the section can never disagree with
 * the verdict that blocks the gate.
 */
import { describe, expect, test } from "bun:test"
import {
  CHAMPION_BOND,
  CHAMPION_CUPS,
  CHAMPION_EVOLUTION_DAY,
  type Creature,
  createCreature,
  createInitialState,
  EVOLUTION_DAY,
  EVOLUTION_MOOD,
  type EvolutionReason,
  evaluateEvolution,
  type GameState,
} from "@apex/sim"
import {
  type GrowthRow,
  type GrowthRowId,
  type GrowthView,
  growthView,
} from "./growth"

const DIGIT = /[0-9]/

interface StateOptions {
  day?: number
  mood?: number
  bond?: number
  sickCooldown?: number
  cupsWon?: number
  juvenileKnown?: boolean
  championKnown?: boolean
}

function stateWith(
  stage: Creature["stage"],
  options: StateOptions = {},
): GameState {
  const base = createInitialState()
  const created = createCreature("fire_drake", 42)
  const day = options.day ?? 1
  const creature: Creature = {
    ...created,
    stage,
    // The pet's own age (save v23): this fixture is a day-1 starter, whose
    // age tracks the world day.
    ageDays: day,
    sickCooldown: options.sickCooldown ?? 0,
    conditions: {
      ...created.conditions,
      mood: options.mood ?? created.conditions.mood,
      bond: options.bond ?? created.conditions.bond,
    },
  }
  return {
    ...base,
    day,
    cupsWon: options.cupsWon ?? 0,
    creature,
    evolutionKnowledge: {
      juvenile: options.juvenileKnown ?? false,
      champion: options.championKnown ?? false,
    },
  }
}

function viewOf(state: GameState): GrowthView {
  const view = growthView(state)
  if (!view) throw new Error("expected a growth view")
  return view
}

function rowOf(state: GameState, id: GrowthRowId): GrowthRow {
  const row = viewOf(state).rows.find((entry) => entry.id === id)
  if (!row) throw new Error(`expected a ${id} row`)
  return row
}

function unmet(state: GameState): GrowthRowId[] {
  return viewOf(state)
    .rows.filter((row) => !row.met)
    .map((row) => row.id)
}

function sentences(text: string): number {
  return text.split(/[.!?]/).filter((part) => part.trim().length > 0).length
}

describe("rows by gate", () => {
  test("a baby is explained through the juvenile gate, in order", () => {
    const view = viewOf(stateWith("baby"))
    expect(view.gate).toBe("juvenile")
    expect(view.rows.map((row) => row.id)).toEqual(["age", "recovery", "mood"])
    expect(view.rows.map((row) => row.label)).toEqual([
      "Age",
      "Clean nights",
      "Mood",
    ])
    expect(view.title).toBe("Growing up")
  })

  test("a juvenile faces all five champion conditions", () => {
    const view = viewOf(stateWith("juvenile"))
    expect(view.gate).toBe("champion")
    expect(view.rows.map((row) => row.id)).toEqual([
      "age",
      "recovery",
      "mood",
      "bond",
      "cups",
    ])
    expect(view.rows.map((row) => row.label)).toEqual([
      "Age",
      "Clean nights",
      "Mood",
      "Bond",
      "Cups won",
    ])
  })
})

describe("undiscovered copy is qualitative", () => {
  test("the juvenile gate carries no digits and no targets", () => {
    const view = viewOf(
      stateWith("baby", { day: EVOLUTION_DAY - 3, mood: 20, sickCooldown: 2 }),
    )
    expect(view.discovered).toBe(false)
    for (const text of [view.title, view.note ?? "", view.summary]) {
      expect(text).not.toMatch(DIGIT)
    }
    for (const row of view.rows) {
      expect(row.detail).not.toMatch(DIGIT)
      expect(row.detail).not.toContain("/")
    }
    expect(rowOf(stateWith("baby"), "age").detail).toBe("still a few days off")
    expect(
      rowOf(stateWith("baby", { sickCooldown: 2 }), "recovery").detail,
    ).toBe("recovering from a rough night")
    expect(rowOf(stateWith("baby", { mood: 20 }), "mood").detail).toBe(
      "needs a lift",
    )
  })

  test("the champion gate stays qualitative too", () => {
    const view = viewOf(stateWith("juvenile", { mood: 30, bond: 20 }))
    expect(view.discovered).toBe(false)
    for (const row of view.rows) {
      expect(row.detail).not.toMatch(DIGIT)
      expect(row.detail).not.toContain("/")
    }
    for (const text of [view.title, view.note ?? "", view.summary]) {
      expect(text).not.toMatch(DIGIT)
    }
    expect(view.rows.map((row) => row.label)).not.toContain("10")
  })

  test("every row and note stays within two sentences", () => {
    for (const state of [
      stateWith("baby", { mood: 20 }),
      stateWith("baby", { juvenileKnown: true }),
      stateWith("juvenile", { juvenileKnown: true }),
      stateWith("juvenile", { championKnown: true }),
      stateWith("champion", { championKnown: true }),
    ]) {
      const view = viewOf(state)
      for (const text of [view.note ?? "", ...view.rows.map((r) => r.detail)]) {
        expect(sentences(text)).toBeLessThanOrEqual(2)
      }
    }
  })
})

describe("a discovered gate reveals current over target", () => {
  test("the juvenile gate shows day and mood against their constants", () => {
    const state = stateWith("baby", {
      day: EVOLUTION_DAY + 2,
      mood: 35,
      juvenileKnown: true,
    })
    const view = viewOf(state)
    expect(view.discovered).toBe(true)
    expect(rowOf(state, "age").detail).toBe(`${EVOLUTION_DAY + 2} / 10`)
    expect(rowOf(state, "mood").detail).toBe(`35 / ${EVOLUTION_MOOD}`)
    expect(rowOf(state, "recovery").detail).toBe("clear")
    expect(view.summary).toBe("Growth, 2 of 3 met")
  })

  test("the champion gate shows bond and cups against their constants", () => {
    const state = stateWith("juvenile", {
      day: CHAMPION_EVOLUTION_DAY + 1,
      mood: 80,
      bond: 52,
      cupsWon: 0,
      championKnown: true,
    })
    expect(rowOf(state, "age").detail).toBe(
      `${CHAMPION_EVOLUTION_DAY + 1} / ${CHAMPION_EVOLUTION_DAY}`,
    )
    expect(rowOf(state, "bond").detail).toBe(`52 / ${CHAMPION_BOND}`)
    expect(rowOf(state, "cups").detail).toBe(`0 / ${CHAMPION_CUPS}`)
    expect(viewOf(state).summary).toBe("Growth, 3 of 5 met")
  })

  test("recovery reveals a clean-night countdown, then clear", () => {
    expect(
      rowOf(
        stateWith("baby", { sickCooldown: 2, juvenileKnown: true }),
        "recovery",
      ).detail,
    ).toBe("2 clean nights to go")
    expect(
      rowOf(
        stateWith("baby", { sickCooldown: 1, juvenileKnown: true }),
        "recovery",
      ).detail,
    ).toBe("1 clean night to go")
    expect(
      rowOf(
        stateWith("baby", { sickCooldown: 0, juvenileKnown: true }),
        "recovery",
      ).detail,
    ).toBe("clear")
  })
})

describe("discovery is per gate", () => {
  test("juvenile knowledge never exposes champion numbers", () => {
    const state = stateWith("baby", { juvenileKnown: true, day: 12, mood: 50 })
    expect(viewOf(state).rows.map((row) => row.id)).toEqual([
      "age",
      "recovery",
      "mood",
    ])
    expect(rowOf(state, "age").detail).toBe(`12 / ${EVOLUTION_DAY}`)
    expect(rowOf(state, "age").detail).not.toBe(
      `12 / ${CHAMPION_EVOLUTION_DAY}`,
    )
    expect(viewOf(state).rows.map((row) => row.label)).not.toContain("Bond")
    expect(viewOf(state).rows.map((row) => row.label)).not.toContain("Cups won")
  })

  test("champion knowledge never reveals a baby's gate", () => {
    const view = viewOf(stateWith("baby", { championKnown: true }))
    expect(view.discovered).toBe(false)
    expect(view.rows.every((row) => !row.detail.includes("/"))).toBe(true)
    expect(view.rows.every((row) => !DIGIT.test(row.detail))).toBe(true)
    expect(view.summary).not.toMatch(DIGIT)
  })

  test("the champion flag reveals the juvenile gate's own champion targets", () => {
    const state = stateWith("juvenile", {
      day: CHAMPION_EVOLUTION_DAY,
      mood: 80,
      bond: 70,
      cupsWon: 2,
      championKnown: true,
    })
    expect(viewOf(state).discovered).toBe(true)
    expect(rowOf(state, "age").detail).toBe(
      `${CHAMPION_EVOLUTION_DAY} / ${CHAMPION_EVOLUTION_DAY}`,
    )
    expect(rowOf(state, "bond").detail).toBe(`70 / ${CHAMPION_BOND}`)
    expect(rowOf(state, "cups").detail).toBe(`2 / ${CHAMPION_CUPS}`)
  })
})

describe("a champion reads as the final stage", () => {
  test("no condition rows, a final note, no thresholds", () => {
    for (const championKnown of [true, false]) {
      const view = viewOf(stateWith("champion", { championKnown }))
      expect(view.gate).toBe("final")
      expect(view.rows).toEqual([])
      expect(view.title).toBe("Final stage")
      expect(view.note ?? "").toContain("champion")
      expect(view.note ?? "").not.toMatch(DIGIT)
      expect(view.summary).toBe("Growth, final stage")
    }
  })
})

describe("boundaries mirror evaluateEvolution", () => {
  test("age at the juvenile gate", () => {
    expect(
      rowOf(stateWith("baby", { day: EVOLUTION_DAY - 1, mood: 80 }), "age").met,
    ).toBe(false)
    expect(
      rowOf(stateWith("baby", { day: EVOLUTION_DAY, mood: 80 }), "age").met,
    ).toBe(true)
  })

  test("age at the champion gate", () => {
    const justShort = stateWith("juvenile", {
      day: CHAMPION_EVOLUTION_DAY - 1,
      mood: 80,
      bond: 80,
      cupsWon: 1,
    })
    const exact = stateWith("juvenile", {
      day: CHAMPION_EVOLUTION_DAY,
      mood: 80,
      bond: 80,
      cupsWon: 1,
    })
    expect(rowOf(justShort, "age").met).toBe(false)
    expect(rowOf(exact, "age").met).toBe(true)
  })

  test("recovery at a clean night", () => {
    expect(rowOf(stateWith("baby", { sickCooldown: 1 }), "recovery").met).toBe(
      false,
    )
    expect(rowOf(stateWith("baby", { sickCooldown: 0 }), "recovery").met).toBe(
      true,
    )
  })

  test("mood at EVOLUTION_MOOD", () => {
    expect(
      rowOf(stateWith("baby", { mood: EVOLUTION_MOOD - 1 }), "mood").met,
    ).toBe(false)
    expect(rowOf(stateWith("baby", { mood: EVOLUTION_MOOD }), "mood").met).toBe(
      true,
    )
  })

  test("bond at CHAMPION_BOND", () => {
    const base = { day: CHAMPION_EVOLUTION_DAY, mood: 80, cupsWon: 1 }
    expect(
      rowOf(stateWith("juvenile", { ...base, bond: CHAMPION_BOND - 1 }), "bond")
        .met,
    ).toBe(false)
    expect(
      rowOf(stateWith("juvenile", { ...base, bond: CHAMPION_BOND }), "bond")
        .met,
    ).toBe(true)
  })

  test("cups at CHAMPION_CUPS", () => {
    const base = { day: CHAMPION_EVOLUTION_DAY, mood: 80, bond: 80 }
    expect(
      rowOf(
        stateWith("juvenile", { ...base, cupsWon: CHAMPION_CUPS - 1 }),
        "cups",
      ).met,
    ).toBe(false)
    expect(
      rowOf(stateWith("juvenile", { ...base, cupsWon: CHAMPION_CUPS }), "cups")
        .met,
    ).toBe(true)
  })

  test("a rough night leaves recovery as the only unmet row", () => {
    const state = stateWith("juvenile", {
      day: CHAMPION_EVOLUTION_DAY,
      mood: 80,
      bond: 80,
      cupsWon: 1,
      sickCooldown: 2,
      championKnown: true,
    })
    expect(unmet(state)).toEqual(["recovery"])
    expect(rowOf(state, "recovery").detail).toBe("2 clean nights to go")
    expect(viewOf(state).summary).toBe("Growth, 4 of 5 met")
  })
})

describe("the rows explain every EvolutionReason", () => {
  const cases: Array<{
    reason: EvolutionReason
    stage: Creature["stage"]
    options: StateOptions
    blocked: GrowthRowId[]
  }> = [
    {
      reason: "too_young",
      stage: "baby",
      options: { day: EVOLUTION_DAY - 1, mood: 80 },
      blocked: ["age"],
    },
    {
      reason: "recently_sick",
      stage: "baby",
      options: { day: EVOLUTION_DAY, mood: 80, sickCooldown: 1 },
      blocked: ["recovery"],
    },
    {
      reason: "low_mood",
      stage: "baby",
      options: { day: EVOLUTION_DAY, mood: EVOLUTION_MOOD - 1 },
      blocked: ["mood"],
    },
    {
      reason: "too_young",
      stage: "juvenile",
      options: {
        day: CHAMPION_EVOLUTION_DAY - 1,
        mood: 80,
        bond: 80,
        cupsWon: 1,
      },
      blocked: ["age"],
    },
    {
      reason: "recently_sick",
      stage: "juvenile",
      options: {
        day: CHAMPION_EVOLUTION_DAY,
        mood: 80,
        bond: 80,
        cupsWon: 1,
        sickCooldown: 1,
      },
      blocked: ["recovery"],
    },
    {
      reason: "low_mood",
      stage: "juvenile",
      options: {
        day: CHAMPION_EVOLUTION_DAY,
        mood: EVOLUTION_MOOD - 1,
        bond: 80,
        cupsWon: 1,
      },
      blocked: ["mood"],
    },
    {
      reason: "low_bond",
      stage: "juvenile",
      options: {
        day: CHAMPION_EVOLUTION_DAY,
        mood: 80,
        bond: CHAMPION_BOND - 1,
        cupsWon: 1,
      },
      blocked: ["bond"],
    },
    {
      reason: "no_cup_win",
      stage: "juvenile",
      options: {
        day: CHAMPION_EVOLUTION_DAY,
        mood: 80,
        bond: 80,
        cupsWon: CHAMPION_CUPS - 1,
      },
      blocked: ["cups"],
    },
    {
      reason: "ready",
      stage: "baby",
      options: { day: EVOLUTION_DAY, mood: 80 },
      blocked: [],
    },
    {
      reason: "ready",
      stage: "juvenile",
      options: { day: CHAMPION_EVOLUTION_DAY, mood: 80, bond: 80, cupsWon: 1 },
      blocked: [],
    },
  ]

  for (const entry of cases) {
    test(`${entry.stage} ${entry.reason} shows ${entry.blocked.join(", ") || "no blocker"}`, () => {
      const state = stateWith(entry.stage, entry.options)
      const creature = state.creature
      if (!creature) throw new Error("expected a creature")
      expect(evaluateEvolution(creature, state.cupsWon).reason).toBe(
        entry.reason,
      )
      expect(unmet(state)).toEqual(entry.blocked)
    })
  }
})

describe("the view-model is safe and status-only", () => {
  test("no creature means no section", () => {
    expect(growthView(createInitialState())).toBeNull()
  })

  test("the summary states the count without colour", () => {
    expect(
      viewOf(stateWith("baby", { day: 1, mood: 0, juvenileKnown: true }))
        .summary,
    ).toBe("Growth, 1 of 3 met")
    expect(
      viewOf(stateWith("juvenile", { mood: 80, bond: 80, cupsWon: 1 })).summary,
    ).toBe("Growth, four of five met")
  })

  test("met is a plain boolean on every row", () => {
    const view = viewOf(
      stateWith("juvenile", {
        day: CHAMPION_EVOLUTION_DAY,
        mood: 80,
        bond: 20,
        cupsWon: 1,
        championKnown: true,
      }),
    )
    expect(view.rows.map((row) => [row.id, row.met])).toEqual([
      ["age", true],
      ["recovery", true],
      ["mood", true],
      ["bond", false],
      ["cups", true],
    ])
  })
})
