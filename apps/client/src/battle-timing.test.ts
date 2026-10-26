/**
 * The battle stage's timing contract (battle_choreography_20261024 NFR-1,
 * AC-10): the constants the visual layer schedules against, and the sim's
 * playback phases, are pinned to today's values so an accidental timing edit
 * fails loudly here instead of silently drifting the animation out of step
 * with the fight.
 *
 * These numbers are asserted, never chosen: `packages/sim` is read-only in
 * this track, and every value below matches the code as it ships today.
 */
import { describe, expect, test } from "bun:test"
import { PLAYBACK_PHASES, type PlaybackStepKind } from "@apex/sim"
import {
  DEFAULT_PROFILE,
  profileFor,
  type ReactionKind,
  reactionFor,
} from "./choreo"
import { CONTACT_T, PROJECTILE_ARC, PROJECTILE_LIFE_MS } from "./move-fx"

describe("the flight constants", () => {
  test("CONTACT_T is 0.46", () => {
    expect(CONTACT_T).toBe(0.46)
  })

  test("PROJECTILE_LIFE_MS is 700", () => {
    expect(PROJECTILE_LIFE_MS).toBe(700)
  })

  test("PROJECTILE_ARC is 0.55", () => {
    expect(PROJECTILE_ARC).toBe(0.55)
  })
})

/** Every step kind's windup/contact/recovery split, as shipped. */
const PHASE_TABLE: ReadonlyArray<{
  kind: PlaybackStepKind
  windup: number
  contact: number
  recovery: number
}> = [
  { kind: "approach", windup: 0.15, contact: 0.7, recovery: 0.15 },
  { kind: "idle", windup: 0.3, contact: 0.4, recovery: 0.3 },
  { kind: "melee", windup: 0.26, contact: 0.2, recovery: 0.54 },
  { kind: "stagger", windup: 0.1, contact: 0.4, recovery: 0.5 },
  { kind: "knockback", windup: 0.1, contact: 0.3, recovery: 0.6 },
  { kind: "projectile", windup: 0.5, contact: 0.25, recovery: 0.25 },
  { kind: "impact", windup: 0.2, contact: 0.3, recovery: 0.5 },
  { kind: "down", windup: 0.2, contact: 0.35, recovery: 0.45 },
  { kind: "judge", windup: 0.25, contact: 0.5, recovery: 0.25 },
]

describe("PLAYBACK_PHASES — the script's normalized beats", () => {
  test("the table covers exactly the nine step kinds", () => {
    const kinds = PHASE_TABLE.map((row) => row.kind).sort()
    expect(Object.keys(PLAYBACK_PHASES).sort()).toEqual(kinds)
  })

  for (const row of PHASE_TABLE) {
    test(`${row.kind} is ${row.windup}/${row.contact}/${row.recovery}`, () => {
      expect(PLAYBACK_PHASES[row.kind]).toEqual({
        windup: row.windup,
        contact: row.contact,
        recovery: row.recovery,
      })
    })
  }
})

/** Every registered archetype (spec FR-1: the three starters, the six
 * reward lines, and the three breeding-discovery lines) and all five
 * reaction kinds. */
const ARCHETYPES = [
  "draconic",
  "bovine",
  "axolotl",
  "storm_hound",
  "falcon",
  "tortoise",
  "frond",
  "crab",
  "smolder",
  "fox",
  "heron",
  "mole",
] as const

const REACTIONS: readonly ReactionKind[] = [
  "glance",
  "stagger",
  "knockback",
  "dodge",
  "down",
]

describe("reactionFor — distances stay global", () => {
  // The invariant the choreography comments promise: a profile may vary an
  // amplitude, never a slide or a dash - those must agree with the sim's
  // far/near semantics, not with a species' personality.
  for (const kind of REACTIONS) {
    test(`${kind}: slide and dash are identical for every profile`, () => {
      const neutral = reactionFor(kind, DEFAULT_PROFILE)
      for (const id of ARCHETYPES) {
        const spec = reactionFor(kind, profileFor(id))
        expect({ id, slide: spec.slide, dash: spec.dash }).toEqual({
          id,
          slide: neutral.slide,
          dash: neutral.dash,
        })
      }
    })
  }
})
