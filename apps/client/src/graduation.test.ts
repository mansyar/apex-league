import { describe, expect, test } from "bun:test"
import {
  createInitialState,
  type GameState,
  type RetiredRecord,
} from "@apex/sim"
import {
  confirmCopy,
  confirmLabel,
  floorSummary,
  hallEntryLabel,
  lineageSummary,
  perkLabels,
} from "./graduation"

function stateWith(generation: number, cupsWon: number): GameState {
  const s = createInitialState()
  return { ...s, cupsWon, lineage: { ...s.lineage, generation } }
}

describe("confirmCopy / confirmLabel", () => {
  test("speaks in warm coach voice and names the retiree", () => {
    const line = confirmCopy("Ember Drake")
    expect(line).toContain("Ember Drake")
    expect(line).toContain("Hall of Fame")
    expect(line).toContain("stat floor")
    // ≤ 2 sentences.
    expect(
      line.split(".").filter((p) => p.trim().length > 0).length,
    ).toBeLessThanOrEqual(2)
  })

  test("the button label names the retiree", () => {
    expect(confirmLabel("Ember Drake")).toBe("Graduate Ember Drake")
  })
})

describe("floorSummary", () => {
  test("formats the four stats", () => {
    expect(floorSummary({ hp: 44, atk: 8, def: 10, spd: 6 })).toBe(
      "HP 44 · ATK 8 · DEF 10 · SPD 6",
    )
  })
})

describe("lineageSummary", () => {
  test("reports generation, prestige and cups", () => {
    expect(lineageSummary(stateWith(2, 3))).toBe(
      "Generation 2 · Prestige 5 · 3 cups",
    )
  })

  test("pluralizes a lone cup correctly", () => {
    expect(lineageSummary(stateWith(0, 1))).toBe(
      "Generation 0 · Prestige 1 · 1 cup",
    )
  })
})

describe("perkLabels", () => {
  test("no perks below the warm-bloodline milestone", () => {
    expect(perkLabels(stateWith(0, 1))).toEqual([])
  })

  test("warm bloodline at prestige 3", () => {
    const labels = perkLabels(stateWith(0, 3))
    expect(labels).toHaveLength(1)
    expect(labels[0]).toContain("Warm bloodline")
  })

  test("both perks at prestige 5", () => {
    const labels = perkLabels(stateWith(0, 5))
    expect(labels).toHaveLength(2)
    expect(labels.join(" ")).toContain("Established line")
  })
})

describe("hallEntryLabel", () => {
  test("names the creature, stage, generation and day", () => {
    const record: RetiredRecord = {
      name: "Ember Drake",
      speciesId: "fire_drake",
      archetypeId: "draconic",
      element: "fire",
      stats: { hp: 45, atk: 12, def: 10, spd: 12 },
      trained: { hp: 0, atk: 0, def: 0, spd: 0 },
      cupsWon: 2,
      generation: 0,
      retiredOnDay: 60,
      traits: [],
      parents: [],
    }
    expect(hallEntryLabel(record)).toBe(
      "Ember Drake · Champion · gen 0 · day 60",
    )
  })
})
