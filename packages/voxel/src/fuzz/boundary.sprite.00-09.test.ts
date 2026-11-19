import { expect, test } from "bun:test"
import { generate } from "../archetype"
import { SPRITE_GRID } from "../sprite"
import { voxelize } from "../voxelizer"

// Roster Wave 2 boundary fuzz (gate slice first three seeds; full list via
// APEX_FUZZ_SWEEP=full). Mirrors the fox shards so parallel tests split work.
const FULL_CHUNK = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
const CHUNK =
  process.env.APEX_FUZZ_SWEEP === "full" ? FULL_CHUNK : FULL_CHUNK.slice(0, 3)

test("no sprite voxel touches the grid boundary over the gate slice (full list via APEX_FUZZ_SWEEP=full)", () => {
  const R = SPRITE_GRID - 1
  let violations = 0
  for (const seed of CHUNK) {
    const { build } = generate("sprite", seed)
    const grid = voxelize(build.fields, SPRITE_GRID)
    for (const part of grid.parts) {
      for (const [x, y, z] of part.voxels) {
        if (x === 0 || y === 0 || z === 0 || x === R || y === R || z === R)
          violations++
      }
    }
  }
  expect(violations).toBe(0)
}, 120000)
