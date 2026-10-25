import { describe, expect, test } from "bun:test"
import { generate } from "./archetype"
import { buildFrond, FROND_GRID, frondTemplate } from "./frond"
import { sampleDna } from "./sample"
import { assertDnaInBounds, validateTemplate } from "./schema"
import { matureProportions } from "./stage"
import { voxelize } from "./voxelizer"

describe("frond template", () => {
  test("declares a valid template", () => {
    expect(validateTemplate(frondTemplate)).toEqual([])
  })

  test("declares signature style slots with real variety", () => {
    const antlers = frondTemplate.styles.antlers
    if (!antlers) throw new Error("missing antlers slot")
    expect(antlers.length).toBeGreaterThanOrEqual(2)
    const tail = frondTemplate.styles.tail
    if (!tail) throw new Error("missing tail slot")
    expect(tail.length).toBeGreaterThanOrEqual(2)
  })

  test("palette hue is the Plant contract (110 degrees)", () => {
    expect(frondTemplate.palette.hue).toBe(110)
  })

  test("gilded rarity is the shared rare gate", () => {
    const gate = frondTemplate.rarity.find((r) => r.id === "gilded")
    expect(gate).toBeDefined()
    expect(gate?.weight).toBe(32)
  })
})

describe("sampleDna (frond)", () => {
  test("same seed produces identical DNA in bounds", () => {
    const a = sampleDna(frondTemplate, 42)
    const b = sampleDna(frondTemplate, 42)
    expect(a).toEqual(b)
    expect(a.archetype).toBe("frond")
    expect(assertDnaInBounds(a, frondTemplate)).toEqual([])
  })

  test("different seeds produce distinct DNA", () => {
    const seen = new Set<string>()
    for (const seed of [1, 2, 3, 4, 5]) {
      seen.add(JSON.stringify(sampleDna(frondTemplate, seed)))
    }
    expect(seen.size).toBeGreaterThanOrEqual(4)
  })

  test("styles always come from the declared slots", () => {
    for (let seed = 0; seed < 30; seed++) {
      const dna = sampleDna(frondTemplate, seed)
      for (const [slot, styleId] of Object.entries(dna.styles)) {
        const defs = frondTemplate.styles[slot]
        if (!defs) throw new Error(`unknown slot ${slot}`)
        expect(defs.some((def) => def.id === styleId)).toBe(true)
      }
    }
  })

  test("gilded rarity lands roughly one-in-weight", () => {
    let hits = 0
    const weight = frondTemplate.rarity[0]?.weight ?? 32
    for (let seed = 0; seed < 2000; seed++) {
      if (sampleDna(frondTemplate, seed).rarity.includes("gilded")) hits++
    }
    const expected = 2000 / weight
    expect(hits).toBeGreaterThanOrEqual(expected * 0.25)
    expect(hits).toBeLessThanOrEqual(expected * 4)
  })
})

describe("buildFrond", () => {
  test("carries the full part inventory with pivots and colors", () => {
    const dna = sampleDna(frondTemplate, 42)
    const build = buildFrond(dna)
    const names = new Set(build.fields.map((f) => f.name))
    for (const part of [
      "body",
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
      "antlerLeft",
      "antlerRight",
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

  test("voxelizes to a non-degenerate leggy build", () => {
    const dna = sampleDna(frondTemplate, 42)
    const build = buildFrond(dna)
    const grid = voxelize(build.fields, FROND_GRID)
    const total = grid.parts.reduce((n, p) => n + p.voxels.length, 0)
    expect(total).toBeGreaterThan(900)
    // Every declared part claims voxels at the archetype grid — a part
    // that paints nothing is a dead field.
    for (const part of grid.parts) expect(part.voxels.length).toBeGreaterThan(0)
    const byName = new Map(grid.parts.map((p) => [p.name, p.voxels.length]))
    // Leafy antler branches are a real crown, not a nub.
    expect(byName.get("antlerLeft") ?? 0).toBeGreaterThan(10)
    expect(byName.get("antlerRight") ?? 0).toBeGreaterThan(10)
  })

  test("is deterministic for a fixed seed", () => {
    const dna = sampleDna(frondTemplate, 7)
    const a = buildFrond(dna)
    const b = buildFrond(dna)
    expect(JSON.stringify(a.fields)).toBe(JSON.stringify(b.fields))
    expect(JSON.stringify(a.pivots)).toBe(JSON.stringify(b.pivots))
    expect(JSON.stringify(a.colors)).toBe(JSON.stringify(b.colors))
  })

  test("runs inside the archetype grid without touching the boundary", () => {
    const dna = sampleDna(frondTemplate, 42)
    const build = buildFrond(dna)
    const grid = voxelize(build.fields, FROND_GRID)
    const r = FROND_GRID - 1
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
  })
})

describe("frond stage maturation", () => {
  test("baby carries no signature parts and matches the default", () => {
    const def = generate("frond", 42)
    const names = def.build.fields.map((f) => f.name)
    for (const part of ["leafBudLeft", "leafBudRight"]) {
      expect(names).not.toContain(part)
    }
    expect(JSON.stringify(generate("frond", 42, "baby").build)).toBe(
      JSON.stringify(def.build),
    )
  })

  test("juvenile adds leaf buds rigged off the head; baby parts survive", () => {
    const baby = generate("frond", 42)
    const juv = generate("frond", 42, "juvenile")
    const babyNames = baby.build.fields.map((f) => f.name)
    const juvNames = juv.build.fields.map((f) => f.name)
    for (const part of ["leafBudLeft", "leafBudRight"]) {
      expect(juvNames).toContain(part)
      expect(juv.build.parents[part]).toBe("head")
      expect(juv.build.pivots[part]).toBeDefined()
      expect(juv.build.colors[part]).toBeDefined()
    }
    for (const name of babyNames) expect(juvNames).toContain(name)
  })

  test("champion adds crown blooms; juvenile parts survive", () => {
    const juv = generate("frond", 42, "juvenile")
    const champ = generate("frond", 42, "champion")
    const juvNames = juv.build.fields.map((f) => f.name)
    const champNames = champ.build.fields.map((f) => f.name)
    for (const part of ["crownBloomLeft", "crownBloomRight"]) {
      expect(champNames).toContain(part)
      expect(champ.build.parents[part]).toBe("head")
    }
    for (const name of juvNames) expect(champNames).toContain(name)
  })

  test("legs ride higher as the frond matures", () => {
    const baby = generate("frond", 42)
    const juv = generate("frond", 42, "juvenile")
    for (const leg of ["legFL", "legFR", "legBL", "legBR"]) {
      expect(juv.build.pivots[leg]?.[1]).toBeGreaterThan(
        baby.build.pivots[leg]?.[1] ?? -1,
      )
    }
  })

  test("stages keep the palette family but lift the shade", () => {
    const baby = generate("frond", 42)
    const juv = generate("frond", 42, "juvenile")
    const champ = generate("frond", 42, "champion")
    expect(JSON.stringify(juv.build.colors.body)).not.toBe(
      JSON.stringify(baby.build.colors.body),
    )
    expect(JSON.stringify(champ.build.colors.body)).not.toBe(
      JSON.stringify(juv.build.colors.body),
    )
  })

  test("baby DNA is untouched by maturity", () => {
    const dna = sampleDna(frondTemplate, 42)
    expect(matureProportions(dna.proportions, "baby")).toEqual(dna.proportions)
  })
})
