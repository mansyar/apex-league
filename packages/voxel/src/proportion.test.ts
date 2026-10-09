import { describe, expect, test } from "bun:test"
import { archetypes, generate } from "./archetype"
import { PROPORTION_BUDGETS, ratioInBudget } from "./budgets"
import { measureRatiosFromFields } from "./proportions"

// The proportion-budget gate: every registered archetype is swept across
// many seeds and every derived dimensional ratio must stay inside its
// declared budget. This is the guardrail against "leggy drake" style
// outliers — budgets are measured from geometry (coarse creature-space
// lattice, see proportions.ts), so they bound what players actually see,
// not the raw DNA jitter.

describe("proportion budget gate", () => {
  test("every registered archetype declares a proportion budget", () => {
    const missing = Object.keys(archetypes).filter(
      (id) => PROPORTION_BUDGETS[id] === undefined,
    )
    expect(missing).toEqual([])
  })

  test("all seeds of all archetypes stay inside proportion budgets", () => {
    const SEEDS = 200
    const violations: string[] = []
    for (const id of Object.keys(archetypes)) {
      const budget = PROPORTION_BUDGETS[id]
      if (!budget) throw new Error(`no budget for archetype ${id}`)
      for (let seed = 1; seed <= SEEDS; seed++) {
        const { dna, build, def } = generate(id, seed)
        const measured = measureRatiosFromFields(build.fields, def.grid)
        for (const [ratio, range] of Object.entries(budget.ratios)) {
          const value = measured[ratio as keyof typeof measured]
          if (value === undefined) {
            violations.push(`${id} seed ${seed}: ratio ${ratio} not measured`)
            continue
          }
          if (!ratioInBudget(value, range)) {
            violations.push(
              `${id} seed ${seed}: ${ratio} = ${value.toFixed(3)} outside [${range.min}, ${range.max}] (dna ${JSON.stringify(dna.proportions)})`,
            )
          }
        }
      }
    }
    expect(violations).toEqual([])
  }, 20000)
})
