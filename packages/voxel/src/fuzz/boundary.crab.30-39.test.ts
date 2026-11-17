import { expect, test } from "bun:test"
import { generate } from "../archetype"
import { CRAB_GRID } from "../crab"
import { voxelize } from "../voxelizer"

// Partitioned per-archetype boundary fuzz, mirroring the tortoise set:
// same guarantee over the same seed range, split so bun test --parallel can
// spread voxelization across cores.
// Smoke slice (test-suite-speedup FR-3): the PR gate runs the first quarter of
// the seed list; `bun run test:fuzz` sets APEX_FUZZ_SWEEP=full for the rest.

const FULL_CHUNK = [30, 31, 32, 33, 34, 35, 36, 37, 38, 39]
// PR gate keeps the three-seed smoke prefix and adds seed 37 (the nightly
// regression seed); the full sweep still covers all ten seeds unchanged.
const SMOKE_CHUNK = [30, 31, 32, 37]
const CHUNK = process.env.APEX_FUZZ_SWEEP === "full" ? FULL_CHUNK : SMOKE_CHUNK

test("no crab voxel touches the grid boundary over the gate slice (first quarter of seeds; full list via APEX_FUZZ_SWEEP=full)", () => {
  const R = CRAB_GRID - 1
  let violations = 0
  for (const seed of CHUNK) {
    const { build } = generate("crab", seed)
    const grid = voxelize(build.fields, CRAB_GRID)
    for (const part of grid.parts) {
      for (const [x, y, z] of part.voxels) {
        if (x === 0 || y === 0 || z === 0 || x === R || y === R || z === R)
          violations++
      }
    }
  }
  expect(violations).toBe(0)
}, 120000)

// Explicit, always-on regression for the nightly failure at seed 37: the
// pre-fix generator put four leg voxels on y = 0 here ("Received: 4"); the
// foot-floor fix keeps every voxel off 0 and CRAB_GRID - 1.
test("crab boundary regression: seed 37 keeps every voxel off 0 and CRAB_GRID - 1", () => {
  const R = CRAB_GRID - 1
  const { build } = generate("crab", 37)
  const grid = voxelize(build.fields, CRAB_GRID)
  let violations = 0
  for (const part of grid.parts) {
    for (const [x, y, z] of part.voxels) {
      if (x === 0 || y === 0 || z === 0 || x === R || y === R || z === R)
        violations++
    }
  }
  expect(violations).toBe(0)
}, 120000)
