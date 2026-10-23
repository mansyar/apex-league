import { describe, expect, test } from "bun:test"
import { generate } from "./archetype"
import { sampleDna } from "./sample"
import { assertDnaInBounds, validateTemplate } from "./schema"
import { matureProportions } from "./stage"
import { buildTortoise, TORTOISE_GRID, tortoiseTemplate } from "./tortoise"
import { voxelize } from "./voxelizer"

describe("tortoise template", () => {
  test("declares a valid template", () => {
    expect(validateTemplate(tortoiseTemplate)).toEqual([])
  })

  test("declares signature style slots with real variety", () => {
    const shell = tortoiseTemplate.styles.shell
    if (!shell) throw new Error("missing shell slot")
    expect(shell.length).toBeGreaterThanOrEqual(2)
    const tail = tortoiseTemplate.styles.tail
    if (!tail) throw new Error("missing tail slot")
    expect(tail.length).toBeGreaterThanOrEqual(2)
  })

  test("palette hue is the Earth contract (28 degrees)", () => {
    expect(tortoiseTemplate.palette.hue).toBe(28)
  })

  test("gilded rarity is a rare gate", () => {
    const gate = tortoiseTemplate.rarity.find((r) => r.id === "gilded")
    expect(gate).toBeDefined()
    expect(gate?.weight).toBeGreaterThanOrEqual(16)
  })
})

describe("sampleDna (tortoise)", () => {
  test("same seed produces identical DNA in bounds", () => {
    const a = sampleDna(tortoiseTemplate, 42)
    const b = sampleDna(tortoiseTemplate, 42)
    expect(a).toEqual(b)
    expect(a.archetype).toBe("tortoise")
    expect(assertDnaInBounds(a, tortoiseTemplate)).toEqual([])
  })

  test("different seeds produce distinct DNA", () => {
    const seen = new Set<string>()
    for (const seed of [1, 2, 3, 4, 5]) {
      seen.add(JSON.stringify(sampleDna(tortoiseTemplate, seed)))
    }
    expect(seen.size).toBeGreaterThanOrEqual(4)
  })

  test("styles always come from the declared slots", () => {
    for (let seed = 0; seed < 30; seed++) {
      const dna = sampleDna(tortoiseTemplate, seed)
      for (const [slot, styleId] of Object.entries(dna.styles)) {
        const defs = tortoiseTemplate.styles[slot]
        if (!defs) throw new Error(`unknown slot ${slot}`)
        expect(defs.some((def) => def.id === styleId)).toBe(true)
      }
    }
  })

  test("gilded rarity lands roughly one-in-weight", () => {
    let hits = 0
    const weight = tortoiseTemplate.rarity[0]?.weight ?? 32
    for (let seed = 0; seed < 2000; seed++) {
      if (sampleDna(tortoiseTemplate, seed).rarity.includes("gilded")) hits++
    }
    const expected = 2000 / weight
    expect(hits).toBeGreaterThanOrEqual(expected * 0.25)
    expect(hits).toBeLessThanOrEqual(expected * 4)
  })
})

describe("buildTortoise", () => {
  test("carries the full part inventory with pivots and colors", () => {
    const dna = sampleDna(tortoiseTemplate, 42)
    const build = buildTortoise(dna)
    const names = new Set(build.fields.map((f) => f.name))
    for (const part of [
      "body",
      "shell",
      "plastron",
      "neck",
      "head",
      "eyeLeft",
      "eyeRight",
      "tail",
      "tailTip",
      "legFL",
      "legFR",
      "legBL",
      "legBR",
    ]) {
      expect(names.has(part)).toBe(true)
      expect(build.pivots[part]).toBeDefined()
      expect(build.colors[part]).toBeDefined()
    }
  })

  test("voxelizes to a non-degenerate, shell-dominated build", () => {
    const dna = sampleDna(tortoiseTemplate, 42)
    const build = buildTortoise(dna)
    const grid = voxelize(build.fields, TORTOISE_GRID)
    const total = grid.parts.reduce((n, p) => n + p.voxels.length, 0)
    expect(total).toBeGreaterThan(1500)
    for (const part of grid.parts) expect(part.voxels.length).toBeGreaterThan(0)
    const byName = new Map(grid.parts.map((p) => [p.name, p.voxels.length]))
    // The dome is the silhouette's dominant mass — what separates the
    // tortoise from every unhelled quadruped.
    expect(byName.get("shell") ?? 0).toBeGreaterThan(byName.get("body") ?? 0)
    expect(byName.get("plastron")).toBeGreaterThan(0)
  })

  test("is deterministic for a fixed seed", () => {
    const dna = sampleDna(tortoiseTemplate, 7)
    const a = buildTortoise(dna)
    const b = buildTortoise(dna)
    expect(JSON.stringify(a.fields)).toBe(JSON.stringify(b.fields))
    expect(JSON.stringify(a.pivots)).toBe(JSON.stringify(b.pivots))
    expect(JSON.stringify(a.colors)).toBe(JSON.stringify(b.colors))
  })

  test("runs inside the archetype grid without touching the boundary", () => {
    const dna = sampleDna(tortoiseTemplate, 42)
    const build = buildTortoise(dna)
    const grid = voxelize(build.fields, TORTOISE_GRID)
    const r = TORTOISE_GRID - 1
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

describe("tortoise stage maturation", () => {
  test("baby carries no signature parts and matches the default", () => {
    const def = generate("tortoise", 42)
    const names = def.build.fields.map((f) => f.name)
    for (const part of ["skullBudLeft", "skullBudRight"]) {
      expect(names).not.toContain(part)
    }
    expect(JSON.stringify(generate("tortoise", 42, "baby").build)).toBe(
      JSON.stringify(def.build),
    )
  })

  test("juvenile adds skull buds rigged off the head; baby parts survive", () => {
    const baby = generate("tortoise", 42)
    const juv = generate("tortoise", 42, "juvenile")
    const babyNames = baby.build.fields.map((f) => f.name)
    const juvNames = juv.build.fields.map((f) => f.name)
    for (const part of ["skullBudLeft", "skullBudRight"]) {
      expect(juvNames).toContain(part)
      expect(juv.build.parents[part]).toBe("head")
      expect(juv.build.pivots[part]).toBeDefined()
      expect(juv.build.colors[part]).toBeDefined()
    }
    for (const name of babyNames) expect(juvNames).toContain(name)
  })

  test("champion adds stone spikes; juvenile parts survive", () => {
    const juv = generate("tortoise", 42, "juvenile")
    const champ = generate("tortoise", 42, "champion")
    const juvNames = juv.build.fields.map((f) => f.name)
    const champNames = champ.build.fields.map((f) => f.name)
    for (const part of ["crownStoneLeft", "crownStoneRight"]) {
      expect(champNames).toContain(part)
      expect(champ.build.parents[part]).toBe("head")
    }
    for (const name of juvNames) expect(champNames).toContain(name)
  })

  test("legs ride higher as the tortoise matures", () => {
    const baby = generate("tortoise", 42)
    const juv = generate("tortoise", 42, "juvenile")
    for (const leg of ["legFL", "legFR", "legBL", "legBR"]) {
      expect(juv.build.pivots[leg]?.[1]).toBeGreaterThan(
        baby.build.pivots[leg]?.[1] ?? -1,
      )
    }
  })

  test("stages keep the palette family but lift the shade", () => {
    const baby = generate("tortoise", 42)
    const juv = generate("tortoise", 42, "juvenile")
    const champ = generate("tortoise", 42, "champion")
    expect(JSON.stringify(juv.build.colors.body)).not.toBe(
      JSON.stringify(baby.build.colors.body),
    )
    expect(JSON.stringify(champ.build.colors.body)).not.toBe(
      JSON.stringify(juv.build.colors.body),
    )
  })

  test("baby DNA is untouched by maturity", () => {
    const dna = sampleDna(tortoiseTemplate, 42)
    expect(matureProportions(dna.proportions, "baby")).toEqual(dna.proportions)
  })
})
