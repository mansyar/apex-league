import { describe, expect, test } from "bun:test"
import { axolotlTemplate } from "../axolotl"
import { bovineTemplate } from "../bovine"
import { drakeTemplate } from "../drake"
import { sampleDna } from "../sample"
import { assertDnaInBounds } from "../schema"

// Partitioned from fuzz.test.ts. The whole suite must stay under its 10 s
// budget (workflow NFR), so heavy property tests are spread across files and
// run concurrently under `bun test --parallel`. Coverage is unchanged: the
// same seeds and the same assertions, just narrower scopes.

describe("drake dna fuzz", () => {
  test("200 seeds all produce in-bounds, distinct DNA", () => {
    const seen = new Set<string>()
    for (let seed = 0; seed < 200; seed++) {
      const dna = sampleDna(drakeTemplate, seed)
      expect(assertDnaInBounds(dna, drakeTemplate)).toEqual([])
      seen.add(JSON.stringify(dna))
    }
    expect(seen.size).toBeGreaterThan(190)
  })
})

describe("bovine dna fuzz", () => {
  test("200 seeds all produce in-bounds, distinct DNA", () => {
    const seen = new Set<string>()
    for (let seed = 0; seed < 200; seed++) {
      const dna = sampleDna(bovineTemplate, seed)
      expect(assertDnaInBounds(dna, bovineTemplate)).toEqual([])
      seen.add(JSON.stringify(dna))
    }
    expect(seen.size).toBeGreaterThan(190)
  })
})

describe("axolotl dna fuzz", () => {
  test("200 seeds all produce in-bounds, distinct DNA", () => {
    const seen = new Set<string>()
    for (let seed = 0; seed < 200; seed++) {
      const dna = sampleDna(axolotlTemplate, seed)
      expect(assertDnaInBounds(dna, axolotlTemplate)).toEqual([])
      seen.add(JSON.stringify(dna))
    }
    expect(seen.size).toBeGreaterThan(190)
  })
})
