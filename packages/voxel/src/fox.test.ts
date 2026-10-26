import { describe, expect, test } from "bun:test"
import { generate } from "./archetype"
import { buildFox, FOX_GRID, foxTemplate } from "./fox"
import { sampleDna } from "./sample"
import { assertDnaInBounds, validateTemplate } from "./schema"
import { matureProportions } from "./stage"
import { voxelize } from "./voxelizer"

describe("fox template", () => {
  test("declares a valid template", () => {
    expect(validateTemplate(foxTemplate)).toEqual([])
  })

  test("declares signature style slots with real variety", () => {
    const ears = foxTemplate.styles.ears
    if (!ears) throw new Error("missing ears slot")
    expect(ears.length).toBeGreaterThanOrEqual(2)
    const tail = foxTemplate.styles.tail
    if (!tail) throw new Error("missing tail slot")
    expect(tail.length).toBeGreaterThanOrEqual(2)
  })

  test("palette hue is the Electric contract (50 degrees)", () => {
    expect(foxTemplate.palette.hue).toBe(50)
  })

  test("gilded rarity is the shared rare gate", () => {
    const gate = foxTemplate.rarity.find((r) => r.id === "gilded")
    expect(gate).toBeDefined()
    expect(gate?.weight).toBe(32)
  })
})

describe("sampleDna (fox)", () => {
  test("same seed produces identical DNA in bounds", () => {
    const a = sampleDna(foxTemplate, 42)
    const b = sampleDna(foxTemplate, 42)
    expect(a).toEqual(b)
    expect(a.archetype).toBe("fox")
    expect(assertDnaInBounds(a, foxTemplate)).toEqual([])
  })

  test("different seeds produce distinct DNA", () => {
    const seen = new Set<string>()
    for (const seed of [1, 2, 3, 4, 5]) {
      seen.add(JSON.stringify(sampleDna(foxTemplate, seed)))
    }
    expect(seen.size).toBeGreaterThanOrEqual(4)
  })

  test("styles always come from the declared slots", () => {
    for (let seed = 0; seed < 30; seed++) {
      const dna = sampleDna(foxTemplate, seed)
      for (const [slot, styleId] of Object.entries(dna.styles)) {
        const defs = foxTemplate.styles[slot]
        if (!defs) throw new Error(`unknown slot ${slot}`)
        expect(defs.some((def) => def.id === styleId)).toBe(true)
      }
    }
  })

  test("gilded rarity lands roughly one-in-weight", () => {
    let hits = 0
    const weight = foxTemplate.rarity[0]?.weight ?? 32
    for (let seed = 0; seed < 2000; seed++) {
      if (sampleDna(foxTemplate, seed).rarity.includes("gilded")) hits++
    }
    const expected = 2000 / weight
    expect(hits).toBeGreaterThanOrEqual(expected * 0.25)
    expect(hits).toBeLessThanOrEqual(expected * 4)
  })
})

describe("buildFox", () => {
  test("carries the full part inventory with pivots and colors", () => {
    const dna = sampleDna(foxTemplate, 42)
    const build = buildFox(dna)
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
      "earLeft",
      "earRight",
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

  test("voxelizes to a non-degenerate compact build", () => {
    const dna = sampleDna(foxTemplate, 42)
    const build = buildFox(dna)
    const grid = voxelize(build.fields, FOX_GRID)
    const total = grid.parts.reduce((n, p) => n + p.voxels.length, 0)
    expect(total).toBeGreaterThan(900)
    // Every declared part claims voxels at the archetype grid — a part
    // that paints nothing is a dead field.
    for (const part of grid.parts) expect(part.voxels.length).toBeGreaterThan(0)
    const byName = new Map(grid.parts.map((p) => [p.name, p.voxels.length]))
    // The brush tail is the fox's banner, not a nub.
    expect(byName.get("tailTip") ?? 0).toBeGreaterThan(10)
  })

  test("is deterministic for a fixed seed", () => {
    const a = buildFox(sampleDna(foxTemplate, 7))
    const b = buildFox(sampleDna(foxTemplate, 7))
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })

  test("every life stage fits the grid", () => {
    // Every life stage ships its own GLB, so every stage must fit the grid —
    // not just the baby build. The juvenile ruffs and champion bolt crowns
    // are the parts that grow the silhouette, so they are exactly the ones a
    // baby-only assertion never looked at.
    const r = FOX_GRID
    const STAGES = ["baby", "juvenile", "champion"] as const
    const signatureParts: Record<(typeof STAGES)[number], string[]> = {
      baby: [],
      juvenile: ["voltRuffLeft", "voltRuffRight"],
      champion: ["crownBoltLeft", "crownBoltRight"],
    }
    for (const stage of STAGES) {
      const build = generate("fox", 42, stage).build
      const grid = voxelize(build.fields, FOX_GRID)
      // A stage that dropped its signature parts would pass the containment
      // check by covering less of the creature, so pin the coverage itself.
      const visited = new Set(grid.parts.map((part) => part.name))
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

describe("fox stage maturation", () => {
  test("baby carries no signature parts and matches the default", () => {
    const def = generate("fox", 42)
    const names = def.build.fields.map((f) => f.name)
    for (const part of ["voltRuffLeft", "voltRuffRight"]) {
      expect(names).not.toContain(part)
    }
    expect(JSON.stringify(generate("fox", 42, "baby").build)).toBe(
      JSON.stringify(def.build),
    )
  })

  test("juvenile adds volt ruffs rigged off the head; baby parts survive", () => {
    const baby = generate("fox", 42)
    const juv = generate("fox", 42, "juvenile")
    const babyNames = baby.build.fields.map((f) => f.name)
    const juvNames = juv.build.fields.map((f) => f.name)
    for (const part of ["voltRuffLeft", "voltRuffRight"]) {
      expect(juvNames).toContain(part)
      expect(juv.build.parents[part]).toBe("head")
      expect(juv.build.pivots[part]).toBeDefined()
      expect(juv.build.colors[part]).toBeDefined()
    }
    for (const name of babyNames) expect(juvNames).toContain(name)
  })

  test("champion adds bolt crowns; juvenile parts survive", () => {
    const juv = generate("fox", 42, "juvenile")
    const champ = generate("fox", 42, "champion")
    const juvNames = juv.build.fields.map((f) => f.name)
    const champNames = champ.build.fields.map((f) => f.name)
    for (const part of ["crownBoltLeft", "crownBoltRight"]) {
      expect(champNames).toContain(part)
      expect(champ.build.parents[part]).toBe("head")
    }
    for (const name of juvNames) expect(champNames).toContain(name)
  })

  test("legs ride higher as the fox matures", () => {
    const baby = generate("fox", 42)
    const juv = generate("fox", 42, "juvenile")
    for (const leg of ["legFL", "legFR", "legBL", "legBR"]) {
      expect(juv.build.pivots[leg]?.[1]).toBeGreaterThan(
        baby.build.pivots[leg]?.[1] ?? -1,
      )
    }
  })

  test("stages keep the palette family but lift the shade", () => {
    const baby = generate("fox", 42)
    const juv = generate("fox", 42, "juvenile")
    const champ = generate("fox", 42, "champion")
    expect(JSON.stringify(juv.build.colors.body)).not.toBe(
      JSON.stringify(baby.build.colors.body),
    )
    expect(JSON.stringify(champ.build.colors.body)).not.toBe(
      JSON.stringify(juv.build.colors.body),
    )
  })

  test("baby DNA is untouched by maturity", () => {
    const dna = sampleDna(foxTemplate, 42)
    expect(matureProportions(dna.proportions, "baby")).toEqual(dna.proportions)
  })
})
