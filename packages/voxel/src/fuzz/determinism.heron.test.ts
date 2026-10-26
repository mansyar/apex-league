import { expect, test } from "bun:test"
import { generate } from "../archetype"
import { exportGlb } from "../glb"
import { meshGrid } from "../mesher"
import { voxelize } from "../voxelizer"

// Partitioned per-archetype determinism fuzz, mirroring the storm_hound set.
// Smoke slice (test-suite-speedup FR-3): the PR gate runs the first quarter of
// the seed list; `bun run test:fuzz` sets APEX_FUZZ_SWEEP=full for the rest.

const FULL_SEEDS = [3, 42, 99]
const SEEDS =
  process.env.APEX_FUZZ_SWEEP === "full" ? FULL_SEEDS : FULL_SEEDS.slice(0, 1)

const VOXEL_SIZE = 0.045

/** Full generation pipeline through the registry, exactly as exporters run it. */
function pipeline(seed: number) {
  const { dna, build, def } = generate("heron", seed)
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

test("full heron pipeline is byte-identical per seed (gate slice; full list via APEX_FUZZ_SWEEP=full)", () => {
  for (const seed of SEEDS) {
    const a = pipeline(seed)
    const b = pipeline(seed)
    expect(Buffer.from(a.glb).equals(Buffer.from(b.glb))).toBe(true)
    expect(a.manifest.glbHash).toBe(b.manifest.glbHash)
  }
}, 120000)
