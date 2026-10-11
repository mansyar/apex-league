import { describe, expect, test } from "bun:test"
import { CREST_GLYPHS } from "./battleHud"
import { ELEMENT_GLYPHS, ELEMENT_HUES, crestGlyph, elementHue } from "./element"

const ALL_ELEMENTS = [
  "fire",
  "water",
  "plant",
  "electric",
  "earth",
  "wind",
] as const

describe("ELEMENT_GLYPHS", () => {
  test("every element has a crest glyph", () => {
    for (const element of ALL_ELEMENTS) {
      const glyph = ELEMENT_GLYPHS[element]
      expect(typeof glyph).toBe("string")
      expect(glyph.startsWith("<svg")).toBe(true)
      expect(glyph.endsWith("</svg>")).toBe(true)
      expect(glyph.length).toBeGreaterThan(40)
    }
  })

  test("every glyph is inline svg with currentColor and no hardcoded fill", () => {
    for (const element of ALL_ELEMENTS) {
      const glyph = ELEMENT_GLYPHS[element]
      expect(glyph).toContain('viewBox="0 0 24 24"')
      expect(glyph).toContain("currentColor")
      // Glyphs must inherit crest color, never bake one in.
      expect(glyph).not.toMatch(/fill="#|stroke="#/)
    }
  })

  test("fire, plant and water glyphs byte-match the battleHud set", () => {
    expect(ELEMENT_GLYPHS.fire).toBe(CREST_GLYPHS.fire)
    expect(ELEMENT_GLYPHS.plant).toBe(CREST_GLYPHS.plant)
    expect(ELEMENT_GLYPHS.water).toBe(CREST_GLYPHS.water)
  })
})

describe("ELEMENT_HUES", () => {
  test("every element has a hue inside the color wheel", () => {
    for (const element of ALL_ELEMENTS) {
      const hue = ELEMENT_HUES[element]
      expect(Number.isFinite(hue)).toBe(true)
      expect(hue).toBeGreaterThanOrEqual(0)
      expect(hue).toBeLessThan(360)
    }
  })

  test("hues match the arena projectile palette", () => {
    expect(ELEMENT_HUES.fire).toBe(18)
    expect(ELEMENT_HUES.water).toBe(205)
    expect(ELEMENT_HUES.plant).toBe(110)
    expect(ELEMENT_HUES.electric).toBe(50)
    expect(ELEMENT_HUES.earth).toBe(28)
    expect(ELEMENT_HUES.wind).toBe(165)
  })
})

describe("fallbacks", () => {
  test("unknown element falls back to the fire crest glyph", () => {
    expect(crestGlyph("unknown")).toBe(ELEMENT_GLYPHS.fire)
    expect(crestGlyph("")).toBe(ELEMENT_GLYPHS.fire)
  })

  test("known element returns its own crest glyph", () => {
    expect(crestGlyph("water")).toBe(ELEMENT_GLYPHS.water)
  })

  test("unknown element falls back to the shared hue (200, not cup's 40)", () => {
    expect(elementHue("unknown")).toBe(200)
    expect(elementHue("")).toBe(200)
  })

  test("known element returns its own hue", () => {
    expect(elementHue("wind")).toBe(165)
  })
})
