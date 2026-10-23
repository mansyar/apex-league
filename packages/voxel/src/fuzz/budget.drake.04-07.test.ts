import { expect, test } from "bun:test"
import { generate } from "../archetype"
import { exportGlb } from "../glb"
import { meshGrid } from "../mesher"
import { voxelize } from "../voxelizer"

// Partitioned from fuzz.test.ts: same GLB budget guarantee over the same seed
// range, split so `bun test --parallel` can spread pipelines across cores.
// Smoke slice (test-suite-speedup FR-3): the PR gate runs the first quarter of
// the seed list; `bun run test:fuzz` sets APEX_FUZZ_SWEEP=full for the rest.

const FULL_SEEDS = [4, 5, 6, 7]
const SEEDS =
  process.env.APEX_FUZZ_SWEEP === "full" ? FULL_SEEDS : FULL_SEEDS.slice(0, 1)

const VOXEL_SIZE = 0.045
/**
 * Spec NFR: committed creature GLBs stay within this budget (320 KiB).
 * Raised from 150 KiB when per-vertex colour and ambient occlusion landed. The
 * budget is a tripwire on generator output, not a shipping constraint: the
 * client generates creatures at runtime and never fetches these files.
 */
const GLB_BUDGET_BYTES = 320 * 1024

/** Full generation pipeline through the registry, exactly as exporters run it. */
function pipeline(seed: number) {
  const { dna, build, def } = generate("draconic", seed)
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

test("drake seeds run the full pipeline within the GLB budget (gate slice; full list via APEX_FUZZ_SWEEP=full)", () => {
  let maxBytes = 0
  for (const seed of SEEDS) {
    const { glb, manifest } = pipeline(seed)
    const view = new DataView(glb.buffer, glb.byteOffset, glb.byteLength)
    expect(view.getUint32(0, true)).toBe(0x46546c67)
    expect(manifest.triCount).toBeGreaterThan(0)
    maxBytes = Math.max(maxBytes, glb.byteLength)
  }
  expect(maxBytes).toBeLessThanOrEqual(GLB_BUDGET_BYTES)
}, 120000)
