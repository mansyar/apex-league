import { describe, expect, test } from "bun:test"
import { crestGlyph, ELEMENT_GLYPHS, ELEMENT_HUES, elementHue } from "./element"

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

  test("fire, plant and water glyphs match the original battleHud artwork", () => {
    // Pinned literals: these were byte-copied from battleHud's original
    // CREST_GLYPHS table when it was deduplicated into this module. They
    // freeze the approved artwork against accidental edits.
    expect(ELEMENT_GLYPHS.fire).toBe(
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2c1 4-.2 6.8-1.6 8.4C9 9.6 8.4 8.6 8.3 7 6.2 9 5 11.6 5 14a7 7 0 0 0 14 0c0-4.6-4-8.4-7-12zm0 18a4 4 0 0 1-4-4c0-1.6.8-3 2-4.3.3 1 .9 1.9 1.9 2.5.2-1.4.7-2.6 1.4-3.7C14.6 12 16 13.8 16 16a4 4 0 0 1-4 4z"/></svg>',
    )
    expect(ELEMENT_GLYPHS.plant).toBe(
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 22v-8m0 0C12 8.5 8.6 5 4 5c0 5.5 3.5 9 8 9zm0 0c0-4 3.2-6.8 8-6.8 0 4.6-3.2 6.8-8 6.8z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
    )
    expect(ELEMENT_GLYPHS.water).toBe(
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2s6.5 7.8 6.5 12.2A6.5 6.5 0 0 1 12 21a6.5 6.5 0 0 1-6.5-6.8C5.5 9.8 12 2 12 2zm0 15.5a3 3 0 0 0 3-3c0-1.4-1.2-3.4-3-5.6-1.8 2.2-3 4.2-3 5.6a3 3 0 0 0 3 3z"/></svg>',
    )
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
