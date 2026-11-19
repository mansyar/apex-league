import { describe, expect, test } from "bun:test"
import type { CreatureBuild } from "./build"
import { buildGolem, GOLEM_GRID, golemTemplate } from "./golem"
import { sampleDna } from "./sample"
import {
  assertDnaInBounds,
  type Dna,
  type Template,
  validateTemplate,
} from "./schema"
import { buildSprite, SPRITE_GRID, spriteTemplate } from "./sprite"
import { matureProportions, STAGES, type Stage } from "./stage"
import type { PartField } from "./voxelizer"
import { voxelize } from "./voxelizer"
import { buildWing, WING_GRID, wingTemplate } from "./wing"

// Roster Wave 2 archetypes (sprite/golem/wing). Mirrors fox.test.ts: template
// validity, deterministic DNA, part inventory, voxel count, interior across
// stages, and the stage signature/pivot/color/parent invariants.

type BuildFn = (dna: Dna, stage?: Stage) => CreatureBuild

interface WaveCase {
  id: string
  grid: number
  template: Template
  build: BuildFn
  sample: (seed: number) => Dna
  hue: number
  wings: readonly [string, string]
  juvenile: readonly [string, string]
  champion: readonly [string, string]
}

const CASES: WaveCase[] = [
  {
    id: "sprite",
    grid: SPRITE_GRID,
    template: spriteTemplate,
    build: buildSprite,
    sample: (seed) => sampleDna(spriteTemplate, seed),
    hue: 112,
    wings: ["leafWingLeft", "leafWingRight"],
    juvenile: ["thornBudLeft", "thornBudRight"],
    champion: ["brambleCrownLeft", "brambleCrownRight"],
  },
  {
    id: "golem",
    grid: GOLEM_GRID,
    template: golemTemplate,
    build: buildGolem,
    sample: (seed) => sampleDna(golemTemplate, seed),
    hue: 205,
    wings: ["slateShoulderLeft", "slateShoulderRight"],
    juvenile: ["siltPearlLeft", "siltPearlRight"],
    champion: ["tideCrownLeft", "tideCrownRight"],
  },
  {
    id: "wing",
    grid: WING_GRID,
    template: wingTemplate,
    build: buildWing,
    sample: (seed) => sampleDna(wingTemplate, seed),
    hue: 20,
    wings: ["emberWingLeft", "emberWingRight"],
    juvenile: ["cinderTuftLeft", "cinderTuftRight"],
    champion: ["flameCrestLeft", "flameCrestRight"],
  },
]

/** Required identity parts (the generic face adds eyes/mouth separately). */
function identityParts(c: WaveCase): string[] {
  return [
    "body",
    "tail",
    "tailTip",
    "legFL",
    "legFR",
    "legBL",
    "legBR",
    "neck",
    "head",
    ...c.wings,
  ]
}

for (const c of CASES) {
  describe(`${c.id} template and DNA`, () => {
    test("the template validates and carries two style slots with a gilded rarity", () => {
      expect(validateTemplate(c.template)).toEqual([])
      expect(Object.keys(c.template.styles).length).toBeGreaterThanOrEqual(2)
      expect(c.template.palette.hue).toBe(c.hue)
      expect(c.template.rarity).toContainEqual({ id: "gilded", weight: 32 })
    })

    test("DNA is deterministic, in bounds and style-varying across seeds", () => {
      for (const seed of [3, 42, 99]) {
        const dna = c.sample(seed)
        expect(c.sample(seed)).toEqual(dna)
        expect(assertDnaInBounds(dna, c.template)).toEqual([])
      }
      const crests = new Set<unknown>()
      for (let seed = 0; seed < 30; seed++)
        crests.add(c.sample(seed).styles.crest)
      expect(crests.size).toBeGreaterThan(1)
    })
  })

  describe(`${c.id} build`, () => {
    test("the identity parts all claim voxels and the body is substantial", () => {
      const dna = c.sample(42)
      const build = c.build(dna)
      const names = build.fields.map((field) => field.name)
      for (const part of identityParts(c)) expect(names).toContain(part)
      const grid = voxelize(build.fields, c.grid)
      const total = grid.parts.reduce(
        (sum, part) => sum + part.voxels.length,
        0,
      )
      expect(total).toBeGreaterThan(900)
      const claimed = new Set(grid.parts.map((part) => part.name))
      for (const field of build.fields)
        expect(claimed.has(field.name)).toBe(true)
    })

    test("the build is byte-deterministic", () => {
      const dna = c.sample(42)
      expect(JSON.stringify(c.build(dna))).toBe(JSON.stringify(c.build(dna)))
    })

    test("every stage stays strictly inside the grid and links its rig", () => {
      const dna = c.sample(42)
      const R = c.grid - 1
      for (const stage of STAGES) {
        const build = c.build(dna, stage)
        const grid = voxelize(build.fields, c.grid)
        let inner = 0
        for (const part of grid.parts) {
          for (const [x, y, z] of part.voxels) {
            expect(x).toBeGreaterThan(0)
            expect(x).toBeLessThan(R)
            expect(y).toBeGreaterThan(0)
            expect(y).toBeLessThan(R)
            expect(z).toBeGreaterThan(0)
            expect(z).toBeLessThan(R)
            inner++
          }
          if (part.name !== "body")
            expect(build.parents[part.name]).toBeDefined()
          expect(build.pivots[part.name]).toHaveLength(3)
        }
        expect(inner).toBeGreaterThan(900)
        const expected =
          stage === "baby" ? [] : stage === "juvenile" ? c.juvenile : c.champion
        const names = build.fields.map((field: PartField) => field.name)
        for (const part of expected) {
          expect(names).toContain(part)
          expect(build.parents[part]).toBe("head")
          expect(build.pivots[part]).toHaveLength(3)
        }
        if (stage !== "baby") {
          const prior = stage === "champion" ? c.juvenile : []
          const priorNames = c
            .build(dna, stage === "champion" ? "juvenile" : "baby")
            .fields.map((field) => field.name)
          for (const part of prior) expect(priorNames).toContain(part)
        }
      }
    })

    test("mature legs rise with stage and the palette lifts with age", () => {
      const dna = c.sample(42)
      const baby = c.build(dna, "baby")
      const juvenile = c.build(dna, "juvenile")
      const champion = c.build(dna, "champion")
      expect(matureProportions(dna.proportions, "baby")).toEqual(
        dna.proportions,
      )
      for (const leg of ["legFL", "legFR", "legBL", "legBR"]) {
        const pivot = (b: CreatureBuild) => b.pivots[leg]?.[1] ?? -1
        expect(pivot(juvenile)).toBeGreaterThan(pivot(baby))
        expect(pivot(champion)).toBeGreaterThan(pivot(juvenile))
      }
      const light = (color: [number, number, number] | undefined) =>
        color?.[2] ?? -1
      expect(light(champion.colors.body)).toBeGreaterThan(
        light(baby.colors.body),
      )
      expect(light(juvenile.colors.body)).toBeGreaterThanOrEqual(
        light(baby.colors.body),
      )
      for (const part of c.juvenile) {
        expect(champion.colors[part]).toEqual(juvenile.colors[part])
      }
      for (const part of c.champion) expect(champion.colors[part]).toBeDefined()
    })
  })
}
