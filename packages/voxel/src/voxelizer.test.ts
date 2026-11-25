import { describe, expect, test } from "bun:test"
import {
  sdBox,
  sdCapsule,
  sdEllipsoid,
  sdRoundCone,
  sdSphere,
  smoothSubtract,
  smoothUnion,
  vec3,
} from "./sdf"
import { type PartField, voxelize } from "./voxelizer"

function spherePart(
  name: string,
  center: [number, number, number],
  radius: number,
): PartField {
  return { name, sdf: sdSphere(vec3(...center), radius) }
}

function projectionHash(value: unknown): string {
  return new Bun.CryptoHasher("sha256")
    .update(JSON.stringify(value))
    .digest("hex")
}

function simpleCharacterizationFields(): PartField[] {
  return [
    {
      name: "base",
      sdf: sdBox(vec3(1.5, 2, 2), vec3(1, 1.5, 1.5)),
      classify: (p) => (p.z < 2 ? 3 : 4),
    },
    {
      name: "overlay",
      sdf: sdBox(vec3(2.5, 2, 2), vec3(0.75, 1.5, 1.5)),
      classify: () => 9,
    },
    {
      name: "detail",
      sdf: sdSphere(vec3(3.5, 1.5, 0.5), 0.49),
      classify: () => 5,
    },
  ]
}

describe("voxelize", () => {
  test("fills a sphere with voxels whose centers are inside the SDF", () => {
    const resolution = 12
    const bodyField = spherePart("body", [6, 6, 6], 3)
    const result = voxelize([bodyField], resolution)
    expect(result.parts).toHaveLength(1)
    const body = result.parts[0]
    if (!body) throw new Error("missing part")
    expect(body.name).toBe("body")
    expect(body.voxels.length).toBeGreaterThan(0)
    for (const [x, y, z] of body.voxels) {
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(resolution)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThan(resolution)
      expect(z).toBeGreaterThanOrEqual(0)
      expect(z).toBeLessThan(resolution)
      // Voxel center must satisfy the field (inside or on surface).
      expect(
        bodyField.sdf(vec3(x + 0.5, y + 0.5, z + 0.5)),
      ).toBeLessThanOrEqual(0)
    }
  })

  test("sphere voxel count is roughly the analytic volume", () => {
    // Radius 3 sphere ≈ 113 voxel centers; accept a loose voxel-sampling band.
    const result = voxelize([spherePart("body", [8, 8, 8], 3)], 16)
    const body = result.parts[0]
    if (!body) throw new Error("missing part")
    expect(body.voxels.length).toBeGreaterThan(70)
    expect(body.voxels.length).toBeLessThan(160)
  })

  test("later parts claim overlapping voxels (paint order)", () => {
    const resolution = 12
    const result = voxelize(
      [spherePart("body", [6, 6, 6], 3), spherePart("head", [6, 8, 6], 2)],
      resolution,
    )
    const body = result.parts[0]
    const head = result.parts[1]
    if (!body || !head) throw new Error("missing part")
    const bodySet = new Set(body.voxels.map(([x, y, z]) => `${x},${y},${z}`))
    const headSet = new Set(head.voxels.map(([x, y, z]) => `${x},${y},${z}`))
    for (const key of headSet) {
      expect(bodySet.has(key)).toBe(false)
    }
    // The overlap region must be substantial: head center is inside body.
    expect(head.voxels.length).toBeGreaterThan(0)
  })

  test("an SDF missing the grid yields an empty part", () => {
    const result = voxelize([spherePart("ghost", [50, 50, 50], 1)], 16)
    expect(result.parts[0]?.voxels).toEqual([])
  })

  test("voxelization is deterministic across runs", () => {
    const parts: PartField[] = [
      spherePart("body", [6, 6, 6], 3),
      spherePart("head", [6, 8, 6], 2),
    ]
    const a = voxelize(parts, 12)
    const b = voxelize(parts, 12)
    expect(b).toEqual(a)
  })

  test("voxels are emitted in a stable scan order", () => {
    const result = voxelize([spherePart("body", [6, 6, 6], 2)], 10)
    const body = result.parts[0]
    if (!body) throw new Error("missing part")
    const keys = body.voxels.map(([x, y, z]) => (x << 20) | (y << 10) | z)
    const sorted = [...keys].sort((p, q) => p - q)
    expect(keys).toEqual(sorted)
  })

  test("pins first-claim ownership and classes on a simple boundary overlap", () => {
    const baseVoxels: Array<[number, number, number]> = []
    const baseClasses: number[] = []
    for (let x = 0; x <= 2; x++) {
      for (let y = 0; y < 4; y++) {
        for (let z = 0; z < 4; z++) {
          baseVoxels.push([x, y, z])
          baseClasses.push(z < 2 ? 3 : 4)
        }
      }
    }
    const result = voxelize(simpleCharacterizationFields(), 4)
    // The overlay shares the base's x=2.5 boundary, but the earlier field owns
    // those cells. Only the detail outside both boxes survives.
    expect(result).toEqual({
      resolution: 4,
      parts: [
        { name: "base", voxels: baseVoxels, classes: baseClasses },
        { name: "overlay", voxels: [], classes: [] },
        { name: "detail", voxels: [[3, 1, 0]], classes: [5] },
      ],
    })
    expect(projectionHash(result)).toBe(
      "05662a0189a75b21251aef3d3b8d83ed25bdb414ef9dc2dde4913d0fbae104c8",
    )
  })

  test("pins a composed field, carve, paint order, and surface classes", () => {
    const body = smoothUnion(
      sdEllipsoid(vec3(2.5, 2, 2.5), vec3(1.8, 1.3, 1.4)),
      sdCapsule(vec3(1, 3.5, 3), vec3(4, 3.5, 3), 0.65),
      0.45,
    )
    const result = voxelize(
      [
        {
          name: "carved",
          sdf: smoothSubtract(body, sdSphere(vec3(3.5, 2, 2), 0.8), 0.3),
          classify: (p) => (p.y > 3 ? 2 : p.x < 2 ? 1 : 0),
        },
        {
          name: "detail",
          sdf: sdRoundCone(vec3(3, 0.5, 1), vec3(4.5, 2, 1), 0.45, 0.25),
          classify: () => 7,
        },
      ],
      6,
    )
    expect(result).toEqual({
      resolution: 6,
      parts: [
        {
          name: "carved",
          voxels: [
            [1, 1, 1],
            [1, 1, 2],
            [1, 1, 3],
            [1, 2, 1],
            [1, 2, 2],
            [1, 2, 3],
            [1, 3, 2],
            [1, 3, 3],
            [2, 1, 1],
            [2, 1, 2],
            [2, 1, 3],
            [2, 2, 1],
            [2, 2, 2],
            [2, 2, 3],
            [2, 3, 2],
            [2, 3, 3],
            [3, 1, 3],
            [3, 2, 3],
            [3, 3, 2],
            [3, 3, 3],
          ],
          classes: [1, 1, 1, 1, 1, 1, 2, 2, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 2, 2],
        },
        { name: "detail", voxels: [], classes: [] },
      ],
    })
    expect(projectionHash(result)).toBe(
      "ef7c08752ff8e962a4d8affe2648683831812aa829380c9182c4b97386429287",
    )
  })

  test("samples and classifies in x-y-z order with first-claim short-circuiting", () => {
    const sampled: Array<[string, number, number, number]> = []
    const classified: Array<[string, number, number, number]> = []
    const base = sdBox(vec3(1.5, 2, 2), vec3(1, 1.5, 1.5))
    const overlay = sdBox(vec3(2.5, 2, 2), vec3(0.75, 1.5, 1.5))
    const detail = sdSphere(vec3(3.5, 1.5, 0.5), 0.49)
    const instrument =
      (name: string, sdf: PartField["sdf"]): PartField["sdf"] =>
      (p) => {
        sampled.push([name, p.x, p.y, p.z])
        return sdf(p)
      }
    voxelize(
      [
        {
          name: "base",
          sdf: instrument("base", base),
          classify: (p) => {
            classified.push(["base", p.x, p.y, p.z])
            return 3
          },
        },
        {
          name: "overlay",
          sdf: instrument("overlay", overlay),
          classify: (p) => {
            classified.push(["overlay", p.x, p.y, p.z])
            return 9
          },
        },
        {
          name: "detail",
          sdf: instrument("detail", detail),
          classify: (p) => {
            classified.push(["detail", p.x, p.y, p.z])
            return 5
          },
        },
      ],
      4,
    )

    const sampledCells: Array<[string, number, number, number]> = []
    const claimedCells: Array<[string, number, number, number]> = []
    for (let x = 0; x < 4; x++) {
      for (let y = 0; y < 4; y++) {
        for (let z = 0; z < 4; z++) {
          const point: [number, number, number] = [x + 0.5, y + 0.5, z + 0.5]
          sampledCells.push(["base", ...point])
          if (x < 3) claimedCells.push(["base", ...point])
          else {
            sampledCells.push(["overlay", ...point])
            sampledCells.push(["detail", ...point])
          }
        }
      }
    }
    expect(sampled).toEqual(sampledCells)
    expect(classified).toEqual([...claimedCells, ["detail", 3.5, 1.5, 0.5]])
  })
})
