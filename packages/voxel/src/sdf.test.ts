import { describe, expect, test } from "bun:test"
import {
  sdBox,
  sdCapsule,
  sdSphere,
  smoothUnion,
  translate,
  union,
  type Vec3,
  vec3,
} from "./sdf"

describe("sdSphere", () => {
  test("is negative inside, zero on surface, positive outside", () => {
    const sdf = sdSphere(vec3(0, 0, 0), 1)
    expect(sdf(vec3(0, 0, 0))).toBe(-1)
    expect(sdf(vec3(1, 0, 0))).toBeCloseTo(0)
    expect(sdf(vec3(2, 0, 0))).toBeCloseTo(1)
  })
})

describe("sdBox", () => {
  test("distance respects half-extents", () => {
    const sdf = sdBox(vec3(0, 0, 0), vec3(1, 0.5, 1))
    expect(sdf(vec3(0, 0, 0))).toBe(-0.5)
    expect(sdf(vec3(2, 0, 0))).toBeCloseTo(1)
    expect(sdf(vec3(0, 1.5, 0))).toBeCloseTo(1)
  })

  test("distance from a corner is euclidean", () => {
    const sdf = sdBox(vec3(0, 0, 0), vec3(1, 1, 1))
    expect(sdf(vec3(2, 2, 2))).toBeCloseTo(Math.sqrt(3))
  })
})

describe("sdCapsule", () => {
  test("distance to the segment plus radius", () => {
    const sdf = sdCapsule(vec3(0, 0, 0), vec3(2, 0, 0), 0.5)
    expect(sdf(vec3(1, 0, 0))).toBe(-0.5)
    expect(sdf(vec3(1, 0.5, 0))).toBeCloseTo(0)
    expect(sdf(vec3(3, 0, 0))).toBeCloseTo(0.5)
  })
})

describe("translate", () => {
  test("moves the sdf by the offset", () => {
    const sdf = translate(sdSphere(vec3(0, 0, 0), 1), vec3(3, 0, 0))
    expect(sdf(vec3(3, 0, 0))).toBe(-1)
    expect(sdf(vec3(0, 0, 0))).toBeCloseTo(2)
  })
})

describe("union", () => {
  test("is the minimum of both distance fields", () => {
    const a = sdSphere(vec3(-1, 0, 0), 1)
    const b = sdSphere(vec3(1, 0, 0), 1)
    const u = union(a, b)
    // Interior of A only: min is A's distance.
    expect(u(vec3(-1, 0, 0))).toBeCloseTo(-1)
    // Outside both: min picks the nearer field (surface distance = euclidean - radius).
    expect(u(vec3(-3, 0, 0))).toBeCloseTo(1)
    expect(u(vec3(3, 0, 0))).toBeCloseTo(1)
  })
})

describe("smoothUnion", () => {
  test("blends the seam between two parts", () => {
    const a = sdSphere(vec3(-1, 0, 0), 1)
    const b = sdSphere(vec3(1, 0, 0), 1)
    const blended = smoothUnion(a, b, 0.8)
    const sharp = union(a, b)
    // At the seam midpoint the smooth union must fill the crevice:
    // its distance must be strictly lower than the sharp min.
    const p: Vec3 = vec3(0, 0.9, 0)
    expect(blended(p)).toBeLessThan(sharp(p))
  })

  test("matches plain union far from the seam", () => {
    const a = sdSphere(vec3(-1, 0, 0), 1)
    const b = sdSphere(vec3(1, 0, 0), 1)
    const blended = smoothUnion(a, b, 0.8)
    expect(blended(vec3(-3, 0, 0))).toBeCloseTo(a(vec3(-3, 0, 0)))
    expect(blended(vec3(3, 0, 0))).toBeCloseTo(b(vec3(3, 0, 0)))
  })
})

describe("sdf purity", () => {
  test("evaluation does not mutate inputs or state", () => {
    const sdf = sdCapsule(vec3(0, 0, 0), vec3(1, 1, 0), 0.4)
    const p = vec3(0.5, 0.5, 0)
    const first = sdf(p)
    const second = sdf(p)
    expect(second).toBe(first)
    expect(p).toEqual(vec3(0.5, 0.5, 0))
  })
})
