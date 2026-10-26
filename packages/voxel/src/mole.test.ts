import { describe, expect, test } from "bun:test"
import { generate } from "./archetype"
import { sampleDna } from "./sample"
import { assertDnaInBounds, validateTemplate } from "./schema"
import { buildMole, MOLE_GRID, moleTemplate } from "./mole"
import { matureProportions } from "./stage"
import { voxelize } from "./voxelizer"

describe("mole template", () => {
  test("declares a valid template", () => {
    expect(validateTemplate(moleTemplate)).toEqual([])
  })

  test("declares signature style slots with real variety", () => {
    const back = moleTemplate.styles.back
    if (!back) throw new Error("missing back slot")
    expect(back.length).toBeGreaterThanOrEqual(2)
    const paws = moleTemplate.styles.paws
    if (!paws) throw new Error("missing paws slot")
    expect(paws.length).toBeGreaterThanOrEqual(2)
  })

  test("palette hue is the Earth contract (28 degrees)", () => {
    expect(moleTemplate.palette.hue).toBe(28)
  })

  test("gilded rarity is the shared rare gate", () => {
    const gate = moleTemplate.rarity.find((r) => r.id === "gilded")
    expect(gate).toBeDefined()
    expect(gate?.weight).toBe(32)
  })
})

describe("sampleDna (mole)", () => {
  test("same seed produces identical DNA in bounds", () => {
    const a = sampleDna(moleTemplate, 42)
    const b = sampleDna(moleTemplate, 42)
    expect(a).toEqual(b)
    expect(a.archetype).toBe("mole")
    expect(assertDnaInBounds(a, moleTemplate)).toEqual([])
  })

  test("different seeds produce distinct DNA", () => {
    const seen = new Set<string>()
    for (const seed of [1, 2, 3, 4, 5]) {
      seen.add(JSON.stringify(sampleDna(moleTemplate, seed)))
    }
    expect(seen.size).toBeGreaterThanOrEqual(4)
  })

  test("styles always come from the declared slots", () => {
    for (let seed = 0; seed < 30; seed++) {
      const dna = sampleDna(moleTemplate, seed)
      for (const [slot, styleId] of Object.entries(dna.styles)) {
        const defs = moleTemplate.styles[slot]
        if (!defs) throw new Error(`unknown slot ${slot}`)
        expect(defs.some((def) => def.id === styleId)).toBe(true)
      }
    }
  })

  test("gilded rarity lands roughly one-in-weight", () => {
    let hits = 0
    const weight = moleTemplate.rarity[0]?.weight ?? 32
    for (let seed = 0; seed < 2000; seed++) {
      if (sampleDna(moleTemplate, seed).rarity.includes("gilded")) hits++
    }
    const expected = 2000 / weight
    expect(hits).toBeGreaterThanOrEqual(expected * 0.25)
    expect(hits).toBeLessThanOrEqual(expected * 4)
  })
})

describe("buildMole", () => {
  test("carries the full part inventory with pivots and colors", () => {
    const dna = sampleDna(moleTemplate, 42)
    const build = buildMole(dna)
    const names = new Set(build.fields.map((f) => f.name))
    for (const part of [
      "body",
      "plates",
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
    const dna = sampleDna(moleTemplate, 42)
    const build = buildMole(dna)
    const grid = voxelize(build.fields, MOLE_GRID)
    const total = grid.parts.reduce((n, p) => n + p.voxels.length, 0)
    expect(total).toBeGreaterThan(900)
    // Every declared part claims voxels at the archetype grid — a part
    // that paints nothing is a dead field.
    for (const part of grid.parts) expect(part.voxels.length).toBeGreaterThan(0)
    const byName = new Map(grid.parts.map((p) => [p.name, p.voxels.length]))
    // The slate plates are armor, not paint — a real dorsal mass.
    expect(byName.get("plates") ?? 0).toBeGreaterThan(10)
  })

  test("is deterministic for a fixed seed", () => {
    const a = buildMole(sampleDna(moleTemplate, 7))
    const b = buildMole(sampleDna(moleTemplate, 7))
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })

  test("every life stage fits the grid", () => {
    // Every life stage ships its own GLB, so every stage must fit the grid —
    // not just the baby build. The juvenile scale buds and champion slate
    // crowns are the parts that grow the silhouette, so they are exactly the
    // ones a baby-only assertion never looked at.
    const r = MOLE_GRID
    const STAGES = ["baby", "juvenile", "champion"] as const
    const signatureParts: Record<(typeof STAGES)[number], string[]> = {
      baby: [],
      juvenile: ["scaleBudLeft", "scaleBudRight"],
      champion: ["crownSlateLeft", "crownSlateRight"],
    }
    for (const stage of STAGES) {
      const build = generate("mole", 42, stage).build
      const grid = voxelize(build.fields, MOLE_GRID)
      // A stage that dropped its signature parts would pass the containment
      // check by covering less of the creature, so pin the coverage itself.
      const visited = new Set(grid.parts.map((part) => part.name))
      expect(visited).toContain("plates")
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

describe("mole stage maturation", () => {
  test("baby carries no signature parts and matches the default", () => {
    const def = generate("mole", 42)
    const names = def.build.fields.map((f) => f.name)
    for (const part of ["scaleBudLeft", "scaleBudRight"]) {
      expect(names).not.toContain(part)
    }
    expect(JSON.stringify(generate("mole", 42, "baby").build)).toBe(
      JSON.stringify(def.build),
    )
  })

  test("juvenile adds scale buds rigged off the head; baby parts survive", () => {
    const baby = generate("mole", 42)
    const juv = generate("mole", 42, "juvenile")
    const babyNames = baby.build.fields.map((f) => f.name)
    const juvNames = juv.build.fields.map((f) => f.name)
    for (const part of ["scaleBudLeft", "scaleBudRight"]) {
      expect(juvNames).toContain(part)
      expect(juv.build.parents[part]).toBe("head")
      expect(juv.build.pivots[part]).toBeDefined()
      expect(juv.build.colors[part]).toBeDefined()
    }
    for (const name of babyNames) expect(juvNames).toContain(name)
  })

  test("champion adds slate crowns; juvenile parts survive", () => {
    const juv = generate("mole", 42, "juvenile")
    const champ = generate("mole", 42, "champion")
    const juvNames = juv.build.fields.map((f) => f.name)
    const champNames = champ.build.fields.map((f) => f.name)
    for (const part of ["crownSlateLeft", "crownSlateRight"]) {
      expect(champNames).toContain(part)
      expect(champ.build.parents[part]).toBe("head")
    }
    for (const name of juvNames) expect(champNames).toContain(name)
  })

  test("legs ride higher as the mole matures", () => {
    const baby = generate("mole", 42)
    const juv = generate("mole", 42, "juvenile")
    for (const leg of ["legFL", "legFR", "legBL", "legBR"]) {
      expect(juv.build.pivots[leg]?.[1]).toBeGreaterThan(
        baby.build.pivots[leg]?.[1] ?? -1,
      )
    }
  })

  test("stages keep the palette family but lift the shade", () => {
    const baby = generate("mole", 42)
    const juv = generate("mole", 42, "juvenile")
    const champ = generate("mole", 42, "champion")
    expect(JSON.stringify(juv.build.colors.body)).not.toBe(
      JSON.stringify(baby.build.colors.body),
    )
    expect(JSON.stringify(champ.build.colors.body)).not.toBe(
      JSON.stringify(juv.build.colors.body),
    )
  })

  test("baby DNA is untouched by maturity", () => {
    const dna = sampleDna(moleTemplate, 42)
    expect(matureProportions(dna.proportions, "baby")).toEqual(dna.proportions)
  })
})
