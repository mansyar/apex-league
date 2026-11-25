import { describe, expect, test } from "bun:test"
import { getMove } from "@apex/sim"
import { CONTACT_T, DEFAULT_FX, fxFor, MOVE_FX } from "../moves"
import { BASIC_FX } from "./basic"

/**
 * Authored identity for the innate Strike (FR-1 / AC-1). These pins go red
 * before P1.T2 lands: `fxFor("basic", undefined)` currently misses `MOVE_FX`
 * and the element fallback, so the most frequent action in a fight reads
 * through the same generic body as an unknown move.
 */

describe("authored Strike identity (AC-1)", () => {
  test("resolves to its own authored row, not the generic default", () => {
    const strike = MOVE_FX.basic
    const authored = BASIC_FX.basic
    expect(strike).toBeDefined()
    expect(authored).toBeDefined()
    if (strike === undefined || authored === undefined) {
      throw new Error("Strike has no authored row")
    }
    expect(strike).toBe(authored)
    expect(fxFor("basic", undefined)).toBe(authored)
    expect(fxFor("basic", undefined)).not.toBe(DEFAULT_FX)
    expect(strike).not.toBe(DEFAULT_FX)
  })

  test("is the sim's innate melee move with no element", () => {
    expect(getMove("basic")?.melee).toBe(true)
    expect(getMove("basic")?.element).toBeUndefined()
  })
})

describe("melee-jab grammar (FR-1)", () => {
  test("the fist is the hit: no projectile, no mouth flash, no charge", () => {
    const fx = MOVE_FX.basic
    if (fx === undefined) throw new Error("Strike has no authored row")
    expect(fx.shots).toHaveLength(0)
    expect(fx.muzzle).toBeUndefined()
    expect(fx.charge).toBeUndefined()
    expect(fx.transit).toBeUndefined()
    // A jab commits early, well before the 0.46 shot release beat.
    expect(fx.wind).toBeLessThan(CONTACT_T)
  })

  test("a compact windup and a short recoil, not the default shot posture", () => {
    const fx = MOVE_FX.basic
    if (fx === undefined) throw new Error("Strike has no authored row")
    expect(fx.pose.windup.hold).toBeUndefined()
    expect(fx.pose.windup.coilX ?? 0).toBeGreaterThan(0)
    expect(fx.pose.windup.pitch ?? 0).toBeLessThan(0)
    expect(fx.pose.recoil.pitchOut ?? 0).toBeGreaterThan(0)
    expect(fx.pose.recoil.sweepX?.[1] ?? 0).toBeLessThan(0)
    expect(fx.pose).not.toEqual(DEFAULT_FX.pose)
  })

  test("contact lands a tight knuckle pop with a light driving shove", () => {
    const fx = MOVE_FX.basic
    if (fx === undefined) throw new Error("Strike has no authored row")
    // Lighter recoil than the default's -0.35 shot kick.
    expect(fx.kick).toBeLessThan(0)
    expect(fx.kick).toBeGreaterThan(DEFAULT_FX.kick)
    expect(fx.arrival.burst.puffs ?? 0).toBeGreaterThan(0)
    expect(fx.arrival.burst.life ?? 0).toBeLessThan(300)
    expect(fx.arrival.shove).toBeLessThan(0)
    expect(fx.arrival.shove).toBeGreaterThan(-0.5)
    expect(fx.arrival).not.toEqual(DEFAULT_FX.arrival)
  })
})
