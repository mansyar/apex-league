import { describe, expect, test } from "bun:test"
import { getMove } from "@apex/sim"
import { DEFAULT_FX, fxFor, MOVE_FX } from "../moves"
import { ELEMENT_FALLBACK_FX, fallbackFor } from "./fallback"
import {
  barrierBody,
  beamBody,
  coneBody,
  dashBody,
  eruptionBody,
  volleyFanBody,
} from "./verbs"

/**
 * Pins for the Phase 1 identity foundation (FR-1, FR-5): the six authored
 * per-element fallback bodies, the element-aware `MOVE_FX` lookup, and the
 * shared verb-family builders the bespoke rows will compose.
 */

const ELEMENTS = [
  "fire",
  "water",
  "plant",
  "electric",
  "earth",
  "wind",
] as const

describe("element fallback bodies (FR-1)", () => {
  test("every element owns an authored fallback body", () => {
    for (const element of ELEMENTS) {
      expect(ELEMENT_FALLBACK_FX[element]).toBeDefined()
    }
  })

  test("fallback bodies are distinct per element", () => {
    const bodies = ELEMENTS.map((element) => ELEMENT_FALLBACK_FX[element])
    expect(new Set(bodies).size).toBe(ELEMENTS.length)
  })

  test("fallbackFor resolves each element; unknown reads undefined", () => {
    for (const element of ELEMENTS) {
      expect(fallbackFor(element)).toBe(ELEMENT_FALLBACK_FX[element])
    }
    expect(fallbackFor(undefined)).toBeUndefined()
    expect(fallbackFor("shadow")).toBeUndefined()
  })

  test("unauthored moves resolve to their element's fallback", () => {
    // Two unauthored specials per element: the guard line plus one attack
    // the bespoke tables do not own.
    const spot: ReadonlyArray<[string, (typeof ELEMENTS)[number]]> = [
      ["spark", "fire"],
      ["pyre_wall", "fire"],
      ["bubble", "water"],
      ["tide_aegis", "water"],
      ["seed_shot", "plant"],
      ["bramble_guard", "plant"],
      ["static_jolt", "electric"],
      ["ion_wall", "electric"],
      ["pebble_shot", "earth"],
      ["basalt_guard", "earth"],
      ["gust", "wind"],
      ["zephyr_veil", "wind"],
    ]
    for (const [moveId, element] of spot) {
      expect(getMove(moveId)?.element).toBe(element)
      expect(MOVE_FX[moveId]).toBeUndefined()
      const expected = fallbackFor(element)
      if (expected === undefined)
        throw new Error(`missing fallback body for ${element}`)
      expect(fxFor(moveId, element)).toBe(expected)
      expect(fxFor(moveId, element)).not.toBe(DEFAULT_FX)
    }
  })

  test("authored rows keep their bodies; element-less lookup keeps DEFAULT_FX", () => {
    expect(fxFor("cinder_shot", "fire")).not.toBe(ELEMENT_FALLBACK_FX.fire)
    expect(fxFor("quake_stomp", "earth")).not.toBe(ELEMENT_FALLBACK_FX.earth)
    expect(fxFor("cyclone_dive", "wind")).not.toBe(ELEMENT_FALLBACK_FX.wind)
    // No element to resolve: today's generic read, so instant mode and any
    // legacy caller see byte-identical behavior.
    expect(fxFor("basalt_guard")).toBe(DEFAULT_FX)
    expect(fxFor(undefined)).toBe(DEFAULT_FX)
    expect(fxFor(undefined, undefined)).toBe(DEFAULT_FX)
    expect(fxFor("plasma_lance")).toBe(DEFAULT_FX)
  })
})

describe("verb-family builders (FR-5)", () => {
  test("every builder starts from its element's fallback body", () => {
    for (const element of ELEMENTS) {
      const base = fallbackFor(element)
      if (base === undefined)
        throw new Error(`missing fallback body for ${element}`)
      expect(barrierBody(element).arrival.burst).toBeDefined()
      expect(dashBody(element).shots).not.toBe(base.shots)
      expect(eruptionBody(element).pose.windup.coilX).toBeGreaterThanOrEqual(
        0.28,
      )
      expect(coneBody(element).arrival.lanes).toHaveLength(3)
      expect(volleyFanBody(element).shots).toHaveLength(3)
      expect(beamBody(element).charge).toBeDefined()
    }
  })

  test("barriers hold no projectile and land with no shove", () => {
    for (const element of ELEMENTS) {
      const barrier = barrierBody(element)
      expect(barrier.shots).toHaveLength(0)
      expect(barrier.arrival.shove).toBe(0)
      expect(barrier.arrival.burst.ring).toBe(true)
    }
  })

  test("builders throw for unknown elements", () => {
    expect(() => barrierBody("shadow")).toThrow()
    expect(() => dashBody("shadow")).toThrow()
    expect(() => eruptionBody("shadow")).toThrow()
    expect(() => coneBody("shadow")).toThrow()
    expect(() => volleyFanBody("shadow")).toThrow()
    expect(() => beamBody("shadow")).toThrow()
  })
})
