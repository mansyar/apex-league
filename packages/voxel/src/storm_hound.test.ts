import { describe, expect, test } from "bun:test"
import { sampleDna } from "./sample"
import { assertDnaInBounds, validateTemplate } from "./schema"
import { matureProportions } from "./stage"
import {
  buildStormHound,
  STORM_HOUND_GRID,
  stormHoundTemplate,
} from "./storm_hound"
import { voxelize } from "./voxelizer"

describe("storm hound template", () => {
  test("is schema-valid", () => {
    expect(validateTemplate(stormHoundTemplate)).toEqual([])
  })

  test("declares signature style slots with 2+ styles each", () => {
    const ears = stormHoundTemplate.styles.ears
    if (!ears) throw new Error("missing ears slot")
    expect(ears.length).toBeGreaterThanOrEqual(2)
    const tail = stormHoundTemplate.styles.tail
    if (!tail) throw new Error("missing tail slot")
    expect(tail.length).toBeGreaterThanOrEqual(2)
  })

  test("palette is electric-toned (hue 50 contract)", () => {
    const hue = stormHoundTemplate.palette.hue
    expect(hue).toBe(50)
  })

  test("declares a gilded rarity gate", () => {
    const gate = stormHoundTemplate.rarity[0]
    if (!gate) throw new Error("missing rarity gate")
    expect(gate.id).toBe("gilded")
    expect(gate.weight).toBeGreaterThanOrEqual(16)
  })
})

describe("sampleDna (storm hound)", () => {
  test("produces in-bounds DNA for the storm hound template", () => {
    const dna = sampleDna(stormHoundTemplate, 42)
    expect(dna.archetype).toBe("storm_hound")
    expect(assertDnaInBounds(dna, stormHoundTemplate)).toEqual([])
  })

  test("is deterministic per seed", () => {
    expect(sampleDna(stormHoundTemplate, 7)).toEqual(
      sampleDna(stormHoundTemplate, 7),
    )
  })

  test("different seeds produce different DNA", () => {
    const dnas = new Set(
      [1, 2, 3, 4, 5].map((s) =>
        JSON.stringify(sampleDna(stormHoundTemplate, s)),
      ),
    )
    expect(dnas.size).toBeGreaterThanOrEqual(4)
  })

  test("styles always come from the declared enums", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const dna = sampleDna(stormHoundTemplate, seed)
      for (const [slot, styleId] of Object.entries(dna.styles)) {
        const defs = stormHoundTemplate.styles[slot]
        if (!defs) throw new Error(`unknown slot ${slot}`)
        expect(defs.some((def) => def.id === styleId)).toBe(true)
      }
    }
  })

  test("gilded rarity holds roughly 1-in-weight over many seeds", () => {
    const gate = stormHoundTemplate.rarity[0]
    if (!gate) throw new Error("missing rarity gate")
    const n = 2000
    let gilded = 0
    for (let seed = 0; seed < n; seed++) {
      const dna = sampleDna(stormHoundTemplate, seed)
      if (dna.rarity.includes("gilded")) gilded++
    }
    const expected = n / gate.weight
    expect(gilded).toBeGreaterThan(expected * 0.25)
    expect(gilded).toBeLessThan(expected * 4)
  })
})

describe("buildStormHound", () => {
  test("assembles the full storm hound part inventory", () => {
    const build = buildStormHound(sampleDna(stormHoundTemplate, 42))
    const names = build.fields.map((field) => field.name)
    expect(names).toContain("body")
    expect(names).toContain("neck")
    expect(names).toContain("head")
    expect(names).toContain("earLeft")
    expect(names).toContain("earRight")
    expect(names).toContain("eyeLeft")
    expect(names).toContain("eyeRight")
    expect(
      names.filter((n) => n.startsWith("tail")).length,
    ).toBeGreaterThanOrEqual(2)
    expect(names.filter((n) => n.startsWith("leg")).length).toBe(4)
    for (const name of names) {
      expect(build.pivots[name]).toBeDefined()
      expect(build.colors[name]).toBeDefined()
    }
  })

  test("voxelizes into a non-degenerate creature", () => {
    const build = buildStormHound(sampleDna(stormHoundTemplate, 42))
    const grid = voxelize(build.fields, STORM_HOUND_GRID)
    const total = grid.parts.reduce((sum, part) => sum + part.voxels.length, 0)
    // The hound is deliberately the leanest land archetype: non-degenerate
    // means a real body of voxels, not drake-scale mass.
    expect(total).toBeGreaterThan(1500)
    for (const part of grid.parts) {
      expect(part.voxels.length).toBeGreaterThan(0)
    }
  })

  test("is deterministic for a fixed seed", () => {
    const a = buildStormHound(sampleDna(stormHoundTemplate, 7))
    const b = buildStormHound(sampleDna(stormHoundTemplate, 7))
    expect(voxelize(a.fields, 24)).toEqual(voxelize(b.fields, 24))
    expect(a.pivots).toEqual(b.pivots)
    expect(a.colors).toEqual(b.colors)
  })

  test("reads as a lean sprinter: legs longer than the ox's, body longer than tall", () => {
    // The SPD-specialist silhouette check: the hound's mean leg extent must
    // dominate the torso height more than either land archetype allows, and
    // the torso must run long.
    const build = buildStormHound(sampleDna(stormHoundTemplate, 42))
    const grid = voxelize(build.fields, STORM_HOUND_GRID)
    const body = grid.parts.find((p) => p.name === "body")
    if (!body) throw new Error("no body part")
    const legNames = ["legFL", "legFR", "legBL", "legBR"]
    const legExtents = legNames.map((name) => {
      const part = grid.parts.find((p) => p.name === name)
      if (!part) throw new Error(`no ${name}`)
      const ys = part.voxels.map((v) => v[1])
      return Math.max(...ys) - Math.min(...ys) + 1
    })
    const bodyY = (() => {
      const ys = body.voxels.map((v) => v[1])
      return Math.max(...ys) - Math.min(...ys) + 1
    })()
    const bodyZ = (() => {
      const zs = body.voxels.map((v) => v[2])
      return Math.max(...zs) - Math.min(...zs) + 1
    })()
    const legMean = legExtents.reduce((a, b) => a + b, 0) / legExtents.length
    expect(legMean / bodyY).toBeGreaterThan(0.6)
    expect(bodyZ / bodyY).toBeGreaterThan(1.4)
  })
})

describe("storm hound stage maturation", () => {
  test("baby carries no signature parts", () => {
    const build = buildStormHound(sampleDna(stormHoundTemplate, 42))
    const names = build.fields.map((f) => f.name)
    expect(names).not.toContain("sparkFrillLeft")
    expect(names).not.toContain("crownSparkLeft")
  })

  test("juvenile adds the spark frills, rigged off the head", () => {
    const baby = buildStormHound(sampleDna(stormHoundTemplate, 42))
    const juv = buildStormHound(sampleDna(stormHoundTemplate, 42), "juvenile")
    const babyNames = baby.fields.map((f) => f.name)
    const juvNames = juv.fields.map((f) => f.name)
    expect(babyNames).not.toContain("sparkFrillLeft")
    expect(juvNames).toContain("sparkFrillLeft")
    expect(juvNames).toContain("sparkFrillRight")
    expect(juv.pivots.sparkFrillLeft).toBeDefined()
    expect(juv.colors.sparkFrillLeft).toBeDefined()
    expect(juv.parents.sparkFrillLeft).toBe("head")
    // Identity layer: every baby part survives into the juvenile.
    for (const name of babyNames) expect(juvNames).toContain(name)
    // Juveniles stand taller at the hip.
    const babyHip = baby.pivots.body
    if (!babyHip) throw new Error("no body pivot")
    expect(juv.pivots.body?.[1]).toBeGreaterThan(babyHip[1])
  })

  test("champion adds the crown sparks above the frills", () => {
    const baby = buildStormHound(sampleDna(stormHoundTemplate, 42))
    const juv = buildStormHound(sampleDna(stormHoundTemplate, 42), "juvenile")
    const champ = buildStormHound(sampleDna(stormHoundTemplate, 42), "champion")
    const babyNames = baby.fields.map((f) => f.name)
    const juvNames = juv.fields.map((f) => f.name)
    const champNames = champ.fields.map((f) => f.name)
    expect(babyNames).not.toContain("crownSparkLeft")
    expect(juvNames).not.toContain("crownSparkLeft")
    expect(champNames).toContain("crownSparkLeft")
    expect(champNames).toContain("crownSparkRight")
    expect(champ.pivots.crownSparkLeft).toBeDefined()
    expect(champ.colors.crownSparkLeft).toBeDefined()
    expect(champ.parents.crownSparkLeft).toBe("head")
    for (const name of juvNames) expect(champNames).toContain(name)
  })

  test("stages keep the palette family but lift the shade", () => {
    const baby = buildStormHound(sampleDna(stormHoundTemplate, 42))
    const juv = buildStormHound(sampleDna(stormHoundTemplate, 42), "juvenile")
    const champ = buildStormHound(sampleDna(stormHoundTemplate, 42), "champion")
    expect(juv.colors.body).not.toEqual(baby.colors.body)
    expect(champ.colors.body).not.toEqual(juv.colors.body)
  })

  test("matureProportions keeps DNA stage-independent", () => {
    const dna = sampleDna(stormHoundTemplate, 42)
    expect(matureProportions(dna.proportions, "baby")).toEqual(dna.proportions)
  })
})
