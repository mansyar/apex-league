/**
 * The reach-derived telegraph's contract (FR-6, AC-6): a basic startup maps
 * to a short reach, a lance startup to a long one; collisions read the
 * longest threat deterministically; the wedge stays on the show floor and
 * narrows with reach; the ring pulse is pure progress math.
 */

import { describe, expect, test } from "bun:test"
import {
  DEFAULT_TELL_REACH_MM,
  estimateStartupMs,
  reachForStartupMs,
  STARTUP_REACH,
  TELL_INNER,
  TELL_MAX_OUTER,
  tellHalfAngle,
  tellOuterWorld,
  tellRing,
} from "./tell-scale"

describe("reachForStartupMs", () => {
  test("the table covers every authored startup, longest reach wins", () => {
    expect(STARTUP_REACH.length).toBeGreaterThan(10)
    const at = (ms: number): number => {
      const row = STARTUP_REACH.find((r) => r.startupMs === ms)
      if (!row) throw new Error(`no row for ${ms} ms`)
      return row.reachMm
    }
    expect(at(160)).toBe(420) // basic
    expect(at(260)).toBe(5200)
    // Collisions read the longest threat, never understating the blow.
    expect(at(300)).toBe(5600) // flame_charge over pebble_shot's 5,200
    expect(at(480)).toBe(6200) // storm_surge over zephyr_veil's 4,400
    expect(at(500)).toBe(6200) // sky_bolt over riptide/ion_wall
    expect(at(720)).toBe(6500) // pyre_lance / maelstrom
    expect(at(800)).toBe(6500) // tectonic_slam
  })

  test("basic estimates map short, lance estimates map long", () => {
    expect(reachForStartupMs(159)).toBe(420)
    expect(reachForStartupMs(729)).toBe(6500)
    expect(reachForStartupMs(708)).toBe(6500)
  })

  test("ties read the longer threat, deterministically", () => {
    // 550 ms sits halfway between tide_aegis (540/4,200) and the 560 group.
    expect(reachForStartupMs(550)).toBe(6200)
    expect(reachForStartupMs(550)).toBe(reachForStartupMs(550))
  })
})

describe("estimateStartupMs", () => {
  test("needs two samples and a positive span", () => {
    expect(estimateStartupMs(1, 32, 32, 20)).toBeUndefined()
    expect(estimateStartupMs(2, 64, 64, 20)).toBeUndefined()
    expect(estimateStartupMs(2, 32, 64, 0)).toBeUndefined()
  })

  test("a basic run estimates near 160 ms", () => {
    // elapsed 20..140 of a 160 ms startup: phaseT 32..223.
    expect(estimateStartupMs(7, 32, 223, 20)).toBe(160)
    expect(estimateStartupMs(2, 32, 64, 20)).toBe(159)
  })

  test("a lance run estimates near 720 ms and stays there", () => {
    // elapsed 20..700 of a 720 ms startup: phaseT 7..248.
    expect(estimateStartupMs(35, 7, 248, 20)).toBe(720)
    expect(estimateStartupMs(2, 7, 14, 20)).toBe(729)
  })
})

describe("tellOuterWorld", () => {
  test("short reach reads short, a lance reads long", () => {
    expect(tellOuterWorld(420, 220)).toBeCloseTo((420 + 220) * 0.0008)
    expect(tellOuterWorld(6500, 220)).toBe(TELL_MAX_OUTER)
  })

  test("the attacker's own radius widens the wedge", () => {
    expect(tellOuterWorld(420, 300)).toBeGreaterThan(tellOuterWorld(420, 180))
  })

  test("the wedge never collapses inside its inner radius", () => {
    expect(tellOuterWorld(0, 0)).toBeGreaterThan(TELL_INNER)
  })
})

describe("tellHalfAngle", () => {
  test("a short swing fans wide, a lance runs narrow", () => {
    const basic = tellHalfAngle(420)
    const lance = tellHalfAngle(6500)
    expect(basic).toBeGreaterThan(lance)
    expect(basic).toBeCloseTo(0.59, 1)
    expect(lance).toBeCloseTo(0.22, 2)
  })

  test("clamps at both ends", () => {
    expect(tellHalfAngle(0)).toBe(0.62)
    expect(tellHalfAngle(99999)).toBe(0.22)
  })
})

describe("tellRing", () => {
  test("sweeps inner to edge twice per startup, thinning as it travels", () => {
    const outer = 2.0
    const start = tellRing(0, outer)
    expect(start.radius).toBeCloseTo(TELL_INNER)
    const mid = tellRing(0.25, outer)
    expect(mid.radius).toBeCloseTo((TELL_INNER + outer) / 2)
    // The second pulse restarts at the body's ground.
    expect(tellRing(0.5, outer).radius).toBeCloseTo(TELL_INNER)
    expect(tellRing(0.99, outer).radius).toBeCloseTo(outer, 0)
    // Opacity fades along the sweep and swells with progress.
    expect(mid.opacity).toBeLessThan(tellRing(0.01, outer).opacity)
    expect(tellRing(0.74, outer).opacity).toBeGreaterThan(
      tellRing(0.24, outer).opacity,
    )
  })

  test("clamps progress without a clock", () => {
    expect(tellRing(-1, 2).radius).toBeCloseTo(TELL_INNER)
    // Past the end the progress clamps: the second pulse has completed and
    // the swell is back at full strength at the body's ground.
    expect(tellRing(2, 2).radius).toBeCloseTo(TELL_INNER)
    expect(tellRing(2, 2).opacity).toBe(0.5)
  })

  test("the default reach is the basic's", () => {
    expect(DEFAULT_TELL_REACH_MM).toBe(420)
  })
})
