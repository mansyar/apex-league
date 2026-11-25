/**
 * Ranch profile adapter contract (FR-2, AC-2, FR-4, AC-4, FR-5, AC-5).
 *
 * The adapter is the ONLY bridge from the shared choreography table to the
 * ranch pose writers: it must derive one amplitude and one tempo from the
 * authored profile + stage, keep the stage on an unknown archetype, damp
 * toward neutral under calm, and reject non-finite compositions. No profile
 * values or stage ladder are repeated here — the oracle below recomputes
 * them from the same shared exports the adapter reads.
 */
import { describe, expect, test } from "bun:test"
import { archetypes } from "@apex/voxel"
import type { BodyProfile } from "../choreo"
import { DEFAULT_PROFILE, profileFor } from "../choreo"
import { BABY_SCALE, CHAMPION_SCALE, stageScale } from "../scene-logic/stage"
import { composeStageProfile } from "../stage-motion"
import { ranchMotionFactors } from "./profile"

/** Every registered archetype, plus a runtime-only unknown id. */
const IDS = [...Object.keys(archetypes), "mystery_beast"]

const STAGES = ["baby", "juvenile", "champion"] as const

/** The eight relative weights behind the amplitude factor. `swayAmp` is
 * deliberately absent: it is an absolute world-unit offset, not a
 * multiplier, so folding it in would corrupt the factor. */
const AMPLITUDE_KEYS = [
  "gaitAmp",
  "breathAmp",
  "hurtMult",
  "staggerMult",
  "windupMult",
  "recoilMult",
  "strikeMult",
  "leanPitch",
] as const satisfies ReadonlyArray<keyof BodyProfile>

const CALM_DAMP = 0.4

type Stage = (typeof STAGES)[number] | undefined

/** Independent restatement of the derivation under test. */
function rawFactors(
  id: string,
  stage: Stage,
): { amplitude: number; tempo: number } {
  const base = profileFor(id)
  const composed = composeStageProfile(id, stage)
  let sum = 0
  for (const key of AMPLITUDE_KEYS) sum += composed[key]
  const stageFactor = stage === undefined ? 1 : stageScale(stage)
  return {
    amplitude: sum / AMPLITUDE_KEYS.length,
    tempo:
      stageFactor * Math.cbrt(base.gaitFreq * base.breathFreq * base.swayFreq),
  }
}

function expected(id: string, stage: Stage, reduced: boolean) {
  const raw = rawFactors(id, stage)
  const settle = (v: number): number => {
    const damped = reduced ? 1 + (v - 1) * CALM_DAMP : v
    if (!Number.isFinite(damped)) return 1
    return Math.min(2, Math.max(0.2, damped))
  }
  return { amplitude: settle(raw.amplitude), tempo: settle(raw.tempo) }
}

describe("ranchMotionFactors (FR-2, FR-4, AC-2, AC-4)", () => {
  test("every archetype × stage composes the shared table into finite, bounded factors", () => {
    for (const id of IDS) {
      for (const stage of STAGES) {
        const got = ranchMotionFactors(id, stage, false)
        const want = expected(id, stage, false)
        expect(got.amplitude).toBeCloseTo(want.amplitude, 12)
        expect(got.tempo).toBeCloseTo(want.tempo, 12)
        expect(Number.isFinite(got.amplitude)).toBe(true)
        expect(Number.isFinite(got.tempo)).toBe(true)
        expect(got.amplitude).toBeGreaterThanOrEqual(0.2)
        expect(got.tempo).toBeGreaterThanOrEqual(0.2)
        expect(got.amplitude).toBeLessThanOrEqual(2)
        expect(got.tempo).toBeLessThanOrEqual(2)
        expect(Object.isFrozen(got)).toBe(true)
      }
    }
  })

  test("a missing stage is the neutral stage factor for every archetype", () => {
    for (const id of IDS) {
      const missing = ranchMotionFactors(id, undefined, false)
      const juvenile = ranchMotionFactors(id, "juvenile", false)
      expect(missing.amplitude).toBe(juvenile.amplitude)
      expect(missing.tempo).toBe(juvenile.tempo)
      expect(missing.amplitude).toBeCloseTo(
        rawFactors(id, undefined).amplitude,
        12,
      )
      expect(missing.tempo).toBeCloseTo(rawFactors(id, undefined).tempo, 12)
    }
  })

  test("an unknown archetype keeps its own stage factor on the shared neutral fallback", () => {
    const baby = ranchMotionFactors("mystery_beast", "baby", false)
    expect(baby.amplitude).toBeCloseTo(BABY_SCALE, 12)
    expect(baby.tempo).toBeCloseTo(BABY_SCALE, 12)
    const champion = ranchMotionFactors("mystery_beast", "champion", false)
    expect(champion.amplitude).toBeCloseTo(CHAMPION_SCALE, 12)
    expect(champion.tempo).toBeCloseTo(CHAMPION_SCALE, 12)
    expect(profileFor("mystery_beast")).toBe(DEFAULT_PROFILE)
  })

  test("a neutral juvenile (unknown archetype) resolves to exactly 1", () => {
    for (const stage of [undefined, "juvenile"] as const) {
      for (const reduced of [false, true]) {
        const f = ranchMotionFactors("mystery_beast", stage, reduced)
        expect(f.amplitude).toBe(1)
        expect(f.tempo).toBe(1)
      }
    }
  })

  test("reduced motion damps every factor toward neutral and never to zero", () => {
    for (const id of IDS) {
      for (const stage of STAGES) {
        const full = ranchMotionFactors(id, stage, false)
        const calm = ranchMotionFactors(id, stage, true)
        const want = expected(id, stage, true)
        expect(calm.amplitude).toBeCloseTo(want.amplitude, 12)
        expect(calm.tempo).toBeCloseTo(want.tempo, 12)
        for (const key of ["amplitude", "tempo"] as const) {
          expect(calm[key]).toBeGreaterThan(0)
          // Damping moves toward 1 (or stays there for an already-neutral
          // factor), and never past the full-motion value.
          expect(Math.abs(calm[key] - 1)).toBeLessThanOrEqual(
            Math.abs(full[key] - 1),
          )
          expect(calm[key]).toBeCloseTo(1 + (full[key] - 1) * CALM_DAMP, 12)
        }
      }
    }
  })

  test("a non-finite composition resolves to neutral instead of leaking NaN", () => {
    // "__proto__" resolves through the table's prototype chain to a non-
    // profile object, so every authored field is undefined — the exact
    // finite guard the adapter must own for malformed runtime ids (AC-5).
    for (const stage of [undefined, ...STAGES] as const) {
      for (const reduced of [false, true]) {
        expect(ranchMotionFactors("__proto__", stage, reduced)).toEqual({
          amplitude: 1,
          tempo: 1,
        })
      }
    }
  })

  test("factors are derived fresh per call — no module-level latch (AC-5)", () => {
    const first = ranchMotionFactors("bovine", "baby", false)
    ranchMotionFactors("falcon", "champion", true)
    const again = ranchMotionFactors("bovine", "baby", false)
    expect(again).toEqual(first)
    expect(again).not.toBe(first)
    expect(ranchMotionFactors("falcon", "champion", true).tempo).not.toBe(
      first.tempo,
    )
  })
})
