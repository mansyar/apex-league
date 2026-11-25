import { describe, expect, test } from "bun:test"
import * as THREE from "three"
import { bodyScaleFor, bodyWorldDiameter } from "./arena-scale"
import { type BodyProfile, profileFor } from "./choreo"
import { buildSpot, HOME_X } from "./roster"
import { CHAMPION_SCALE } from "./scene-logic/stage"

describe("bodyScaleFor", () => {
  test("sizes each rig to its simulated diameter", () => {
    // A tortoise (r 300) must read larger than a heron (r 180).
    expect(bodyWorldDiameter("tortoise")).toBeCloseTo(0.48)
    expect(bodyWorldDiameter("heron")).toBeCloseTo(0.288)
    expect(bodyScaleFor("tortoise", 1)).toBeCloseTo(0.48)
    expect(bodyScaleFor("heron", 1)).toBeCloseTo(0.288)
    expect(bodyScaleFor("tortoise", 2)).toBeCloseTo(0.24)
  })

  test("falls back to the default body for an unknown archetype", () => {
    expect(bodyScaleFor("not-a-creature", 1)).toBeCloseTo(0.352)
  })

  test("never divides by zero on a degenerate rig", () => {
    expect(bodyScaleFor("tortoise", 0)).toBeCloseTo(480)
  })
})

/** The nine stage-scaled amplitudes, pinned at the buildSpot boundary. */
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

describe("buildSpot stage profile (FR-1, AC-1)", () => {
  const info = { archetypeId: "draconic", seed: 42, name: "fig", key: "q" }
  const plain = buildSpot(info, 1, new THREE.Group())
  const champion = buildSpot(
    { ...info, stage: "champion" },
    1,
    new THREE.Group(),
  )
  const rival = buildSpot({ ...info, stage: "champion" }, -1, new THREE.Group())

  test("a staged cast reads the composed profile, an unstaged cast the authored one", () => {
    const authored = profileFor("draconic")
    for (const key of AMPLITUDE_KEYS) {
      expect(champion.profile[key]).toBeCloseTo(
        authored[key] * CHAMPION_SCALE,
        12,
      )
    }
    expect(champion.profile.gaitFreq).toBe(authored.gaitFreq)
    expect(champion.profile.swayFreq).toBe(authored.swayFreq)
    expect(champion.profile.breathFreq).toBe(authored.breathFreq)
    expect(plain.profile).toEqual(authored)
  })

  test("the stage factor touches no sim coordinate or physical-scale bookkeeping", () => {
    for (const c of [plain, champion]) {
      expect(c.home.toArray()).toEqual([HOME_X, 0, 0])
      expect(c.stage.toArray()).toEqual([HOME_X, 0, 0])
      expect(c.smooth.toArray()).toEqual([HOME_X, 0, 0])
      expect(c.group.position.toArray()).toEqual([HOME_X, 0, 0])
      expect(c.baseScale).toBe(c.group.scale.x)
      expect(Number.isFinite(c.baseScale)).toBe(true)
      expect(c.baseScale).toBeGreaterThan(0)
    }
    expect(rival.home.toArray()).toEqual([-HOME_X, 0, 0])
    expect(rival.stage.toArray()).toEqual([-HOME_X, 0, 0])
    expect(rival.smooth.toArray()).toEqual([-HOME_X, 0, 0])
  })
})
