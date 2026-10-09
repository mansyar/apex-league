import { describe, expect, test } from "bun:test"
import { axolotlTemplate } from "./axolotl"
import { validateTemplate } from "./schema"

// Axolotl archetype: the Water starter's body plan. Third archetype,
// completing the Fire/Water/Plant starter trio. Tests mirror the bovine
// suite's structure — the template owns the body plan and bounds; DNA only
// jitters within them.

describe("axolotlTemplate", () => {
  test("is schema-valid", () => {
    expect(validateTemplate(axolotlTemplate)).toEqual([])
  })

  test("declares 3 signature style slots with >=2 styles each", () => {
    for (const slot of ["gills", "dorsalFin", "whiskers"]) {
      const styles = axolotlTemplate.styles[slot]
      expect(styles).toBeDefined()
      expect(styles?.length ?? 0).toBeGreaterThanOrEqual(2)
    }
  })

  test("has unique style ids across slots", () => {
    const ids = Object.values(axolotlTemplate.styles)
      .flatMap((styles) => styles.map((s) => s.id))
    expect(new Set(ids).size).toBe(ids.length)
  })

  test("uses a fixed Water-blue palette hue of 205 degrees", () => {
    expect(axolotlTemplate.palette.hue).toBe(205)
  })

  test("has a gilded rarity gate with weight 32", () => {
    const gate = axolotlTemplate.rarity[0]
    if (!gate) throw new Error("fixture missing rarity gate")
    expect(gate.id).toBe("gilded")
    expect(gate.weight).toBe(32)
  })
})
