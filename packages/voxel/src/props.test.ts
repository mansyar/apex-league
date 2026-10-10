import { describe, expect, test } from "bun:test"
import { generateProp, props } from "./props"
import { voxelize } from "./voxelizer"

const IDS = ["broadleafTree", "bush", "foodPile", "rock", "tuft"] as const
const VEGETATION = ["broadleafTree", "bush", "tuft"] as const

describe("prop registry", () => {
  test("registers exactly the five ranch props", () => {
    expect(Object.keys(props).sort()).toEqual([...IDS])
  })

  test("generates deterministically - same seed, identical voxels and colors", () => {
    for (const id of IDS) {
      const a = generateProp(id, 7)
      const b = generateProp(id, 7)
      expect(b.dna).toEqual(a.dna)
      // SDF fields are closures — compare their voxelized consequence.
      expect(voxelize(b.build.fields, b.def.grid)).toEqual(
        voxelize(a.build.fields, a.def.grid),
      )
      expect(b.build.colors).toEqual(a.build.colors)
    }
  })

  test("props are static: no pivots, no rig parents", () => {
    for (const id of IDS) {
      const { build } = generateProp(id, 42)
      expect(build.pivots).toEqual({})
      expect(build.parents).toEqual({})
    }
  })

  test("vegetation declares 2-3 hue variants", () => {
    for (const id of VEGETATION) {
      const def = props[id]
      if (!def) throw new Error(`missing prop ${id}`)
      expect(def.variants.length).toBeGreaterThanOrEqual(2)
      expect(def.variants.length).toBeLessThanOrEqual(3)
    }
  })

  test("vegetation hue variants all occur across seeds", () => {
    for (const id of VEGETATION) {
      const def = props[id]
      if (!def) throw new Error(`missing prop ${id}`)
      const seen = new Set<number>()
      for (let seed = 0; seed < 40; seed++) {
        seen.add(generateProp(id, seed).dna.hueVariant)
      }
      expect(seen.size).toBe(def.variants.length)
    }
  })

  test("scale jitters within bounded variation across seeds", () => {
    for (const id of IDS) {
      const scales: number[] = []
      for (let seed = 0; seed < 40; seed++) {
        scales.push(generateProp(id, seed).dna.scale)
      }
      const min = Math.min(...scales)
      const max = Math.max(...scales)
      // A visible but landscape-noise-sized range, never -1 (full growth
      // delay) and never +1 (never exceeds the authored silhouette).
      expect(min).toBeGreaterThan(0.8)
      expect(max).toBeLessThan(1.2)
      expect(max - min).toBeGreaterThan(0.05)
    }
  })

  test("fields voxelize into a grounded silhouette for every prop", () => {
    for (const id of IDS) {
      const def = props[id]
      if (!def) throw new Error(`missing prop ${id}`)
      const { build } = generateProp(id, 42)
      const grid = voxelize(build.fields, def.grid)
      expect(grid.parts.length).toBeGreaterThan(0)
      for (const part of grid.parts) {
        expect(part.voxels.length).toBeGreaterThan(0)
        // Grounded: no voxel reaches below the floor plane (y < 0).
        for (const v of part.voxels) {
          expect(v[1]).toBeGreaterThanOrEqual(0)
        }
      }
    }
  })
})
