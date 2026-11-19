import { expect, test } from "bun:test"
import { generate } from "./archetype"
import { PROPORTION_BUDGETS, ratioInBudget } from "./budgets"
import { measureRatiosFromFields } from "./proportions"

// Regression audit for the shared Roster Wave 2 body plan: the coarse lattice
// sampler must see the same four dimension budgets the registry advertises,
// and the audited ratios must stay finite at both ends of the seed range.

const CASES = [
  ["sprite", 56],
  ["golem", 56],
  ["wing", 56],
] as const

test("wave body audit ratios stay finite and inside the declared budgets", () => {
  for (const [id, grid] of CASES) {
    const budget = PROPORTION_BUDGETS[id]
    expect(budget).toBeDefined()
    for (const seed of [0, 9, 38, 42, 99]) {
      for (const stage of ["baby", "juvenile", "champion"] as const) {
        const { build } = generate(id, seed, stage)
        const ratios = measureRatiosFromFields(build.fields, grid)
        for (const [metric, value] of Object.entries(ratios)) {
          expect(Number.isFinite(value)).toBe(true)
          expect(
            ratioInBudget(
              value,
              budget?.ratios[metric] ?? { min: Infinity, max: -Infinity },
            ),
          ).toBe(true)
        }
      }
    }
  }
}, 120000)
