import { expect, test } from "bun:test"
import { generate } from "../archetype"
import { voxelize } from "../voxelizer"

const FULL_CHUNK = [20, 21, 22, 23, 24, 25, 26, 27, 28, 29]
const CHUNK =
  process.env.APEX_FUZZ_SWEEP === "full" ? FULL_CHUNK : FULL_CHUNK.slice(0, 3)

test("ray seeds 20-29 never touch the voxel grid boundary", () => {
  for (const seed of CHUNK) {
    const { build, def } = generate("ray", seed)
    const r = def.grid - 1
    for (const part of voxelize(build.fields, def.grid).parts) {
      for (const [x, y, z] of part.voxels) {
        expect(
          x === 0 || y === 0 || z === 0 || x === r || y === r || z === r,
        ).toBe(false)
      }
    }
  }
}, 120000)
