import { expect, test } from "bun:test"
import { generate } from "../archetype"
import { exportGlb } from "../glb"
import { meshGrid } from "../mesher"
import { voxelize } from "../voxelizer"

// Partitioned from fuzz.test.ts: determinism guarantee for one archetype.
// un test --parallel runs this alongside the other fuzz partitions.

const VOXEL_SIZE = 0.045

/** Full generation pipeline through the registry, exactly as exporters run it. */
function pipeline(seed: number) {
  const { dna, build, def } = generate("storm_hound", seed)
  const meshes = meshGrid(voxelize(build.fields, def.grid))
  return exportGlb({
    archetype: def.id,
    seed,
    dnaJson: JSON.stringify(dna),
    voxelSize: VOXEL_SIZE,
    colors: build.colors,
    palettes: build.palettes,
    pivots: build.pivots,
    parts: meshes,
  })
}

test("full storm hound pipeline is byte-identical per seed", () => {
  for (const seed of [3, 42, 99]) {
    const a = pipeline(seed)
    const b = pipeline(seed)
    expect(Buffer.from(a.glb).equals(Buffer.from(b.glb))).toBe(true)
    expect(a.manifest.glbHash).toBe(b.manifest.glbHash)
  }
}, 120000)
