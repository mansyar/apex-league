/**
 * Legacy & Breeding tests — Task 1: the lineage slice and the prestige model.
 * Table-driven per the workflow (success + failure cases).
 */

import { describe, expect, it } from "bun:test"
import {
  initialLineage,
  lineagePerks,
  lineagePrestige,
  PRESTIGE_ESTABLISHED_LINE,
  PRESTIGE_FOUNDED,
  PRESTIGE_WARM_BLOODLINE,
} from "./legacy"
import { createInitialState } from "./state"

describe("initialLineage", () => {
  it("starts a bloodline at generation 0 with an empty Hall of Fame", () => {
    expect(initialLineage()).toEqual({ generation: 0, hallOfFame: [] })
  })

  it("is part of the fresh GameState", () => {
    expect(createInitialState().lineage).toEqual({
      generation: 0,
      hallOfFame: [],
    })
  })
})

describe("lineagePrestige", () => {
  it("is 0 for a fresh save", () => {
    expect(lineagePrestige(createInitialState())).toBe(0)
  })

  it("sums completed generations and lifetime cup wins", () => {
    const s = createInitialState()
    const withLineage = {
      ...s,
      lineage: { ...s.lineage, generation: 4 },
      cupsWon: 3,
    }
    expect(lineagePrestige(withLineage)).toBe(7)
  })
})

describe("lineagePerks — milestone table", () => {
  it("unlocks nothing below the founded threshold", () => {
    expect(lineagePerks(0)).toEqual({
      founded: false,
      warmBloodline: false,
      establishedLine: false,
    })
  })

  it("unlocks founded at the founded milestone", () => {
    expect(lineagePerks(PRESTIGE_FOUNDED)).toEqual({
      founded: true,
      warmBloodline: false,
      establishedLine: false,
    })
  })

  it("unlocks warm bloodline at its milestone", () => {
    expect(lineagePerks(PRESTIGE_WARM_BLOODLINE)).toEqual({
      founded: true,
      warmBloodline: true,
      establishedLine: false,
    })
  })

  it("unlocks established line at its milestone", () => {
    expect(lineagePerks(PRESTIGE_ESTABLISHED_LINE)).toEqual({
      founded: true,
      warmBloodline: true,
      establishedLine: true,
    })
  })

  it("keeps every lower perk at a high prestige", () => {
    expect(lineagePerks(12)).toEqual({
      founded: true,
      warmBloodline: true,
      establishedLine: true,
    })
  })
})
