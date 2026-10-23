import { expect, test } from "bun:test"
import { generate } from "../archetype"
import { FALCON_GRID } from "../falcon"
import { voxelize } from "../voxelizer"

// Partitioned per-archetype boundary fuzz, mirroring the storm_hound set:
// same guarantee over the same seed range, split so bun test --parallel can
// spread voxelization across cores.

const CHUNK = [20, 21, 22, 23, 24, 25, 26, 27, 28, 29]

test("no falcon voxel touches the grid boundary over seeds 20-29", () => {
  const R = FALCON_GRID - 1
  let violations = 0
  for (const seed of CHUNK) {
    const { build } = generate("falcon", seed)
    const grid = voxelize(build.fields, FALCON_GRID)
    for (const part of grid.parts) {
      for (const [x, y, z] of part.voxels) {
        if (x === 0 || y === 0 || z === 0 || x === R || y === R || z === R)
          violations++
      }
    }
  }
  expect(violations).toBe(0)
}, 120000)
