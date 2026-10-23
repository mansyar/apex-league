/**
 * Champion Stable head-start AP tests (affinity_drift prestige perks,
 * spec FR-5 / AC-5): +1 max AP for a hatchling's first five in-game days,
 * derived — never stored — so it auto-expires with no extra save state.
 * Includes the day-ticker integration and the cup-day boundary.
 */

import { describe, expect, it } from "bun:test"
import { HEAD_START_AP_BONUS, HEAD_START_DAYS, headStartAp } from "./ap"
import { graduateWithPair } from "./breeding"
import { initialLadder } from "./ladder"
import { GRADUATION_DAY, type RetiredRecord } from "./legacy"
import { ACTION_POINTS_PER_DAY, type GameState } from "./state"
import { advanceDay } from "./ticker"

/**
 * A champion-stable prestige state whose last Hall record retired on
 * `hatchDay` — that record's graduation day is the current creature's
 * derived hatch day. Prestige = `generation` + `cupsWon`.
 */
function prestigeState(
  hatchDay: number,
  day: number,
  generation = 9,
  cupsWon = 0,
): GameState {
  const record: RetiredRecord = {
    name: "Rolo",
    speciesId: "fire_drake",
    archetypeId: "draconic",
    element: "fire",
    affinity: null,
    stats: { hp: 100, atk: 20, def: 14, spd: 16 },
    trained: { hp: 0, atk: 0, def: 0, spd: 0 },
    cupsWon: 0,
    generation: generation - 1,
    retiredOnDay: hatchDay,
    traits: [],
    parents: [],
    branch: "legacy",
    giftEgg: false,
  }
  return {
    day,
    phase: "day",
    actionPoints: ACTION_POINTS_PER_DAY,
    creature: {
      archetypeId: "draconic",
      speciesId: "fire_drake",
      name: "Ember",
      element: "fire",
      affinity: null,
      traits: [],
      parents: [generation - 1],
      stage: "champion",
      ageDays: day - hatchDay + 1,
      branch: null,
      giftEgg: false,
      sickCooldown: 0,
      stats: { hp: 90, atk: 18, def: 12, spd: 14 },
      trained: { hp: 0, atk: 0, def: 0, spd: 0 },
      trainingProgram: null,
      trainingResult: null,
      trainingDays: 0,
      loadout: null,
      conditions: { hunger: 80, energy: 80, health: 100, mood: 60, bond: 20 },
      bondedToday: false,
      fedToday: false,
    },
    settings: {
      reducedMotion: false,
      seenHints: [],
      arenaCamera: "broadcast",
      muted: false,
      musicVolume: 1,
      sfxVolume: 1,
    },
    cupsWon,
    lastCupDay: null,
    ladder: initialLadder(),
    lineage: { generation, hallOfFame: [record] },
    bossDefeats: [],
    legendTitles: 0,
    evolutionKnowledge: { juvenile: false, champion: false },
    claimedTiers: [],
    pendingRewards: [],
    stable: [],
  }
}

describe("headStartAp — the derived budget bonus", () => {
  it("pins the window and the bonus", () => {
    expect(HEAD_START_DAYS).toBe(5)
    expect(HEAD_START_AP_BONUS).toBe(1)
  })

  it("pays +1 on each of the first five days of life (AC-5)", () => {
    for (let lifeDay = 1; lifeDay <= HEAD_START_DAYS; lifeDay++) {
      expect(headStartAp(10, 10 + lifeDay - 1, true)).toBe(HEAD_START_AP_BONUS)
    }
  })

  it("pays nothing from day 6 of life (AC-5)", () => {
    expect(headStartAp(10, 10 + HEAD_START_DAYS, true)).toBe(0)
    expect(headStartAp(10, 10 + HEAD_START_DAYS + 30, true)).toBe(0)
  })

  it("pays nothing without the champion-stable perk (AC-4 symmetry)", () => {
    for (let day = 10; day <= 15; day++) {
      expect(headStartAp(10, day, false)).toBe(0)
    }
  })

  it("treats a hatch day in the future as day one of life", () => {
    // A corrupt or hand-edited save must not produce a negative life day.
    expect(headStartAp(20, 10, true)).toBe(HEAD_START_AP_BONUS)
  })
})

describe("head-start AP through the day ticker", () => {
  it("budgets +1 on the hatch day and the four days after, then normal", () => {
    let s = prestigeState(3, 3)
    expect(s.actionPoints).toBe(ACTION_POINTS_PER_DAY)
    s = advanceDay(s)
    expect(s.day).toBe(4)
    expect(s.actionPoints).toBe(ACTION_POINTS_PER_DAY + HEAD_START_AP_BONUS)
    for (const day of [5, 6, 7]) {
      s = advanceDay(s)
      expect(s.day).toBe(day)
      expect(s.actionPoints).toBe(ACTION_POINTS_PER_DAY + HEAD_START_AP_BONUS)
    }
    // Life day 6: the head-start has expired.
    s = advanceDay(s)
    expect(s.day).toBe(8)
    expect(s.actionPoints).toBe(ACTION_POINTS_PER_DAY)
  })

  it("never stacks the bonus below the champion-stable milestone", () => {
    const s = prestigeState(3, 6, 8)
    expect(advanceDay(s).actionPoints).toBe(ACTION_POINTS_PER_DAY)
  })

  it("resolves a cup day on the expiry boundary at match prep", () => {
    // Hatch day 2: day 7 is a cup day and life day 6 — the first normal day.
    // The budget is derived at advance time, so the cup opens on the plain
    // budget with no cached head-start leaking in.
    const cupDay = advanceDay(prestigeState(2, 6))
    expect(cupDay.day).toBe(7)
    expect(cupDay.phase).toBe("cup")
    expect(cupDay.actionPoints).toBe(ACTION_POINTS_PER_DAY)

    // A cup day inside the window keeps the bonus.
    const cupInside = advanceDay(prestigeState(3, 6))
    expect(cupInside.day).toBe(7)
    expect(cupInside.actionPoints).toBe(ACTION_POINTS_PER_DAY + 1)
  })
})

describe("head-start AP on graduation day", () => {
  it("starts the champion-stable successor's first day with the bonus", () => {
    // The champion is a day-1 starter: it hatched on day 1 and has lived its
    // own 60 days, so the send-off is legal (the gate reads the pet's age,
    // save v23).
    const state = prestigeState(1, GRADUATION_DAY)
    const res = graduateWithPair(state, [8, 9], "fire_drake", 42)
    if (!res.ok) throw new Error(`rejected: ${res.reason}`)
    expect(res.state.day).toBe(GRADUATION_DAY)
    expect(res.state.actionPoints).toBe(
      ACTION_POINTS_PER_DAY + HEAD_START_AP_BONUS,
    )
  })

  it("keeps the plain budget when the milestone is below nine", () => {
    // The successor's prestige is generation + cups: lineage generation 7
    // hatches at prestige 8 — one short of Champion Stable.
    const state = prestigeState(1, GRADUATION_DAY, 7)
    const res = graduateWithPair(state, [6, 7], "fire_drake", 42)
    if (!res.ok) throw new Error(`rejected: ${res.reason}`)
    expect(res.state.actionPoints).toBe(ACTION_POINTS_PER_DAY)
  })
})
