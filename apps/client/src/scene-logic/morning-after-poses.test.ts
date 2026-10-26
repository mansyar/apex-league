/**
 * The morning-after's per-archetype pose choreography (FR-3): the six
 * voxel archetypes read the ceremony's class stance differently through
 * the existing pose vocabulary — chest-forward bearing, in-place prance,
 * tail carriage, sag. Pure: a derivation from drive weights, no DOM, no
 * Three, no randomness (NFR-5). Also the day-long tint latch's pure
 * bookkeeping (set on arrival, cleared at the night settle).
 */
import { describe, expect, test } from "bun:test"
import {
  createMorningAfterLedger,
  MORNING_AFTER_ARCHETYPES,
  type MorningAfterDrive,
  mintMorningAfter,
  morningAfterPoseOf,
  retireMorningAfterTint,
  setMorningAfterTint,
  takeMorningAfter,
} from "../scene-logic"

/** A hand-fed drive at a given stance blend (the machine's mid-ceremony
 * shape), with the fields the pose layer ignores zeroed. */
function drive(strut: number, droop: number, glow = 0): MorningAfterDrive {
  return {
    phase: "pose",
    strut,
    droop,
    glow,
    amplified: false,
    active: true,
    done: false,
    outcome: "none",
  }
}

describe("morning-after archetype poses (FR-3)", () => {
  test("the twelve voxel archetypes are the choreography's roster", () => {
    expect([...MORNING_AFTER_ARCHETYPES]).toEqual([
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
    ])
  })

  test("every archetype maps a finite pose", () => {
    for (const id of MORNING_AFTER_ARCHETYPES) {
      const pose = morningAfterPoseOf(id, drive(1, 1))
      for (const value of Object.values(pose)) {
        expect(Number.isFinite(value)).toBe(true)
      }
    }
  })

  test("a full strut lifts the champion: head, chest, tail, prance", () => {
    const pose = morningAfterPoseOf("draconic", drive(1, 0))
    expect(pose.headLift).toBeCloseTo(0.27, 10)
    expect(pose.chest).toBeCloseTo(0.36, 10)
    expect(pose.tailCarry).toBeCloseTo(0.5, 10)
    expect(pose.prance).toBeCloseTo(0.35, 10)
    expect(pose.roll).toBeCloseTo(0.042, 10)
    expect(pose.glow).toBe(0)
  })

  test("the strut rides the roster's temper: showboat vs heavy-footed", () => {
    const strut = (id: string) => morningAfterPoseOf(id, drive(1, 0))
    // The drake announces the title through its tail carriage the most.
    for (const id of MORNING_AFTER_ARCHETYPES) {
      if (id !== "draconic") {
        expect(strut("draconic").tailCarry).toBeGreaterThan(strut(id).tailCarry)
      }
    }
    // The buoyant axolotl prances the most; the tortoise the least.
    for (const id of MORNING_AFTER_ARCHETYPES) {
      if (id !== "axolotl") {
        expect(strut("axolotl").prance).toBeGreaterThan(strut(id).prance)
      }
    }
    // Every archetype lifts and lifts its chest for a title.
    for (const id of MORNING_AFTER_ARCHETYPES) {
      expect(strut(id).headLift).toBeGreaterThan(0)
      expect(strut(id).chest).toBeGreaterThan(0)
    }
  })

  test("a loss sags every archetype, graded by build", () => {
    const sag = (id: string) => morningAfterPoseOf(id, drive(0, 1))
    for (const id of MORNING_AFTER_ARCHETYPES) {
      expect(sag(id).headLift).toBeLessThan(0)
      expect(sag(id).chest).toBeLessThan(0)
      // A droop never prances and never announces a tail.
      expect(sag(id).prance).toBe(0)
    }
    // The shell-heavy tortoise sinks the deepest; the restless falcon the
    // least — the loss reads in each build's own body.
    for (const id of MORNING_AFTER_ARCHETYPES) {
      if (id !== "tortoise") {
        expect(sag("tortoise").headLift).toBeLessThan(sag(id).headLift)
      }
      if (id !== "falcon") {
        expect(sag("falcon").headLift).toBeGreaterThan(sag(id).headLift)
      }
    }
  })

  test("the stance blends rise monotonically with the strut weight", () => {
    const pose = (id: string, strut: number) =>
      morningAfterPoseOf(id, drive(strut, 0))
    for (const id of MORNING_AFTER_ARCHETYPES) {
      const quarter = pose(id, 0.25)
      const half = pose(id, 0.5)
      const full = pose(id, 1)
      for (const field of [
        "headLift",
        "chest",
        "roll",
        "tailCarry",
        "prance",
      ] as const) {
        expect(quarter[field]).toBeLessThan(half[field])
        expect(half[field]).toBeLessThan(full[field])
      }
    }
  })

  test("the glow pulse rides through untouched", () => {
    const pose = morningAfterPoseOf("bovine", drive(1, 0, 0.75))
    expect(pose.glow).toBe(0.75)
  })

  test("a zero drive is a zero pose", () => {
    const pose = morningAfterPoseOf("tortoise", drive(0, 0))
    expect(pose.headLift).toBe(0)
    expect(pose.chest).toBe(0)
    expect(pose.roll).toBe(0)
    expect(pose.tailCarry).toBe(0)
    expect(pose.prance).toBe(0)
    expect(pose.glow).toBe(0)
  })

  test("an unknown archetype falls back to the neutral stance", () => {
    const mystery = morningAfterPoseOf("mystery_mongrel", drive(1, 0))
    const legged = morningAfterPoseOf("sand_wyrm", drive(1, 0))
    // Neutral factors: bear 0.35, slump 0.45, tail 0.25, prance 0.3.
    expect(mystery.headLift).toBeCloseTo(0.21, 10)
    expect(mystery.chest).toBeCloseTo(0.28, 10)
    expect(mystery.tailCarry).toBeCloseTo(0.25, 10)
    expect(mystery.prance).toBeCloseTo(0.3, 10)
    expect(mystery).toEqual(legged)
  })

  test("pure: the same inputs read the same pose", () => {
    expect(morningAfterPoseOf("falcon", drive(0.4, 0.2, 0.5))).toEqual(
      morningAfterPoseOf("falcon", drive(0.4, 0.2, 0.5)),
    )
  })
})

describe("morning-after day tint bookkeeping (FR-3)", () => {
  test("set latches the class stance on its own day", () => {
    const tint = {
      active: false,
      day: null as number | null,
      strut: 0,
      droop: 0,
    }
    setMorningAfterTint(tint, "title", 12)
    expect(tint.active).toBe(true)
    expect(tint.day).toBe(12)
    expect(tint.strut).toBe(1)
    expect(tint.droop).toBe(0)
  })

  test("the same day keeps the tint; the night settle clears it", () => {
    const tint = {
      active: false,
      day: null as number | null,
      strut: 0,
      droop: 0,
    }
    setMorningAfterTint(tint, "gatekeep", 7)
    retireMorningAfterTint(tint, 7)
    expect(tint.active).toBe(true)
    expect(tint.droop).toBe(0.8)
    retireMorningAfterTint(tint, 8)
    expect(tint.active).toBe(false)
    expect(tint.strut).toBe(0)
    expect(tint.droop).toBe(0)
    expect(tint.day).toBe(null)
  })

  test("retiring an unlatched tint is a no-op", () => {
    const tint = {
      active: false,
      day: null as number | null,
      strut: 0,
      droop: 0,
    }
    retireMorningAfterTint(tint, 20)
    expect(tint.active).toBe(false)
    expect(tint.day).toBe(null)
  })
})

describe("morning-after ledger interlock", () => {
  test("mirrors the machine's own contract through the barrel", () => {
    const ledger = createMorningAfterLedger()
    const derivation = { class: "title" as const, amplifiers: [], bossId: null }
    mintMorningAfter(ledger, derivation, 3)
    expect(takeMorningAfter(ledger, 3, false)).toEqual(derivation)
    expect(takeMorningAfter(ledger, 3, false)).toBeNull()
  })
})
