import { describe, expect, test } from "bun:test"
import { archetypes, generate } from "./archetype"
import {
  EYE_CLASS,
  faceParts,
  facePlan,
  type HeadShape,
  SKIN_CLASS,
  skinPalette,
} from "./face"
import { vec3 } from "./sdf"
import { voxelize } from "./voxelizer"

// Representative skulls: the drake carries a long snout, the bovine a deep
// muzzle hung below the skull, the axolotl neither.
const DRAKE_HEAD: HeadShape = {
  center: vec3(0, 0, 0),
  half: vec3(3.6, 2.7, 3.6),
  snout: { center: vec3(0, -0.4, 3.8), half: vec3(2.4, 1.9, 3.8) },
}
const BOVINE_HEAD: HeadShape = {
  center: vec3(0, 0, 0),
  half: vec3(3.2, 2.4, 2.6),
  snout: { center: vec3(0, -1, 2.4), half: vec3(2.4, 2.3, 2) },
}
const AXOLOTL_HEAD: HeadShape = {
  center: vec3(0, 0, 0),
  half: vec3(4.6, 1.6, 2),
}

const COAT: readonly [number, number, number] = [0.8, 0.5, 0.3]

describe("facePlan", () => {
  test("every archetype gets a mirrored eye pair inside the skull", () => {
    for (const [archetype, head] of [
      ["draconic", DRAKE_HEAD],
      ["bovine", BOVINE_HEAD],
      ["axolotl", AXOLOTL_HEAD],
    ] as const) {
      const plan = facePlan(archetype, head)
      expect(plan.eyes).toHaveLength(2)
      const [left, right] = plan.eyes
      if (!left || !right) throw new Error("missing eye")
      expect(left.side).toBe(-1)
      expect(right.side).toBe(1)
      expect(right.center.x).toBeCloseTo(-left.center.x, 10)
      expect(right.center.y).toBeCloseTo(left.center.y, 10)
      expect(right.center.z).toBeCloseTo(left.center.z, 10)
      // Seated on the skull's outward voxel column: the outer face of the eye is
      // the cheek itself, not a ball stuck on it.
      expect(Math.abs(left.center.x) + left.radii.x).toBeGreaterThan(
        head.half.x - 0.7,
      )
      expect(Math.abs(left.center.x) + left.radii.x).toBeLessThanOrEqual(
        head.half.x + 1,
      )
      expect(Math.abs(left.center.y)).toBeLessThan(head.half.y)
      expect(Math.abs(left.center.z)).toBeLessThan(head.half.z)
      // Sampling contract. The voxelizer samples cell centres, so the eye sits on
      // a cell corner in y and z (four cells at half a voxel each) and on the
      // outward cell column in x. Break either and the bead samples to nothing.
      expect(Math.abs(left.center.x % 1)).toBeCloseTo(0.5, 10)
      expect(left.center.y % 1).toBeCloseTo(0, 10)
      expect(left.center.z % 1).toBeCloseTo(0, 10)
      // A radius under the cell-corner distance misses every sample; one over a
      // voxel would add a third row. Between them is the beady window.
      expect(left.radii.y).toBeGreaterThan(Math.SQRT1_2)
      expect(left.radii.y).toBeLessThan(1)
    }
  })

  test("brows only where the species reads with one", () => {
    expect(facePlan("draconic", DRAKE_HEAD).brows).toHaveLength(2)
    expect(facePlan("bovine", BOVINE_HEAD).brows).toBeUndefined()
    expect(facePlan("axolotl", AXOLOTL_HEAD).brows).toBeUndefined()
  })

  // Only the bovine muzzle is broad enough to hold a pair far enough from the
  // mouth line. On the drake's four-cell snout the dots either land at eye
  // height (a second pair of eyes) or merge with the mouth into one dark mask,
  // so the drake goes without.
  test("nostrils follow the species face table", () => {
    expect(facePlan("draconic", DRAKE_HEAD).nostrils).toHaveLength(0)
    expect(facePlan("bovine", BOVINE_HEAD).nostrils).toHaveLength(2)
    expect(facePlan("axolotl", AXOLOTL_HEAD).nostrils).toHaveLength(0)
  })

  test("mouth sits on the muzzle's front face", () => {
    const plan = facePlan("draconic", DRAKE_HEAD)
    const muzzle = DRAKE_HEAD.snout
    if (!muzzle) throw new Error("missing snout")
    expect(Math.abs(plan.mouth.center.y - muzzle.center.y)).toBeLessThan(
      muzzle.half.y,
    )
    // Painted on the face plane, so its centre is exactly one half-depth out.
    expect(plan.mouth.center.z).toBeCloseTo(muzzle.center.z + muzzle.half.z, 10)
    // A line, not a second snout: it is thin in y.
    expect(plan.mouth.half.y).toBeLessThan(plan.mouth.half.z)
  })
})

describe("faceParts", () => {
  test("pivots sit at the top-centre of each eye", () => {
    const plan = facePlan("draconic", DRAKE_HEAD)
    const bake = faceParts(plan, COAT)
    for (const eyePlan of plan.eyes) {
      const name = eyePlan.side < 0 ? "eyeLeft" : "eyeRight"
      const pivot = bake.pivots[name]
      if (!pivot) throw new Error(`no pivot for ${name}`)
      expect(pivot[1]).toBeCloseTo(eyePlan.center.y + eyePlan.radii.y, 10)
      expect(pivot[0]).toBeCloseTo(eyePlan.center.x, 10)
      expect(pivot[2]).toBeCloseTo(eyePlan.center.z, 10)
      expect(bake.parents[name]).toBe("head")
    }
  })

  test("a dark bead with one warm cell at the top-front corner", () => {
    const plan = facePlan("draconic", DRAKE_HEAD)
    const bake = faceParts(plan, COAT)
    const left = plan.eyes[0]
    if (!left) throw new Error("missing left eye")
    const part = bake.fields.find((field) => field.name === "eyeLeft")
    const classify = part?.classify
    if (!classify) throw new Error("eye has no classifier")
    const { center } = left
    // The four cell centres the bead actually owns.
    const cell = (dy: number, dz: number) =>
      classify(vec3(center.x, center.y + dy, center.z + dz))
    expect(cell(0.5, 0.5)).toBe(EYE_CLASS.catchlight)
    expect(cell(0.5, -0.5)).toBe(EYE_CLASS.pupil)
    expect(cell(-0.5, 0.5)).toBe(EYE_CLASS.pupil)
    expect(cell(-0.5, -0.5)).toBe(EYE_CLASS.pupil)
  })

  // The unit classifier passing is not enough: the head claims every eye voxel
  // that sits inside the skull, so a bead can lose cells (or all of itself)
  // while `face.ts` still classifies them correctly.
  //
  // Split per archetype: nine voxelizations in one test made the whole
  // file slow enough to need a two-minute budget, and a slow test hides a
  // slow generator. One archetype per test keeps each inside 20 seconds.
  for (const archetype of ["draconic", "bovine", "axolotl"] as const) {
    test(`every built ${archetype} eye is a two-by-two bead with one highlight`, () => {
      for (const stage of ["baby", "juvenile", "champion"] as const) {
        const def = archetypes[archetype]
        if (!def) throw new Error(`no archetype ${archetype}`)
        const { build } = generate(archetype, 42, stage)
        const grid = voxelize(build.fields, def.grid)
        for (const name of ["eyeLeft", "eyeRight"]) {
          const eye = grid.parts.find((part) => part.name === name)
          if (!eye) throw new Error(`no built ${name} for ${archetype}`)
          expect({ archetype, stage, name, cells: eye.voxels.length }).toEqual({
            archetype,
            stage,
            name,
            cells: 4,
          })
          const counts = new Map<number, number>()
          for (const cls of eye.classes ?? []) {
            counts.set(cls, (counts.get(cls) ?? 0) + 1)
          }
          expect(counts.get(EYE_CLASS.pupil)).toBe(3)
          expect(counts.get(EYE_CLASS.catchlight)).toBe(1)
          // Two rows tall, two deep, one voxel thick against the cheek.
          expect(new Set(eye.voxels.map((v) => v[1])).size).toBe(2)
          expect(new Set(eye.voxels.map((v) => v[2])).size).toBe(2)
          expect(new Set(eye.voxels.map((v) => v[0])).size).toBe(1)
        }
      }
    }, 20_000)
  }

  test("recess walls are dark, the rest of the head is coat", () => {
    const plan = facePlan("bovine", BOVINE_HEAD)
    const bake = faceParts(plan, COAT)
    // A voxel on the mouth line, and one far above it.
    expect(bake.skinClass(plan.mouth.center)).toBe(SKIN_CLASS.dark)
    expect(bake.skinClass(vec3(0, BOVINE_HEAD.center.y + 2, 0))).toBe(
      SKIN_CLASS.coat,
    )
    // The mouth is paint on the surface: it darkens cells but carves nothing,
    // while the socket dish beside it does cut the skull.
    expect(bake.recess(plan.mouth.center)).toBeLessThanOrEqual(0)
    expect(bake.carve(plan.mouth.center)).toBeGreaterThan(0)
    expect(bake.recess(vec3(0, BOVINE_HEAD.center.y + 2, 0))).toBeGreaterThan(0)
  })

  test("skin palette darkens the coat instead of inventing a colour", () => {
    const palette = skinPalette(COAT)
    const dark = palette[SKIN_CLASS.dark]
    if (!dark) throw new Error("no dark step")
    expect(dark[0]).toBeCloseTo(COAT[0] * 0.25, 10)
    expect(dark[1]).toBeCloseTo(COAT[1] * 0.25, 10)
    expect(dark[2]).toBeCloseTo(COAT[2] * 0.25, 10)
  })
})

describe("face wiring", () => {
  test("every archetype and stage emits riggable eyes under the head", () => {
    for (const archetype of ["draconic", "bovine", "axolotl"]) {
      for (const stage of ["baby", "juvenile", "champion"] as const) {
        const { build } = generate(archetype, 42, stage)
        const names = build.fields.map((field) => field.name)
        expect(names).toContain("eyeLeft")
        expect(names).toContain("eyeRight")
        for (const name of ["eyeLeft", "eyeRight"]) {
          expect(build.parents[name]).toBe("head")
          expect(build.palettes?.[name]).toHaveLength(2)
          expect(build.pivots[name]).toBeDefined()
        }
        const head = build.fields.find((field) => field.name === "head")
        expect(head?.classify).toBeDefined()
        expect(build.palettes?.head).toHaveLength(2)
        // Brows are the drake's alone.
        if (archetype === "draconic") {
          expect(names).toContain("browLeft")
          expect(names).toContain("browRight")
        } else {
          expect(names).not.toContain("browLeft")
        }
      }
    }
  })

  // A paint-only mouth is invisible if the muzzle it is measured from is not
  // where the head actually is: a double-grid offset put the bovine snout (and
  // with it the whole mouth) outside the sampled volume, and nothing failed.
  // Every stage, because the muzzle shrinks with the skull.
  //
  // Split per archetype for the same reason as the eye test above.
  for (const archetype of ["draconic", "bovine", "axolotl"] as const) {
    test(`every built ${archetype} head owns the surface its mouth is painted on`, () => {
      for (const stage of ["baby", "juvenile", "champion"] as const) {
        const { build, def } = generate(archetype, 42, stage)
        const grid = voxelize(build.fields, def.grid)
        const head = grid.parts.find((part) => part.name === "head")
        const classes = head?.classes
        if (!head || !classes) {
          throw new Error(`${archetype} ${stage} has no classified head`)
        }
        const rows = new Map<number, number>()
        head.voxels.forEach((voxel, i) => {
          if (classes[i] !== SKIN_CLASS.dark) return
          rows.set(voxel[1], (rows.get(voxel[1]) ?? 0) + 1)
        })
        const mouthRow = Math.min(...rows.keys())
        expect(rows.get(mouthRow)).toBeGreaterThanOrEqual(3)
      }
    }, 20_000)
  }

  // An isolated `voxelize([eye])` grid is not evidence of anything: the sampler
  // spans the whole scene bounds, so a standalone eye gets two or three samples
  // whatever its size. The built eye is checked above, in the real grid.
})
