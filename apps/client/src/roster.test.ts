import { describe, expect, test } from "bun:test"
import { ARENA_FOOTPRINT, arenaFootprintScale } from "./roster"

describe("arenaFootprintScale", () => {
  test("scales the widest ground span up to the canonical slot", () => {
    expect(arenaFootprintScale({ x: 1, z: 2 })).toBeCloseTo(ARENA_FOOTPRINT / 2)
  })

  test("never divides by zero on a degenerate creature", () => {
    expect(arenaFootprintScale({ x: 0, z: 0 })).toBeCloseTo(
      ARENA_FOOTPRINT / 0.001,
    )
  })
})
