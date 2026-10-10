import { expect, test } from "bun:test"
import { generate } from "../archetype"
import { DRAKE_GRID } from "../drake"
import { voxelize } from "../voxelizer"

// Partitioned from fuzz.test.ts: same boundary guarantee over the same seed
// range, split so bun test --parallel can spread voxelization across cores.
// Coverage is unchanged: every seed is asserted.

const CHUNK = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

test("no drake voxel touches the grid boundary over seeds 0-9", () => {
  const R = DRAKE_GRID - 1
  let violations = 0
  for (const seed of CHUNK) {
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
