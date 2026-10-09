import { describe, expect, test } from "bun:test"
import { generate } from "./archetype"
import {
  AXOLOTL_GRID,
  axolotlTemplate,
  buildAxolotl,
  sampleAxolotlDna,
} from "./axolotl"
import { assertDnaInBounds, type Dna, validateTemplate } from "./schema"
import { voxelize } from "./voxelizer"

// Axolotl archetype: the Water starter's body plan. Third archetype,
// completing the Fire/Water/Plant starter trio. Tests mirror the bovine
// suite's structure — the template owns the body plan and bounds; DNA only
// jitters within them.

describe("axolotlTemplate", () => {
  test("is schema-valid", () => {
    expect(validateTemplate(axolotlTemplate)).toEqual([])
  })

  test("declares 2 signature style slots with >=2 styles each", () => {
    for (const slot of ["gills", "dorsalFin"]) {
      const styles = axolotlTemplate.styles[slot]
      expect(styles).toBeDefined()
      expect(styles?.length ?? 0).toBeGreaterThanOrEqual(2)
    }
  })

  test("has unique style ids across slots", () => {
    const ids = Object.values(axolotlTemplate.styles).flatMap((styles) =>
      styles.map((s) => s.id),
    )
    expect(new Set(ids).size).toBe(ids.length)
  })

  test("uses a fixed Water-blue palette hue of 205 degrees", () => {
    expect(axolotlTemplate.palette.hue).toBe(205)
  })

  test("has a gilded rarity gate with weight 32", () => {
    const gate = axolotlTemplate.rarity[0]
    if (!gate) throw new Error("fixture missing rarity gate")
    expect(gate.id).toBe("gilded")
    expect(gate.weight).toBe(32)
  })
})

function makeDna(seed = 42): Dna {
  return sampleAxolotlDna(axolotlTemplate, seed)
}

describe("sampleAxolotlDna", () => {
  test("produces in-bounds DNA", () => {
    const dna = makeDna()
    expect(dna.archetype).toBe("axolotl")
    expect(assertDnaInBounds(dna, axolotlTemplate)).toEqual([])
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
      expect(assertDnaInBounds(dna, axolotlTemplate)).toEqual([])
    }
  })

  test("gilded frequency stays within 0.25x-4x of 1/weight over 2000 seeds", () => {
    const gate = axolotlTemplate.rarity[0]
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

describe("buildAxolotl", () => {
  test("produces the full part inventory", () => {
    const build = buildAxolotl(makeDna())
    const names = new Set(build.fields.map((f) => f.name))
    for (const required of ["body", "head", "leg", "tail", "dorsalFin"]) {
      expect(
        names.has(required) || [...names].some((n) => n.startsWith(required)),
      ).toBe(true)
    }
    // Gill fronds are the mandatory "axolotl read" — present for every seed.
    for (let seed = 1; seed <= 30; seed++) {
      const gillNames = buildAxolotl(makeDna(seed))
        .fields.map((f) => f.name)
        .filter((n) => n.startsWith("gill"))
      expect(gillNames.length).toBeGreaterThanOrEqual(2)
    }
    expect(build.fields.length).toBeGreaterThan(4)
  })

  test("defines pivots and colors for every part", () => {
    for (const seed of [42, 7, 99]) {
      const build = buildAxolotl(makeDna(seed))
      for (const field of build.fields) {
        expect(build.pivots[field.name]).toBeDefined()
        expect(build.colors[field.name]).toBeDefined()
      }
    }
  })

  test("hangs signature parts on the right rig parents", () => {
    const build = buildAxolotl(makeDna())
    const names = new Set(build.fields.map((f) => f.name))
    for (const field of build.fields) {
      if (field.name.startsWith("gill")) {
        expect(build.parents[field.name]).toBe("head")
      }
      if (field.name === "dorsalFin" || field.name === "tail") {
        expect(build.parents[field.name]).toBe("body")
      }
      if (field.name.startsWith("leg")) {
        expect(build.parents[field.name]).toBe("body")
      }
      expect(names.has(field.name)).toBe(true)
    }
    expect(build.parents.head).toBe("neck")
    expect(build.parents.neck).toBe("body")
  })

  test("voxelizes non-degenerately at AXOLOTL_GRID", () => {
    const build = buildAxolotl(makeDna())
    const grid = voxelize(build.fields, AXOLOTL_GRID)
    const total = grid.parts.reduce((sum, p) => sum + p.voxels.length, 0)
    expect(total).toBeGreaterThan(2000)
    for (const part of grid.parts) {
      expect(part.voxels.length).toBeGreaterThan(0)
    }
  })

  test("is deterministic for a fixed seed", () => {
    const a = buildAxolotl(makeDna(99))
    const b = buildAxolotl(makeDna(99))
    expect(JSON.stringify(a.fields)).toBe(JSON.stringify(b.fields))
    expect(a.pivots).toEqual(b.pivots)
    expect(a.colors).toEqual(b.colors)
  })
})

describe("axolotl archetype registry", () => {
  test("generate resolves the registered axolotl archetype", () => {
    const { dna, build, def } = generate("axolotl", 42)
    expect(def.id).toBe("axolotl")
    expect(dna.archetype).toBe("axolotl")
    expect(build.fields.length).toBeGreaterThan(0)
  })

  test("unknown archetype ids still fail loudly", () => {
    expect(() => generate("axolotll", 42)).toThrow()
  })
})
