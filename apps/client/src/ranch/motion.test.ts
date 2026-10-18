import { describe, expect, test } from "bun:test"
import type { CreatureConditions } from "@apex/sim"
import { EXHAUSTED_ENERGY, SICK_HEALTH } from "@apex/sim"
import { gaitIntensity, smoothstep, standPointOnLineTo } from "../scene-logic"
import { moodModeFrom } from "./mood"

const conditions = (over: Partial<CreatureConditions>): CreatureConditions => ({
  hunger: 50,
  energy: 100,
  health: 100,
  mood: 50,
  bond: 0,
  ...over,
})

describe("smoothstep", () => {
  test("returns 0 at k=0 and 1 at k=1", () => {
    expect(smoothstep(0)).toBe(0)
    expect(smoothstep(1)).toBe(1)
  })

  test("is symmetric around 0.5", () => {
    expect(smoothstep(0.5)).toBe(0.5)
    expect(smoothstep(0.25)).toBeCloseTo(1 - smoothstep(0.75))
  })

  test("rises monotonically", () => {
    expect(smoothstep(0.2)).toBeLessThan(smoothstep(0.6))
    expect(smoothstep(0.6)).toBeLessThan(smoothstep(0.9))
  })
})

describe("standPointOnLineTo", () => {
  test("stands on the creature→pile line, setback short of the pile", () => {
    // Creature at origin, pile 5 units east: stand 1.15 west of the pile.
    const spot = standPointOnLineTo(0, 0, 5, 0, 1.15)
    expect(spot.x).toBeCloseTo(3.85)
    expect(spot.z).toBeCloseTo(0)
  })

  test("keeps the setback along a diagonal approach", () => {
    const spot = standPointOnLineTo(0, 0, 3, 4, 1) // 5-unit diagonal
    expect(spot.x).toBeCloseTo(3 - (3 / 5) * 1)
    expect(spot.z).toBeCloseTo(4 - (4 / 5) * 1)
  })

  test("degenerate zero-distance approach falls back cleanly", () => {
    // Creature already at the pile: direction is undefined, the guard
    // substitutes a unit length so the spot lands on the pile itself.
    const spot = standPointOnLineTo(2, 2, 2, 2, 1.15)
    expect(spot.x).toBeCloseTo(2)
    expect(spot.z).toBeCloseTo(2)
  })
})

describe("moodModeFrom", () => {
  test("droopy wins when health is below the sickness line", () => {
    expect(
      moodModeFrom(conditions({ health: SICK_HEALTH - 1, energy: 100 })),
    ).toBe("droopy")
  })

  test("exactly-at-threshold health is not droopy", () => {
    expect(
      moodModeFrom(conditions({ health: SICK_HEALTH, energy: 100 })),
    ).not.toBe("droopy")
  })

  test("sluggish when energy is exhausted (and health is fine)", () => {
    expect(moodModeFrom(conditions({ energy: EXHAUSTED_ENERGY }))).toBe(
      "sluggish",
    )
    expect(moodModeFrom(conditions({ energy: EXHAUSTED_ENERGY - 1 }))).toBe(
      "sluggish",
    )
  })

  test("happy at mood 80 and above", () => {
    expect(moodModeFrom(conditions({ mood: 80 }))).toBe("happy")
    expect(moodModeFrom(conditions({ mood: 79 }))).toBe("normal")
  })

  test("normal when nothing bites", () => {
    expect(moodModeFrom(conditions({}))).toBe("normal")
  })
})

describe("gaitIntensity", () => {
  test("zero when not traveling", () => {
    expect(gaitIntensity(false, 3)).toBe(0)
  })

  test("eases out over the last 0.6 units", () => {
    expect(gaitIntensity(true, 0.6)).toBe(1)
    // Closer to the target = deeper into the ease-out, never above 1.
    expect(gaitIntensity(true, 0.2)).toBe(smoothstep(0.2 / 0.6))
    expect(gaitIntensity(true, 0.2)).toBeLessThan(gaitIntensity(true, 0.45))
    expect(gaitIntensity(true, 0.45)).toBeLessThan(1)
  })
})
