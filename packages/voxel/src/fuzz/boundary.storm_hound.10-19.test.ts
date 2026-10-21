import { expect, test } from "bun:test"
import { generate } from "../archetype"
import { STORM_HOUND_GRID } from "../storm_hound"
import { voxelize } from "../voxelizer"

// Partitioned from fuzz.test.ts: same boundary guarantee over the same seed
// range, split so bun test --parallel can spread voxelization across cores.
// Coverage is unchanged: every seed is asserted.

const CHUNK = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19]

test("no storm hound voxel touches the grid boundary over seeds 10-19", () => {
  const R = STORM_HOUND_GRID - 1
  let violations = 0
  for (const seed of CHUNK) {
    const { build } = generate("storm_hound", seed)
    const grid = voxelize(build.fields, STORM_HOUND_GRID)
    for (const part of grid.parts) {
      for (const [x, y, z] of part.voxels) {
        if (x === 0 || y === 0 || z === 0 || x === R || y === R || z === R)
          violations++
      }
    }
  }
  expect(violations).toBe(0)
}, 120000)
