import { expect, test } from "bun:test"
import { generate } from "../archetype"
import { exportGlb } from "../glb"
import { meshGrid } from "../mesher"
import { voxelize } from "../voxelizer"

const FULL_SEEDS = [4, 5, 6, 7]
const SEEDS =
  process.env.APEX_FUZZ_SWEEP === "full" ? FULL_SEEDS : FULL_SEEDS.slice(0, 1)
const GLB_BUDGET_BYTES = 320 * 1024

test("moth seeds 04-07 run the full pipeline within the GLB budget", () => {
  let maxBytes = 0
  for (const seed of SEEDS) {
    const { dna, build, def } = generate("moth", seed)
    const meshes = meshGrid(voxelize(build.fields, def.grid))
    const { glb, manifest } = exportGlb({
      archetype: def.id,
      seed,
      dnaJson: JSON.stringify(dna),
      voxelSize: 0.045,
      colors: build.colors,
      palettes: build.palettes,
      pivots: build.pivots,
      parts: meshes,
    })
    const view = new DataView(glb.buffer, glb.byteOffset, glb.byteLength)
    expect(view.getUint32(0, true)).toBe(0x46546c67)
    expect(manifest.triCount).toBeGreaterThan(0)
    maxBytes = Math.max(maxBytes, glb.byteLength)
  }
  expect(maxBytes).toBeLessThanOrEqual(GLB_BUDGET_BYTES)
}, 120000)
