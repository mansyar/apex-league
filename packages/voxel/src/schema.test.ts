import { describe, expect, test } from "bun:test"
import {
  assertDnaInBounds,
  type Dna,
  type Template,
  validateTemplate,
} from "./schema"

/** Minimal well-formed template fixture (bovine-like, NOT the real drake). */
function makeTemplate(): Template {
  return {
    id: "bovine",
    version: 1,
    proportions: {
      bodyGirth: { min: 0.8, max: 1.2 },
      legLength: { min: 0.7, max: 1.3 },
    },
    styles: {
      horns: [
        { id: "curved", params: { curl: { min: 0, max: 1 } } },
        { id: "straight", params: {} },
      ],
    },
    palette: {
      hue: 30,
      valueJitter: { min: -0.1, max: 0.1 },
    },
    rarity: [{ id: "gilded", weight: 128 }],
  }
}

function makeDna(template: Template): Dna {
  return {
    archetype: template.id,
    archetypeVersion: template.version,
    seed: 42,
    proportions: { bodyGirth: 1.0, legLength: 0.9 },
    styles: { horns: "curved" },
    styleParams: { curl: 0.5 },
    rarity: [],
  }
}

describe("validateTemplate", () => {
  test("accepts a well-formed template", () => {
    const errors = validateTemplate(makeTemplate())
    expect(errors).toEqual([])
  })

  test("rejects a template with no proportions", () => {
    const t = makeTemplate()
    t.proportions = {}
    expect(validateTemplate(t).length).toBeGreaterThan(0)
  })

  test("rejects a range where min >= max", () => {
    const t = makeTemplate()
    t.proportions.bodyGirth = { min: 1.2, max: 0.8 }
    expect(validateTemplate(t).length).toBeGreaterThan(0)
  })

  test("rejects a style slot with zero styles", () => {
    const t = makeTemplate()
    t.styles.horns = []
    expect(validateTemplate(t).length).toBeGreaterThan(0)
  })

  test("rejects a style with an out-of-range param bound", () => {
    const t = makeTemplate()
    const style = t.styles.horns?.[0]
    if (!style) throw new Error("fixture missing horns style")
    style.params.curl = { min: 2, max: 1 }
    expect(validateTemplate(t).length).toBeGreaterThan(0)
  })

  test("rejects non-positive rarity weight", () => {
    const t = makeTemplate()
    const gate = t.rarity[0]
    if (!gate) throw new Error("fixture missing rarity gate")
    gate.weight = 0
    expect(validateTemplate(t).length).toBeGreaterThan(0)
  })
})

describe("assertDnaInBounds", () => {
  test("accepts DNA within bounds", () => {
    const t = makeTemplate()
    expect(assertDnaInBounds(makeDna(t), t)).toEqual([])
  })

  test("rejects a proportion above its max", () => {
    const t = makeTemplate()
    const dna = makeDna(t)
    dna.proportions.bodyGirth = 1.5
    expect(assertDnaInBounds(dna, t).length).toBeGreaterThan(0)
  })

  test("rejects a proportion below its min", () => {
    const t = makeTemplate()
    const dna = makeDna(t)
    dna.proportions.legLength = 0.2
    expect(assertDnaInBounds(dna, t).length).toBeGreaterThan(0)
  })

  test("rejects an unknown proportion key", () => {
    const t = makeTemplate()
    const dna = makeDna(t)
    dna.proportions.wingSpan = 1.0
    expect(assertDnaInBounds(dna, t).length).toBeGreaterThan(0)
  })

  test("rejects an unknown style name for a declared slot", () => {
    const t = makeTemplate()
    const dna = makeDna(t)
    dna.styles.horns = "spiral"
    expect(assertDnaInBounds(dna, t).length).toBeGreaterThan(0)
  })

  test("rejects an unknown archetype id", () => {
    const t = makeTemplate()
    const dna = makeDna(t)
    dna.archetype = "draconic"
    expect(assertDnaInBounds(dna, t).length).toBeGreaterThan(0)
  })
})
