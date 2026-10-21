import { describe, expect, test } from "bun:test"
import { archetypes, generate } from "./archetype"
import { PROPORTION_BUDGETS, ratioInBudget } from "./budgets"
import { measureRatiosFromFields } from "./proportions"
import type { Stage } from "./stage"

// The stage-variant contract: one generator, two life stages. The baby
// build is the artifact players already know (byte-stable — the
// determinism gate keeps hashing it), and the juvenile build is derived
// from the SAME seed: same body plan, same palette family, same horn and
// snout shapes — plus a maturing silhouette and one new signature part
// the baby does not have yet.

const ARCHETYPE_SIGNATURES: Record<string, string[]> = {
  draconic: ["hornNubLeft", "hornNubRight"],
  bovine: ["hornBudLeft", "hornBudRight"],
  axolotl: ["gillFrillLeft", "gillFrillRight"],
  storm_hound: ["sparkFrillLeft", "sparkFrillRight"],
}

// The champion layer adds one more signature upgrade per archetype —
// the crown a champion earns (spec R3): drake crown horns, bovine full
// horn curls, axolotl grand frills + a tail fin.
const CHAMPION_SIGNATURES: Record<string, string[]> = {
  draconic: ["crownHornLeft", "crownHornRight"],
  bovine: ["hornCurlLeft", "hornCurlRight"],
  axolotl: ["grandFrillLeft", "grandFrillRight", "grandFin"],
  storm_hound: ["crownSparkLeft", "crownSparkRight"],
}

describe("stage-variant build API", () => {
  test("stage defaults to baby and baby builds carry no signature parts", () => {
    for (const id of Object.keys(archetypes)) {
      const { build } = generate(id, 42)
      const names = build.fields.map((f) => f.name)
      for (const part of ARCHETYPE_SIGNATURES[id] ?? []) {
        expect(names).not.toContain(part)
      }
      // Explicit baby matches the default exactly (digest stability).
      const explicit = generate(id, 42, "baby")
      expect(JSON.stringify(explicit.build)).toBe(JSON.stringify(build))
    }
  })

  test("same seed twice produces an identical juvenile build", () => {
    for (const id of Object.keys(archetypes)) {
      const a = generate(id, 42, "juvenile")
      const b = generate(id, 42, "juvenile")
      expect(JSON.stringify(a.build)).toBe(JSON.stringify(b.build))
    }
  })

  test("juvenile adds exactly the archetype's signature parts", () => {
    for (const id of Object.keys(archetypes)) {
      const baby = generate(id, 42)
      const juv = generate(id, 42, "juvenile")
      const babyNames = baby.build.fields.map((f) => f.name)
      const juvNames = juv.build.fields.map((f) => f.name)
      for (const part of ARCHETYPE_SIGNATURES[id] ?? []) {
        expect(babyNames).not.toContain(part)
        expect(juvNames).toContain(part)
      }
      // The signature part is rigged: it has a pivot, a color, and hangs
      // off the head so the rig carries it.
      const part = (ARCHETYPE_SIGNATURES[id] ?? [])[0]
      if (part) {
        expect(juv.build.pivots[part]).toBeDefined()
        expect(juv.build.colors[part]).toBeDefined()
        expect(juv.build.parents[part]).toBe("head")
        // Identity layer: every baby part survives into the juvenile with
        // the same name (body plan does not rename underneath the rig).
        for (const name of babyNames) expect(juvNames).toContain(name)
      }
    }
  })

  test("juvenile maturation shifts proportions within the same silhouette family", () => {
    for (const id of Object.keys(archetypes)) {
      const baby = generate(id, 42)
      const juv = generate(id, 42, "juvenile")
      // Same individual: identical DNA...
      expect(juv.dna.proportions).toEqual(baby.dna.proportions)
      // ...but a maturing stance: hips stand higher (pivot-level — free of
      // voxel-quantization ties) and measured leg ratios never shrink.
      const legNames = Object.keys(baby.build.pivots).filter((name) =>
        name.startsWith("leg"),
      )
      expect(legNames.length).toBeGreaterThan(0)
      for (const name of legNames) {
        const babyPivot = baby.build.pivots[name]
        const juvPivot = juv.build.pivots[name]
        expect(babyPivot).toBeDefined()
        expect(juvPivot).toBeDefined()
        if (!babyPivot || !juvPivot) continue
        expect(juvPivot[1]).toBeGreaterThan(babyPivot[1])
      }
      const babyRatios = measureRatiosFromFields(
        baby.build.fields,
        baby.def.grid,
      )
      const juvRatios = measureRatiosFromFields(juv.build.fields, juv.def.grid)
      expect(juvRatios["legLength/bodyHeight"]).toBeGreaterThanOrEqual(
        babyRatios["legLength/bodyHeight"],
      )
    }
  })

  test("juvenile keeps the palette family but shifts the shade", () => {
    for (const id of Object.keys(archetypes)) {
      const baby = generate(id, 42)
      const juv = generate(id, 42, "juvenile")
      expect(juv.build.colors.body).not.toEqual(baby.build.colors.body)
    }
  })

  test("juvenile builds pass the proportion-budget audit across seeds", () => {
    const SEEDS = 200
    const violations: string[] = []
    for (const id of Object.keys(archetypes)) {
      const budget = PROPORTION_BUDGETS[id]
      if (!budget) throw new Error(`no budget for archetype ${id}`)
      for (let seed = 1; seed <= SEEDS; seed++) {
        const { build, def } = generate(id, seed, "juvenile")
        const measured = measureRatiosFromFields(build.fields, def.grid)
        for (const [ratio, range] of Object.entries(budget.ratios)) {
          const value = measured[ratio as keyof typeof measured]
          if (value === undefined) {
            violations.push(
              `${id} juvenile seed ${seed}: ${ratio} not measured`,
            )
            continue
          }
          if (!ratioInBudget(value, range)) {
            violations.push(
              `${id} juvenile seed ${seed}: ${ratio} = ${value.toFixed(3)} outside [${range.min}, ${range.max}]`,
            )
          }
        }
      }
    }
    expect(violations).toEqual([])
  }, 120000)

  test("same seed twice produces an identical champion build", () => {
    for (const id of Object.keys(archetypes)) {
      const a = generate(id, 42, "champion")
      const b = generate(id, 42, "champion")
      expect(JSON.stringify(a.build)).toBe(JSON.stringify(b.build))
    }
  })

  test("champion adds exactly the champion signature parts", () => {
    for (const id of Object.keys(archetypes)) {
      const baby = generate(id, 42)
      const juv = generate(id, 42, "juvenile")
      const champ = generate(id, 42, "champion")
      const babyNames = baby.build.fields.map((f) => f.name)
      const juvNames = juv.build.fields.map((f) => f.name)
      const champNames = champ.build.fields.map((f) => f.name)
      for (const part of CHAMPION_SIGNATURES[id] ?? []) {
        expect(babyNames).not.toContain(part)
        expect(juvNames).not.toContain(part)
        expect(champNames).toContain(part)
        // Rigged like every signature part: a pivot, a color, and a parent.
        expect(champ.build.pivots[part]).toBeDefined()
        expect(champ.build.colors[part]).toBeDefined()
        expect(champ.build.parents[part]?.length ?? 0).toBeGreaterThan(0)
      }
      // Identity layer: every juvenile part survives into the champion.
      for (const name of juvNames) expect(champNames).toContain(name)
      // And the baby parts too (double-check the full lineage).
      for (const name of babyNames) expect(champNames).toContain(name)
    }
  })

  test("champion keeps the palette family but shifts the shade again", () => {
    for (const id of Object.keys(archetypes)) {
      const juv = generate(id, 42, "juvenile")
      const champ = generate(id, 42, "champion")
      expect(champ.build.colors.body).not.toEqual(juv.build.colors.body)
    }
  })

  test("champion builds pass the proportion-budget audit across seeds", () => {
    const SEEDS = 200
    const violations: string[] = []
    for (const id of Object.keys(archetypes)) {
      const budget = PROPORTION_BUDGETS[id]
      if (!budget) throw new Error(`no budget for archetype ${id}`)
      for (let seed = 1; seed <= SEEDS; seed++) {
        const { build, def } = generate(id, seed, "champion")
        const measured = measureRatiosFromFields(build.fields, def.grid)
        for (const [ratio, range] of Object.entries(budget.ratios)) {
          const value = measured[ratio as keyof typeof measured]
          if (value === undefined) {
            violations.push(
              `${id} champion seed ${seed}: ${ratio} not measured`,
            )
            continue
          }
          if (!ratioInBudget(value, range)) {
            violations.push(
              `${id} champion seed ${seed}: ${ratio} = ${value.toFixed(3)} outside [${range.min}, ${range.max}]`,
            )
          }
        }
      }
    }
    expect(violations).toEqual([])
  }, 120000)

  test("stage rejects unknown values", () => {
    // The Stage union is compile-time, but generate() should still refuse a
    // nonsense stage from untyped callers (save files, debug tools).
    expect(() => generate("draconic", 42, "adult" as Stage)).toThrow()
  })
})
