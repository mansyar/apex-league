import { describe, expect, test } from "bun:test"
import { meshGrid } from "./mesher"
import { generateProp, props } from "./props"
import { voxelize } from "./voxelizer"

// Props share the surface pipeline, so they must pick up occlusion too —
// otherwise a rock sits in the ranch with flat faces beside a shaded creature.
describe("props inherit ambient occlusion", () => {
  for (const propId of Object.keys(props)) {
    test(`${propId} has baked occlusion inside the legal range`, () => {
      const { build, def } = generateProp(propId, 42)
      const parts = meshGrid(voxelize(build.fields, def.grid))
      let shaded = 0
      for (const part of parts) {
        expect(part.ao.length).toBe(part.positions.length / 3)
        for (const a of part.ao) {
          expect(a).toBeGreaterThan(0)
          expect(a).toBeLessThanOrEqual(1)
          if (a < 1) shaded++
        }
      }
      expect(shaded).toBeGreaterThan(0)
    })
  }
})
