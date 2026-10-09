import {
  assertDnaInBounds,
  buildBovine,
  BOVINE_GRID,
  bovineTemplate,
  sampleDna,
  validateTemplate,
  type Dna,
} from "./bovine"
import { voxelize } from "./voxelizer"

function makeDna(seed = 42): Dna {
  return sampleDna(bovineTemplate, seed)
}

describe("bovineTemplate", () => {
  test("is schema-valid", () => {
    expect(validateTemplate(bovineTemplate)).toEqual([])
  })

  test("declares 3 signature style slots with >=2 styles each", () => {
    for (const slot of ["horns", "tail", "crest"]) {
      const styles = bovineTemplate.styles[slot]
      expect(styles).toBeDefined()
      expect(styles?.length ?? 0).toBeGreaterThanOrEqual(2)
    }
  })

  test("uses a fixed Plant-green palette hue", () => {
    expect(Number.isFinite(bovineTemplate.palette.hue)).toBe(true)
  })

  test("has a gilded rarity gate with a sane weight", () => {
    const gate = bovineTemplate.rarity[0]
    if (!gate) throw new Error("fixture missing rarity gate")
    expect(gate.id).toBe("gilded")
    expect(gate.weight).toBeGreaterThanOrEqual(16)
  })
})

describe("sampleBovineDna", () => {
  test("produces in-bounds DNA", () => {
    const dna = makeDna()
    expect(dna.archetype).toBe("bovine")
    expect(assertDnaInBounds(dna, bovineTemplate)).toEqual([])
  })

  test("is deterministic per seed", () => {
    expect(JSON.stringify(makeDna(7))).toBe(JSON.stringify(makeDna(7)))
  })

  test("diverges across seeds", () => {
    const dnas = [1, 2, 3, 4, 5].map((s) => JSON.stringify(makeDna(s)))
    expect(new Set(dnas).size).toBeGreaterThanOrEqual(4)
  })

  test("respects style enums over 30 seeds", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const dna = makeDna(seed)
      expect(assertDnaInBounds(dna, bovineTemplate)).toEqual([])
    }
  })

  test("gilded frequency stays within 0.25x-4x of 1/weight over 2000 seeds", () => {
    const gate = bovineTemplate.rarity[0]
    if (!gate) throw new Error("fixture missing rarity gate")
    let hits = 0
    for (let seed = 1; seed <= 2000; seed++) {
      if (makeDna(seed).rarity.includes("gilded")) hits++
    }
    const expected = 2000 / gate.weight
    expect(hits).toBeGreaterThanOrEqual(expected * 0.25)
    expect(hits).toBeLessThanOrEqual(expected * 4)
  })
})

describe("buildBovine", () => {
  test("produces the full part inventory", () => {
    const build = buildBovine(makeDna())
    const names = new Set(build.fields.map((f) => f.name))
    for (const required of ["body", "head", "legs"]) {
      expect(names.has(required) || [...names].some((n) => n.startsWith(required))).toBe(
        true,
      )
    }
    expect(build.fields.length).toBeGreaterThan(4)
  })

  test("defines pivots and colors for every part", () => {
    const build = buildBovine(makeDna())
    for (const field of build.fields) {
      expect(build.pivots[field.name]).toBeDefined()
      expect(build.colors[field.name]).toBeDefined()
    }
  })

  test("voxelizes non-degenerately at BOVINE_GRID", () => {
    const build = buildBovine(makeDna())
    const grid = voxelize(build.fields, BOVINE_GRID)
    const total = grid.parts.reduce((sum, p) => sum + p.voxels.length, 0)
    expect(total).toBeGreaterThan(2000)
    for (const part of grid.parts) {
      expect(part.voxels.length).toBeGreaterThan(0)
    }
  })

  test("is deterministic for a fixed seed", () => {
    const a = buildBovine(makeDna(99))
    const b = buildBovine(makeDna(99))
    expect(JSON.stringify(a.fields)).toBe(JSON.stringify(b.fields))
    expect(a.pivots).toEqual(b.pivots)
    expect(a.colors).toEqual(b.colors)
  })
})
