import { expect, test } from "bun:test"
import { generate } from "../archetype"
import { GOLEM_GRID } from "../golem"
import { voxelize } from "../voxelizer"

const FULL_CHUNK = [30, 31, 32, 33, 34, 35, 36, 37, 38, 39]
const CHUNK =
  process.env.APEX_FUZZ_SWEEP === "full" ? FULL_CHUNK : FULL_CHUNK.slice(0, 3)

test("no golem voxel touches the grid boundary over the gate slice (full list via APEX_FUZZ_SWEEP=full)", () => {
  const R = GOLEM_GRID - 1
  let violations = 0
  for (const seed of CHUNK) {
    const { build } = generate("golem", seed)
    const grid = voxelize(build.fields, GOLEM_GRID)
    for (const part of grid.parts) {
      for (const [x, y, z] of part.voxels) {
        if (x === 0 || y === 0 || z === 0 || x === R || y === R || z === R)
          violations++
      }
    }
  }
  expect(violations).toBe(0)
}, 120000)
