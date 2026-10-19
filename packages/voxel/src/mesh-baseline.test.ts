/**
 * Mesh baseline pin (suite-budget tripwire).
 *
 * Hashes the EXACT mesh output (positions / normals / indices / AO, per part,
 * in emission order) for one full-resolution creature plus every prop, at the
 * canonical seed. This exists so surface work (colour classes, ambient
 * occlusion) can prove it does not silently move a single vertex: mesh drift
 * has to be an intentional re-pin with regenerated GLBs, never a side effect.
 *
 * Re-pinned in Phase 2 of creature_readability_20261018: AO-gated merging and
 * the darker-diagonal split legitimately change quad counts (draconic champion
 * 2116 -> 3634 tris), so the previous pin no longer describes the mesh.
 *
 * Re-pinned again after surface zones: quad merging is gated on the packed
 * class signature, so a zone edge legitimately splits quads that used to merge
 * (draconic champion 3634 -> 3700 tris). Geometry itself is untouched; only
 * where a merge may cross a colour boundary moved. An earlier cut of this
 * re-pin read 3780, when the band edges still dithered per voxel; the dither
 * frayed the boundary into pale speckle that read as damage at arena distance,
 * so it was removed and only the low-frequency wobble remains.
 *
 * Re-pinned again for the face kit: the head is now carved by socket, mouth and
 * nostril recesses and gains eyes and brows as separate parts, so the head
 * surface and the part list both moved on purpose (draconic champion
 * 3700 -> 3840 tris). The last 16 of those come from the eye fix in the same
 * phase: stage now reaches `facePlan` (it was silently defaulting to juvenile,
 * so every stage shipped juvenile eyes), the bovine eye is 15% larger to keep
 * its classes proud of a thick skull, and the stage inset that sank the eye was
 * dropped because at champion size it swallowed the sclera and highlight.
 *
 * Re-pinned once more when the face was rejected on looks and rebuilt: the eye
 * is a two-by-two bead (four voxels, dark pupil plus one warm cell) instead of
 * the sclera/pupil/catchlight ball, stage-scaled eye proportions and species
 * eye scales are gone, and the mouth and nostrils are painted cells rather than
 * carved recesses - so the head loses its mouth/nostril carving and the eye
 * parts lose half their voxels (draconic champion 3840 -> 3756 tris). The
 * bovine snout also moved back inside the grid: a double grid offset had put it
 * at z 73 of a 56-deep grid, which is why the bovine had no muzzle, and the
 * mouth row it was painting never landed on a voxel.
 *
 * Scope is deliberately one creature, not all nine: a full 9-stage sweep costs
 * ~7.5s of SDF sampling, which would blow the suite's <=15s budget. The
 * exhaustive byte-identical sweep over every archetype and stage is already
 * `bun run gate:determinism`; this test is the fast in-suite half that fails
 * in the same second as the violating edit.
 *
 * Re-pin procedure: copy the new hashes AND state in the track plan why the
 * mesh moved.
 */
import { describe, expect, test } from "bun:test"
import { archetypes, generate } from "./archetype"
import { type MeshePart, meshGrid } from "./mesher"
import { generateProp, props } from "./props"
import { voxelize } from "./voxelizer"

const SEED = 42

/** Mesh projection: geometry plus the baked occlusion term. */
function meshHash(meshes: MeshePart[]): string {
  const projection = meshes.map((m) => ({
    name: m.name,
    positions: m.positions,
    normals: m.normals,
    indices: m.indices,
    ao: m.ao,
  }))
  return new Bun.CryptoHasher("sha256")
    .update(JSON.stringify(projection))
    .digest("hex")
}

function creatureHash(archetype: string): string {
  const def = archetypes[archetype]
  if (!def) throw new Error(`unknown archetype ${archetype}`)
  const { build } = generate(archetype, SEED, "champion")
  return meshHash(meshGrid(voxelize(build.fields, def.grid)))
}

function propHash(propId: string): string {
  const { build, def } = generateProp(propId, SEED)
  return meshHash(meshGrid(voxelize(build.fields, def.grid)))
}

const DRACONIC_CHAMPION =
  "e85cd4780db27799e246bb08d641d845a7ddbb5c2d9fbe219be60ee2036f8a09"

const PROP_BASELINE: Record<string, string> = {
  tuft: "9a5658fc92af4ed573660245dfb4b3df8c16e8545b086eaeef261dfa690ed645",
  bush: "f59f111b8472ce18497c94ec0ddbf8303635e29bae35f644d290cc9e4cb7b60f",
  broadleafTree:
    "92e71a57fa87fff5654f5e25a42c74d9152d4c61dffa7bea3c6b8bc84c55821b",
  rock: "509f00414d48ba4c1bd145f8c6dadac13ce70ba07be44f2a34927c67f17dab7f",
  foodPile: "008ecf655de1434599622124b490371d34bb6418a48920ff9d99bce4d11a0e50",
}

describe("mesh baseline", () => {
  test("draconic champion mesh is unchanged", () => {
    expect(creatureHash("draconic")).toBe(DRACONIC_CHAMPION)
  })

  for (const propId of Object.keys(props)) {
    test(`prop ${propId} mesh is unchanged`, () => {
      const expected = PROP_BASELINE[propId]
      if (!expected) throw new Error(`no baseline for prop ${propId}`)
      expect(propHash(propId)).toBe(expected)
    })
  }
})
