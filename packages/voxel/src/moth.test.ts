import { describe, expect, test } from "bun:test"
import { generate } from "./archetype"
import { buildMoth, MOTH_GRID, mothTemplate } from "./moth"
import { sampleDna } from "./sample"
import { assertDnaInBounds, validateTemplate } from "./schema"
import { matureProportions } from "./stage"
import { voxelize } from "./voxelizer"

const STAGES = ["baby", "juvenile", "champion"] as const
const SIGNATURES = ["dustScaleLeft", "dustScaleRight"]
const CROWNS = ["lunarCrestLeft", "lunarCrestRight"]

describe("moth template", () => {
  test("declares a valid template", () => {
    expect(validateTemplate(mothTemplate)).toEqual([])
  })

  test("declares signature style slots with real variety", () => {
    const wings = mothTemplate.styles.wings
    const antennae = mothTemplate.styles.antennae
    if (!wings || !antennae) throw new Error("missing signature slot")
    expect(wings.length).toBeGreaterThanOrEqual(2)
    expect(antennae.length).toBeGreaterThanOrEqual(2)
  })

  test("palette hue is the Wind contract (165 degrees)", () => {
    expect(mothTemplate.palette.hue).toBe(165)
  })

  test("gilded rarity is the shared rare gate", () => {
    expect(mothTemplate.rarity.find((r) => r.id === "gilded")?.weight).toBe(32)
  })
})

describe("sampleDna (moth)", () => {
  test("same seed produces identical DNA in bounds", () => {
    const a = sampleDna(mothTemplate, 42)
    expect(a).toEqual(sampleDna(mothTemplate, 42))
    expect(a.archetype).toBe("moth")
    expect(assertDnaInBounds(a, mothTemplate)).toEqual([])
  })

  test("different seeds produce distinct DNA", () => {
    const seen = new Set<string>()
    for (const seed of [1, 2, 3, 4, 5]) {
      seen.add(JSON.stringify(sampleDna(mothTemplate, seed)))
    }
    expect(seen.size).toBeGreaterThanOrEqual(4)
  })

  test("styles always come from the declared slots", () => {
    for (let seed = 0; seed < 30; seed++) {
      const dna = sampleDna(mothTemplate, seed)
      for (const [slot, styleId] of Object.entries(dna.styles)) {
        const defs = mothTemplate.styles[slot]
        if (!defs) throw new Error(`unknown slot ${slot}`)
        expect(defs.some((def) => def.id === styleId)).toBe(true)
      }
    }
  })

  test("gilded rarity lands roughly one-in-weight", () => {
    let hits = 0
    for (let seed = 0; seed < 2000; seed++) {
      if (sampleDna(mothTemplate, seed).rarity.includes("gilded")) hits++
    }
    const expected = 2000 / 32
    expect(hits).toBeGreaterThanOrEqual(expected * 0.25)
    expect(hits).toBeLessThanOrEqual(expected * 4)
  })
})

describe("buildMoth", () => {
  test("carries the full part inventory with pivots and colors", () => {
    const build = buildMoth(sampleDna(mothTemplate, 42))
    const names = new Set(build.fields.map((f) => f.name))
    for (const part of [
      "body",
      "neck",
      "head",
      "eyeLeft",
      "eyeRight",
      "wingFL",
      "wingFR",
      "wingHL",
      "wingHR",
      "antennaLeft",
      "antennaRight",
      "legFL",
      "legFR",
      "legML",
      "legMR",
      "legBL",
      "legBR",
    ]) {
      expect(names.has(part)).toBe(true)
      expect(build.pivots[part]).toBeDefined()
      expect(build.colors[part]).toBeDefined()
    }
    expect(
      build.fields
        .map((f) => f.name)
        .filter((n) => n.startsWith("leg"))
        .sort(),
    ).toEqual(["legBL", "legBR", "legFL", "legFR", "legML", "legMR"])
  })

  test("voxelizes to a non-degenerate winged build", () => {
    const grid = voxelize(
      buildMoth(sampleDna(mothTemplate, 42)).fields,
      MOTH_GRID,
    )
    const total = grid.parts.reduce((n, p) => n + p.voxels.length, 0)
    expect(total).toBeGreaterThan(900)
    for (const part of grid.parts) expect(part.voxels.length).toBeGreaterThan(0)
    const byName = new Map(grid.parts.map((p) => [p.name, p.voxels.length]))
    // The paired wings are the moth's banner, not decorative nubs.
    expect(byName.get("wingFL") ?? 0).toBeGreaterThan(40)
    expect(byName.get("wingFR") ?? 0).toBeGreaterThan(40)
  })

  test("is deterministic for a fixed seed", () => {
    expect(JSON.stringify(buildMoth(sampleDna(mothTemplate, 7)))).toBe(
      JSON.stringify(buildMoth(sampleDna(mothTemplate, 7))),
    )
  })

  test("every life stage fits the grid with its signature parts", () => {
    const pinned: Record<(typeof STAGES)[number], string[]> = {
      baby: [],
      juvenile: SIGNATURES,
      champion: [...SIGNATURES, ...CROWNS],
    }
    for (const stage of STAGES) {
      const build = generate("moth", 42, stage).build
      const grid = voxelize(build.fields, MOTH_GRID)
      const visited = new Set(grid.parts.map((p) => p.name))
      for (const part of pinned[stage]) expect(visited).toContain(part)
      for (const part of grid.parts) {
        for (const [x, y, z] of part.voxels) {
          expect(x).toBeGreaterThan(0)
          expect(x).toBeLessThan(MOTH_GRID)
          expect(y).toBeGreaterThan(0)
          expect(y).toBeLessThan(MOTH_GRID)
          expect(z).toBeGreaterThan(0)
          expect(z).toBeLessThan(MOTH_GRID)
        }
      }
    }
  })
})

describe("moth stage maturation", () => {
  test("baby carries no signature parts and matches the default", () => {
    const def = generate("moth", 42)
    const names = def.build.fields.map((f) => f.name)
    for (const part of [...SIGNATURES, ...CROWNS])
      expect(names).not.toContain(part)
    expect(JSON.stringify(generate("moth", 42, "baby").build)).toBe(
      JSON.stringify(def.build),
    )
  })

  test("juvenile adds dust scales rigged off the head; baby parts survive", () => {
    const baby = generate("moth", 42).build
    const juv = generate("moth", 42, "juvenile").build
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

  test("champion adds lunar crests; juvenile parts survive", () => {
    const juv = generate("moth", 42, "juvenile").build
    const champ = generate("moth", 42, "champion").build
    const champNames = champ.fields.map((f) => f.name)
    for (const part of CROWNS) {
      expect(champNames).toContain(part)
      expect(champ.parents[part]).toBe("head")
    }
    for (const part of juv.fields.map((f) => f.name))
      expect(champNames).toContain(part)
  })

  test("legs ride higher as the moth matures", () => {
    const baby = generate("moth", 42).build
    const juv = generate("moth", 42, "juvenile").build
    for (const leg of ["legFL", "legFR", "legML", "legMR", "legBL", "legBR"]) {
      expect(juv.pivots[leg]?.[1]).toBeGreaterThan(baby.pivots[leg]?.[1] ?? -1)
    }
  })

  test("stages keep the palette family but lift the shade", () => {
    const baby = generate("moth", 42).build
    const juv = generate("moth", 42, "juvenile").build
    const champ = generate("moth", 42, "champion").build
    expect(JSON.stringify(juv.colors.body)).not.toBe(
      JSON.stringify(baby.colors.body),
    )
    expect(JSON.stringify(champ.colors.body)).not.toBe(
      JSON.stringify(juv.colors.body),
    )
  })

  test("baby DNA is untouched by maturity", () => {
    const dna = sampleDna(mothTemplate, 42)
    expect(matureProportions(dna.proportions, "baby")).toEqual(dna.proportions)
  })
})
