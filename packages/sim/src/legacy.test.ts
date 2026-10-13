/**
 * Legacy & Breeding tests — Task 1: the lineage slice and the prestige model.
 * Task 2: the graduation eligibility gate. Table-driven per the workflow
 * (success + failure cases).
 */

import { describe, expect, it } from "bun:test"
import {
  canGraduate,
  GRADUATION_DAY,
  GRADUATION_HINT_DAY,
  initialLineage,
  lineagePerks,
  lineagePrestige,
  PRESTIGE_ESTABLISHED_LINE,
  PRESTIGE_FOUNDED,
  PRESTIGE_WARM_BLOODLINE,
} from "./legacy"
import { chooseStarter, createInitialState, type GameState } from "./state"

type Stage = "baby" | "juvenile" | "champion"

/** A single-creature state at a chosen stage/day/phase. */
function stateWith(stage: Stage, day: number, phase: "day" | "cup" = "day"): GameState {
  const owned = chooseStarter(createInitialState(), "fire_drake", 42)
  const creature = owned.creature
  if (!creature) throw new Error("expected a starter creature")
  return { ...owned, day, phase, creature: { ...creature, stage } }
}

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

describe("canGraduate — eligibility gate", () => {
  it("exposes the pinned day constants", () => {
    expect(GRADUATION_DAY).toBe(60)
    expect(GRADUATION_HINT_DAY).toBe(55)
  })

  it("rejects a save with no creature", () => {
    expect(canGraduate(createInitialState())).toEqual({
      eligible: false,
      reason: "no-creature",
    })
  })

  it("rejects a no-creature save even mid-cup (no-creature precedes cup-phase)", () => {
    const noCreature: GameState = {
      ...createInitialState(),
      phase: "cup",
      day: GRADUATION_DAY,
    }
    expect(canGraduate(noCreature)).toEqual({
      eligible: false,
      reason: "no-creature",
    })
  })

  it("rejects a champion mid-cup with cup-phase", () => {
    expect(canGraduate(stateWith("champion", GRADUATION_DAY, "cup"))).toEqual({
      eligible: false,
      reason: "cup-phase",
    })
  })

  it("rejects a baby during the day phase with not-champion", () => {
    expect(canGraduate(stateWith("baby", GRADUATION_DAY))).toEqual({
      eligible: false,
      reason: "not-champion",
    })
  })

  it("rejects a juvenile during the day phase with not-champion", () => {
    expect(canGraduate(stateWith("juvenile", GRADUATION_DAY))).toEqual({
      eligible: false,
      reason: "not-champion",
    })
  })

  it("prefers not-champion over too-young for an under-age baby", () => {
    expect(canGraduate(stateWith("baby", 5))).toEqual({
      eligible: false,
      reason: "not-champion",
    })
  })

  it("rejects a champion one day under the age floor with too-young", () => {
    expect(canGraduate(stateWith("champion", GRADUATION_DAY - 1))).toEqual({
      eligible: false,
      reason: "too-young",
    })
  })

  it("accepts a champion on the age floor day", () => {
    expect(canGraduate(stateWith("champion", GRADUATION_DAY))).toEqual({
      eligible: true,
      reason: "eligible",
    })
  })

  it("stays eligible forever past the floor (no upper limit)", () => {
    expect(canGraduate(stateWith("champion", 200))).toEqual({
      eligible: true,
      reason: "eligible",
    })
  })
})
