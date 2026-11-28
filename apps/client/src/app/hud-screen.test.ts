/**
 * The debrief announce wrapper (postcup_morning_after FR-6, review F4):
 * the HUD's update is wrapped so the ritual day's coach debrief leads
 * the ticker exactly once — the chain (routine update → debrief gate →
 * announceMorningAfter) has no other caller, so this file pins it with
 * a fake Hud double.
 */
import { describe, expect, test } from "bun:test"
import {
  assignTraining,
  chooseStarter,
  createInitialState,
  type GameState,
} from "@apex/sim"
import type { Hud } from "../hud"
import type { MorningAfterDerivation } from "../morning-after/derive"
import {
  advanceSummaryLine,
  withAdvanceSummary,
  withMorningAfterDebrief,
} from "./hud-screen"

const derivation = (): MorningAfterDerivation => ({
  class: "gatekeep",
  amplifiers: [],
  bossId: null,
})

/** A minimal Hud double: the wrapper only drives update and the debrief
 * announce — everything else is spread through untouched. */
const hudDouble = (lines: string[]): Hud =>
  ({
    update: () => {},
    announceMorningAfter: (line: string) => {
      lines.push(line)
    },
  }) as unknown as Hud

/** The only state the wrapper reads: the sim day and the creature. */
const ritualState = (day: number): GameState =>
  ({ day, creature: { name: "Pip" } }) as unknown as GameState

describe("the hud's morning-after debrief wrapper (FR-6)", () => {
  test("says exactly once per ritual day, and never after the settle", () => {
    const lines: string[] = []
    let pending: MorningAfterDerivation | null = derivation()
    const hud = withMorningAfterDebrief(hudDouble(lines), () => pending)
    hud.update(ritualState(7))
    hud.update(ritualState(7)) // the same day again — the latch holds
    expect(lines).toHaveLength(1)
    // The settle: the bank is consumed, so no day ever says again.
    pending = null
    hud.update(ritualState(7))
    hud.update(ritualState(8))
    expect(lines).toHaveLength(1)
  })
})

/** A ranch with a partner so growth facts are real, not invented. */
const ranchState = (): GameState => {
  const starter = chooseStarter(createInitialState(), "fire_drake", 42)
  const assigned = assignTraining(starter, "power")
  if (!assigned.ok) throw new Error("test setup: training assignment failed")
  const creature = assigned.state.creature
  if (!creature) throw new Error("test setup: no partner")
  return {
    ...assigned.state,
    actionPoints: 3,
    creature: { ...creature, fedToday: false },
  }
}

describe("the eve-of-advance summary (FR-3, AC-3)", () => {
  test("lists assigned training, unspent AP and the dawn reset", () => {
    const line = advanceSummaryLine(ranchState())
    expect(line).toContain("Power Lifting assigned for tonight")
    expect(line).toContain("3 AP unspent — resets at dawn")
    expect(line).toContain("Ration not served tonight")
    expect(line).toMatch(/Growth \d+ of \d+ conditions met/)
  })

  test("reports ration readiness and unassigned training without invention", () => {
    const state = ranchState()
    const creature = state.creature
    if (!creature) throw new Error("test setup: no partner")
    const fed = {
      ...state,
      actionPoints: 0,
      creature: { ...creature, fedToday: true, trainingProgram: null },
    }
    const line = advanceSummaryLine(fed)
    expect(line).toContain("No training assigned for tonight")
    expect(line).toContain("0 AP unspent — resets at dawn")
    expect(line).toContain("Ration served tonight — resets at dawn")
    expect(line).not.toContain("will evolve")
  })

  test("before a partner exists it still states the real reset", () => {
    const line = advanceSummaryLine(createInitialState())
    expect(line).toContain("No training assigned for tonight")
    expect(line).toContain("AP unspent — resets at dawn")
    expect(line).not.toContain("Growth")
  })

  test("paints after the routine update so the CTA is never disabled", () => {
    const target: { textContent: string } = { textContent: "" }
    const sandbox = globalThis as unknown as { document?: unknown }
    const original = sandbox.document
    sandbox.document = {
      querySelector: (selector: string) =>
        selector === ".advance-summary" ? target : null,
    }
    let routineRan = false
    const hud: Hud = {
      ...hudDouble([]),
      update: () => {
        routineRan = true
      },
    }
    try {
      withAdvanceSummary(hud).update(ranchState())
      expect(routineRan).toBe(true)
      expect(target.textContent).toContain("Power Lifting assigned for tonight")
    } finally {
      if (original === undefined) delete sandbox.document
      else sandbox.document = original
    }
  })

  test("an unchanged summary is not rewritten into the live region", () => {
    const state = ranchState()
    let stored = advanceSummaryLine(state)
    let writes = 0
    const target = {} as { textContent: string }
    Object.defineProperty(target, "textContent", {
      configurable: true,
      get: () => stored,
      set: (next: string) => {
        writes += 1
        stored = next
      },
    })
    const sandbox = globalThis as unknown as { document?: unknown }
    const original = sandbox.document
    sandbox.document = {
      querySelector: (selector: string) =>
        selector === ".advance-summary" ? target : null,
    }
    try {
      const hud = withAdvanceSummary(hudDouble([]))
      hud.update(state)
      expect(writes).toBe(0) // same text: no re-announcement
      hud.update({ ...state, actionPoints: state.actionPoints + 1 })
      expect(writes).toBe(1) // a real change still paints once
    } finally {
      if (original === undefined) delete sandbox.document
      else sandbox.document = original
    }
  })
})
