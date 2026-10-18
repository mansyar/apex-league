/**
 * Colour-class plumbing (FR1/FR2): a voxel carries an opaque surface class,
 * greedy merging refuses to cross class boundaries, and the mesher hands the
 * class of every emitted vertex to the consumer.
 *
 * Class ids are NOT colours — they are indices an archetype maps to palette
 * entries. Keeping ids in the mesh (instead of resolved RGB) is what lets the
 * same geometry be baked grey for silhouette review or be multiplied by
 * ambient occlusion later without a second meshing pass.
 */
import { describe, expect, test } from "bun:test"
import { type MeshePart, meshGrid } from "./mesher"
import { type Sdf, sdSphere, type Vec3, vec3 } from "./sdf"
import { bakeVertexColors } from "./vertex-color"
import { type PartField, type VoxelGrid, voxelize } from "./voxelizer"

/** Exactly one contained voxel, at cell (1,1,1). */
const oneCell: Sdf = (p) => sdSphere(vec3(1.5, 1.5, 1.5), 0.49)(p)

/** Exactly two contained voxels, adjacent along x: (1,1,1) and (2,1,1). */
const twoCells: Sdf = (p) =>
  Math.min(oneCell(p), sdSphere(vec3(2.5, 1.5, 1.5), 0.49)(p))

/**
 * Two same-part voxels adjacent along x. Built by hand rather than by SDF so
 * the class layout under test is exact and cannot drift with sphere radius.
 */
function dominoGrid(classes?: [number, number]): VoxelGrid {
  return {
    resolution: 4,
    parts: [
      {
        name: "domino",
        voxels: [
          [1, 1, 1],
          [2, 1, 1],
        ],
        classes: classes ? [classes[0], classes[1]] : undefined,
      },
    ],
  }
}

describe("voxelize colour classes", () => {
  test("records the class returned by classify, one per voxel", () => {
    const field: PartField = {
      name: "pair",
      sdf: twoCells,
      classify: (p) => (p.x > 1.5 ? 7 : 0),
    }
    const part = voxelize([field], 4).parts[0]
    if (!part) throw new Error("missing part")
    expect(part.voxels).toHaveLength(2)
    // Voxels are emitted in (x, y, z) scan order, so x=1 precedes x=2.
    expect(part.classes).toEqual([0, 7])
  })

  test("defaults every voxel to class 0 when the field declares no classifier", () => {
    const part = voxelize([{ name: "cube", sdf: oneCell }], 3).parts[0]
    if (!part) throw new Error("missing part")
    expect(part.classes).toEqual(part.voxels.map(() => 0))
  })

  test("classifies only the voxels the part actually claims", () => {
    const calls: Vec3[] = []
    const part = voxelize(
      [
        {
          name: "cube",
          sdf: oneCell,
          classify: (p) => {
            calls.push(p)
            return 3
          },
        },
      ],
      3,
    ).parts[0]
    if (!part) throw new Error("missing part")
    expect(calls).toHaveLength(part.voxels.length)
    expect(part.classes).toEqual(part.voxels.map(() => 3))
  })
})

describe("greedy meshing across class boundaries", () => {
  test("a uniform class still merges its long faces into single quads", () => {
    const mesh = meshGrid(dominoGrid([0, 0]))[0]
    if (!mesh) throw new Error("missing mesh")
    // Same baseline as the pre-class mesher: 6 quads, not the naive 10.
    expect(mesh.indices.length).toBe(6 * 6)
  })

  test("two classes on one face plane refuse to merge", () => {
    const mesh = meshGrid(dominoGrid([0, 1]))[0]
    if (!mesh) throw new Error("missing mesh")
    // Nothing can merge across the seam: -x, +x, and 4 faces per voxel on the
    // other two axes => 10 quads.
    expect(mesh.indices.length).toBe(10 * 6)
  })

  test("no class array at all meshes exactly like a uniform class-0 grid", () => {
    const plain = meshGrid(dominoGrid())
    const zeroed = meshGrid(dominoGrid([0, 0]))
    expect(plain.map((m) => m.indices)).toEqual(zeroed.map((m) => m.indices))
    expect(plain.map((m) => m.positions)).toEqual(
      zeroed.map((m) => m.positions),
    )
  })

  test("emits exactly one class per emitted vertex", () => {
    const mesh = meshGrid(dominoGrid([0, 4]))[0]
    if (!mesh) throw new Error("missing mesh")
    expect(mesh.classes).toHaveLength(mesh.positions.length / 3)
  })

  test("every vertex of a quad carries that quad's class", () => {
    const mesh = meshGrid(dominoGrid([0, 4]))[0]
    if (!mesh) throw new Error("missing mesh")
    for (let quad = 0; quad < mesh.indices.length / 6; quad++) {
      const vertex = mesh.indices[quad * 6] ?? 0
      const cls = mesh.classes[vertex]
      expect(cls === 0 || cls === 4).toBe(true)
      for (let k = 0; k < 4; k++) {
        expect(mesh.classes[vertex + k]).toBe(cls)
      }
    }
  })
})

describe("bakeVertexColors", () => {
  const palette = [
    [0, 0, 0],
    [1, 0.5, 0.25],
  ] as const

  test("maps each vertex class to its palette entry", () => {
    const mesh: MeshePart = {
      name: "t",
      positions: [0, 0, 0, 1, 0, 0],
      normals: [1, 0, 0, 1, 0, 0],
      indices: [0, 1, 0],
      classes: [0, 1],
    }
    expect([...bakeVertexColors(mesh, palette)]).toEqual([
      0, 0, 0, 1, 0.5, 0.25,
    ])
  })

  test("falls back to loud magenta for a class the palette omits", () => {
    const mesh: MeshePart = {
      name: "t",
      positions: [0, 0, 0],
      normals: [1, 0, 0],
      indices: [0, 0, 0],
      classes: [9],
    }
    expect([...bakeVertexColors(mesh, palette)]).toEqual([1, 0, 1])
  })

  test("is a pure function: baking twice yields identical bytes", () => {
    const mesh = meshGrid(dominoGrid([0, 1]))[0]
    if (!mesh) throw new Error("missing mesh")
    const a = bakeVertexColors(mesh, palette)
    const b = bakeVertexColors(mesh, palette)
    expect(Buffer.from(a.buffer).equals(Buffer.from(b.buffer))).toBe(true)
  })
})
