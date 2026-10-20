import { describe, expect, test } from "bun:test"
import type { CupSession, SaveData } from "@apex/sim"
import { importBlocked, importSummary, transferNotice } from "./save-transfer"

const save = (overrides: Partial<SaveData["state"]> = {}): SaveData =>
  ({
    version: 17,
    savedAt: 0,
    session: null,
    state: {
      day: 70,
      phase: "day",
      actionPoints: 3,
      creature: {
        speciesId: "water_axolotl",
        name: "Tide Axolotl",
        stage: "champion",
        element: "water",
        archetypeId: "axolotl",
        stats: { hp: 88, atk: 8, def: 10, spd: 8 },
        trained: { hp: 0, atk: 0, def: 0, spd: 0 },
        conditions: { hunger: 80, energy: 80, health: 100, mood: 60, bond: 10 },
        bondedToday: false,
        fedToday: false,
        traits: ["sturdy"],
        parents: [1],
      },
      settings: {
        reducedMotion: false,
        seenHints: [],
        arenaCamera: "cinematic",
        muted: false,
        musicVolume: 1,
        sfxVolume: 1,
      },
      cupsWon: 2,
      lastCupDay: 60,
      ladder: { tier: "bronze", subTier: 3, points: 0 },
      lineage: {
        generation: 2,
        hallOfFame: [],
        bossDefeats: [],
        legendTitles: 0,
      },
      ...overrides,
    },
  }) as SaveData

describe("importBlocked", () => {
  test("idle play may import", () => {
    expect(importBlocked(null)).toBe(false)
  })

  test("a live cup session blocks import", () => {
    expect(importBlocked({} as CupSession)).toBe(true)
  })
})

describe("transferNotice", () => {
  test("maps every refusal to calm coach copy", () => {
    expect(transferNotice("busy")).toContain("cup")
    expect(transferNotice("future-version")).toContain("newer version")
    expect(transferNotice("malformed")).toContain("isn't an Apex League save")
    expect(transferNotice("invalid")).toContain("nothing was changed")
  })
})

describe("importSummary", () => {
  test("names the day, partner, generation, and cups", () => {
    expect(importSummary(save())).toBe("Day 70 · Tide Axolotl · Gen 2 · 2 cups")
  })

  test("handles a save with no partner yet", () => {
    expect(importSummary(save({ creature: null, cupsWon: 0 }))).toBe(
      "Day 70 · no partner yet · Gen 2 · 0 cups",
    )
  })
})
