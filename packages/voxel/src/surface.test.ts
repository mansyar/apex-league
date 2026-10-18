import { describe, expect, test } from "bun:test"
import { generate } from "./archetype"
import { hslToRgb } from "./color"
import {
  creaturePalette,
  dappleNoise,
  SURFACE_CLASS,
  shadowHue,
  surfaceClass,
} from "./surface"

const lum = (rgb: readonly [number, number, number]): number =>
  0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]

/** Shortest angular distance between two hues, in degrees. */
const hueDistance = (a: number, b: number): number =>
  Math.abs(((((a - b) % 360) + 540) % 360) - 180)

const BOUNDS = { torsoBottom: 10, torsoTop: 20, sockTop: 3 }
const SEED = 42

describe("surface ramp", () => {
  test("ramp is monotonic in lightness from sock to belly", () => {
    const palette = creaturePalette({ hue: 18, sat: 0.72, light: 0.5 })
    const sock = palette[SURFACE_CLASS.sock]
    const dorsal = palette[SURFACE_CLASS.dorsal]
    const limb = palette[SURFACE_CLASS.limb]
    const lateral = palette[SURFACE_CLASS.lateral]
    const belly = palette[SURFACE_CLASS.belly]
    if (!sock || !dorsal || !limb || !lateral || !belly) {
      throw new Error("palette is missing a ramp step")
    }
    expect(lum(sock)).toBeLessThan(lum(dorsal))
    expect(lum(dorsal)).toBeLessThan(lum(limb))
    expect(lum(limb)).toBeLessThan(lum(lateral))
    expect(lum(lateral)).toBeLessThan(lum(belly))
  })

  test("lateral step reproduces the previous flat colour exactly", () => {
    const palette = creaturePalette({ hue: 18, sat: 0.72, light: 0.5 })
    const lateral = palette[SURFACE_CLASS.lateral]
    const expected = hslToRgb(18, 0.72, 0.5)
    for (let c = 0; c < 3; c++) {
      expect(lateral?.[c]).toBeCloseTo(expected[c] as number, 10)
    }
  })

  test("limb step reproduces the previous flat leg colour exactly", () => {
    const main = hslToRgb(18, 0.72, 0.5)
    const limb = creaturePalette({ hue: 18, sat: 0.72, light: 0.5 })[
      SURFACE_CLASS.limb
    ]
    for (let c = 0; c < 3; c++) {
      expect(limb?.[c]).toBeCloseTo((main[c] as number) * 0.7, 10)
    }
  })

  test("shadow hues rotate toward cool, by 15-25 degrees", () => {
    for (const hue of [18, 110, 205, 45]) {
      for (const degrees of [15, 22, 25]) {
        const shifted = shadowHue(hue, degrees)
        expect(hueDistance(shifted, 240)).toBeLessThan(hueDistance(hue, 240))
        expect(hueDistance(shifted, hue)).toBeCloseTo(degrees, 6)
      }
    }
  })

  test("every channel stays in range", () => {
    for (const hue of [0, 18, 110, 205, 330]) {
      for (const light of [0.05, 0.5, 0.95]) {
        for (const step of creaturePalette({ hue, sat: 0.72, light })) {
          for (const channel of step) {
            expect(channel).toBeGreaterThanOrEqual(0)
            expect(channel).toBeLessThanOrEqual(1)
          }
        }
      }
    }
  })

  test("gilded keeps the flat gold as its base step", () => {
    const palette = creaturePalette({ hue: 45, sat: 0.85, light: 0.55 })
    const lateral = palette[SURFACE_CLASS.lateral]
    const gold = hslToRgb(45, 0.85, 0.55)
    for (let c = 0; c < 3; c++) {
      expect(lateral?.[c]).toBeCloseTo(gold[c] as number, 10)
    }
  })
})

describe("zone classifier", () => {
  test("torso bands: belly low, dorsal high, lateral between", () => {
    expect(surfaceClass("torso", { x: 4, y: 5, z: 4 }, SEED, BOUNDS)).toBe(
      SURFACE_CLASS.belly,
    )
    expect(surfaceClass("torso", { x: 4, y: 25, z: 4 }, SEED, BOUNDS)).toBe(
      SURFACE_CLASS.dorsal,
    )
    const mid = surfaceClass("torso", { x: 4, y: 15, z: 4 }, SEED, BOUNDS)
    const midBand: number[] = [
      SURFACE_CLASS.limb,
      SURFACE_CLASS.lateral,
      SURFACE_CLASS.belly,
    ]
    expect(midBand).toContain(mid)
  })

  test("socks appear only on leg parts", () => {
    const low = { x: 4, y: 2, z: 4 }
    expect(surfaceClass("leg", low, SEED, BOUNDS)).toBe(SURFACE_CLASS.sock)
    expect(surfaceClass("torso", low, SEED, BOUNDS)).toBe(SURFACE_CLASS.belly)
  })

  test("the classifier is deterministic", () => {
    const p = { x: 7, y: 16, z: 9 }
    expect(surfaceClass("torso", p, SEED, BOUNDS)).toBe(
      surfaceClass("torso", p, SEED, BOUNDS),
    )
  })
})

describe("wired archetypes", () => {
  for (const arch of ["draconic", "bovine", "axolotl"]) {
    test(`${arch}: belly reads lighter than dorsal`, () => {
      const { build } = generate(arch, SEED, "champion")
      const ramp = build.palettes?.body
      const belly = ramp?.[SURFACE_CLASS.belly]
      const dorsal = ramp?.[SURFACE_CLASS.dorsal]
      if (!belly || !dorsal) throw new Error(`${arch} has no body ramp`)
      expect(lum(belly)).toBeGreaterThan(lum(dorsal))
    })

    test(`${arch}: the body classifier yields zones, never socks`, () => {
      const { build } = generate(arch, SEED, "champion")
      const classify = build.fields.find((f) => f.name === "body")?.classify
      if (!classify) throw new Error(`${arch} body has no classifier`)
      const seen = new Set<number>()
      for (let x = 0; x <= 48; x += 2) {
        for (let y = 0; y <= 48; y += 2) {
          for (let z = 0; z <= 48; z += 2) {
            seen.add(classify({ x, y, z }))
          }
        }
      }
      expect(seen.has(SURFACE_CLASS.belly)).toBe(true)
      expect(seen.has(SURFACE_CLASS.dorsal)).toBe(true)
      expect(seen.has(SURFACE_CLASS.sock)).toBe(false)
    })
  }
})

describe("dappling noise", () => {
  test("is deterministic for a seed and varies across seeds", () => {
    const a = dappleNoise(3, 4, 5, SEED)
    expect(dappleNoise(3, 4, 5, SEED)).toBe(a)
    expect(a).toBeGreaterThanOrEqual(0)
    expect(a).toBeLessThan(1)
    expect(dappleNoise(3, 4, 5, SEED + 1)).not.toBe(a)
  })

  test("dappling forms patches, not speckle", () => {
    let same = 0
    let total = 0
    let previous = surfaceClass("torso", { x: 0, y: 15, z: 10 }, SEED, BOUNDS)
    for (let x = 1; x < 48; x++) {
      const cls = surfaceClass("torso", { x, y: 15, z: 10 }, SEED, BOUNDS)
      total++
      if (cls === previous) same++
      previous = cls
    }
    expect(same / total).toBeGreaterThan(0.6)
  })

  test("a torso slab mixes all three zone classes without a flood", () => {
    const tally = new Map<number, number>()
    let total = 0
    for (let x = 0; x < 24; x++) {
      for (let y = 5; y < 25; y++) {
        for (let z = 0; z < 24; z++) {
          const cls = surfaceClass("torso", { x, y, z }, SEED, BOUNDS)
          tally.set(cls, (tally.get(cls) ?? 0) + 1)
          total++
        }
      }
    }
    const share = (cls: number) => (tally.get(cls) ?? 0) / total
    expect(share(SURFACE_CLASS.lateral)).toBeGreaterThan(0.05)
    expect(share(SURFACE_CLASS.dorsal)).toBeGreaterThan(0.05)
    expect(share(SURFACE_CLASS.belly)).toBeGreaterThan(0.05)
    for (const [, count] of tally) {
      expect(count / total).toBeLessThan(0.9)
    }
  })
})
