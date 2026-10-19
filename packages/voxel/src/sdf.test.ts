import { describe, expect, test } from "bun:test"
import {
  sdBox,
  sdCapsule,
  sdEllipsoid,
  sdRoundCone,
  sdSphere,
  smoothSubtract,
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

describe("sdRoundCone", () => {
  test("equal radii collapse to a capsule", () => {
    const cone = sdRoundCone(vec3(0, 0, 0), vec3(2, 0, 0), 0.5, 0.5)
    const capsule = sdCapsule(vec3(0, 0, 0), vec3(2, 0, 0), 0.5)
    for (const p of [
      vec3(1, 0, 0),
      vec3(1, 0.5, 0),
      vec3(3, 0, 0),
      vec3(-1, 0, 0),
      vec3(1, 0.2, 0.3),
    ]) {
      expect(cone(p)).toBeCloseTo(capsule(p), 6)
    }
  })

  test("tapers so the same offset is closer to the thin end", () => {
    const cone = sdRoundCone(vec3(0, 0, 0), vec3(4, 0, 0), 1, 0.2)
    // Both points sit one unit off the axis: the thick end reaches out to it,
    // the thin end does not.
    expect(cone(vec3(0.5, 1, 0))).toBeLessThan(cone(vec3(3.5, 1, 0)))
    expect(cone(vec3(0, 0, 0))).toBe(-1)
    expect(cone(vec3(4, 0, 0))).toBeCloseTo(-0.2)
    expect(cone(vec3(2, 0, 0))).toBeLessThan(0)
  })
})

describe("sdEllipsoid", () => {
  test("is negative inside, zero at each radial extreme, positive outside", () => {
    const sdf = sdEllipsoid(vec3(0, 0, 0), vec3(2, 1, 0.5))
    expect(sdf(vec3(0, 0, 0))).toBeCloseTo(-0.5)
    expect(sdf(vec3(2, 0, 0))).toBeCloseTo(0)
    expect(sdf(vec3(0, 1, 0))).toBeCloseTo(0)
    expect(sdf(vec3(0, 0, 0.5))).toBeCloseTo(0)
    expect(sdf(vec3(3, 0, 0))).toBeGreaterThan(0)
  })

  test("equal radii match a sphere", () => {
    const ellipsoid = sdEllipsoid(vec3(1, 2, 3), vec3(1.5, 1.5, 1.5))
    const sphere = sdSphere(vec3(1, 2, 3), 1.5)
    for (const p of [
      vec3(1, 2, 3),
      vec3(2.5, 2, 3),
      vec3(3, 2, 3),
      vec3(0, 0, 0),
    ]) {
      expect(ellipsoid(p)).toBeCloseTo(sphere(p), 4)
    }
  })
})

describe("smoothSubtract", () => {
  const base = sdSphere(vec3(0, 0, 0), 3)
  const cutter = sdSphere(vec3(3, 0, 0), 1)

  test("carves the cutter's volume out of the base", () => {
    const carved = smoothSubtract(base, cutter, 0.2)
    // Inside both volumes: now outside the carved solid.
    expect(carved(vec3(2.9, 0, 0))).toBeGreaterThan(0)
    expect(carved(vec3(3, 0, 0))).toBeGreaterThan(0)
    // Deep inside the base, away from the cutter: still solid.
    expect(carved(vec3(-2, 0, 0))).toBeLessThan(0)
  })

  test("never bulges past the base's own surface", () => {
    const carved = smoothSubtract(base, cutter, 0.5)
    const far = vec3(-3.1, 0, 0)
    expect(base(far)).toBeGreaterThan(0)
    expect(carved(far)).toBeGreaterThan(0)
    // A point on the base surface away from the cut stays on the surface.
    expect(carved(vec3(-3, 0, 0))).toBeCloseTo(0, 1)
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
