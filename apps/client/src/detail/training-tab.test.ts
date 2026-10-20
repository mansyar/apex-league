/**
 * The Training tab's reading (FR-13): the breakthrough arithmetic, the form
 * tier with the ATK delta it applies, and the program table. Pure data, so no
 * DOM is needed here; the panel's mounting is covered by
 * `creature-detail.test.ts` and by the phase's visual evidence.
 */
import { describe, expect, test } from "bun:test"
import {
  type Creature,
  createCreature,
  FORM_COPY,
  type TrainingProgram,
} from "@apex/sim"
import { trainingView } from "./training-tab"

const fresh = createCreature("fire_drake", 42)

function withProgram(
  program: TrainingProgram | null,
  extra: Partial<Creature> = {},
): Creature {
  return { ...fresh, trainingProgram: program, ...extra }
}

function condition(overrides: Partial<Creature["conditions"]>): Creature {
  return { ...fresh, conditions: { ...fresh.conditions, ...overrides } }
}

describe("the breakthough line", () => {
  test("counts the nights to the next third trained night", () => {
    const read = (trainingDays: number): string =>
      trainingView({ ...fresh, trainingDays }).breakthrough
    expect(read(0)).toBe("Breakthrough in 3 nights")
    expect(read(1)).toBe("Breakthrough in 2 nights")
    expect(read(2)).toBe("Breakthrough in 1 night")
    expect(read(3)).toBe("Breakthrough in 3 nights")
    expect(read(4)).toBe("Breakthrough in 2 nights")
    expect(read(5)).toBe("Breakthrough in 1 night")
    expect(read(6)).toBe("Breakthrough in 3 nights")
  })
})

describe("the program section", () => {
  test("names the assigned program with the catalog's own blurb", () => {
    const view = trainingView(withProgram("sprint"))
    expect(view.program).toEqual({
      label: "Sprint Work",
      blurb: "Sprints build SPD, with ATK on breakthrough nights.",
      empty: false,
    })
  })

  test("points back at the dock when nothing is assigned", () => {
    expect(trainingView(fresh).program).toEqual({
      label: "Nothing assigned tonight.",
      blurb: "Pick a program in the ranch dock to start.",
      empty: true,
    })
  })

  test("reports the trained nights", () => {
    expect(trainingView(fresh).nights).toBe(0)
    expect(trainingView({ ...fresh, trainingDays: 7 }).nights).toBe(7)
  })
})

describe("the form section", () => {
  test("a fresh creature is steady and moves nothing", () => {
    expect(trainingView(fresh).form).toEqual({
      label: FORM_COPY.steady.label,
      delta: "ATK +0",
      line: FORM_COPY.steady.line,
      sickNote: null,
    })
  })

  test("sharp carries ATK +1, flat -1 and sluggish -2", () => {
    expect(
      trainingView(condition({ mood: 100, bond: 100 })).form,
    ).toMatchObject({ label: "Sharp", delta: "ATK +1" })
    expect(trainingView(condition({ mood: 30, bond: 20 })).form).toMatchObject({
      label: "Flat",
      delta: "ATK -1",
    })
    expect(trainingView(condition({ mood: 0, bond: 0 })).form).toMatchObject({
      label: "Sluggish",
      delta: "ATK -2",
    })
  })

  test("sickness pins the tier and says so in a sentence", () => {
    const form = trainingView(
      condition({ mood: 100, bond: 100, health: 50 }),
    ).form
    expect(form.label).toBe("Sluggish")
    expect(form.delta).toBe("ATK -2")
    expect(form.sickNote).toBe(
      "Sick, so form is pinned to Sluggish — medicine would help.",
    )
  })

  test("a healthy sluggish keeps its line and stays colour-free", () => {
    const form = trainingView(condition({ mood: 0, bond: 0 })).form
    expect(form.line).toBe(FORM_COPY.sluggish.line)
    expect(form.sickNote).toBeNull()
    expect(form.delta).toBe("ATK -2")
  })
})

describe("the program table", () => {
  test("lists all four in catalog order with spelled-out stats", () => {
    expect(trainingView(fresh).rows).toEqual([
      {
        id: "power",
        label: "Power Lifting",
        primary: "ATK",
        trickle: "DEF",
        tonight: false,
      },
      {
        id: "endurance",
        label: "Endurance Circuit",
        primary: "HP",
        trickle: "DEF",
        tonight: false,
      },
      {
        id: "sprint",
        label: "Sprint Work",
        primary: "SPD",
        trickle: "ATK",
        tonight: false,
      },
      {
        id: "ring",
        label: "Ring Craft",
        primary: "ATK",
        trickle: "DEF",
        tonight: false,
      },
    ])
  })

  test("marks the assigned program as tonight's", () => {
    const rows = trainingView(withProgram("ring")).rows
    expect(rows.map((row) => row.tonight)).toEqual([false, false, false, true])
  })
})
