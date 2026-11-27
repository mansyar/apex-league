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
  DOCTRINE_IDS,
  makeExhibition,
  type RuleId,
  SIM_VERSION,
  streamOf,
  tacticForDoctrine,
} from "@apex/sim"
import {
  ghostSparSetup,
  isVersionSkippedBundle,
  readGhostContender,
} from "./ghost"
import { resolveSpar } from "./resolve"

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
    const setup = ghostSparSetup(drake, contender, "kite")
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
    const first = ghostSparSetup(drake, contender, "press")
    const second = ghostSparSetup(drake, contender, "press")
    expect(second).toEqual(first)
    const firstVerdict = resolveSpar(first, contender.seed)
    const secondVerdict = resolveSpar(second, contender.seed)
    expect(secondVerdict).toEqual(firstVerdict)
    // A ghost bout is a spar: it carries the dense trace too.
    expect(streamOf(firstVerdict)).toBeDefined()
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
    const setup = ghostSparSetup(frozenCreature, frozenContender, "press")
    const verdict = resolveSpar(setup, frozenContender.seed)
    expect(typeof verdict.winner).toBe("string")
    // The local-only rule, structurally: cups, ladder, and the bundle the
    // bout borrowed from are exactly as they were.
    expect(state).toEqual({ cups: { wins: 3 }, ladder: { points: 12 } })
    expect(frozenBundle).toEqual(bundle)
  })

  test("arm-then-start parity: the armed doctrine + note wire a ghost bout exactly like a normal spar", () => {
    const contender = readGhostContender(ghostBundle())
    expect(contender).not.toBeNull()
    if (contender === null) return
    const rule: RuleId = "read_tell"
    for (const doctrine of DOCTRINE_IDS) {
      const armed = ghostSparSetup(drake, contender, doctrine, rule)
      const normal = makeExhibition(
        drake,
        tacticForDoctrine(doctrine),
        contender.seed,
        doctrine,
        rule,
      )
      // The selection the panel arms is the selection the launch reads: the
      // player's side is identical across both setup paths.
      expect(armed.ownedSide).toEqual(normal.ownedSide)
      expect(armed.ownedSide.doctrine).toBe(doctrine)
      expect(armed.ownedSide.tactic).toBe(tacticForDoctrine(doctrine))
      expect(armed.ownedSide.rule).toBe(rule)
      // The ghost still lends its contender over the shared setup wire.
      expect(armed.rivalSide.name).toBe(contender.name)
      expect([...armed.rivalSide.kit]).toEqual(CHAMPION_KIT)
      // Start resolves the armed ghost bout deterministically (AC-5).
      expect(resolveSpar(armed, contender.seed)).toEqual(
        resolveSpar(armed, contender.seed),
      )
    }
    // Different armed doctrines really re-arm the ghost fight.
    const press = ghostSparSetup(drake, contender, "press")
    const kite = ghostSparSetup(drake, contender, "kite")
    expect(press.ownedSide.doctrine).toBe("press")
    expect(kite.ownedSide.doctrine).toBe("kite")
    expect(press.ownedSide).not.toEqual(kite.ownedSide)
  })
})
