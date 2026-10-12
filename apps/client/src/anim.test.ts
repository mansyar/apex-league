/**
 * Animation primitive layer (battle-animation-overhaul FR4): pure,
 * testable math that both the arena and the ranch can choreograph with.
 * No THREE dependency — plain numbers and objects — so the tests stay
 * instant and the functions stay framework-free.
 */
import { describe, expect, test } from "bun:test"
import type { PlaybackPhases } from "@apex/sim"
import {
  clamp01,
  composePose,
  easeInOutCubic,
  easeOut,
  easeOutBack,
  easeOutCubic,
  hashString,
  jitter,
  phaseAt,
  sampleTrack,
  sampleVecTrack,
} from "./anim"

describe("easings", () => {
  test("clamp01 clamps both ends and passes the middle through", () => {
    expect(clamp01(-0.4)).toBe(0)
    expect(clamp01(0.37)).toBe(0.37)
    expect(clamp01(1.4)).toBe(1)
  })

  test("every easing starts at zero and ends at one", () => {
    for (const e of [easeOut, easeOutCubic, easeInOutCubic, easeOutBack]) {
      expect(e(0)).toBeCloseTo(0)
      expect(e(1)).toBeCloseTo(1)
    }
  })

  test("easeOut is the quadratic ease-out used by the arena", () => {
    expect(easeOut(0.5)).toBe(0.75)
  })

  test("easeOutCubic matches its closed form", () => {
    expect(easeOutCubic(0.5)).toBeCloseTo(0.875)
  })

  test("easeInOutCubic is point-symmetric around the middle", () => {
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5)
    expect(easeInOutCubic(0.25) + easeInOutCubic(0.75)).toBeCloseTo(1)
  })

  test("easeOutBack overshoots before settling", () => {
    expect(easeOutBack(0.8)).toBeGreaterThan(1)
    expect(easeOutBack(1)).toBeCloseTo(1)
  })
})

describe("phaseAt — normalized step phases", () => {
  const MELEE: PlaybackPhases = { windup: 0.26, contact: 0.2, recovery: 0.54 }

  test("walks windup, contact, recovery with local progress", () => {
    expect(phaseAt(0, MELEE)).toEqual({ phase: "windup", local: 0 })
    expect(phaseAt(0.13, MELEE)).toEqual({ phase: "windup", local: 0.5 })
    expect(phaseAt(0.26, MELEE)).toEqual({ phase: "contact", local: 0 })
    expect(phaseAt(0.46, MELEE)).toEqual({ phase: "recovery", local: 0 })
  })

  test("clamps to the step's ends", () => {
    expect(phaseAt(-0.1, MELEE).phase).toBe("windup")
    expect(phaseAt(-0.1, MELEE).local).toBe(0)
    expect(phaseAt(1.1, MELEE).phase).toBe("recovery")
    expect(phaseAt(1.1, MELEE).local).toBe(1)
  })
})

describe("sampleTrack — per-part phased timelines", () => {
  const track = [
    { t: 0, value: 0 },
    { t: 0.5, value: 10 },
    { t: 1, value: 4 },
  ]

  test("hits keyframes exactly and interpolates between them", () => {
    expect(sampleTrack(track, 0)).toBe(0)
    expect(sampleTrack(track, 0.5)).toBe(10)
    expect(sampleTrack(track, 0.25)).toBe(5)
  })

  test("clamps before the first and after the last keyframe", () => {
    expect(sampleTrack(track, -1)).toBe(0)
    expect(sampleTrack(track, 2)).toBe(4)
  })

  test("vector tracks interpolate per axis", () => {
    const vecTrack = [
      { t: 0, value: { x: 0, y: 0, z: 0 } },
      { t: 1, value: { x: 2, y: 4, z: -2 } },
    ]
    const mid = sampleVecTrack(vecTrack, 0.5)
    expect(mid).toEqual({ x: 1, y: 2, z: -1 })
  })
})

describe("composePose — additive pose layers", () => {
  const base = {
    position: { x: 1, y: 0, z: -2 },
    rotation: { x: 0, y: 1.5, z: 0 },
    scale: 1,
  }

  test("adds position and rotation per axis, multiplies scale", () => {
    const pose = composePose(base, {
      position: { x: 0.5 },
      rotation: { y: -0.25 },
      scale: 1.2,
    })
    expect(pose.position).toEqual({ x: 1.5, y: 0, z: -2 })
    expect(pose.rotation).toEqual({ x: 0, y: 1.25, z: 0 })
    expect(pose.scale).toBeCloseTo(1.2)
  })

  test("layers compose in order", () => {
    const pose = composePose(
      base,
      { scale: 1.1 },
      { scale: 0.9 },
      { position: { z: 0.3 } },
    )
    expect(pose.scale).toBeCloseTo(0.99)
    expect(pose.position).toEqual({ x: 1, y: 0, z: -1.7 })
  })

  test("empty deltas leave the base pose unchanged", () => {
    expect(composePose(base)).toEqual(base)
  })
})

describe("seed-derived variation", () => {
  test("hashString is deterministic FNV-1a", () => {
    expect(hashString("drake-lunge")).toBe(hashString("drake-lunge"))
    expect(hashString("drake-lunge")).not.toBe(hashString("ox-slam"))
  })

  test("jitter is deterministic per seed+key and bounded", () => {
    expect(jitter(42, "drake-lunge", 0.1)).toBe(jitter(42, "drake-lunge", 0.1))
    expect(jitter(42, "drake-lunge", 0.1)).not.toBe(
      jitter(43, "drake-lunge", 0.1),
    )
    for (let seed = 0; seed < 50; seed++) {
      const v = jitter(seed, "weave", 0.3)
      expect(v).toBeGreaterThanOrEqual(-0.3)
      expect(v).toBeLessThanOrEqual(0.3)
    }
  })

  test("zero spread is exactly zero", () => {
    expect(jitter(42, "anything", 0)).toBe(0)
  })
})
