import { describe, expect, test } from "bun:test"
import { archetypes, generate } from "./archetype"
import {
  EYE_CLASS,
  eyeScale,
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

const eyeHalfHeight = (
  archetype: string,
  head: HeadShape,
  stage: "baby" | "juvenile" | "champion",
): number => {
  const eyePlan = facePlan(archetype, head, stage).eyes[0]
  if (!eyePlan) throw new Error("no eyes in plan")
  return eyePlan.radii.y
}

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
      // The eye rides on the skull surface: its centre is at or just past the
      // side of the head, and the ellipsoid reaches into it.
      expect(Math.abs(left.center.x)).toBeLessThanOrEqual(head.half.x + 0.5)
      expect(Math.abs(left.center.x) + left.radii.x).toBeGreaterThan(
        head.half.x,
      )
      expect(Math.abs(left.center.y)).toBeLessThan(head.half.y)
      expect(Math.abs(left.center.z)).toBeLessThan(head.half.z)
      // Spec floor: yes, a feature this size survives baby scale.
      expect(left.radii.y).toBeGreaterThanOrEqual(1.8)
    }
  })

  test("brows only where the species reads with one", () => {
    expect(facePlan("draconic", DRAKE_HEAD).brows).toHaveLength(2)
    expect(facePlan("bovine", BOVINE_HEAD).brows).toBeUndefined()
    expect(facePlan("axolotl", AXOLOTL_HEAD).brows).toBeUndefined()
  })

  test("nostrils follow the species face table", () => {
    expect(facePlan("draconic", DRAKE_HEAD).nostrils).toHaveLength(2)
    expect(facePlan("bovine", BOVINE_HEAD).nostrils).toHaveLength(2)
    expect(facePlan("axolotl", AXOLOTL_HEAD).nostrils).toHaveLength(0)
  })

  test("mouth sits inside the muzzle", () => {
    const plan = facePlan("draconic", DRAKE_HEAD)
    const muzzle = DRAKE_HEAD.snout
    if (!muzzle) throw new Error("missing snout")
    expect(Math.abs(plan.mouth.center.y - muzzle.center.y)).toBeLessThan(
      muzzle.half.y,
    )
    expect(Math.abs(plan.mouth.center.z - muzzle.center.z)).toBeLessThan(
      muzzle.half.z,
    )
    // A mouth line, not a second snout: it is thin in y.
    expect(plan.mouth.half.y).toBeLessThan(plan.mouth.half.z)
  })
})

describe("faceParts", () => {
  test("pivots sit at the top-centre of each eye", () => {
    for (const stage of ["baby", "juvenile", "champion"] as const) {
      const plan = facePlan("draconic", DRAKE_HEAD, stage)
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
    }
  })

  test("eyes shrink with age; babies are the roundest", () => {
    expect(eyeHalfHeight("draconic", DRAKE_HEAD, "baby")).toBeGreaterThan(
      eyeHalfHeight("draconic", DRAKE_HEAD, "juvenile"),
    )
    expect(eyeHalfHeight("draconic", DRAKE_HEAD, "juvenile")).toBeGreaterThan(
      eyeHalfHeight("draconic", DRAKE_HEAD, "champion"),
    )
    expect(eyeScale("baby")).toBeGreaterThan(eyeScale("juvenile"))
    expect(eyeScale("juvenile")).toBeGreaterThan(eyeScale("champion"))
  })

  test("pupil in the middle, sclera at the rim, catchlight in the corner", () => {
    const plan = facePlan("draconic", DRAKE_HEAD, "juvenile")
    const bake = faceParts(plan, COAT)
    const left = plan.eyes[0]
    if (!left) throw new Error("missing left eye")
    const part = bake.fields.find((field) => field.name === "eyeLeft")
    if (!part?.classify) throw new Error("eye has no classifier")
    const { center, radii } = left
    // Height and width only: the visible face of a voxel eye is one voxel deep,
    // so the classes are bands across it.
    expect(part.classify(vec3(center.x, center.y, center.z))).toBe(
      EYE_CLASS.pupil,
    )
    expect(
      part.classify(vec3(center.x, center.y + radii.y * 0.95, center.z)),
    ).toBe(EYE_CLASS.sclera)
    expect(
      part.classify(vec3(center.x, center.y - radii.y * 0.95, center.z)),
    ).toBe(EYE_CLASS.sclera)
    expect(
      part.classify(
        vec3(center.x, center.y + radii.y * 0.6, center.z + radii.z * 0.5),
      ),
    ).toBe(EYE_CLASS.catchlight)
  })

  test("every built eye keeps sclera, pupil and highlight at every stage", () => {
    // The unit classifier passing is not enough: the head claims every eye voxel
    // that sits inside the skull, so a champion bovine can lose its whole sclera
    // rim and highlight while `face.ts` still classifies them correctly.
    for (const archetype of ["draconic", "bovine", "axolotl"] as const) {
      for (const stage of ["baby", "juvenile", "champion"] as const) {
        const def = archetypes[archetype]
        if (!def) throw new Error(`no archetype ${archetype}`)
        const { build } = generate(archetype, 42, stage)
        const grid = voxelize(build.fields, def.grid)
        const eye = grid.parts.find((part) => part.name === "eyeLeft")
        if (!eye?.classes) throw new Error(`no built eyeLeft for ${archetype}`)
        expect({
          archetype,
          stage,
          classes: [...new Set(eye.classes)].sort(),
        }).toEqual({
          archetype,
          stage,
          classes: [EYE_CLASS.sclera, EYE_CLASS.pupil, EYE_CLASS.catchlight],
        })
      }
    }
  })

  test("recess walls are dark, the rest of the head is coat", () => {
    const plan = facePlan("bovine", BOVINE_HEAD)
    const bake = faceParts(plan, COAT)
    // A voxel on the mouth line, and one far above it.
    expect(bake.skinClass(plan.mouth.center)).toBe(SKIN_CLASS.dark)
    expect(bake.skinClass(vec3(0, BOVINE_HEAD.center.y + 2, 0))).toBe(
      SKIN_CLASS.coat,
    )
    // The recess carves where the mouth is and leaves the skull alone.
    expect(bake.recess(plan.mouth.center)).toBeLessThan(0)
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
          expect(build.palettes?.[name]).toHaveLength(3)
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

  test("an eye carries sclera, pupil and catchlight voxels", () => {
    const { build } = generate("draconic", 42, "champion")
    const eye = build.fields.find((field) => field.name === "eyeLeft")
    if (!eye) throw new Error("no eyeLeft field")
    const grid = voxelize([eye], 56)
    const part = grid.parts[0]
    if (!part) throw new Error("eye produced no part")
    const classes = new Set(part.classes ?? [])
    expect(part.voxels.length).toBeGreaterThan(8)
    expect(classes.has(EYE_CLASS.sclera)).toBe(true)
    expect(classes.has(EYE_CLASS.pupil)).toBe(true)
    expect(classes.has(EYE_CLASS.catchlight)).toBe(true)
  })
})
