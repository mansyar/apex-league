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
    // One unauthored special per element with moves still to land (fire,
    // water, and plant are fully bespoke — see the AC-1 fire/water/plant
    // pins below): the guard line plus one attack the bespoke tables do
    // not own.
    const spot: ReadonlyArray<[string, (typeof ELEMENTS)[number]]> = [
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

  test("all 8 fire specials resolve to bespoke rows (AC-1 fire)", () => {
    const fireMoves = [
      "spark",
      "flame_charge",
      "cinder_shot",
      "blaze_bolt",
      "flare_dart",
      "pyre_lance",
      "cinder_dive",
      "pyre_wall",
    ]
    for (const moveId of fireMoves) {
      expect(getMove(moveId)?.element).toBe("fire")
      const row = MOVE_FX[moveId]
      if (row === undefined) throw new Error(`missing bespoke row: ${moveId}`)
      expect(fxFor(moveId, "fire")).toBe(row)
      expect(fxFor(moveId, "fire")).not.toBe(ELEMENT_FALLBACK_FX.fire)
    }
  })

  test("fire verb reads (AC-3 fire)", () => {
    // Guards raise a barrier: no projectile, no shove. Dashes launch the
    // body with a deep shove; the lance keeps its charge phase.
    const wall = MOVE_FX.pyre_wall
    if (wall === undefined) throw new Error("missing bespoke row: pyre_wall")
    expect(wall.shots).toHaveLength(0)
    expect(wall.arrival.shove).toBe(0)
    expect(wall.arrival.burst.ring).toBe(true)
    const charge = MOVE_FX.flame_charge
    if (charge === undefined)
      throw new Error("missing bespoke row: flame_charge")
    expect(charge.kick).toBeLessThanOrEqual(-0.6)
    const dive = MOVE_FX.cinder_dive
    if (dive === undefined) throw new Error("missing bespoke row: cinder_dive")
    expect(dive.kick).toBeLessThanOrEqual(-0.6)
    const lance = MOVE_FX.pyre_lance
    if (lance === undefined) throw new Error("missing bespoke row: pyre_lance")
    expect(lance.charge).toBeDefined()
    const bolt = MOVE_FX.blaze_bolt
    if (bolt === undefined) throw new Error("missing bespoke row: blaze_bolt")
    expect(bolt.charge).toBeDefined()
  })

  test("all 8 water specials resolve to bespoke rows (AC-1 water)", () => {
    const waterMoves = [
      "bubble",
      "tide_shot",
      "foam_volley",
      "splash_bolt",
      "mist_spray",
      "maelstrom",
      "riptide_rush",
      "tide_aegis",
    ]
    for (const moveId of waterMoves) {
      expect(getMove(moveId)?.element).toBe("water")
      const row = MOVE_FX[moveId]
      if (row === undefined) throw new Error(`missing bespoke row: ${moveId}`)
      expect(fxFor(moveId, "water")).toBe(row)
      expect(fxFor(moveId, "water")).not.toBe(ELEMENT_FALLBACK_FX.water)
    }
  })

  test("water verb reads (AC-3 water)", () => {
    // Guards raise a barrier: no projectile, no shove. The rush dashes the
    // body with a deep shove; the volley fans three shots; the spray lands
    // across three lanes; the heavies keep their charge phase.
    const aegis = MOVE_FX.tide_aegis
    if (aegis === undefined) throw new Error("missing bespoke row: tide_aegis")
    expect(aegis.shots).toHaveLength(0)
    expect(aegis.arrival.shove).toBe(0)
    expect(aegis.arrival.burst.ring).toBe(true)
    const rush = MOVE_FX.riptide_rush
    if (rush === undefined) throw new Error("missing bespoke row: riptide_rush")
    expect(rush.kick).toBeLessThanOrEqual(-0.6)
    const volley = MOVE_FX.foam_volley
    if (volley === undefined)
      throw new Error("missing bespoke row: foam_volley")
    expect(volley.shots).toHaveLength(3)
    const spray = MOVE_FX.mist_spray
    if (spray === undefined) throw new Error("missing bespoke row: mist_spray")
    expect(spray.arrival.lanes).toHaveLength(3)
    expect(spray.arrival.burst.ring).toBe(true)
    const storm = MOVE_FX.maelstrom
    if (storm === undefined) throw new Error("missing bespoke row: maelstrom")
    expect(storm.charge).toBeDefined()
    expect(storm.shots).toHaveLength(2)
    const bolt = MOVE_FX.splash_bolt
    if (bolt === undefined) throw new Error("missing bespoke row: splash_bolt")
    expect(bolt.charge).toBeDefined()
  })

  test("all 8 plant specials resolve to bespoke rows (AC-1 plant)", () => {
    const plantMoves = [
      "seed_shot",
      "thorn_volley",
      "spore_burst",
      "bramble_dart",
      "vine_lash",
      "root_quake",
      "thorn_charge",
      "bramble_guard",
    ]
    for (const moveId of plantMoves) {
      expect(getMove(moveId)?.element).toBe("plant")
      const row = MOVE_FX[moveId]
      if (row === undefined) throw new Error(`missing bespoke row: ${moveId}`)
      expect(fxFor(moveId, "plant")).toBe(row)
      expect(fxFor(moveId, "plant")).not.toBe(ELEMENT_FALLBACK_FX.plant)
    }
  })

  test("plant verb reads (AC-3 plant)", () => {
    // Guards raise a barrier: no projectile, no shove. The charge dashes
    // the body with a deep shove; the volley fans three shots; the burst
    // lands across three lanes; the quake keeps its charge phase and a
    // deep ground coil.
    const guard = MOVE_FX.bramble_guard
    if (guard === undefined)
      throw new Error("missing bespoke row: bramble_guard")
    expect(guard.shots).toHaveLength(0)
    expect(guard.arrival.shove).toBe(0)
    expect(guard.arrival.burst.ring).toBe(true)
    const charge = MOVE_FX.thorn_charge
    if (charge === undefined)
      throw new Error("missing bespoke row: thorn_charge")
    expect(charge.kick).toBeLessThanOrEqual(-0.6)
    const volley = MOVE_FX.thorn_volley
    if (volley === undefined)
      throw new Error("missing bespoke row: thorn_volley")
    expect(volley.shots).toHaveLength(3)
    const burst = MOVE_FX.spore_burst
    if (burst === undefined) throw new Error("missing bespoke row: spore_burst")
    expect(burst.arrival.lanes).toHaveLength(3)
    expect(burst.arrival.burst.ring).toBe(true)
    const quake = MOVE_FX.root_quake
    if (quake === undefined) throw new Error("missing bespoke row: root_quake")
    expect(quake.charge).toBeDefined()
    expect(quake.pose.windup.coilX ?? 0).toBeGreaterThanOrEqual(0.28)
    expect(quake.arrival.burst.ring).toBe(true)
    expect(quake.arrival.shove ?? 0).toBeLessThanOrEqual(-0.55)
    const dart = MOVE_FX.bramble_dart
    if (dart === undefined) throw new Error("missing bespoke row: bramble_dart")
    expect(dart.shots).toHaveLength(1)
    expect(dart.kick).toBeLessThanOrEqual(-0.5)
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
