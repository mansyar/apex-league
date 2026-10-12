import { describe, expect, test } from "bun:test"
import {
  type BodyProfile,
  DEFAULT_PROFILE,
  hurtImpulse,
  idleSway,
  profileFor,
  staggerReel,
} from "./choreo"

describe("body profiles (FR5 — per-archetype body language)", () => {
  test("all three arena archetypes resolve to distinct signatures", () => {
    const drake = profileFor("draconic")
    const ox = profileFor("bovine")
    const axolotl = profileFor("axolotl")
    // Distinct objects — each archetype carries its own motion identity.
    expect(drake).not.toBe(ox)
    expect(ox).not.toBe(axolotl)
    // The ox is heavy: biggest gait bob, slowest stride, heaviest flinch.
    expect(ox.gaitAmp).toBeGreaterThan(drake.gaitAmp)
    expect(ox.gaitFreq).toBeLessThan(drake.gaitFreq)
    expect(ox.hurtMult).toBeGreaterThan(drake.hurtMult)
    // The axolotl is fluid: the strongest idle sway, the lightest gait.
    expect(axolotl.swayAmp).toBeGreaterThan(drake.swayAmp)
    expect(axolotl.gaitAmp).toBeLessThan(drake.gaitAmp)
  })

  test("an unknown archetype falls back to the neutral profile", () => {
    const unknown = profileFor("mystery_beast")
    expect(unknown).toBe(DEFAULT_PROFILE)
  })

  test("profiles are frozen — choreography cannot mutate them", () => {
    expect(Object.isFrozen(profileFor("draconic"))).toBe(true)
    expect(Object.isFrozen(DEFAULT_PROFILE)).toBe(true)
  })

  test("every profile stays within sane multiplier bounds", () => {
    const ids = ["draconic", "bovine", "axolotl", "unknown"] as const
    for (const id of ids) {
      const p = profileFor(id)
      const fields: Array<keyof BodyProfile> = [
        "gaitAmp",
        "gaitFreq",
        "leanPitch",
        "swayAmp",
        "swayFreq",
        "breathAmp",
        "breathFreq",
        "hurtMult",
        "staggerMult",
      ]
      for (const f of fields) {
        expect(p[f]).toBeGreaterThan(0)
        expect(p[f]).toBeLessThanOrEqual(2)
      }
    }
  })
})

describe("hurt and stagger weight (FR5 reaction profiles)", () => {
  test("hurtImpulse scales the base impulse by the archetype's weight", () => {
    const ox = profileFor("bovine")
    const axolotl = profileFor("axolotl")
    expect(hurtImpulse(ox, 1)).toBeGreaterThan(hurtImpulse(axolotl, 1))
    expect(hurtImpulse(DEFAULT_PROFILE, 0.85)).toBeCloseTo(0.85)
  })

  test("staggerReel scales the reel magnitude by the archetype's weight", () => {
    const ox = profileFor("bovine")
    const axolotl = profileFor("axolotl")
    expect(staggerReel(ox, 1)).toBeGreaterThan(staggerReel(axolotl, 1))
  })
})

describe("idleSway — the resting body drift", () => {
  const drake = profileFor("draconic")

  test("is zero at rest with no phase offset", () => {
    expect(idleSway(drake, 0, 0)).toBe(0)
  })

  test("is bounded by the profile's sway amplitude", () => {
    for (let ms = 0; ms <= 5000; ms += 97) {
      const z = idleSway(drake, ms, 1.1)
      expect(Math.abs(z)).toBeLessThanOrEqual(drake.swayAmp + 1e-9)
    }
  })

  test("is periodic (repeats with the sway frequency)", () => {
    const period = (2 * Math.PI * 1000) / drake.swayFreq
    expect(idleSway(drake, period, 0)).toBeCloseTo(idleSway(drake, 0, 0))
  })
})
