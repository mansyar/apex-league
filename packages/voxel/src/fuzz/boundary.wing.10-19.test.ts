import { expect, test } from "bun:test"
import { generate } from "../archetype"
import { voxelize } from "../voxelizer"
import { WING_GRID } from "../wing"

const FULL_CHUNK = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
const CHUNK =
  process.env.APEX_FUZZ_SWEEP === "full" ? FULL_CHUNK : FULL_CHUNK.slice(0, 3)

test("no wing voxel touches the grid boundary over the gate slice (full list via APEX_FUZZ_SWEEP=full)", () => {
  const R = WING_GRID - 1
  let violations = 0
  for (const seed of CHUNK) {
    const { build } = generate("wing", seed)
    const grid = voxelize(build.fields, WING_GRID)
    for (const part of grid.parts) {
      for (const [x, y, z] of part.voxels) {
        if (x === 0 || y === 0 || z === 0 || x === R || y === R || z === R)
          violations++
      }
    }
  }
  expect(violations).toBe(0)
}, 120000)
