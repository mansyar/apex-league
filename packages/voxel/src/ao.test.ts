import { describe, expect, test } from "bun:test"
import { AO_FLOOR, aoFactor, aoLevel, packAo, unpackAo } from "./ao"

describe("ambient occlusion level", () => {
  test("both side neighbours occlude the corner completely", () => {
    expect(aoLevel(1, 0, 1)).toBe(0)
    expect(aoLevel(1, 1, 1)).toBe(0)
  })

  test("a side plus the diagonal is a single step of occlusion", () => {
    expect(aoLevel(1, 1, 0)).toBe(1)
    expect(aoLevel(0, 1, 1)).toBe(1)
  })

  test("a lone side, or a lone diagonal, is partial occlusion", () => {
    expect(aoLevel(1, 0, 0)).toBe(2)
    expect(aoLevel(0, 1, 0)).toBe(2)
    expect(aoLevel(0, 0, 1)).toBe(2)
  })

  test("an open corner is fully lit", () => {
    expect(aoLevel(0, 0, 0)).toBe(3)
  })

  test("the rule is symmetric in the two side neighbours", () => {
    for (const corner of [0, 1]) {
      for (const left of [0, 1]) {
        for (const right of [0, 1]) {
          expect(aoLevel(left, corner, right)).toBe(
            aoLevel(right, corner, left),
          )
        }
      }
    }
  })

  test("only four levels exist and none exceeds full brightness", () => {
    const levels = new Set<number>()
    for (const corner of [0, 1]) {
      for (const left of [0, 1]) {
        for (const right of [0, 1]) {
          levels.add(aoLevel(left, corner, right))
        }
      }
    }
    expect([...levels].sort()).toEqual([0, 1, 2, 3])
  })
})

describe("ambient occlusion factor", () => {
  test("full brightness is exactly 1 and the darkest level is the floor", () => {
    expect(aoFactor(3)).toBe(1)
    expect(aoFactor(0)).toBe(AO_FLOOR)
  })

  test("levels are strictly increasing and never exceed 1", () => {
    for (let level = 1; level <= 3; level++) {
      expect(aoFactor(level)).toBeGreaterThan(aoFactor(level - 1))
      expect(aoFactor(level)).toBeLessThanOrEqual(1)
    }
  })

  test("the floor stays subtle — no level drops below 0.7", () => {
    expect(AO_FLOOR).toBeGreaterThanOrEqual(0.7)
    expect(AO_FLOOR).toBeLessThan(0.8)
  })
})

describe("packed corner signatures", () => {
  test("four levels round-trip through one integer", () => {
    const signature = packAo([3, 2, 1, 0])
    expect(unpackAo(signature)).toEqual([3, 2, 1, 0])
  })

  test("every combination round-trips and fits in a byte", () => {
    for (let a0 = 0; a0 < 4; a0++) {
      for (let a1 = 0; a1 < 4; a1++) {
        for (let a2 = 0; a2 < 4; a2++) {
          for (let a3 = 0; a3 < 4; a3++) {
            const sig = packAo([a0, a1, a2, a3])
            expect(sig).toBeLessThan(256)
            expect(unpackAo(sig)).toEqual([a0, a1, a2, a3])
          }
        }
      }
    }
  })

  test("distinct signatures never collide", () => {
    const seen = new Set<number>()
    for (let a0 = 0; a0 < 4; a0++) {
      for (let a1 = 0; a1 < 4; a1++) {
        for (let a2 = 0; a2 < 4; a2++) {
          for (let a3 = 0; a3 < 4; a3++) {
            const sig = packAo([a0, a1, a2, a3])
            expect(seen.has(sig)).toBe(false)
            seen.add(sig)
          }
        }
      }
    }
    expect(seen.size).toBe(256)
  })
})
