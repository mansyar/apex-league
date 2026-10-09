import { describe, expect, test } from "bun:test"
import { sdSphere, vec3 } from "./sdf"
import { type PartField, voxelize } from "./voxelizer"

function spherePart(
  name: string,
  center: [number, number, number],
  radius: number,
): PartField {
  return { name, sdf: sdSphere(vec3(...center), radius) }
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
})
