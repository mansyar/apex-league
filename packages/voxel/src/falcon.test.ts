import { describe, expect, test } from "bun:test"
import { generate } from "./archetype"
import { buildFalcon, FALCON_GRID, falconTemplate } from "./falcon"
import { sampleDna } from "./sample"
import { assertDnaInBounds, validateTemplate } from "./schema"
import { matureProportions } from "./stage"
import { voxelize } from "./voxelizer"

describe("falcon template", () => {
  test("declares a valid template", () => {
    expect(validateTemplate(falconTemplate)).toEqual([])
  })

  test("declares signature style slots with real variety", () => {
    const wings = falconTemplate.styles.wings
    if (!wings) throw new Error("missing wings slot")
    expect(wings.length).toBeGreaterThanOrEqual(2)
    const tail = falconTemplate.styles.tail
    if (!tail) throw new Error("missing tail slot")
    expect(tail.length).toBeGreaterThanOrEqual(2)
  })

  test("palette hue is the Wind contract (165 degrees)", () => {
    expect(falconTemplate.palette.hue).toBe(165)
  })

  test("gilded rarity is a rare gate", () => {
    const gate = falconTemplate.rarity.find((r) => r.id === "gilded")
    expect(gate).toBeDefined()
    expect(gate?.weight).toBeGreaterThanOrEqual(16)
  })
})

describe("sampleDna (falcon)", () => {
  test("same seed produces identical DNA in bounds", () => {
    const a = sampleDna(falconTemplate, 42)
    const b = sampleDna(falconTemplate, 42)
    expect(a).toEqual(b)
    expect(a.archetype).toBe("falcon")
    expect(assertDnaInBounds(a, falconTemplate)).toEqual([])
  })

  test("different seeds produce distinct DNA", () => {
    const seen = new Set<string>()
    for (const seed of [1, 2, 3, 4, 5]) {
      seen.add(JSON.stringify(sampleDna(falconTemplate, seed)))
    }
    expect(seen.size).toBeGreaterThanOrEqual(4)
  })

  test("styles always come from the declared slots", () => {
    for (let seed = 0; seed < 30; seed++) {
      const dna = sampleDna(falconTemplate, seed)
      for (const [slot, styleId] of Object.entries(dna.styles)) {
        const defs = falconTemplate.styles[slot]
        if (!defs) throw new Error(`unknown slot ${slot}`)
        expect(defs.some((def) => def.id === styleId)).toBe(true)
      }
    }
  })

  test("gilded rarity lands roughly one-in-weight", () => {
    let hits = 0
    const weight = falconTemplate.rarity[0]?.weight ?? 32
    for (let seed = 0; seed < 2000; seed++) {
      if (sampleDna(falconTemplate, seed).rarity.includes("gilded")) hits++
    }
    const expected = 2000 / weight
    expect(hits).toBeGreaterThanOrEqual(expected * 0.25)
    expect(hits).toBeLessThanOrEqual(expected * 4)
  })
})

describe("buildFalcon", () => {
  test("carries the full part inventory with pivots and colors", () => {
    const dna = sampleDna(falconTemplate, 42)
    const build = buildFalcon(dna)
    const names = new Set(build.fields.map((f) => f.name))
    for (const part of [
      "body",
      "wingLeft",
      "wingRight",
      "neck",
      "head",
      "beak",
      "eyeLeft",
      "eyeRight",
      "tail",
      "tailTip",
      "legFL",
      "legFR",
    ]) {
      expect(names.has(part)).toBe(true)
      expect(build.pivots[part]).toBeDefined()
      expect(build.colors[part]).toBeDefined()
    }
    // The biped contract: exactly two legs and two wings — what separates
    // the falcon from every four-legged archetype, especially the hound.
    const legNames = build.fields
      .map((f) => f.name)
      .filter((n) => n.startsWith("leg"))
    expect(legNames).toEqual(["legFL", "legFR"])
  })

  test("voxelizes to a non-degenerate winged build", () => {
    const dna = sampleDna(falconTemplate, 42)
    const build = buildFalcon(dna)
    const grid = voxelize(build.fields, FALCON_GRID)
    const total = grid.parts.reduce((n, p) => n + p.voxels.length, 0)
    expect(total).toBeGreaterThan(900)
    for (const part of grid.parts) expect(part.voxels.length).toBeGreaterThan(0)
    const byName = new Map(grid.parts.map((p) => [p.name, p.voxels.length]))
    // A folded wing is a substantial blade along the flank, not a nub.
    expect(byName.get("wingLeft") ?? 0).toBeGreaterThan(40)
    expect(byName.get("wingRight") ?? 0).toBeGreaterThan(40)
    // Every declared part claims voxels at the archetype grid — a part
    // that paints nothing is a dead field.
    for (const part of grid.parts) expect(part.voxels.length).toBeGreaterThan(0)
  })

  test("is deterministic for a fixed seed", () => {
    const dna = sampleDna(falconTemplate, 7)
    const a = buildFalcon(dna)
    const b = buildFalcon(dna)
    expect(JSON.stringify(a.fields)).toBe(JSON.stringify(b.fields))
    expect(JSON.stringify(a.pivots)).toBe(JSON.stringify(b.pivots))
    expect(JSON.stringify(a.colors)).toBe(JSON.stringify(b.colors))
  })

  test("runs inside the archetype grid without touching the boundary", () => {
    const dna = sampleDna(falconTemplate, 42)
    const build = buildFalcon(dna)
    const grid = voxelize(build.fields, FALCON_GRID)
    const r = FALCON_GRID - 1
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

describe("falcon stage maturation", () => {
  test("baby carries no signature parts and matches the default", () => {
    const def = generate("falcon", 42)
    const names = def.build.fields.map((f) => f.name)
    for (const part of ["pinionBudLeft", "pinionBudRight"]) {
      expect(names).not.toContain(part)
    }
    expect(JSON.stringify(generate("falcon", 42, "baby").build)).toBe(
      JSON.stringify(def.build),
    )
  })

  test("juvenile adds pinion buds rigged off the head; baby parts survive", () => {
    const baby = generate("falcon", 42)
    const juv = generate("falcon", 42, "juvenile")
    const babyNames = baby.build.fields.map((f) => f.name)
    const juvNames = juv.build.fields.map((f) => f.name)
    for (const part of ["pinionBudLeft", "pinionBudRight"]) {
      expect(juvNames).toContain(part)
      expect(juv.build.parents[part]).toBe("head")
      expect(juv.build.pivots[part]).toBeDefined()
      expect(juv.build.colors[part]).toBeDefined()
    }
    for (const name of babyNames) expect(juvNames).toContain(name)
  })

  test("champion adds crown plumes; juvenile parts survive", () => {
    const juv = generate("falcon", 42, "juvenile")
    const champ = generate("falcon", 42, "champion")
    const juvNames = juv.build.fields.map((f) => f.name)
    const champNames = champ.build.fields.map((f) => f.name)
    for (const part of ["crownPlumeLeft", "crownPlumeRight"]) {
      expect(champNames).toContain(part)
      expect(champ.build.parents[part]).toBe("head")
    }
    for (const name of juvNames) expect(champNames).toContain(name)
  })

  test("legs ride higher as the falcon matures", () => {
    const baby = generate("falcon", 42)
    const juv = generate("falcon", 42, "juvenile")
    for (const leg of ["legFL", "legFR"]) {
      expect(juv.build.pivots[leg]?.[1]).toBeGreaterThan(
        baby.build.pivots[leg]?.[1] ?? -1,
      )
    }
  })

  test("stages keep the palette family but lift the shade", () => {
    const baby = generate("falcon", 42)
    const juv = generate("falcon", 42, "juvenile")
    const champ = generate("falcon", 42, "champion")
    expect(JSON.stringify(juv.build.colors.body)).not.toBe(
      JSON.stringify(baby.build.colors.body),
    )
    expect(JSON.stringify(champ.build.colors.body)).not.toBe(
      JSON.stringify(juv.build.colors.body),
    )
  })

  test("baby DNA is untouched by maturity", () => {
    const dna = sampleDna(falconTemplate, 42)
    expect(matureProportions(dna.proportions, "baby")).toEqual(dna.proportions)
  })
})
