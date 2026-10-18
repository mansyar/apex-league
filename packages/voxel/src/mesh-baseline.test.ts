/**
 * Geometry baseline pin (suite-budget tripwire).
 *
 * Hashes the EXACT mesh geometry (positions / normals / indices, per part, in
 * emission order) for one full-resolution creature plus every prop, at the
 * canonical seed. This exists so surface work (colour classes, ambient
 * occlusion) can prove it does not silently move a single vertex: geometry
 * drift has to be an intentional re-pin with regenerated GLBs, never a side
 * effect.
 *
 * Scope is deliberately one creature, not all nine: a full 9-stage sweep costs
 * ~7.5s of SDF sampling, which would blow the suite's <=15s budget. The
 * exhaustive byte-identical sweep over every archetype and stage is already
 * `bun run gate:determinism`; this test is the fast in-suite half that fails
 * in the same second as the violating edit.
 *
 * Re-pin procedure: copy the new hashes AND state in the track plan why the
 * geometry moved.
 */
import { describe, expect, test } from "bun:test"
import { archetypes, generate } from "./archetype"
import { type MeshePart, meshGrid } from "./mesher"
import { generateProp, props } from "./props"
import { voxelize } from "./voxelizer"

const SEED = 42

/** Geometry-only projection: deliberately excludes colour/AO attributes. */
function geometryHash(meshes: MeshePart[]): string {
  const geometry = meshes.map((m) => ({
    name: m.name,
    positions: m.positions,
    normals: m.normals,
    indices: m.indices,
  }))
  return new Bun.CryptoHasher("sha256")
    .update(JSON.stringify(geometry))
    .digest("hex")
}

function creatureHash(archetype: string): string {
  const def = archetypes[archetype]
  if (!def) throw new Error(`unknown archetype ${archetype}`)
  const { build } = generate(archetype, SEED, "champion")
  return geometryHash(meshGrid(voxelize(build.fields, def.grid)))
}

function propHash(propId: string): string {
  const { build, def } = generateProp(propId, SEED)
  return geometryHash(meshGrid(voxelize(build.fields, def.grid)))
}

const DRACONIC_CHAMPION =
  "d9af8744eb1cc9f3740d5a5325c9be112976a95c6ab6801fa4fdb3aaaba77d88"

const PROP_BASELINE: Record<string, string> = {
  tuft: "6acfee3cd9a8c66f31599bd753c7801265a07c77a1a0dad5fa49b6c24bbc0c2c",
  bush: "2d60d7279fc0d3408394c5fa8bb7fbbd837dd5e3f21390c704b674aeed129930",
  broadleafTree:
    "c4c5a72af7d0dff066b4d541f1df1038b7f32309e7e670458c918a39ca43e7b0",
  rock: "c375b6cb09340ee19d6064e0e1d5ef7f289908555c0d05e9097370a25772ebbe",
  foodPile: "06255fdf8fe7769699f0d1d2fb5bae4608eadaec7dd6bbcb8ad0a2b1b49f4b69",
}

describe("mesh geometry baseline", () => {
  test("draconic champion geometry is unchanged", () => {
    expect(creatureHash("draconic")).toBe(DRACONIC_CHAMPION)
  })

  for (const propId of Object.keys(props)) {
    test(`prop ${propId} geometry is unchanged`, () => {
      const expected = PROP_BASELINE[propId]
      if (!expected) throw new Error(`no baseline for prop ${propId}`)
      expect(propHash(propId)).toBe(expected)
    })
  }
})
