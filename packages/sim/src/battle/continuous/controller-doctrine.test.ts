import { describe, expect, test } from "bun:test"
import type { Temperament } from "../../species"
import { createController, decide } from "./controller"
import { strafeIntent } from "./controller-aim"
import {
  bandFor,
  DOCTRINE_IDS,
  DOCTRINE_LABELS,
  DOCTRINES,
  type DoctrineId,
  doctrineForTactic,
  profileForDoctrine,
  REFERENCE_REACH_EDGE_MM,
  tacticForDoctrine,
} from "./controller-profile"
import { createFight } from "./step"
import { HOLD } from "./types"

const TEMPERAMENTS: readonly Temperament[] = ["rush", "obedient", "slow"]
const REACH = REFERENCE_REACH_EDGE_MM
const BOUNDS = { minX: -4000, maxX: 4000, minZ: -3000, maxZ: 3000 }

function fighter(
  key: string,
  x: number,
  z: number,
  facing: { x: number; z: number },
) {
  return {
    key,
    spd: 10,
    at: { x, z },
    facing,
    stats: { atk: 10, def: 5 },
  }
}

function fightAt(gap: number): ReturnType<typeof createFight> {
  const half = Math.trunc(gap / 2)
  return createFight({
    seed: 7,
    bounds: BOUNDS,
    fighters: [
      fighter("home", -half, 0, { x: 1000, z: 0 }),
      fighter("away", half, 0, { x: -1000, z: 0 }),
    ],
  })
}

function orderAt(
  doctrine: DoctrineId,
  temperament: Temperament,
  gap: number,
): ReturnType<typeof decide> {
  const fight = fightAt(gap)
  return decide({
    state: fight.state,
    side: 0,
    controller: createController(),
    profile: profileForDoctrine(DOCTRINES[doctrine], temperament),
    kit: ["basic"],
  })
}

function scaled(permille: number): number {
  return Math.trunc((permille * REACH) / 1000)
}

describe("doctrines (FR-11, FR-12)", () => {
  test("the four doctrines are frozen, named, and ordered", () => {
    expect([...DOCTRINE_IDS]).toEqual(["press", "circle", "kite", "counter"])
    expect(Object.isFrozen(DOCTRINE_IDS)).toBe(true)
    expect(Object.isFrozen(DOCTRINES)).toBe(true)
    for (const id of DOCTRINE_IDS) {
      const doctrine = DOCTRINES[id]
      expect(Object.isFrozen(doctrine)).toBe(true)
      expect(doctrine.id).toBe(id)
      expect(DOCTRINE_LABELS[id]).toBe(doctrine.label)
      expect(doctrine.floorPermille).toBeLessThan(doctrine.ceilingPermille)
    }
    expect(DOCTRINES.circle.seeksRear).toBe(true)
    expect(DOCTRINES.counter.commit).toBe("punish")
    expect(DOCTRINES.kite.floorPermille).toBeGreaterThan(
      DOCTRINES.press.ceilingPermille,
    )
  })

  test("bands scale from the pair's reach edge", () => {
    for (const id of DOCTRINE_IDS) {
      const doctrine = DOCTRINES[id]
      const profile = profileForDoctrine(doctrine, "obedient")
      const band = bandFor(profile, REACH)
      const floor = Math.max(REACH, scaled(doctrine.floorPermille))
      const ceiling = Math.max(floor, scaled(doctrine.ceilingPermille))
      const centre = Math.trunc(
        (doctrine.floorPermille + doctrine.ceilingPermille) / 2,
      )
      const hold = Math.min(ceiling, Math.max(floor, scaled(centre)))
      expect(band).toEqual({
        preferredMm: hold,
        floorMm: floor,
        ceilingMm: ceiling,
      })
      expect(band.floorMm).toBeLessThanOrEqual(band.preferredMm)
      expect(band.preferredMm).toBeLessThanOrEqual(band.ceilingMm)
    }
  })

  test("legacy tactics map onto doctrines, both ways", () => {
    expect(doctrineForTactic("balanced")).toBe("press")
    expect(doctrineForTactic("specials")).toBe("kite")
    for (const id of DOCTRINE_IDS) {
      const expected = id === "circle" || id === "kite" ? "kite" : "press"
      expect(doctrineForTactic(tacticForDoctrine(id))).toBe(expected)
    }
  })
})

describe("temperament shades intensity, doctrine owns intent (AC-12)", () => {
  test("every temperament on a doctrine keeps its floor, ceiling, hold", () => {
    for (const id of DOCTRINE_IDS) {
      const doctrine = DOCTRINES[id]
      const rows = TEMPERAMENTS.map((temperament) => ({
        temperament,
        profile: profileForDoctrine(doctrine, temperament),
      }))
      const first = bandFor(profileForDoctrine(doctrine, "rush"), REACH)
      for (const row of rows) {
        expect(bandFor(row.profile, REACH)).toEqual(first)
        expect(row.profile.floorRangeMm).toBe(first.floorMm)
        expect(row.profile.ceilingRangeMm).toBe(first.ceilingMm)
      }
    }
  })

  test("the shade moves aggression, strafe, and dodge, never the band", () => {
    for (const id of DOCTRINE_IDS) {
      const doctrine = DOCTRINES[id]
      const rush = profileForDoctrine(doctrine, "rush")
      const obedient = profileForDoctrine(doctrine, "obedient")
      const slow = profileForDoctrine(doctrine, "slow")
      expect(rush.aggression).toBeGreaterThan(obedient.aggression)
      expect(obedient.aggression).toBeGreaterThan(slow.aggression)
      expect(rush.strafeBias).toBeLessThan(obedient.strafeBias)
      expect(obedient.strafeBias).toBeLessThan(slow.strafeBias)
      expect(rush.dodgeThresholdMm).toBeGreaterThan(obedient.dodgeThresholdMm)
      expect(obedient.dodgeThresholdMm).toBeGreaterThan(slow.dodgeThresholdMm)
      for (const profile of [rush, obedient, slow]) {
        expect(profile.aggression).toBeGreaterThanOrEqual(0)
        expect(profile.aggression).toBeLessThanOrEqual(100)
        expect(profile.strafeBias).toBeGreaterThanOrEqual(0)
        expect(profile.strafeBias).toBeLessThanOrEqual(100)
      }
    }
  })

  test("rush and slow on the same doctrine stay inside its band", () => {
    for (const id of DOCTRINE_IDS) {
      const profile = profileForDoctrine(DOCTRINES[id], "obedient")
      const band = bandFor(profile, REACH)
      const above = band.ceilingMm + 300
      const below = Math.max(1, band.floorMm - 300)
      for (const temperament of TEMPERAMENTS) {
        expect(orderAt(id, temperament, above).verb).toBe("advance")
        expect(orderAt(id, temperament, below).verb).toBe("retreat")
      }
    }
  })

  test("a rush creature on Kite still kites, harder not closer", () => {
    const rush = profileForDoctrine(DOCTRINES.kite, "rush")
    const slow = profileForDoctrine(DOCTRINES.kite, "slow")
    expect(rush.preferredRangeMm).toBe(slow.preferredRangeMm)
    expect(rush.floorRangeMm).toBe(slow.floorRangeMm)
    expect(rush.ceilingRangeMm).toBe(slow.ceilingRangeMm)
    const band = bandFor(rush, REACH)
    expect(orderAt("kite", "rush", band.floorMm - 300).verb).toBe("retreat")
    expect(orderAt("kite", "rush", band.ceilingMm + 300).verb).toBe("advance")
  })
})

describe("Circle seeks the rear arc (FR-11, AC-11)", () => {
  test("Circle strafes toward the foe's back, Press does not", () => {
    const fight = createFight({
      seed: 7,
      bounds: BOUNDS,
      fighters: [
        fighter("home", 0, 500, { x: 0, z: -1000 }),
        fighter("away", 0, 0, { x: 1000, z: 0 }),
      ],
    })
    const me = fight.state.fighters[0]
    const foe = fight.state.fighters[1]
    const plain = strafeIntent(me, foe, 1)
    const rear = strafeIntent(me, foe, 1, true)
    expect(plain).not.toEqual(rear)
    expect(plain === HOLD && rear === HOLD).toBe(false)
    const circle = profileForDoctrine(DOCTRINES.circle, "obedient")
    const press = profileForDoctrine(DOCTRINES.press, "obedient")
    expect(circle.seeksRear).toBe(true)
    expect(press.seeksRear).toBe(false)
  })

  test("Circle holds a closer band than Kite on the same pair", () => {
    const circle = profileForDoctrine(DOCTRINES.circle, "obedient")
    const kite = profileForDoctrine(DOCTRINES.kite, "obedient")
    expect(bandFor(circle, REACH).preferredMm).toBeLessThan(
      bandFor(kite, REACH).preferredMm,
    )
    expect(bandFor(circle, REACH).floorMm).toBeLessThan(
      bandFor(kite, REACH).floorMm,
    )
  })
})
