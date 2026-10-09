import { describe, expect, test } from "bun:test"
import { meshGrid } from "./mesher"
import { sdSphere, vec3 } from "./sdf"
import { type PartField, type VoxelGrid, voxelize } from "./voxelizer"

function singleVoxelGrid(): VoxelGrid {
  // 1x1x1 part at (1,1,1): use a tiny SDF that contains exactly one center.
  const field: PartField = {
    name: "cube",
    sdf: (p) => sdSphere(vec3(1.5, 1.5, 1.5), 0.49)(p),
  }
  return voxelize([field], 3)
}

describe("meshGrid", () => {
  test("a lone voxel yields 6 faces: 24 vertices, 36 indices", () => {
    const meshes = meshGrid(singleVoxelGrid())
    expect(meshes).toHaveLength(1)
    const mesh = meshes[0]
    if (!mesh) throw new Error("missing mesh")
    expect(mesh.name).toBe("cube")
    expect(mesh.positions.length).toBe(6 * 4 * 3) // 24 vertices, 72 floats
    expect(mesh.indices.length).toBe(36)
  })

  test("all normals are unit-length and axis-aligned", () => {
    const meshes = meshGrid(singleVoxelGrid())
    const mesh = meshes[0]
    if (!mesh) throw new Error("missing mesh")
    const axes = new Set(mesh.normals.map((n) => Math.abs(Math.round(n))))
    expect(axes).toEqual(new Set([0, 1]))
    for (let i = 0; i < mesh.normals.length; i += 3) {
      const nx = mesh.normals[i] ?? 0
      const ny = mesh.normals[i + 1] ?? 0
      const nz = mesh.normals[i + 2] ?? 0
      expect(Math.abs(nx) + Math.abs(ny) + Math.abs(nz)).toBeCloseTo(1)
    }
  })

  test("greedy meshing merges the domino's long faces", () => {
    // Two adjacent voxels along x: 10 visible voxel-faces; greedy merges
    // top, bottom, and both long sides into 2x1 quads → 6 quads total
    // (naive emission would be 10 faces = 60 indices).
    const grid = twoVoxelGrid()
    const meshes = meshGrid(grid)
    const mesh = meshes[0]
    if (!mesh) throw new Error("missing mesh")
    expect(mesh.indices.length).toBe(6 * 6)
  })

  test("shared faces between different parts are hidden", () => {
    const grid = twoAdjacentPartGrid()
    const meshes = meshGrid(grid)
    expect(meshes).toHaveLength(2)
    for (const mesh of meshes) {
      expect(mesh.positions.length).toBe(5 * 4 * 3) // 5 faces, 20 vertices
      expect(mesh.indices.length).toBe(30) // 5 faces * 6 indices
    }
  })

  test("meshing is deterministic", () => {
    const a = meshGrid(twoVoxelGrid())
    const b = meshGrid(twoVoxelGrid())
    expect(b).toEqual(a)
  })

  test("every triangle wound consistently (normals point outward)", () => {
    const meshes = meshGrid(singleVoxelGrid())
    const mesh = meshes[0]
    if (!mesh) throw new Error("missing mesh")
    // Each face's cross-product normal must align with the vertex normal sign.
    for (let f = 0; f < mesh.indices.length; f += 6) {
      const i0 = mesh.indices[f] ?? 0
      const i1 = mesh.indices[f + 1] ?? 0
      const i2 = mesh.indices[f + 2] ?? 0
      const ax = (mesh.positions[i1 * 3] ?? 0) - (mesh.positions[i0 * 3] ?? 0)
      const ay =
        (mesh.positions[i1 * 3 + 1] ?? 0) - (mesh.positions[i0 * 3 + 1] ?? 0)
      const az =
        (mesh.positions[i1 * 3 + 2] ?? 0) - (mesh.positions[i0 * 3 + 2] ?? 0)
      const bx = (mesh.positions[i2 * 3] ?? 0) - (mesh.positions[i0 * 3] ?? 0)
      const by =
        (mesh.positions[i2 * 3 + 1] ?? 0) - (mesh.positions[i0 * 3 + 1] ?? 0)
      const bz =
        (mesh.positions[i2 * 3 + 2] ?? 0) - (mesh.positions[i0 * 3 + 2] ?? 0)
      const cx = ay * bz - az * by
      const cy = az * bx - ax * bz
      const cz = ax * by - ay * bx
      const nx = mesh.normals[i0 * 3] ?? 0
      const ny = mesh.normals[i0 * 3 + 1] ?? 0
      const nz = mesh.normals[i0 * 3 + 2] ?? 0
      expect(cx * nx + cy * ny + cz * nz).toBeGreaterThan(0)
    }
  })
})

// --- fixtures -------------------------------------------------------------

/** Two same-part voxels adjacent along x at (1,1,1) and (2,1,1). */
function twoVoxelGrid(): VoxelGrid {
  return {
    resolution: 4,
    parts: [
      {
        name: "domino",
        voxels: [
          [1, 1, 1],
          [2, 1, 1],
        ],
      },
    ],
  }
}

/** Two voxels adjacent along x but owned by different parts. */
function twoAdjacentPartGrid(): VoxelGrid {
  return {
    resolution: 4,
    parts: [
      { name: "body", voxels: [[1, 1, 1]] },
      { name: "head", voxels: [[2, 1, 1]] },
    ],
  }
}
