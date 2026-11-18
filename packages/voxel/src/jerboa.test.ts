import { describe, expect, test } from "bun:test"
import { generate } from "./archetype"
import { buildJerboa, JERBOA_GRID, jerboaTemplate } from "./jerboa"
import { sampleDna } from "./sample"
import { assertDnaInBounds, validateTemplate } from "./schema"
import { matureProportions } from "./stage"
import { voxelize } from "./voxelizer"

const STAGES = ["baby", "juvenile", "champion"] as const
const SIGNATURES = ["dustTuftLeft", "dustTuftRight"]
const CROWNS = ["duneCrestLeft", "duneCrestRight"]

describe("jerboa template", () => {
  test("declares a valid template", () => {
    expect(validateTemplate(jerboaTemplate)).toEqual([])
  })

  test("declares signature style slots with real variety", () => {
    const ears = jerboaTemplate.styles.ears
    const tail = jerboaTemplate.styles.tail
    if (!ears || !tail) throw new Error("missing signature slot")
    expect(ears.length).toBeGreaterThanOrEqual(2)
    expect(tail.length).toBeGreaterThanOrEqual(2)
  })

  test("palette hue is the Earth contract (28 degrees)", () => {
    expect(jerboaTemplate.palette.hue).toBe(28)
  })

  test("gilded rarity is the shared rare gate", () => {
    expect(jerboaTemplate.rarity.find((r) => r.id === "gilded")?.weight).toBe(
      32,
    )
  })
})

describe("sampleDna (jerboa)", () => {
  test("same seed produces identical DNA in bounds", () => {
    const a = sampleDna(jerboaTemplate, 42)
    expect(a).toEqual(sampleDna(jerboaTemplate, 42))
    expect(a.archetype).toBe("jerboa")
    expect(assertDnaInBounds(a, jerboaTemplate)).toEqual([])
  })

  test("different seeds produce distinct DNA", () => {
    const seen = new Set<string>()
    for (const seed of [1, 2, 3, 4, 5]) {
      seen.add(JSON.stringify(sampleDna(jerboaTemplate, seed)))
    }
    expect(seen.size).toBeGreaterThanOrEqual(4)
  })

  test("styles always come from the declared slots", () => {
    for (let seed = 0; seed < 30; seed++) {
      const dna = sampleDna(jerboaTemplate, seed)
      for (const [slot, styleId] of Object.entries(dna.styles)) {
        const defs = jerboaTemplate.styles[slot]
        if (!defs) throw new Error(`unknown slot ${slot}`)
        expect(defs.some((def) => def.id === styleId)).toBe(true)
      }
    }
  })

  test("gilded rarity lands roughly one-in-weight", () => {
    let hits = 0
    for (let seed = 0; seed < 2000; seed++) {
      if (sampleDna(jerboaTemplate, seed).rarity.includes("gilded")) hits++
    }
    const expected = 2000 / 32
    expect(hits).toBeGreaterThanOrEqual(expected * 0.25)
    expect(hits).toBeLessThanOrEqual(expected * 4)
  })
})

describe("buildJerboa", () => {
  test("carries the full part inventory with pivots and colors", () => {
    const build = buildJerboa(sampleDna(jerboaTemplate, 42))
    const names = new Set(build.fields.map((f) => f.name))
    for (const part of [
      "body",
      "neck",
      "head",
      "eyeLeft",
      "eyeRight",
      "tail",
      "tailTip",
      "earLeft",
      "earRight",
      "legFL",
      "legFR",
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
    ).toEqual(["legBL", "legBR", "legFL", "legFR"])
  })

  test("voxelizes to a non-degenerate compact build", () => {
    const grid = voxelize(
      buildJerboa(sampleDna(jerboaTemplate, 42)).fields,
      JERBOA_GRID,
    )
    const total = grid.parts.reduce((n, p) => n + p.voxels.length, 0)
    expect(total).toBeGreaterThan(900)
    for (const part of grid.parts) expect(part.voxels.length).toBeGreaterThan(0)
    const byName = new Map(grid.parts.map((p) => [p.name, p.voxels.length]))
    // The whip tail is the jerboa's banner, not a nub.
    expect(byName.get("tailTip") ?? 0).toBeGreaterThan(10)
  })

  test("is deterministic for a fixed seed", () => {
    const a = buildJerboa(sampleDna(jerboaTemplate, 7))
    const b = buildJerboa(sampleDna(jerboaTemplate, 7))
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })

  test("every life stage fits the grid with its signature parts", () => {
    const pinned: Record<(typeof STAGES)[number], string[]> = {
      baby: [],
      juvenile: SIGNATURES,
      champion: [...SIGNATURES, ...CROWNS],
    }
    for (const stage of STAGES) {
      const build = generate("jerboa", 42, stage).build
      const grid = voxelize(build.fields, JERBOA_GRID)
      const visited = new Set(grid.parts.map((p) => p.name))
      for (const part of pinned[stage]) expect(visited).toContain(part)
      for (const part of grid.parts) {
        for (const [x, y, z] of part.voxels) {
          expect(x).toBeGreaterThan(0)
          expect(x).toBeLessThan(JERBOA_GRID)
          expect(y).toBeGreaterThan(0)
          expect(y).toBeLessThan(JERBOA_GRID)
          expect(z).toBeGreaterThan(0)
          expect(z).toBeLessThan(JERBOA_GRID)
        }
      }
    }
  })
})

describe("jerboa stage maturation", () => {
  test("baby carries no signature parts and matches the default", () => {
    const def = generate("jerboa", 42)
    const names = def.build.fields.map((f) => f.name)
    for (const part of [...SIGNATURES, ...CROWNS])
      expect(names).not.toContain(part)
    expect(JSON.stringify(generate("jerboa", 42, "baby").build)).toBe(
      JSON.stringify(def.build),
    )
  })

  test("juvenile adds tufts rigged off the head; baby parts survive", () => {
    const baby = generate("jerboa", 42).build
    const juv = generate("jerboa", 42, "juvenile").build
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

  test("champion adds dune crests; juvenile parts survive", () => {
    const juv = generate("jerboa", 42, "juvenile").build
    const champ = generate("jerboa", 42, "champion").build
    const champNames = champ.fields.map((f) => f.name)
    for (const part of CROWNS) {
      expect(champNames).toContain(part)
      expect(champ.parents[part]).toBe("head")
    }
    for (const part of juv.fields.map((f) => f.name))
      expect(champNames).toContain(part)
  })

  test("legs ride higher as the jerboa matures", () => {
    const baby = generate("jerboa", 42).build
    const juv = generate("jerboa", 42, "juvenile").build
    for (const leg of ["legFL", "legFR", "legBL", "legBR"]) {
      expect(juv.pivots[leg]?.[1]).toBeGreaterThan(baby.pivots[leg]?.[1] ?? -1)
    }
  })

  test("stages keep the palette family but lift the shade", () => {
    const baby = generate("jerboa", 42).build
    const juv = generate("jerboa", 42, "juvenile").build
    const champ = generate("jerboa", 42, "champion").build
    expect(JSON.stringify(juv.colors.body)).not.toBe(
      JSON.stringify(baby.colors.body),
    )
    expect(JSON.stringify(champ.colors.body)).not.toBe(
      JSON.stringify(juv.colors.body),
    )
  })

  test("baby DNA is untouched by maturity", () => {
    const dna = sampleDna(jerboaTemplate, 42)
    expect(matureProportions(dna.proportions, "baby")).toEqual(dna.proportions)
  })
})
