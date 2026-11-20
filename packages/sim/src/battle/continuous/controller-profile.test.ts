/**
 * Speed-aware Kite band reachability (FR-2, FR-3, AC-2, AC-3).
 *
 * These tests drive the pure band construction without running a fight. The
 * slow-kiter case is the failing-first reproduction: before the clamp the
 * doctrine hands a `spd 5` Kite a hold point no slower body can keep against a
 * closing Press foe. The rest pin the invariants the clamp must never break.
 */

import { describe, expect, test } from "bun:test"
import type { Temperament } from "../../species"
import {
  bandFor,
  DOCTRINES,
  profileForDoctrine,
  type RangeBand,
  reachEdgeMm,
} from "./controller-profile"
import { REACH_STANDOFF_MM, threatBandFor } from "./controller-reach"
import { topSpeed } from "./movement"
import { createFight } from "./step"
import type { FighterState } from "./types"

const BOUNDS = { minX: -4000, maxX: 4000, minZ: -3000, maxZ: 3000 }
const TEMPERAMENTS: readonly Temperament[] = ["rush", "slow", "obedient"]

function pair(
  ownSpd: number,
  foeSpd: number,
  radiusMm = 220,
): [FighterState, FighterState] {
  const fight = createFight({
    seed: 11,
    bounds: BOUNDS,
    fighters: [
      { key: "home", spd: ownSpd, at: { x: 0, z: 0 }, radiusMm },
      { key: "away", spd: foeSpd, at: { x: 1000, z: 0 }, radiusMm },
    ],
  })
  return [fight.state.fighters[0], fight.state.fighters[1]]
}

/** The independent, integer upper bound the clamp must respect. */
function maintainable(ownSpd: number, foeSpd: number, edge: number): number {
  return (
    edge +
    Math.trunc((edge * topSpeed(ownSpd)) / topSpeed(foeSpd)) +
    REACH_STANDOFF_MM
  )
}

function expectBand(band: RangeBand, minFloor: number): void {
  expect(Number.isInteger(band.floorMm)).toBe(true)
  expect(Number.isInteger(band.preferredMm)).toBe(true)
  expect(Number.isInteger(band.ceilingMm)).toBe(true)
  expect(band.floorMm).toBeGreaterThanOrEqual(minFloor)
  expect(band.floorMm).toBeLessThanOrEqual(band.preferredMm)
  expect(band.preferredMm).toBeLessThanOrEqual(band.ceilingMm)
}

describe("speed-aware Kite band (FR-2, AC-2)", () => {
  test("a spd 5 Kite is not assigned a hold gap it cannot maintain", () => {
    const [me, foe] = pair(5, 10)
    const edge = reachEdgeMm(me, foe)
    const cap = maintainable(5, 10, edge)
    // 860 mm edge, 550/1000 milli-mm/ms: 860 + 473 + 80 = 1413 mm.
    expect(edge).toBe(860)
    expect(cap).toBe(1413)
    const band = threatBandFor(
      profileForDoctrine(DOCTRINES.kite, "slow"),
      me,
      foe,
    )
    expect(band.floorMm).toBeLessThanOrEqual(cap)
    expect(band.preferredMm).toBeLessThanOrEqual(cap)
  })

  test("the clamp is deterministic for identical inputs", () => {
    const args = (): RangeBand => {
      const [me, foe] = pair(5, 17, 300)
      return threatBandFor(
        profileForDoctrine(DOCTRINES.kite, "obedient"),
        me,
        foe,
      )
    }
    expect(args()).toEqual(args())
  })
})

describe("band invariants across speed pairs (FR-3, AC-3)", () => {
  test("equal speed leaves the doctrinal band unchanged", () => {
    const [me, foe] = pair(10, 10)
    const profile = profileForDoctrine(DOCTRINES.kite, "obedient")
    const edge = reachEdgeMm(me, foe)
    expect(threatBandFor(profile, me, foe)).toEqual(bandFor(profile, edge))
  })

  test("a fast Kite versus a slow foe is never clamped", () => {
    const [me, foe] = pair(17, 5)
    const profile = profileForDoctrine(DOCTRINES.kite, "rush")
    const edge = reachEdgeMm(me, foe)
    expect(threatBandFor(profile, me, foe)).toEqual(bandFor(profile, edge))
  })

  test("a very slow Kite versus a much faster foe keeps every invariant", () => {
    const [me, foe] = pair(3, 17, 300)
    const cap = maintainable(3, 17, reachEdgeMm(me, foe))
    const band = threatBandFor(
      profileForDoctrine(DOCTRINES.kite, "slow"),
      me,
      foe,
    )
    expect(band.preferredMm).toBeLessThanOrEqual(cap)
    expectBand(band, reachEdgeMm(me, foe) + REACH_STANDOFF_MM)
  })

  test("all three temperaments stay inside the clamped band", () => {
    for (const temperament of TEMPERAMENTS) {
      const [me, foe] = pair(5, 10)
      const band = threatBandFor(
        profileForDoctrine(DOCTRINES.kite, temperament),
        me,
        foe,
      )
      expect(band.preferredMm).toBeLessThanOrEqual(
        maintainable(5, 10, reachEdgeMm(me, foe)),
      )
      expectBand(band, reachEdgeMm(me, foe) + REACH_STANDOFF_MM)
    }
  })

  test("differing radii recompute the edge, not a fixed gap", () => {
    const small = pair(5, 10, 60)
    const large = pair(5, 10, 300)
    const profile = profileForDoctrine(DOCTRINES.kite, "obedient")
    const smallBand = threatBandFor(profile, small[0], small[1])
    const largeBand = threatBandFor(profile, large[0], large[1])
    expect(smallBand.preferredMm).toBeLessThanOrEqual(
      maintainable(5, 10, reachEdgeMm(small[0], small[1])),
    )
    expect(largeBand.preferredMm).toBeLessThanOrEqual(
      maintainable(5, 10, reachEdgeMm(large[0], large[1])),
    )
    expect(largeBand.floorMm).toBeGreaterThan(smallBand.floorMm)
    expectBand(smallBand, reachEdgeMm(small[0], small[1]) + REACH_STANDOFF_MM)
    expectBand(largeBand, reachEdgeMm(large[0], large[1]) + REACH_STANDOFF_MM)
  })

  test("non-Kite doctrines are not speed-clamped", () => {
    for (const id of ["press", "circle", "counter"] as const) {
      const [me, foe] = pair(5, 17)
      const profile = profileForDoctrine(DOCTRINES[id], "obedient")
      const edge = reachEdgeMm(me, foe)
      const lifted = threatBandFor(profile, me, foe)
      const plain = bandFor(profile, edge)
      expect(lifted.floorMm).toBe(
        Math.max(plain.floorMm, edge + REACH_STANDOFF_MM),
      )
      expect(lifted.preferredMm).toBe(
        Math.max(plain.preferredMm, lifted.floorMm),
      )
      expect(lifted.ceilingMm).toBe(
        Math.max(plain.ceilingMm, lifted.preferredMm),
      )
    }
  })
})
