import { describe, expect, test } from "bun:test"
import { meshGrid } from "./mesher"
import type { VoxelGrid } from "./voxelizer"

type Cell = [number, number, number]

function gridOf(resolution: number, cells: Cell[]): VoxelGrid {
  return { resolution, parts: [{ name: "body", voxels: cells }] }
}

/** Solid cells of an axis-aligned box, used to build simple fixtures. */
function box(from: Cell, to: Cell): Cell[] {
  const cells: Cell[] = []
  for (let x = from[0]; x <= to[0]; x++) {
    for (let y = from[1]; y <= to[1]; y++) {
      for (let z = from[2]; z <= to[2]; z++) cells.push([x, y, z])
    }
  }
  return cells
}

const mesh = (grid: VoxelGrid) => {
  const parts = meshGrid(grid)
  const part = parts[0]
  if (!part) throw new Error("no part")
  return part
}

/** Number of quads whose normal points along +axis. */
function quadsFacing(
  part: ReturnType<typeof mesh>,
  axis: number,
  sign: number,
): number {
  let count = 0
  for (let v = 0; v < part.normals.length; v += 3) {
    if (part.normals[v + axis] === sign) count++
  }
  return count / 4
}

describe("ambient occlusion in the mesher", () => {
  test("an isolated voxel is fully lit on all six faces", () => {
    const part = mesh(gridOf(5, [[2, 2, 2]]))
    expect(part.ao).toHaveLength(part.positions.length / 3)
    expect(part.ao.every((a) => a === 1)).toBe(true)
  })

  test("a flat open plate stays a single merged quad", () => {
    const part = mesh(gridOf(8, box([1, 0, 1], [6, 0, 6])))
    // Nothing above or beside the top plane, so every corner is exposed and
    // the merge is free to span the whole plate.
    expect(quadsFacing(part, 1, 1)).toBe(1)
    expect(part.ao.every((a) => a === 1)).toBe(true)
  })

  test("a wall splits the plate's top face where it shadows", () => {
    const floor = box([1, 0, 1], [6, 0, 6])
    const wall = box([1, 1, 1], [1, 2, 6])
    const part = mesh(gridOf(8, [...floor, ...wall]))

    // The wall's shadow changes the corner signature along x, so the top
    // plane can no longer merge into one quad.
    expect(quadsFacing(part, 1, 1)).toBeGreaterThan(1)
    expect(part.ao.some((a) => a < 1)).toBe(true)
  })

  test("occlusion is symmetric left-to-right on a mirrored fixture", () => {
    const mirror = (cells: Cell[], res: number): Cell[] =>
      cells.map(([x, y, z]) => [res - 1 - x, y, z])
    const base: Cell[] = [...box([1, 0, 3], [3, 0, 5]), [2, 1, 4], [2, 2, 4]]
    const left = mesh(gridOf(7, base))
    const right = mesh(gridOf(7, mirror(base, 7)))

    // Same multiset of AO factors on both sides of the mirror line.
    const tally = (part: ReturnType<typeof mesh>) =>
      part.ao
        .map((a) => a.toFixed(3))
        .sort()
        .join(",")
    expect(tally(left)).toBe(tally(right))
  })

  test("every AO factor is in (0, 1]", () => {
    const part = mesh(
      gridOf(8, [...box([1, 0, 1], [5, 0, 5]), ...box([2, 1, 2], [3, 3, 3])]),
    )
    for (const a of part.ao) {
      expect(a).toBeGreaterThan(0)
      expect(a).toBeLessThanOrEqual(1)
    }
  })

  test("quads split along the darker diagonal to avoid anisotropy", () => {
    const floor = box([1, 0, 1], [6, 0, 6])
    const wall = box([1, 1, 1], [1, 2, 6])
    const part = mesh(gridOf(8, [...floor, ...wall]))

    let checked = 0
    for (let quad = 0; quad * 4 < part.ao.length; quad++) {
      const a0 = part.ao[quad * 4] ?? 1
      const a1 = part.ao[quad * 4 + 1] ?? 1
      const a2 = part.ao[quad * 4 + 2] ?? 1
      const a3 = part.ao[quad * 4 + 3] ?? 1
      const tri = part.indices.slice(quad * 6, quad * 6 + 6)
      if (a0 + a2 > a1 + a3) {
        // Diagonal 1-3: the split runs through the brighter pair's opposite.
        expect(tri).toEqual([
          quad * 4,
          quad * 4 + 1,
          quad * 4 + 3,
          quad * 4 + 1,
          quad * 4 + 2,
          quad * 4 + 3,
        ])
        checked++
      } else {
        expect(tri).toEqual([
          quad * 4,
          quad * 4 + 1,
          quad * 4 + 2,
          quad * 4,
          quad * 4 + 2,
          quad * 4 + 3,
        ])
      }
    }
    // The fixture must actually exercise the flipped branch, or the test is
    // asserting nothing.
    expect(checked).toBeGreaterThan(0)
  })

  test("AO is deterministic across runs", () => {
    const cells = [...box([1, 0, 1], [5, 0, 5]), ...box([2, 1, 2], [4, 3, 4])]
    expect(mesh(gridOf(8, cells))).toEqual(mesh(gridOf(8, cells)))
  })
})
