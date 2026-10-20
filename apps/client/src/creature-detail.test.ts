/**
 * Detail-panel Growth rows (evolution discovery, Phase 3). The repo has no
 * DOM harness, so the row reading is extracted as `growthRowParts` and pinned
 * here: met and unmet never share a glyph or a status word, a revealed gate
 * composes label + value/target, and an undiscovered gate leaks no digits.
 * The repaint seam itself lives in `growth-panel.test.ts`.
 */
import { describe, expect, test } from "bun:test"
import {
  type Creature,
  createCreature,
  createInitialState,
  type GameState,
} from "@apex/sim"
import { type GrowthView, growthView } from "./growth"
import { growthRowParts } from "./growth-panel"

const DIGIT = /[0-9]/

interface StateOptions {
  day?: number
  mood?: number
  bond?: number
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
  const creature: Creature = {
    ...created,
    stage,
    conditions: {
      ...created.conditions,
      mood: options.mood ?? created.conditions.mood,
      bond: options.bond ?? created.conditions.bond,
    },
  }
  return {
    ...base,
    day: options.day ?? 1,
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

function partsOf(state: GameState) {
  return viewOf(state).rows.map(growthRowParts)
}

describe("growth row reading", () => {
  test("a revealed champion gate composes the value / target pair", () => {
    const parts = partsOf(
      stateWith("juvenile", {
        day: 6,
        mood: 35,
        bond: 52,
        cupsWon: 0,
        championKnown: true,
      }),
    )
    expect(parts.map((part) => part.label)).toEqual([
      "Day",
      "Clean nights",
      "Mood",
      "Bond",
      "Cups won",
    ])
    expect(parts.find((part) => part.label === "Mood")).toMatchObject({
      detail: "35 / 40",
      glyph: "○",
      status: "Not yet",
    })
    expect(parts.find((part) => part.label === "Day")?.detail).toBe("6 / 25")
    expect(parts.find((part) => part.label === "Bond")?.detail).toBe("52 / 60")
    expect(parts.find((part) => part.label === "Cups won")?.detail).toBe(
      "0 / 1",
    )
    // The juvenile gate reads the same way at its own target.
    const juvenile = partsOf(
      stateWith("baby", { day: 6, mood: 35, juvenileKnown: true }),
    )
    expect(juvenile.find((part) => part.label === "Day")?.detail).toBe("6 / 10")
  })

  test("met and unmet read differently without colour", () => {
    const met = partsOf(
      stateWith("juvenile", {
        day: 30,
        mood: 100,
        bond: 100,
        cupsWon: 1,
        championKnown: true,
      }),
    )
    const unmet = partsOf(
      stateWith("juvenile", {
        day: 1,
        mood: 0,
        bond: 0,
        cupsWon: 0,
        championKnown: true,
      }),
    )
    const readings = new Set(
      [...met, ...unmet].map((part) => `${part.glyph}|${part.status}`),
    )
    expect(readings).toEqual(new Set(["✓|Met", "○|Not yet"]))
    expect(met.every((part) => part.status === "Met")).toBe(true)
    expect(unmet.some((part) => part.status === "Not yet")).toBe(true)
    expect(met.every((part) => part.glyph === "✓")).toBe(true)
    expect(unmet.some((part) => part.glyph === "○")).toBe(true)
  })

  test("an undiscovered gate composes no digits", () => {
    const parts = partsOf(stateWith("baby", { day: 1, mood: 10 }))
    expect(parts.length).toBeGreaterThan(0)
    for (const part of parts) {
      expect(part.label).not.toMatch(DIGIT)
      expect(part.detail).not.toMatch(DIGIT)
      expect(part.status).toMatch(/^(Met|Not yet)$/)
      expect(["✓", "○"]).toContain(part.glyph)
    }
    expect(parts.map((part) => part.detail).join(" ")).not.toMatch(DIGIT)
  })
})
