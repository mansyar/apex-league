import { describe, expect, test } from "bun:test"
import { BOVINE_GRID, bovineTemplate, buildBovine } from "./bovine"
import { buildDrake, DRAKE_GRID, drakeTemplate } from "./drake"
import { exportGlb } from "./glb"
import { meshGrid } from "./mesher"
import { sampleDna } from "./sample"
import { assertDnaInBounds } from "./schema"
import { voxelize } from "./voxelizer"

// Property tests over many seeds: the pipeline's guarantees must hold for
// every seed, not just curated ones. Kept under the suite's <10s budget.

const VOXEL_SIZE = 0.045
/** Spec NFR: committed creature GLBs stay within this budget. */
const GLB_BUDGET_BYTES = 150 * 1024

function pipeline(seed: number) {
  const dna = sampleDna(drakeTemplate, seed)
  const build = buildDrake(dna)
  const grid = voxelize(build.fields, DRAKE_GRID)
  const meshes = meshGrid(grid)
  return exportGlb({
    archetype: drakeTemplate.id,
    seed,
    dnaJson: JSON.stringify(dna),
    voxelSize: VOXEL_SIZE,
    colors: build.colors,
    pivots: build.pivots,
    parts: meshes,
  })
}

describe("drake fuzz", () => {
  test("200 seeds all produce in-bounds, distinct DNA", () => {
    const seen = new Set<string>()
    for (let seed = 0; seed < 200; seed++) {
      const dna = sampleDna(drakeTemplate, seed)
      expect(assertDnaInBounds(dna, drakeTemplate)).toEqual([])
      seen.add(JSON.stringify(dna))
    }
    expect(seen.size).toBeGreaterThan(190)
  })

  test("no voxel touches the grid boundary over 40 seeds", () => {
    const R = DRAKE_GRID - 1
    let violations = 0
    for (let seed = 0; seed < 40; seed++) {
      const build = buildDrake(sampleDna(drakeTemplate, seed))
      const grid = voxelize(build.fields, DRAKE_GRID)
      for (const part of grid.parts) {
        for (const [x, y, z] of part.voxels) {
          if (x === 0 || y === 0 || z === 0 || x === R || y === R || z === R)
            violations++
        }
      }
    }
    expect(violations).toBe(0)
  }, 15000)

  test("8 seeds run the full pipeline within the GLB budget", () => {
    let maxBytes = 0
    for (let seed = 0; seed < 8; seed++) {
      const { glb, manifest } = pipeline(seed)
      const view = new DataView(glb.buffer, glb.byteOffset, glb.byteLength)
      expect(view.getUint32(0, true)).toBe(0x46546c67)
      expect(manifest.triCount).toBeGreaterThan(0)
      maxBytes = Math.max(maxBytes, glb.byteLength)
    }
    expect(maxBytes).toBeLessThanOrEqual(GLB_BUDGET_BYTES)
  }, 15000)
})

describe("bovine fuzz", () => {
  test("200 seeds all produce in-bounds, distinct DNA", () => {
    const seen = new Set<string>()
    for (let seed = 0; seed < 200; seed++) {
      const dna = sampleDna(bovineTemplate, seed)
      expect(assertDnaInBounds(dna, bovineTemplate)).toEqual([])
      seen.add(JSON.stringify(dna))
    }
    expect(seen.size).toBeGreaterThan(190)
  })

  test("no voxel touches the grid boundary over 40 seeds", () => {
    const R = BOVINE_GRID - 1
    let violations = 0
    for (let seed = 0; seed < 40; seed++) {
      const build = buildBovine(sampleDna(bovineTemplate, seed))
      const grid = voxelize(build.fields, BOVINE_GRID)
      for (const part of grid.parts) {
        for (const [x, y, z] of part.voxels) {
          if (x === 0 || y === 0 || z === 0 || x === R || y === R || z === R)
            violations++
        }
      }
    }
    expect(violations).toBe(0)
  }, 15000)

  test("8 seeds run the full pipeline within the GLB budget", () => {
    let maxBytes = 0
    for (let seed = 0; seed < 8; seed++) {
      const dna = sampleDna(bovineTemplate, seed)
      const build = buildBovine(dna)
      const meshes = meshGrid(voxelize(build.fields, BOVINE_GRID))
      const { glb, manifest } = exportGlb({
        archetype: bovineTemplate.id,
        seed,
        dnaJson: JSON.stringify(dna),
        voxelSize: VOXEL_SIZE,
        colors: build.colors,
        pivots: build.pivots,
        parts: meshes,
      })
      const view = new DataView(glb.buffer, glb.byteOffset, glb.byteLength)
      expect(view.getUint32(0, true)).toBe(0x46546c67)
      expect(manifest.triCount).toBeGreaterThan(0)
      maxBytes = Math.max(maxBytes, glb.byteLength)
    }
    expect(maxBytes).toBeLessThanOrEqual(GLB_BUDGET_BYTES)
  }, 15000)

  test("full pipeline is byte-identical per seed", () => {
    for (const seed of [3, 42, 99]) {
      const dna = sampleDna(bovineTemplate, seed)
      const build = buildBovine(dna)
      const run = () =>
        exportGlb({
          archetype: bovineTemplate.id,
          seed,
          dnaJson: JSON.stringify(dna),
          voxelSize: VOXEL_SIZE,
          colors: build.colors,
          pivots: build.pivots,
          parts: meshGrid(voxelize(build.fields, BOVINE_GRID)),
        })
      const a = run()
      const b = run()
      expect(Buffer.from(a.glb).equals(Buffer.from(b.glb))).toBe(true)
      expect(a.manifest.glbHash).toBe(b.manifest.glbHash)
    }
  })
})
