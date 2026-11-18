import { describe, expect, test } from "bun:test"
import { generate } from "./archetype"
import { buildRay, RAY_GRID, rayTemplate } from "./ray"
import { sampleDna } from "./sample"
import { assertDnaInBounds, validateTemplate } from "./schema"
import { matureProportions } from "./stage"
import { voxelize } from "./voxelizer"

const STAGES = ["baby", "juvenile", "champion"] as const
const SIGNATURES = ["sparkBarLeft", "sparkBarRight"]
const CROWNS = ["crownArcLeft", "crownArcRight"]

describe("ray template", () => {
  test("declares a valid template", () => {
    expect(validateTemplate(rayTemplate)).toEqual([])
  })

  test("declares signature style slots with real variety", () => {
    const fins = rayTemplate.styles.fins
    const tail = rayTemplate.styles.tail
    if (!fins || !tail) throw new Error("missing signature slot")
    expect(fins.length).toBeGreaterThanOrEqual(2)
    expect(tail.length).toBeGreaterThanOrEqual(2)
  })

  test("palette hue is the Electric contract (50 degrees)", () => {
    expect(rayTemplate.palette.hue).toBe(50)
  })

  test("gilded rarity is the shared rare gate", () => {
    expect(rayTemplate.rarity.find((r) => r.id === "gilded")?.weight).toBe(32)
  })
})

describe("sampleDna (ray)", () => {
  test("same seed produces identical DNA in bounds", () => {
    const a = sampleDna(rayTemplate, 42)
    expect(a).toEqual(sampleDna(rayTemplate, 42))
    expect(a.archetype).toBe("ray")
    expect(assertDnaInBounds(a, rayTemplate)).toEqual([])
  })

  test("different seeds produce distinct DNA", () => {
    const seen = new Set<string>()
    for (const seed of [1, 2, 3, 4, 5]) {
      seen.add(JSON.stringify(sampleDna(rayTemplate, seed)))
    }
    expect(seen.size).toBeGreaterThanOrEqual(4)
  })

  test("styles always come from the declared slots", () => {
    for (let seed = 0; seed < 30; seed++) {
      const dna = sampleDna(rayTemplate, seed)
      for (const [slot, styleId] of Object.entries(dna.styles)) {
        const defs = rayTemplate.styles[slot]
        if (!defs) throw new Error(`unknown slot ${slot}`)
        expect(defs.some((def) => def.id === styleId)).toBe(true)
      }
    }
  })

  test("gilded rarity lands roughly one-in-weight", () => {
    let hits = 0
    for (let seed = 0; seed < 2000; seed++) {
      if (sampleDna(rayTemplate, seed).rarity.includes("gilded")) hits++
    }
    const expected = 2000 / 32
    expect(hits).toBeGreaterThanOrEqual(expected * 0.25)
    expect(hits).toBeLessThanOrEqual(expected * 4)
  })
})

describe("buildRay", () => {
  test("carries the full part inventory with pivots and colors", () => {
    const build = buildRay(sampleDna(rayTemplate, 42))
    const names = new Set(build.fields.map((f) => f.name))
    for (const part of [
      "body",
      "head",
      "eyeLeft",
      "eyeRight",
      "finLeft",
      "finRight",
      "tail",
      "tailTip",
      "legFL",
      "legFR",
    ]) {
      expect(names.has(part)).toBe(true)
      expect(build.pivots[part]).toBeDefined()
      expect(build.colors[part]).toBeDefined()
    }
    // Non-quadruped contract: a head seated on the trunk, no neck, and only
    // the two vestigial pelvic fin-lobes the shared stage rig reads as legs.
    expect(names.has("neck")).toBe(false)
    expect(
      build.fields
        .map((f) => f.name)
        .filter((n) => n.startsWith("leg"))
        .sort(),
    ).toEqual(["legFL", "legFR"])
  })

  test("voxelizes to a non-degenerate flat build", () => {
    const grid = voxelize(buildRay(sampleDna(rayTemplate, 42)).fields, RAY_GRID)
    const total = grid.parts.reduce((n, p) => n + p.voxels.length, 0)
    expect(total).toBeGreaterThan(900)
    for (const part of grid.parts) expect(part.voxels.length).toBeGreaterThan(0)
    const byName = new Map(grid.parts.map((p) => [p.name, p.voxels.length]))
    expect(byName.get("tailTip") ?? 0).toBeGreaterThan(10)
    expect(byName.get("finLeft") ?? 0).toBeGreaterThan(40)
  })

  test("is deterministic for a fixed seed", () => {
    expect(JSON.stringify(buildRay(sampleDna(rayTemplate, 7)))).toBe(
      JSON.stringify(buildRay(sampleDna(rayTemplate, 7))),
    )
  })

  test("every life stage fits the grid with its signature parts", () => {
    const pinned: Record<(typeof STAGES)[number], string[]> = {
      baby: [],
      juvenile: SIGNATURES,
      champion: [...SIGNATURES, ...CROWNS],
    }
    for (const stage of STAGES) {
      const build = generate("ray", 42, stage).build
      const grid = voxelize(build.fields, RAY_GRID)
      const visited = new Set(grid.parts.map((p) => p.name))
      for (const part of pinned[stage]) expect(visited).toContain(part)
      for (const part of grid.parts) {
        for (const [x, y, z] of part.voxels) {
          expect(x).toBeGreaterThan(0)
          expect(x).toBeLessThan(RAY_GRID)
          expect(y).toBeGreaterThan(0)
          expect(y).toBeLessThan(RAY_GRID)
          expect(z).toBeGreaterThan(0)
          expect(z).toBeLessThan(RAY_GRID)
        }
      }
    }
  })
})

describe("ray stage maturation", () => {
  test("baby carries no signature parts and matches the default", () => {
    const def = generate("ray", 42)
    const names = def.build.fields.map((f) => f.name)
    for (const part of [...SIGNATURES, ...CROWNS])
      expect(names).not.toContain(part)
    expect(JSON.stringify(generate("ray", 42, "baby").build)).toBe(
      JSON.stringify(def.build),
    )
  })

  test("juvenile adds spark bars rigged off the head; baby parts survive", () => {
    const baby = generate("ray", 42).build
    const juv = generate("ray", 42, "juvenile").build
    const juvNames = juv.fields.map((f) => f.name)
    for (const part of SIGNATURES) {
      expect(juvNames).toContain(part)
      expect(juv.parents[part]).toBe("head")
      expect(juv.pivots[part]).toBeDefined()
      expect(juv.colors[part]).toBeDefined()
    }
    for (const part of baby.fields.map((f) => f.name))
      expect(juvNames).toContain(part)
  })

  test("champion adds arc crowns; juvenile parts survive", () => {
    const juv = generate("ray", 42, "juvenile").build
    const champ = generate("ray", 42, "champion").build
    const champNames = champ.fields.map((f) => f.name)
    for (const part of CROWNS) {
      expect(champNames).toContain(part)
      expect(champ.parents[part]).toBe("head")
    }
    for (const part of juv.fields.map((f) => f.name))
      expect(champNames).toContain(part)
  })

  test("pelvic fin-lobes ride higher as the ray matures", () => {
    const baby = generate("ray", 42).build
    const juv = generate("ray", 42, "juvenile").build
    for (const leg of ["legFL", "legFR"]) {
      expect(juv.pivots[leg]?.[1]).toBeGreaterThan(baby.pivots[leg]?.[1] ?? -1)
    }
  })

  test("stages keep the palette family but lift the shade", () => {
    const baby = generate("ray", 42).build
    const juv = generate("ray", 42, "juvenile").build
    const champ = generate("ray", 42, "champion").build
    expect(JSON.stringify(juv.colors.body)).not.toBe(
      JSON.stringify(baby.colors.body),
    )
    expect(JSON.stringify(champ.colors.body)).not.toBe(
      JSON.stringify(juv.colors.body),
    )
  })

  test("baby DNA is untouched by maturity", () => {
    const dna = sampleDna(rayTemplate, 42)
    expect(matureProportions(dna.proportions, "baby")).toEqual(dna.proportions)
  })
})
