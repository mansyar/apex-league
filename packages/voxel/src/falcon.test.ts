import { describe, expect, test } from "bun:test"
import { generate } from "./archetype"
import { PROPORTION_BUDGETS } from "./budgets"
import { buildFalcon, FALCON_GRID, falconTemplate } from "./falcon"
import { sampleDna } from "./sample"
import type { Dna } from "./schema"
import { assertDnaInBounds, validateTemplate } from "./schema"
import { matureProportions, type Stage } from "./stage"
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

describe("falcon feather silhouette contract", () => {
  const FEATHER_PARTS = [
    "wingFeatherLeft",
    "wingFeatherRight",
    "tailFeatherLeft",
    "tailFeatherRight",
  ] as const
  const FEATHER_PARENTS: Record<string, string> = {
    wingFeatherLeft: "wingLeft",
    wingFeatherRight: "wingRight",
    tailFeatherLeft: "tail",
    tailFeatherRight: "tail",
  }
  const STAGES: Stage[] = ["baby", "juvenile", "champion"]
  const WING_STYLES = ["folded", "drooped", "flared"]
  const TAIL_STYLES = ["fan", "forked", "streamer"]

  const isFiniteTriple = (value: unknown): boolean =>
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((n) => typeof n === "number" && Number.isFinite(n))

  /** One DNA per style pair; params pinned to a slot bound for reach. */
  const variantDna = (
    wings: string,
    tail: string,
    reach: number,
    proportions = sampleDna(falconTemplate, 42).proportions,
  ): Dna => {
    const base = sampleDna(falconTemplate, 42)
    return {
      ...base,
      proportions: { ...proportions },
      styles: { ...base.styles, wings, tail },
      styleParams: {
        ...base.styleParams,
        sweep: reach,
        forkSpread: reach,
        streamerLength: reach,
      },
    }
  }

  const SEED_PROPORTIONS = sampleDna(falconTemplate, 42).proportions
  /** Template maxima for the four proportions scaled by the feather SDFs. */
  const WORST_CASE_PROPORTIONS = {
    bodyGirth: 1.3,
    bodyLength: 1.35,
    wingLength: 1.35,
    tailLength: 1.35,
  }

  /** Proportion sets the style × stage sweep must cover. */
  const PROPORTION_SETS = [
    { label: "seed42", proportions: SEED_PROPORTIONS },
    {
      label: "worst",
      proportions: { ...SEED_PROPORTIONS, ...WORST_CASE_PROPORTIONS },
    },
  ]

  const sweepCases = () =>
    PROPORTION_SETS.flatMap((set) =>
      WING_STYLES.flatMap((wings) =>
        TAIL_STYLES.flatMap((tail) =>
          [0.6, 1.4].flatMap((reach) =>
            STAGES.map((stage) => ({ set, wings, tail, reach, stage })),
          ),
        ),
      ),
    )

  test("style sweep combines template-max proportions with champion extremes", () => {
    expect(
      sweepCases().some(
        ({ set, wings, tail, reach, stage }) =>
          set.label === "worst" &&
          wings === "flared" &&
          tail === "streamer" &&
          reach === 1.4 &&
          stage === "champion",
      ),
    ).toBe(true)
  })

  test("four named feathers are rigged base parts in every stage", () => {
    for (const stage of STAGES) {
      const build = generate("falcon", 42, stage).build
      for (const part of FEATHER_PARTS) {
        // Stable name: exactly one field with that name, in every stage.
        expect(build.fields.filter((f) => f.name === part).length).toBe(1)
        expect(isFiniteTriple(build.pivots[part])).toBe(true)
        expect(isFiniteTriple(build.colors[part])).toBe(true)
        const parent = build.parents[part]
        expect(parent).toBeDefined()
        expect(
          parent === "wingLeft" || parent === "wingRight" || parent === "tail",
        ).toBe(true)
        expect(parent).toBe(FEATHER_PARENTS[part])
      }
      const grid = voxelize(build.fields, FALCON_GRID)
      const byName = new Map(grid.parts.map((p) => [p.name, p.voxels.length]))
      for (const part of FEATHER_PARTS) {
        expect(byName.get(part) ?? 0).toBeGreaterThan(0)
      }
    }
  })

  test("feathers are base silhouette, never stage signatures", () => {
    // Mirrors stage.test.ts (which is not edited here): these are the only
    // stage-gated falcon parts. A part present in the baby cannot be one.
    const juvenileSignatures = ["pinionBudLeft", "pinionBudRight"]
    const championSignatures = ["crownPlumeLeft", "crownPlumeRight"]
    for (const part of FEATHER_PARTS) {
      expect(juvenileSignatures).not.toContain(part)
      expect(championSignatures).not.toContain(part)
    }
    const namesOf = (stage: Stage): string[] =>
      generate("falcon", 42, stage).build.fields.map((f) => f.name)
    const baby = namesOf("baby")
    const juv = namesOf("juvenile")
    const champ = namesOf("champion")
    for (const part of FEATHER_PARTS) {
      expect(baby).toContain(part)
      expect(juv).toContain(part)
      expect(champ).toContain(part)
    }
    for (const part of juvenileSignatures) {
      expect(baby).not.toContain(part)
      expect(juv).toContain(part)
      expect(generate("falcon", 42, "juvenile").build.parents[part]).toBe(
        "head",
      )
      expect(champ).toContain(part)
    }
    for (const part of championSignatures) {
      expect(baby).not.toContain(part)
      expect(juv).not.toContain(part)
      expect(generate("falcon", 42, "champion").build.parents[part]).toBe(
        "head",
      )
      expect(champ).toContain(part)
    }
    expect(juv.filter((n) => !baby.includes(n)).sort()).toEqual(
      [...juvenileSignatures].sort(),
    )
    expect(champ.filter((n) => !juv.includes(n)).sort()).toEqual(
      [...championSignatures].sort(),
    )
  })

  test("every wing × tail style in every stage is bounded and non-degenerate", () => {
    const problems: string[] = []
    for (const { set, wings, tail, reach, stage } of sweepCases()) {
      const label = `${set.label}/${wings}/${tail}/${stage}/${reach}`
      const dna = variantDna(wings, tail, reach, set.proportions)
      if (assertDnaInBounds(dna, falconTemplate).length > 0) {
        problems.push(`${label}: DNA outside template bounds`)
      }
      const build = buildFalcon(dna, stage)
      for (const field of build.fields) {
        if (!isFiniteTriple(build.pivots[field.name])) {
          problems.push(`${label}: ${field.name} non-finite pivot`)
        }
        if (!isFiniteTriple(build.colors[field.name])) {
          problems.push(`${label}: ${field.name} non-finite color`)
        }
        for (const sample of [
          { x: 0.5, y: 0.5, z: 0.5 },
          { x: FALCON_GRID / 2, y: 12, z: FALCON_GRID / 2 },
          {
            x: FALCON_GRID - 0.5,
            y: FALCON_GRID - 0.5,
            z: FALCON_GRID - 0.5,
          },
        ]) {
          if (!Number.isFinite(field.sdf(sample))) {
            problems.push(`${label}: ${field.name} non-finite SDF`)
          }
        }
      }
      const grid = voxelize(build.fields, FALCON_GRID)
      const total = grid.parts.reduce((n, p) => n + p.voxels.length, 0)
      if (total <= 900) problems.push(`${label}: only ${total} voxels`)
      const r = FALCON_GRID - 1
      for (const part of grid.parts) {
        if (part.voxels.length === 0) {
          problems.push(`${label}: ${part.name} claims no voxels`)
        }
        for (const [x, y, z] of part.voxels) {
          if (x <= 0 || y <= 0 || z <= 0 || x >= r || y >= r || z >= r) {
            problems.push(
              `${label}: ${part.name} voxel on boundary (${x},${y},${z})`,
            )
            break
          }
        }
      }
    }
    expect(problems).toEqual([])
  }, 120000)

  test("worst-case proportions keep all four feathers finite and grid-bounded", () => {
    const problems: string[] = []
    const samples = [
      { x: 0.5, y: 0.5, z: 0.5 },
      { x: FALCON_GRID / 2, y: 12, z: FALCON_GRID / 2 },
      {
        x: FALCON_GRID - 0.5,
        y: FALCON_GRID - 0.5,
        z: FALCON_GRID - 0.5,
      },
    ]
    for (const { set, wings, tail, reach, stage } of sweepCases()) {
      if (set.label !== "worst") continue
      const label = `${wings}/${tail}/${stage}/${reach}`
      const build = buildFalcon(
        variantDna(wings, tail, reach, set.proportions),
        stage,
      )
      const grid = voxelize(build.fields, FALCON_GRID)
      const voxelsByName = new Map(grid.parts.map((p) => [p.name, p.voxels]))
      const r = FALCON_GRID - 1
      for (const part of FEATHER_PARTS) {
        if (build.fields.filter((f) => f.name === part).length !== 1) {
          problems.push(`${label}: ${part} field count`)
        }
        if (!isFiniteTriple(build.pivots[part])) {
          problems.push(`${label}: ${part} non-finite pivot`)
        }
        if (!isFiniteTriple(build.colors[part])) {
          problems.push(`${label}: ${part} non-finite color`)
        }
        const field = build.fields.find((f) => f.name === part)
        for (const sample of samples) {
          if (!field || !Number.isFinite(field.sdf(sample))) {
            problems.push(`${label}: ${part} non-finite SDF`)
          }
        }
        const voxels = voxelsByName.get(part) ?? []
        if (voxels.length === 0) {
          problems.push(`${label}: ${part} claims no voxels`)
        }
        for (const [x, y, z] of voxels) {
          if (x <= 0 || y <= 0 || z <= 0 || x >= r || y >= r || z >= r) {
            problems.push(
              `${label}: ${part} voxel on boundary (${x},${y},${z})`,
            )
            break
          }
        }
      }
    }
    expect(problems).toEqual([])
  }, 120000)

  test("biped, template, DNA and budget contracts stay frozen", () => {
    const build = buildFalcon(sampleDna(falconTemplate, 42))
    const names = build.fields.map((f) => f.name)
    expect(names.filter((n) => n.startsWith("leg"))).toEqual(["legFL", "legFR"])
    expect(names.filter((n) => n === "wingLeft" || n === "wingRight")).toEqual([
      "wingLeft",
      "wingRight",
    ])
    expect(names.filter((n) => n.startsWith("wing")).sort()).toEqual(
      [
        ...FEATHER_PARTS.filter((n) => n.startsWith("wing")),
        "wingLeft",
        "wingRight",
      ].sort(),
    )
    expect(names).toContain("tail")
    expect(names).toContain("tailTip")
    expect(build.parents.pinionBudLeft).toBeUndefined()

    expect(falconTemplate.id).toBe("falcon")
    expect(falconTemplate.version).toBe(1)
    expect(falconTemplate.palette.hue).toBe(165)
    expect(falconTemplate.rarity).toEqual([{ id: "gilded", weight: 32 }])
    expect(falconTemplate.proportions).toEqual({
      bodyLength: { min: 0.75, max: 1.35 },
      bodyGirth: { min: 0.75, max: 1.3 },
      legLength: { min: 0.75, max: 1.3 },
      neckLength: { min: 0.7, max: 1.3 },
      neckThickness: { min: 0.75, max: 1.3 },
      headSize: { min: 0.75, max: 1.3 },
      wingLength: { min: 0.75, max: 1.35 },
      tailLength: { min: 0.7, max: 1.35 },
    })
    expect(Object.keys(falconTemplate.styles)).toEqual(["wings", "tail"])
    expect(falconTemplate.styles.wings?.map((s) => s.id)).toEqual([
      "folded",
      "drooped",
      "flared",
    ])
    expect(falconTemplate.styles.tail?.map((s) => s.id)).toEqual([
      "fan",
      "forked",
      "streamer",
    ])
    expect(PROPORTION_BUDGETS.falcon?.ratios).toEqual({
      "legLength/bodyHeight": { min: 0.25, max: 1.15 },
      "neckLength/bodyLength": { min: 0.03, max: 0.65 },
      "headHeight/bodyHeight": { min: 0.05, max: 0.85 },
      "bodyLength/bodyHeight": { min: 1.0, max: 2.6 },
    })
  })
})
