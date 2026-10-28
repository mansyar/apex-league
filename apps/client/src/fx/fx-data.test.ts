import { describe, expect, test } from "bun:test"
import {
  burstPhysics,
  DECAL_LIFE_MS,
  DECAL_MAX,
  decalRadius,
  decalRing,
  FLASH_MS,
  PROJECTILE_RADIUS,
  SHOT_ORIGIN_Y,
  SHOT_TARGET_Y,
  trailOpacity,
  trailRadius,
} from "./fx-data"

describe("fx data registry", () => {
  test("golden: the shared scale constants are pinned", () => {
    expect(PROJECTILE_RADIUS).toBe(0.22)
    expect(FLASH_MS).toBe(180)
    expect(DECAL_MAX).toBe(6)
    expect(DECAL_LIFE_MS).toBe(1800)
    expect(SHOT_ORIGIN_Y).toBe(0.8)
    expect(SHOT_TARGET_Y).toBe(0.6)
  })

  test("golden: element burst physics per element (FR7)", () => {
    expect(burstPhysics("fire")).toEqual({ gravity: -2.2, sway: 0.5 })
    expect(burstPhysics("water")).toEqual({ gravity: 10, sway: 0 })
    expect(burstPhysics("plant")).toEqual({ gravity: 1.8, sway: 1.0 })
    expect(burstPhysics("electric")).toEqual({ gravity: -1, sway: 1.6 })
    expect(burstPhysics("earth")).toEqual({ gravity: 14, sway: 0 })
    expect(burstPhysics("wind")).toEqual({ gravity: 1.2, sway: 1.4 })
  })

  test("golden: unknown elements keep the neutral scatter", () => {
    expect(burstPhysics("shadow")).toEqual({ gravity: 7, sway: 0 })
    expect(burstPhysics(undefined)).toEqual({ gravity: 7, sway: 0 })
  })

  test("golden: decal radius grows with blow strength and caps", () => {
    expect(decalRadius(0)).toBe(0.22)
    expect(decalRadius(10)).toBeCloseTo(0.42)
    expect(decalRadius(16.5)).toBeCloseTo(0.55)
    expect(decalRadius(100)).toBe(0.55)
  })

  test("golden: outline elements leave ring marks, others discs (FR-6)", () => {
    expect(decalRing("water")).toBe(true)
    expect(decalRing("wind")).toBe(true)
    expect(decalRing("electric")).toBe(true)
    expect(decalRing("fire")).toBe(false)
    expect(decalRing("earth")).toBe(false)
    expect(decalRing("plant")).toBe(false)
    expect(decalRing(undefined)).toBe(false)
    expect(decalRing("shadow")).toBe(false)
  })

  test("golden: trail segments taper toward the tail with a floor", () => {
    expect(trailRadius(1, 0)).toBeCloseTo(0.187)
    expect(trailRadius(1, 3)).toBeCloseTo(0.088)
    expect(trailRadius(0.5, 3)).toBe(0.05)
  })

  test("golden: trail opacity fades along the tail", () => {
    expect(trailOpacity(0)).toBeCloseTo(0.55)
    expect(trailOpacity(1)).toBeCloseTo(0.45)
    expect(trailOpacity(3)).toBeCloseTo(0.25)
  })
})
