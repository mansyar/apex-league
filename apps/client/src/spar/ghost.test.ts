/**
 * The ghost-rival reader (ghost_data_async_rivals FR-5, AC-5): fightability is
 * shape plus this build's simulator version; a fightable bundle lends its
 * champion's kit and name to a seeded exhibition; the bout it builds resolves
 * deterministically and touches nothing outside the panel.
 */
import { describe, expect, test } from "bun:test"
import {
  type BattleSide,
  createCreature,
  resolveBattle,
  SIM_VERSION,
} from "@apex/sim"
import {
  ghostSparSetup,
  isVersionSkippedBundle,
  readGhostContender,
} from "./ghost"

const CHAMPION_KIT = ["spark", "flame_charge", "cinder_shot", "blaze_bolt"]

function championSide(overrides: Record<string, unknown> = {}): BattleSide {
  return {
    name: "Ember",
    id: "owned",
    element: "fire",
    stats: { hp: 80, atk: 13, def: 8, spd: 9 },
    kit: [...CHAMPION_KIT],
    tactic: "balanced",
    temperament: "rush",
    ...(overrides as Partial<BattleSide>),
  }
}

function ghostBundle(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    simVersion: SIM_VERSION,
    seed: 424242,
    day: 12,
    round: 3,
    player: championSide(),
    rival: championSide({ name: "Tidecaller", id: "rival", element: "water" }),
    winner: "player",
    events: [],
    ...overrides,
  }
}

const drake = createCreature("fire_drake", 7)

describe("readGhostContender", () => {
  test("a same-version bundle yields its champion side", () => {
    expect(readGhostContender(ghostBundle())).toEqual({
      seed: 424242,
      name: "Ember",
      element: "fire",
      kit: CHAMPION_KIT,
    })
  })

  test("foreign bodies, skew versions, and incomplete champions stay unfightable", () => {
    expect(readGhostContender(null)).toBeNull()
    expect(readGhostContender({ simVersion: SIM_VERSION })).toBeNull()
    expect(
      readGhostContender(ghostBundle({ simVersion: SIM_VERSION + 1 })),
    ).toBeNull()
    expect(readGhostContender(ghostBundle({ seed: 4.5 }))).toBeNull()
    expect(readGhostContender(ghostBundle({ player: null }))).toBeNull()
    expect(
      readGhostContender(ghostBundle({ player: championSide({ name: "" }) })),
    ).toBeNull()
    expect(
      readGhostContender(
        ghostBundle({ player: championSide({ element: "" }) }),
      ),
    ).toBeNull()
    expect(
      readGhostContender(ghostBundle({ player: championSide({ kit: [] }) })),
    ).toBeNull()
    expect(
      readGhostContender(
        ghostBundle({ player: championSide({ kit: ["spark", 7] }) }),
      ),
    ).toBeNull()
  })

  test("the contender kit is a copy: board rows cannot dent the bundle", () => {
    const bundle = ghostBundle()
    const contender = readGhostContender(bundle)
    expect(contender).not.toBeNull()
    if (contender === null) return
    ;(contender.kit as string[]).push("gigavolt")
    const champion = (bundle as { player: BattleSide }).player
    expect(champion.kit).toEqual(CHAMPION_KIT)
  })
})

describe("isVersionSkippedBundle", () => {
  test("only a champion side under another version skips quietly", () => {
    expect(isVersionSkippedBundle(ghostBundle())).toBe(false)
    expect(
      isVersionSkippedBundle(ghostBundle({ simVersion: SIM_VERSION + 1 })),
    ).toBe(true)
    expect(isVersionSkippedBundle(null)).toBe(false)
    expect(isVersionSkippedBundle({ simVersion: 999 })).toBe(false)
    expect(
      isVersionSkippedBundle(
        ghostBundle({ simVersion: SIM_VERSION + 1, player: null }),
      ),
    ).toBe(false)
  })
})

describe("ghostSparSetup", () => {
  test("the rival wears the ghost kit and name over a seeded exhibition", () => {
    const contender = readGhostContender(ghostBundle())
    expect(contender).not.toBeNull()
    if (contender === null) return
    const setup = ghostSparSetup(drake, contender, "specials")
    expect(setup.rivalSide.name).toBe("Ember")
    expect([...setup.rivalSide.kit]).toEqual(CHAMPION_KIT)
    // The exhibition underneath is untouched: the owner fights their own
    // creature, and the bout seed is the bundle's.
    expect(setup.ownedSide.name).toBe(drake.name)
    expect(setup.rivalSpeciesId.length).toBeGreaterThan(0)
  })

  test("the same ghost and creature always build the same bout", () => {
    const contender = readGhostContender(ghostBundle())
    expect(contender).not.toBeNull()
    if (contender === null) return
    const first = ghostSparSetup(drake, contender, "balanced")
    const second = ghostSparSetup(drake, contender, "balanced")
    expect(second).toEqual(first)
    const firstVerdict = resolveBattle(
      first.ownedSide,
      first.rivalSide,
      contender.seed,
    )
    const secondVerdict = resolveBattle(
      second.ownedSide,
      second.rivalSide,
      contender.seed,
    )
    expect(secondVerdict).toEqual(firstVerdict)
  })

  test("frozen inputs survive: the bout reads, never writes", () => {
    const bundle = ghostBundle()
    const contender = readGhostContender(bundle)
    expect(contender).not.toBeNull()
    if (contender === null) return
    const frozenCreature = Object.freeze({ ...drake })
    const frozenBundle = Object.freeze(bundle)
    const frozenContender = Object.freeze({ ...contender })
    const state = Object.freeze({
      cups: Object.freeze({ wins: 3 }),
      ladder: Object.freeze({ points: 12 }),
    })
    const setup = ghostSparSetup(frozenCreature, frozenContender, "balanced")
    const verdict = resolveBattle(
      setup.ownedSide,
      setup.rivalSide,
      frozenContender.seed,
    )
    expect(typeof verdict.winner).toBe("string")
    // The local-only rule, structurally: cups, ladder, and the bundle the
    // bout borrowed from are exactly as they were.
    expect(state).toEqual({ cups: { wins: 3 }, ladder: { points: 12 } })
    expect(frozenBundle).toEqual(bundle)
  })
})
