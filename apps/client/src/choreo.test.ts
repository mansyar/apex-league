import { describe, expect, test } from "bun:test"
import { archetypes } from "@apex/voxel"
import {
  type BodyProfile,
  DEFAULT_PROFILE,
  hurtImpulse,
  idleSway,
  profileFor,
  reactionFor,
  staggerReel,
} from "./choreo"

/** The six registered arena archetypes, in registry order. */
const ARCHETYPES = [
  "draconic",
  "bovine",
  "axolotl",
  "storm_hound",
  "falcon",
  "tortoise",
] as const

/** Every knob a profile carries, in table order. */
const KNOBS: Array<keyof BodyProfile> = [
  "gaitAmp",
  "gaitFreq",
  "leanPitch",
  "swayAmp",
  "swayFreq",
  "breathAmp",
  "breathFreq",
  "hurtMult",
  "staggerMult",
  "windupMult",
  "recoilMult",
  "strikeMult",
]

/** The knobs the spec bands as multipliers (swayAmp has its own band). */
const MULTIPLIER_KNOBS: Array<keyof BodyProfile> = [
  "gaitAmp",
  "gaitFreq",
  "leanPitch",
  "swayFreq",
  "breathAmp",
  "breathFreq",
  "hurtMult",
  "staggerMult",
  "windupMult",
  "recoilMult",
  "strikeMult",
]

/** How many knobs two profiles differ in. */
function difference(a: BodyProfile, b: BodyProfile): number {
  return KNOBS.filter((k) => a[k] !== b[k]).length
}

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
        "windupMult",
        "recoilMult",
        "strikeMult",
      ]
      for (const f of fields) {
        expect(p[f]).toBeGreaterThan(0)
        expect(p[f]).toBeLessThanOrEqual(2)
      }
    }
  })
})

describe("the six authored identities (FR1, FR3)", () => {
  test("every registered archetype resolves to an authored, non-default profile", () => {
    for (const id of ARCHETYPES) {
      const p = profileFor(id)
      expect(p).not.toBe(DEFAULT_PROFILE)
      expect(Object.isFrozen(p)).toBe(true)
    }
  })

  test("the voxel registry and the profile table cover the same ids", () => {
    // The registry is the source of truth for what exists; the table must
    // not be missing one of its members.
    expect(Object.keys(archetypes).sort()).toEqual([...ARCHETYPES].sort())
    for (const id of Object.keys(archetypes)) {
      expect(profileFor(id)).not.toBe(DEFAULT_PROFILE)
    }
  })

  test("every value sits inside its declared band", () => {
    for (const id of ARCHETYPES) {
      const p = profileFor(id)
      for (const k of MULTIPLIER_KNOBS) {
        expect(p[k]).toBeGreaterThanOrEqual(0.5)
        expect(p[k]).toBeLessThanOrEqual(1.6)
      }
      expect(p.swayAmp).toBeGreaterThanOrEqual(0.004)
      expect(p.swayAmp).toBeLessThanOrEqual(0.045)
    }
  })

  test("no two profiles are equal — each pair differs in at least two knobs", () => {
    for (const [i, a] of ARCHETYPES.entries()) {
      for (const [j, b] of ARCHETYPES.entries()) {
        if (j <= i) continue
        expect(difference(profileFor(a), profileFor(b))).toBeGreaterThanOrEqual(
          2,
        )
      }
    }
  })

  test("the neutral profile keeps every knob at exactly 1", () => {
    // NEUTRAL is today's behavior: nothing moves until a profile authors it.
    expect(DEFAULT_PROFILE.windupMult).toBe(1)
    expect(DEFAULT_PROFILE.recoilMult).toBe(1)
    expect(DEFAULT_PROFILE.strikeMult).toBe(1)
  })

  test("the attack character reads as personality", () => {
    // A heavy body coils slow and deep; a quick body snaps out of a
    // short windup.
    expect(profileFor("bovine").windupMult).toBeGreaterThan(
      profileFor("draconic").windupMult,
    )
    expect(profileFor("tortoise").windupMult).toBeGreaterThan(
      profileFor("falcon").windupMult,
    )
    expect(profileFor("falcon").strikeMult).toBeGreaterThan(
      profileFor("axolotl").strikeMult,
    )
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

describe("reaction library (FR5)", () => {
  test("every reaction kind resolves to a distinct spec", () => {
    const kinds = ["glance", "stagger", "knockback", "dodge", "down"] as const
    const specs = kinds.map((k) => reactionFor(k, profileFor("draconic")))
    // All five kinds exist and no two share a full spec.
    expect(specs.length).toBe(5)
    const keys = new Set(specs.map((s) => JSON.stringify(s)))
    expect(keys.size).toBe(5)
  })

  test("stagger weight follows the profile's stagger multiplier", () => {
    const ox = reactionFor("stagger", profileFor("bovine"))
    const drake = reactionFor("stagger", profileFor("draconic"))
    const axo = reactionFor("stagger", profileFor("axolotl"))
    expect(ox.impulse).toBeGreaterThan(drake.impulse)
    expect(drake.impulse).toBeGreaterThan(axo.impulse)
    // Matches the staggerReel contract: base * staggerMult.
    expect(ox.impulse).toBeCloseTo(staggerReel(profileFor("bovine"), 0.85))
  })

  test("glance weight follows the profile's hurt multiplier", () => {
    const ox = reactionFor("glance", profileFor("bovine"))
    expect(ox.impulse).toBeCloseTo(hurtImpulse(profileFor("bovine"), 0.85))
    // A glance never moves the fighter.
    expect(ox.slide).toBe(0)
    expect(ox.dash).toBe(0)
  })

  test("knockback slides farther than a stagger (the range shift)", () => {
    const p = profileFor("draconic")
    expect(reactionFor("knockback", p).slide).toBeGreaterThan(
      reactionFor("stagger", p).slide,
    )
  })

  test("a dodge dashes off the lane without a reel", () => {
    const spec = reactionFor("dodge", profileFor("draconic"))
    expect(spec.dash).toBeGreaterThan(0)
    expect(spec.reel).toBe(0)
    expect(spec.reelPitch).toBe(0)
  })

  test("falling weight scales with the body (profile-aware)", () => {
    const ox = reactionFor("down", profileFor("bovine")).impulse
    const axo = reactionFor("down", profileFor("axolotl")).impulse
    expect(ox).toBeGreaterThan(axo)
  })

  test("unknown kinds fall back to the glance spec", () => {
    // Cast through unknown: runtime data, not a compile-time union.
    const bogus = reactionFor("blink" as "glance", profileFor("draconic"))
    expect(bogus).toEqual(reactionFor("glance", profileFor("draconic")))
  })

  test("reaction specs are frozen", () => {
    expect(Object.isFrozen(reactionFor("stagger", profileFor("bovine")))).toBe(
      true,
    )
  })

  test("every archetype composes its own reactions per kind", () => {
    for (const id of ARCHETYPES) {
      const p = profileFor(id)
      // Stagger is weighted by the archetype's stagger multiplier.
      expect(reactionFor("stagger", p).impulse).toBeCloseTo(
        0.85 * p.staggerMult,
      )
      // Glance and down are weighted by the hurt multiplier.
      expect(reactionFor("glance", p).impulse).toBeCloseTo(0.85 * p.hurtMult)
      expect(reactionFor("down", p).impulse).toBeCloseTo(0.9 * p.hurtMult)
      // A dodge is neither: it is an evasion, not a body reaction.
      expect(reactionFor("dodge", p).impulse).toBeCloseTo(-0.3)
      // Movement stays global so the visual agrees with the sim.
      expect(reactionFor("stagger", p).slide).toBe(0.3)
      expect(reactionFor("knockback", p).slide).toBe(0.9)
      expect(reactionFor("dodge", p).dash).toBe(0.85)
    }
  })
})
