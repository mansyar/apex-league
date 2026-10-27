import { describe, expect, test } from "bun:test"
import { generate } from "./archetype"
import { BOAR_GRID, boarTemplate, buildBoar } from "./boar"
import { sampleDna } from "./sample"
import { assertDnaInBounds, validateTemplate } from "./schema"
import { matureProportions } from "./stage"
import { voxelize } from "./voxelizer"

describe("boar template", () => {
  test("declares a valid template", () => {
    expect(validateTemplate(boarTemplate)).toEqual([])
  })

  test("declares signature style slots with real variety", () => {
    const ridge = boarTemplate.styles.ridge
    if (!ridge) throw new Error("missing ridge slot")
    expect(ridge.length).toBeGreaterThanOrEqual(2)
    const paws = boarTemplate.styles.paws
    if (!paws) throw new Error("missing paws slot")
    expect(paws.length).toBeGreaterThanOrEqual(2)
  })

  test("palette hue is the Plant contract (110 degrees)", () => {
    expect(boarTemplate.palette.hue).toBe(110)
  })

  test("gilded rarity is the shared rare gate", () => {
    const gate = boarTemplate.rarity.find((r) => r.id === "gilded")
    expect(gate).toBeDefined()
    expect(gate?.weight).toBe(32)
  })
})

describe("sampleDna (boar)", () => {
  test("same seed produces identical DNA in bounds", () => {
    const a = sampleDna(boarTemplate, 42)
    const b = sampleDna(boarTemplate, 42)
    expect(a).toEqual(b)
    expect(a.archetype).toBe("boar")
    expect(assertDnaInBounds(a, boarTemplate)).toEqual([])
  })

  test("different seeds produce distinct DNA", () => {
    const seen = new Set<string>()
    for (const seed of [1, 2, 3, 4, 5]) {
      seen.add(JSON.stringify(sampleDna(boarTemplate, seed)))
    }
    expect(seen.size).toBeGreaterThanOrEqual(4)
  })

  test("styles always come from the declared slots", () => {
    for (let seed = 0; seed < 30; seed++) {
      const dna = sampleDna(boarTemplate, seed)
      for (const [slot, styleId] of Object.entries(dna.styles)) {
        const defs = boarTemplate.styles[slot]
        if (!defs) throw new Error(`unknown slot ${slot}`)
        expect(defs.some((def) => def.id === styleId)).toBe(true)
      }
    }
  })

  test("gilded rarity lands roughly one-in-weight", () => {
    let hits = 0
    const weight = boarTemplate.rarity[0]?.weight ?? 32
    for (let seed = 0; seed < 2000; seed++) {
      if (sampleDna(boarTemplate, seed).rarity.includes("gilded")) hits++
    }
    const expected = 2000 / weight
    expect(hits).toBeGreaterThanOrEqual(expected * 0.25)
    expect(hits).toBeLessThanOrEqual(expected * 4)
  })
})

describe("buildBoar", () => {
  test("carries the full part inventory with pivots and colors", () => {
    const dna = sampleDna(boarTemplate, 42)
    const build = buildBoar(dna)
    const names = new Set(build.fields.map((f) => f.name))
    for (const part of [
      "body",
      "ridge",
      "legFL",
      "legFR",
      "legBL",
      "legBR",
      "neck",
      "head",
      "eyeLeft",
      "eyeRight",
      "tail",
      "tailTip",
    ]) {
      expect(names.has(part)).toBe(true)
      expect(build.pivots[part]).toBeDefined()
      expect(build.colors[part]).toBeDefined()
    }
    // The quadruped contract: exactly four legs.
    const legNames = build.fields
      .map((f) => f.name)
      .filter((n) => n.startsWith("leg"))
    expect(legNames).toEqual(["legFL", "legFR", "legBL", "legBR"])
  })

  test("voxelizes to a non-degenerate heavy build", () => {
    const dna = sampleDna(boarTemplate, 42)
    const build = buildBoar(dna)
    const grid = voxelize(build.fields, BOAR_GRID)
    const total = grid.parts.reduce((n, p) => n + p.voxels.length, 0)
    expect(total).toBeGreaterThan(900)
    // Every declared part claims voxels at the archetype grid — a part
    // that paints nothing is a dead field.
    for (const part of grid.parts) expect(part.voxels.length).toBeGreaterThan(0)
    const byName = new Map(grid.parts.map((p) => [p.name, p.voxels.length]))
    // The mossy ridge is a crest, not paint — a real dorsal mass.
    expect(byName.get("ridge") ?? 0).toBeGreaterThan(10)
  })

  test("is deterministic for a fixed seed", () => {
    const a = buildBoar(sampleDna(boarTemplate, 7))
    const b = buildBoar(sampleDna(boarTemplate, 7))
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })

  test("every life stage fits the grid", () => {
    // Every life stage ships its own GLB, so every stage must fit the grid —
    // not just the baby build. The juvenile moss buds and champion tusks
    // are the parts that grow the silhouette, so they are exactly the ones
    // a baby-only assertion never looked at.
    const r = BOAR_GRID
    const STAGES = ["baby", "juvenile", "champion"] as const
    const signatureParts: Record<(typeof STAGES)[number], string[]> = {
      baby: [],
      juvenile: ["mossBudLeft", "mossBudRight"],
      champion: ["crownTuskLeft", "crownTuskRight"],
    }
    for (const stage of STAGES) {
      const build = generate("boar", 42, stage).build
      const grid = voxelize(build.fields, BOAR_GRID)
      // A stage that dropped its signature parts would pass the containment
      // check by covering less of the creature, so pin the coverage itself.
      const visited = new Set(grid.parts.map((part) => part.name))
      expect(visited).toContain("ridge")
      for (const part of signatureParts[stage]) expect(visited).toContain(part)
      for (const part of grid.parts) {
        for (const [x, y, z] of part.voxels) {
          expect(x).toBeGreaterThan(0)
          expect(x).toBeLessThan(r)
          expect(y).toBeGreaterThan(0)
          expect(y).toBeLessThan(r)
          expect(z).toBeGreaterThan(0)
          expect(z).toBeLessThan(r)
        }
      }
    }
  })
})

describe("boar stage maturation", () => {
  test("baby carries no signature parts and matches the default", () => {
    const def = generate("boar", 42)
    const names = def.build.fields.map((f) => f.name)
    for (const part of ["mossBudLeft", "mossBudRight"]) {
      expect(names).not.toContain(part)
    }
    expect(JSON.stringify(generate("boar", 42, "baby").build)).toBe(
      JSON.stringify(def.build),
    )
  })

  test("juvenile adds moss buds rigged off the head; baby parts survive", () => {
    const baby = generate("boar", 42)
    const juv = generate("boar", 42, "juvenile")
    const babyNames = baby.build.fields.map((f) => f.name)
    const juvNames = juv.build.fields.map((f) => f.name)
    for (const part of ["mossBudLeft", "mossBudRight"]) {
      expect(juvNames).toContain(part)
      expect(juv.build.parents[part]).toBe("head")
      expect(juv.build.pivots[part]).toBeDefined()
      expect(juv.build.colors[part]).toBeDefined()
    }
    for (const name of babyNames) expect(juvNames).toContain(name)
  })

  test("champion adds tusks; juvenile parts survive", () => {
    const juv = generate("boar", 42, "juvenile")
    const champ = generate("boar", 42, "champion")
    const juvNames = juv.build.fields.map((f) => f.name)
    const champNames = champ.build.fields.map((f) => f.name)
    for (const part of ["crownTuskLeft", "crownTuskRight"]) {
      expect(champNames).toContain(part)
      expect(champ.build.parents[part]).toBe("head")
    }
    for (const name of juvNames) expect(champNames).toContain(name)
  })

  test("legs ride higher as the boar matures", () => {
    const baby = generate("boar", 42)
    const juv = generate("boar", 42, "juvenile")
    for (const leg of ["legFL", "legFR", "legBL", "legBR"]) {
      expect(juv.build.pivots[leg]?.[1]).toBeGreaterThan(
        baby.build.pivots[leg]?.[1] ?? -1,
      )
    }
  })

  test("stages keep the palette family but lift the shade", () => {
    const baby = generate("boar", 42)
    const juv = generate("boar", 42, "juvenile")
    const champ = generate("boar", 42, "champion")
    expect(JSON.stringify(juv.build.colors.body)).not.toBe(
      JSON.stringify(baby.build.colors.body),
    )
    expect(JSON.stringify(champ.build.colors.body)).not.toBe(
      JSON.stringify(juv.build.colors.body),
    )
  })

  test("baby DNA is untouched by maturity", () => {
    const dna = sampleDna(boarTemplate, 42)
    expect(matureProportions(dna.proportions, "baby")).toEqual(dna.proportions)
  })
})
