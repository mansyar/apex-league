import { describe, expect, test } from "bun:test"
import { buildDrake, drakeTemplate } from "./drake"
import { sampleDna } from "./sample"
import { assertDnaInBounds, validateTemplate } from "./schema"
import { voxelize } from "./voxelizer"

describe("drake template", () => {
  test("is schema-valid", () => {
    expect(validateTemplate(drakeTemplate)).toEqual([])
  })

  test("declares signature style slots with 2+ styles each", () => {
    const horns = drakeTemplate.styles.horns
    if (!horns) throw new Error("missing horns slot")
    expect(horns.length).toBeGreaterThanOrEqual(2)
    const tail = drakeTemplate.styles.tail
    if (!tail) throw new Error("missing tail slot")
    expect(tail.length).toBeGreaterThanOrEqual(2)
  })

  test("palette is fire-toned", () => {
    const hue = drakeTemplate.palette.hue
    expect(hue).toBeGreaterThanOrEqual(0)
    expect(hue).toBeLessThanOrEqual(60)
  })

  test("declares a gilded rarity gate", () => {
    const gate = drakeTemplate.rarity[0]
    if (!gate) throw new Error("missing rarity gate")
    expect(gate.id).toBe("gilded")
    expect(gate.weight).toBeGreaterThanOrEqual(16)
  })
})

describe("sampleDna", () => {
  test("produces in-bounds DNA for the drake template", () => {
    const dna = sampleDna(drakeTemplate, 42)
    expect(dna.archetype).toBe("draconic")
    expect(assertDnaInBounds(dna, drakeTemplate)).toEqual([])
  })

  test("is deterministic per seed", () => {
    expect(sampleDna(drakeTemplate, 7)).toEqual(sampleDna(drakeTemplate, 7))
  })

  test("different seeds produce different DNA", () => {
    const dnas = new Set(
      [1, 2, 3, 4, 5].map((s) => JSON.stringify(sampleDna(drakeTemplate, s))),
    )
    expect(dnas.size).toBeGreaterThanOrEqual(4)
  })

  test("styles always come from the declared enums", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const dna = sampleDna(drakeTemplate, seed)
      for (const [slot, styleId] of Object.entries(dna.styles)) {
        const defs = drakeTemplate.styles[slot]
        if (!defs) throw new Error(`unknown slot ${slot}`)
        expect(defs.some((def) => def.id === styleId)).toBe(true)
      }
    }
  })

  test("gilded rarity holds roughly 1-in-weight over many seeds", () => {
    const gate = drakeTemplate.rarity[0]
    if (!gate) throw new Error("missing rarity gate")
    const n = 2000
    let gilded = 0
    for (let seed = 0; seed < n; seed++) {
      const dna = sampleDna(drakeTemplate, seed)
      if (dna.rarity.includes("gilded")) gilded++
    }
    const expected = n / gate.weight
    expect(gilded).toBeGreaterThan(expected * 0.25)
    expect(gilded).toBeLessThan(expected * 4)
  })
})

describe("buildDrake", () => {
  test("assembles the full drake part inventory", () => {
    const build = buildDrake(sampleDna(drakeTemplate, 42))
    const names = build.fields.map((field) => field.name)
    expect(names).toContain("body")
    expect(names).toContain("head")
    expect(
      names.filter((n) => n.startsWith("horn")).length,
    ).toBeGreaterThanOrEqual(2)
    expect(
      names.filter((n) => n.startsWith("tail")).length,
    ).toBeGreaterThanOrEqual(2)
    expect(names.filter((n) => n.startsWith("leg")).length).toBe(4)
    for (const name of names) {
      expect(build.pivots[name]).toBeDefined()
      expect(build.colors[name]).toBeDefined()
    }
  })

  test("voxelizes into a non-degenerate creature", () => {
    const build = buildDrake(sampleDna(drakeTemplate, 42))
    const grid = voxelize(build.fields, 48)
    const total = grid.parts.reduce((sum, part) => sum + part.voxels.length, 0)
    expect(total).toBeGreaterThan(2000)
    for (const part of grid.parts) {
      expect(part.voxels.length).toBeGreaterThan(0)
    }
  })

  test("is deterministic for a fixed seed", () => {
    const a = buildDrake(sampleDna(drakeTemplate, 7))
    const b = buildDrake(sampleDna(drakeTemplate, 7))
    expect(voxelize(a.fields, 24)).toEqual(voxelize(b.fields, 24))
    expect(a.pivots).toEqual(b.pivots)
    expect(a.colors).toEqual(b.colors)
  })
})
