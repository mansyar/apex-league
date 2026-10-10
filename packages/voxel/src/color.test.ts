import { describe, expect, test } from "bun:test"
import { hslToRgb } from "./color"

describe("hslToRgb", () => {
  test("pure red corner: hue 0, full saturation, mid lightness", () => {
    expect(hslToRgb(0, 1, 0.5)).toEqual([1, 0, 0])
  })

  test("green, cyan, and blue corners map conventionally", () => {
    expect(hslToRgb(120, 1, 0.5)).toEqual([0, 1, 0])
    expect(hslToRgb(180, 1, 0.5)).toEqual([0, 1, 1])
    expect(hslToRgb(240, 1, 0.5)).toEqual([0, 0, 1])
  })

  test("saturation 0 collapses to a grey regardless of hue", () => {
    expect(hslToRgb(200, 0, 0.5)).toEqual([0.5, 0.5, 0.5])
    expect(hslToRgb(90, 0, 0.42)).toEqual([0.42, 0.42, 0.42])
  })

  test("hue wraps around 360 degrees", () => {
    expect(hslToRgb(480, 1, 0.5)).toEqual(hslToRgb(120, 1, 0.5))
    expect(hslToRgb(-60, 1, 0.5)).toEqual(hslToRgb(300, 1, 0.5))
  })

  test("mid-hue value used by the builders stays stable", () => {
    // props.ts trunk colour: warm low-saturation brown.
    const [r, g, b] = hslToRgb(28, 0.45, 0.3)
    expect(r).toBeGreaterThan(g)
    expect(g).toBeGreaterThan(b)
  })

  test("output stays inside the unit cube", () => {
    for (let h = -720; h <= 720; h += 37) {
      for (const s of [0, 0.25, 0.5, 1]) {
        for (const l of [0, 0.2, 0.7, 1]) {
          const [r, g, b] = hslToRgb(h, s, l)
          for (const v of [r, g, b]) {
            expect(v).toBeGreaterThanOrEqual(0)
            expect(v).toBeLessThanOrEqual(1)
          }
        }
      }
    }
  })
})
