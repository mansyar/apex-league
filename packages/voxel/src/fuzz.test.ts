import { describe, expect, test } from "bun:test"
import { generate } from "./archetype"
import { AXOLOTL_GRID, axolotlTemplate } from "./axolotl"
import { BOVINE_GRID, bovineTemplate } from "./bovine"
import { DRAKE_GRID, drakeTemplate } from "./drake"
import { exportGlb } from "./glb"
import { meshGrid } from "./mesher"
import { sampleDna } from "./sample"
import { assertDnaInBounds } from "./schema"
import { voxelize } from "./voxelizer"

// Property tests over many seeds: the pipeline's guarantees must hold for
// every seed, not just curated ones. Kept under the suite's <10s budget.

const VOXEL_SIZE = 0.045
/** Spec NFR: committed creature GLBs stay within this budget (150 KiB). */
const GLB_BUDGET_BYTES = 150 * 1024

/** Full generation pipeline through the registry, exactly as exporters run it. */
function pipeline(archetypeId: string, seed: number) {
  const { dna, build, def } = generate(archetypeId, seed)
  const meshes = meshGrid(voxelize(build.fields, def.grid))
  return exportGlb({
    archetype: def.id,
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
      const { build } = generate("draconic", seed)
      const grid = voxelize(build.fields, DRAKE_GRID)
      for (const part of grid.parts) {
        for (const [x, y, z] of part.voxels) {
          if (x === 0 || y === 0 || z === 0 || x === R || y === R || z === R)
            violations++
        }
      }
    }
    expect(violations).toBe(0)
  }, 30000)

  test("8 seeds run the full pipeline within the GLB budget", () => {
    let maxBytes = 0
    for (let seed = 0; seed < 8; seed++) {
      const { glb, manifest } = pipeline("draconic", seed)
      const view = new DataView(glb.buffer, glb.byteOffset, glb.byteLength)
      expect(view.getUint32(0, true)).toBe(0x46546c67)
      expect(manifest.triCount).toBeGreaterThan(0)
      maxBytes = Math.max(maxBytes, glb.byteLength)
    }
    expect(maxBytes).toBeLessThanOrEqual(GLB_BUDGET_BYTES)
  }, 30000)
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
      const { build } = generate("bovine", seed)
      const grid = voxelize(build.fields, BOVINE_GRID)
      for (const part of grid.parts) {
        for (const [x, y, z] of part.voxels) {
          if (x === 0 || y === 0 || z === 0 || x === R || y === R || z === R)
            violations++
        }
      }
    }
    expect(violations).toBe(0)
  }, 30000)

  test("8 seeds run the full pipeline within the GLB budget", () => {
    let maxBytes = 0
    for (let seed = 0; seed < 8; seed++) {
      const { glb, manifest } = pipeline("bovine", seed)
      const view = new DataView(glb.buffer, glb.byteOffset, glb.byteLength)
      expect(view.getUint32(0, true)).toBe(0x46546c67)
      expect(manifest.triCount).toBeGreaterThan(0)
      maxBytes = Math.max(maxBytes, glb.byteLength)
    }
    expect(maxBytes).toBeLessThanOrEqual(GLB_BUDGET_BYTES)
  }, 30000)

  test("full pipeline is byte-identical per seed", () => {
    for (const seed of [3, 42, 99]) {
      const a = pipeline("bovine", seed)
      const b = pipeline("bovine", seed)
      expect(Buffer.from(a.glb).equals(Buffer.from(b.glb))).toBe(true)
      expect(a.manifest.glbHash).toBe(b.manifest.glbHash)
    }
  })
})

describe("axolotl fuzz", () => {
  test("200 seeds all produce in-bounds, distinct DNA", () => {
    const seen = new Set<string>()
    for (let seed = 0; seed < 200; seed++) {
      const dna = sampleDna(axolotlTemplate, seed)
      expect(assertDnaInBounds(dna, axolotlTemplate)).toEqual([])
      seen.add(JSON.stringify(dna))
    }
    expect(seen.size).toBeGreaterThan(190)
  })

  test("no voxel touches the grid boundary over 40 seeds", () => {
    const R = AXOLOTL_GRID - 1
    let violations = 0
    for (let seed = 0; seed < 40; seed++) {
      const { build } = generate("axolotl", seed)
      const grid = voxelize(build.fields, AXOLOTL_GRID)
      for (const part of grid.parts) {
        for (const [x, y, z] of part.voxels) {
          if (x === 0 || y === 0 || z === 0 || x === R || y === R || z === R)
            violations++
        }
      }
    }
    expect(violations).toBe(0)
  }, 30000)

  test("8 seeds run the full pipeline within the GLB budget", () => {
    let maxBytes = 0
    for (let seed = 0; seed < 8; seed++) {
      const { glb, manifest } = pipeline("axolotl", seed)
      const view = new DataView(glb.buffer, glb.byteOffset, glb.byteLength)
      expect(view.getUint32(0, true)).toBe(0x46546c67)
      expect(manifest.triCount).toBeGreaterThan(0)
      maxBytes = Math.max(maxBytes, glb.byteLength)
    }
    expect(maxBytes).toBeLessThanOrEqual(GLB_BUDGET_BYTES)
  }, 30000)

  test("full pipeline is byte-identical per seed", () => {
    for (const seed of [3, 42, 99]) {
      const a = pipeline("axolotl", seed)
      const b = pipeline("axolotl", seed)
      expect(Buffer.from(a.glb).equals(Buffer.from(b.glb))).toBe(true)
      expect(a.manifest.glbHash).toBe(b.manifest.glbHash)
    }
  }, 30000)
})
