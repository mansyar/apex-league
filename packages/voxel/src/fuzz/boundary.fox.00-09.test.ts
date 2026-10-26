import { expect, test } from "bun:test"
import { generate } from "../archetype"
import { FOX_GRID } from "../fox"
import { voxelize } from "../voxelizer"

// Partitioned per-archetype boundary fuzz, mirroring the tortoise set:
// same guarantee over the same seed range, split so bun test --parallel can
// spread voxelization across cores.
// Smoke slice (test-suite-speedup FR-3): the PR gate runs the first quarter of
// the seed list; `bun run test:fuzz` sets APEX_FUZZ_SWEEP=full for the rest.

const FULL_CHUNK = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
const CHUNK =
  process.env.APEX_FUZZ_SWEEP === "full" ? FULL_CHUNK : FULL_CHUNK.slice(0, 3)

test("no fox voxel touches the grid boundary over the gate slice (first quarter of seeds; full list via APEX_FUZZ_SWEEP=full)", () => {
  const R = FOX_GRID - 1
  let violations = 0
  for (const seed of CHUNK) {
    const { build } = generate("fox", seed)
    const grid = voxelize(build.fields, FOX_GRID)
    for (const part of grid.parts) {
      for (const [x, y, z] of part.voxels) {
        if (x === 0 || y === 0 || z === 0 || x === R || y === R || z === R)
          violations++
      }
    }
  }
  expect(violations).toBe(0)
}, 120000)
