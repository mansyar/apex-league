import { expect, test } from "bun:test"
import { generate } from "../archetype"
import { FROND_GRID } from "../frond"
import { voxelize } from "../voxelizer"

// Partitioned per-archetype boundary fuzz, mirroring the tortoise set:
// same guarantee over the same seed range, split so bun test --parallel can
// spread voxelization across cores.
// Smoke slice (test-suite-speedup FR-3): the PR gate runs the first quarter of
// the seed list; `bun run test:fuzz` sets APEX_FUZZ_SWEEP=full for the rest.

const FULL_CHUNK = [20, 21, 22, 23, 24, 25, 26, 27, 28, 29]
const CHUNK =
  process.env.APEX_FUZZ_SWEEP === "full" ? FULL_CHUNK : FULL_CHUNK.slice(0, 3)

test("no frond voxel touches the grid boundary over the gate slice (first quarter of seeds; full list via APEX_FUZZ_SWEEP=full)", () => {
  const R = FROND_GRID - 1
  let violations = 0
  for (const seed of CHUNK) {
    const { build } = generate("frond", seed)
    const grid = voxelize(build.fields, FROND_GRID)
    for (const part of grid.parts) {
      for (const [x, y, z] of part.voxels) {
        if (x === 0 || y === 0 || z === 0 || x === R || y === R || z === R)
          violations++
      }
    }
  }
  expect(violations).toBe(0)
}, 120000)
