import { expect, test } from "bun:test"
import { generate } from "../archetype"
import { AXOLOTL_GRID } from "../axolotl"
import { voxelize } from "../voxelizer"

// Partitioned from fuzz.test.ts: same boundary guarantee over the same seed
// range, split so bun test --parallel can spread voxelization across cores.
// Coverage is unchanged: every seed is asserted.

const CHUNK = [30, 31, 32, 33, 34, 35, 36, 37, 38, 39]

test("no axolotl voxel touches the grid boundary over seeds 30-39", () => {
  const R = AXOLOTL_GRID - 1
  let violations = 0
  for (const seed of CHUNK) {
    const { build } = generate("axolotl", seed)
    const grid = voxelize(build.fields, AXOLOTL_GRID)
    for (const part of grid.parts) {
      for (const [x, y, z] of part.voxels) {
        if (x === 0 || y === 0 || z === 0 || x === R || y === R || z === R)
          violations++
      }
    }
  }
  expect(violations).toBe(0)
}, 30000)
