import { expect, test } from "bun:test"
import { generate } from "../archetype"
import { BOVINE_GRID } from "../bovine"
import { voxelize } from "../voxelizer"

// Partitioned from fuzz.test.ts: same boundary guarantee over the same seed
// range, split so bun test --parallel can spread voxelization across cores.
// Coverage is unchanged: every seed is asserted.

const CHUNK = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

test("no bovine voxel touches the grid boundary over seeds 0-9", () => {
  const R = BOVINE_GRID - 1
  let violations = 0
  for (const seed of CHUNK) {
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
}, 120000)
