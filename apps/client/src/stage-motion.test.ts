/**
 * Arena/ranch stage-motion contract (FR-1, AC-1). A life stage scales the
 * authored archetype's presentation amplitudes only: the three frequency
 * knobs stay exactly as choreographed, and an absent stage is the neutral
 * factor. Physical scale and sim coordinates are not part of this composer —
 * `roster.test.ts` pins those separately.
 */
import { describe, expect, test } from "bun:test"
import { archetypes } from "@apex/voxel"
import { type BodyProfile, DEFAULT_PROFILE, profileFor } from "./choreo"
import {
  BABY_SCALE,
  CHAMPION_SCALE,
  JUVENILE_SCALE,
  stageScale,
} from "./scene-logic/stage"
import { composeStageProfile } from "./stage-motion"

/** Every registered archetype, plus a runtime-only unknown id. */
const IDS = [...Object.keys(archetypes), "mystery_beast"]

const STAGES = ["baby", "juvenile", "champion"] as const

/** The nine amplitude/weight fields a stage factor multiplies. */
const AMPLITUDE_KEYS = [
  "gaitAmp",
  "leanPitch",
  "swayAmp",
  "breathAmp",
  "hurtMult",
  "staggerMult",
  "windupMult",
  "recoilMult",
  "strikeMult",
] as const satisfies ReadonlyArray<keyof BodyProfile>

/** Tempo is authored per archetype and must never be stage-scaled. */
const FREQUENCY_KEYS = [
  "gaitFreq",
  "swayFreq",
  "breathFreq",
] as const satisfies ReadonlyArray<keyof BodyProfile>

describe("composeStageProfile (FR-1, AC-1)", () => {
  test("every archetype × stage scales the nine amplitudes by stageScale only", () => {
    for (const id of IDS) {
      const authored = profileFor(id)
      for (const stage of STAGES) {
        const factor = stageScale(stage)
        const composed = composeStageProfile(id, stage)
        for (const key of AMPLITUDE_KEYS) {
          expect(composed[key]).toBeCloseTo(authored[key] * factor, 12)
        }
        for (const key of FREQUENCY_KEYS) {
          expect(composed[key]).toBe(authored[key])
        }
        expect(Object.isFrozen(composed)).toBe(true)
      }
    }
  })

  test("a missing stage is the neutral factor for every archetype", () => {
    for (const id of IDS) {
      const composed = composeStageProfile(id)
      const authored = profileFor(id)
      for (const key of AMPLITUDE_KEYS) {
        expect(composed[key]).toBe(authored[key])
      }
      for (const key of FREQUENCY_KEYS) {
        expect(composed[key]).toBe(authored[key])
      }
      expect(composed).toEqual(authored)
    }
  })

  test("an unknown archetype scales the shared neutral fallback", () => {
    const baby = composeStageProfile("mystery_beast", "baby")
    for (const key of AMPLITUDE_KEYS) {
      expect(baby[key]).toBeCloseTo(DEFAULT_PROFILE[key] * BABY_SCALE, 12)
    }
    expect(composeStageProfile("mystery_beast")).toBe(DEFAULT_PROFILE)
  })

  test("the stage ladder is single-sourced from scene-logic/stage", () => {
    // No second ladder: the composer must reuse these exact constants.
    expect(BABY_SCALE).toBe(0.6)
    expect(JUVENILE_SCALE).toBe(1)
    expect(CHAMPION_SCALE).toBe(1.15)
    expect(stageScale("baby")).toBe(BABY_SCALE)
    expect(stageScale("juvenile")).toBe(JUVENILE_SCALE)
    expect(stageScale("champion")).toBe(CHAMPION_SCALE)
    // Juvenile is itself the neutral factor, so it composes identically
    // to an absent stage while still reading the archetype's profile.
    for (const id of IDS) {
      expect(composeStageProfile(id, "juvenile")).toEqual(profileFor(id))
    }
  })

  test("composing never mutates the authored profile or the registry table", () => {
    const authored = profileFor("bovine")
    const snapshot = { ...authored }
    const composed = composeStageProfile("bovine", "champion")
    expect(composed).not.toBe(authored)
    expect(authored).toEqual(snapshot)
    expect(profileFor("bovine")).toEqual(snapshot)
  })

  test("stage factors keep every amplitude finite and non-negative", () => {
    for (const id of IDS) {
      for (const stage of STAGES) {
        const composed = composeStageProfile(id, stage)
        for (const key of AMPLITUDE_KEYS) {
          expect(Number.isFinite(composed[key])).toBe(true)
          expect(composed[key]).toBeGreaterThanOrEqual(0)
        }
      }
    }
  })
})
