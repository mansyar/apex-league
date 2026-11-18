import { expect, test } from "bun:test"
import { generate } from "../archetype"
import { voxelize } from "../voxelizer"

const FULL_CHUNK = [30, 31, 32, 33, 34, 35, 36, 37, 38, 39]
const CHUNK =
  process.env.APEX_FUZZ_SWEEP === "full" ? FULL_CHUNK : FULL_CHUNK.slice(0, 3)

test("jerboa seeds 30-39 never touch the voxel grid boundary", () => {
  for (const seed of CHUNK) {
    const { build, def } = generate("jerboa", seed)
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
