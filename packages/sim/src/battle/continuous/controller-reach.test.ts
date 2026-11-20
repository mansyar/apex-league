/**
 * The opponent reach model and the band it lifts (FR-14, AC-14).
 *
 * The doctrine floors shipped today already sit outside a 220 mm foe's innate
 * strike (the Press floor of 1,000 mm against an 860 mm threat plus 80 mm of
 * clearance), so the lift is inert for the standard roster. It exists so a
 * band that *does* sit inside the foe's threat is carried out of it; the
 * synthetic profile below is that case. Legacy rows keep their old shape.
 */

import { describe, expect, test } from "bun:test"
import {
  bandFor,
  type ControllerProfile,
  DOCTRINES,
  profileFor,
  profileForDoctrine,
} from "./controller-profile"
import {
  opponentReachMm,
  REACH_STANDOFF_MM,
  threatBandFor,
} from "./controller-reach"
import { createFight } from "./step"
import type { FighterState } from "./types"

const BOUNDS = { minX: -4000, maxX: 4000, minZ: -3000, maxZ: 3000 }

function pair(radiusMm = 220): [FighterState, FighterState] {
  const fight = createFight({
    seed: 11,
    bounds: BOUNDS,
    fighters: [
      { key: "home", spd: 10, at: { x: 0, z: 0 }, radiusMm },
      { key: "away", spd: 10, at: { x: 1000, z: 0 }, radiusMm },
    ],
  })
  return [fight.state.fighters[0], fight.state.fighters[1]]
}

/** A doctrine-shaped profile whose floor sits inside the threat. */
const LOW: ControllerProfile = {
  aggression: 50,
  preferredRangeMm: 1000,
  strafeBias: 20,
  dodgeThresholdMm: 2000,
  floorRangeMm: 800,
  ceilingRangeMm: 1200,
}

describe("opponent reach", () => {
  test("an idle foe threatens its innate strike plus both radii", () => {
    const [me, foe] = pair()
    expect(opponentReachMm(me, foe)).toBe(420 + 220 + 220)
  })

  test("radii are counted, not assumed", () => {
    const [me, foe] = pair(60)
    expect(opponentReachMm(me, foe)).toBe(420 + 60 + 60)
  })

  test("a committed melee row is read, not the innate strike", () => {
    const [me, foe] = pair()
    const swinging: FighterState = {
      ...foe,
      attack: {
        moveId: "basic",
        phase: "startup",
        elapsedMs: 0,
        landed: false,
      },
    }
    expect(opponentReachMm(me, swinging)).toBe(860)
  })
})

describe("threat band", () => {
  test("a floor inside the foe's threat moves one standoff outside it", () => {
    const [me, foe] = pair()
    const lifted = threatBandFor(LOW, me, foe)
    expect(opponentReachMm(me, foe) + REACH_STANDOFF_MM).toBe(940)
    expect(lifted.floorMm).toBe(940)
    // The hold point was already outside the lifted floor and stays put.
    expect(lifted.preferredMm).toBe(1000)
    expect(lifted.ceilingMm).toBe(1200)
  })

  test("a hold point inside the lifted floor is carried out with it", () => {
    const [me, foe] = pair()
    const low: ControllerProfile = { ...LOW, preferredRangeMm: 900 }
    const lifted = threatBandFor(low, me, foe)
    expect(lifted.floorMm).toBe(940)
    expect(lifted.preferredMm).toBe(940)
    expect(lifted.ceilingMm).toBe(1200)
  })

  test("a shipped doctrine floor at the threat is lifted", () => {
    const [me, foe] = pair()
    const press = profileForDoctrine(DOCTRINES.press, "obedient")
    // Press's floor sits below the 860 mm reference edge, so the band's own
    // floor is the edge; the threat lift still pushes it one standoff clear.
    expect(bandFor(press, 860).floorMm).toBe(860)
    const lifted = threatBandFor(press, me, foe)
    expect(lifted.floorMm).toBe(940)
    expect(lifted.preferredMm).toBe(946)
    expect(lifted.ceilingMm).toBe(1290)
  })

  test("a legacy row keeps its old band exactly", () => {
    const [me, foe] = pair()
    const rush = profileFor("rush")
    expect(threatBandFor(rush, me, foe)).toEqual(bandFor(rush, 860))
  })
})
