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

  test("tracks mutable endpoints across the fallback boundary", () => {
    const a = vec3(-0.75, 0.25, 0.5)
    const b = vec3(1.5, 1.25, 1.75)
    const cone = sdRoundCone(a, b, 0.8, 0.25)
    const first = vec3(0.125, -1.75, 3.25)
    const points = [first, vec3(2.5, 0.5, -0.75), vec3(-3.125, 4.25, 1.5)]

    expect(cone(first)).toBe(2.6671504955951946)

    b.x = a.x
    b.y = a.y
    b.z = a.z
    const coincident = sdRoundCone(a, b, 0.8, 0.25)
    for (const point of points) {
      expect(cone(point)).toBe(coincident(point))
    }

    b.x = 2.5
    b.y = -0.25
    b.z = 1
    const separated = sdRoundCone(a, b, 0.8, 0.25)
    for (const point of points) {
      expect(cone(point)).toBe(separated(point))
    }
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

describe("exact SDF characterization", () => {
  test("primitive and combinator samples retain their floating-point payloads", () => {
    const points = [
      vec3(0.125, -1.75, 3.25),
      vec3(2.5, 0.5, -0.75),
      vec3(-3.125, 4.25, 1.5),
    ]
    const sphere = sdSphere(vec3(0.25, -0.5, 1.75), 1.125)
    const capsule = sdCapsule(vec3(-1, 0.5, 0), vec3(1.25, 1.75, 0.5), 0.375)
    const cases = [
      {
        name: "sphere",
        sdf: sphere,
        samples: [0.8315594803123161, 2.3839172119045497, 4.7072915736441026],
      },
      {
        name: "box",
        sdf: sdBox(vec3(-0.5, 0.25, 0.75), vec3(0.875, 1.25, 0.625)),
        samples: [2.019436802675439, 2.2980970388562794, 3.261997087674972],
      },
      {
        name: "capsule",
        sdf: capsule,
        samples: [3.7027423845242424, 1.7900635094610968, 4.181915947715676],
      },
      {
        name: "ellipsoid",
        sdf: sdEllipsoid(vec3(0.5, -0.25, 1), vec3(1.25, 0.75, 1.75)),
        samples: [1.2053642708867807, 1.2532690137118347, 4.539728207157971],
      },
      {
        name: "round cone",
        sdf: sdRoundCone(
          vec3(-0.75, 0.25, 0.5),
          vec3(1.5, 1.25, 1.75),
          0.8,
          0.25,
        ),
        samples: [2.6671504955951946, 2.3104703830234783, 3.958216577668571],
      },
      {
        name: "degenerate round cone fallback",
        sdf: sdRoundCone(vec3(0, 0, 0), vec3(0.25, 0, 0), 0.8, 0.25),
        samples: [2.8933216756735396, 1.8575364531836625, 4.684352742120076],
      },
      {
        name: "translated sphere",
        sdf: translate(sphere, vec3(0.5, -1, 0.25)),
        samples: [0.2947270864500684, 2.699264635194589, 5.826843280742166],
      },
      {
        name: "hard union",
        sdf: union(sphere, capsule),
        samples: [0.8315594803123161, 1.7900635094610968, 4.181915947715676],
      },
      {
        name: "smooth union",
        sdf: smoothUnion(sphere, capsule, 0.625),
        samples: [0.8315594803123161, 1.7896754727205044, 4.177945941352014],
      },
      {
        name: "hard subtraction",
        sdf: smoothSubtract(sphere, capsule, 0),
        samples: [0.8315594803123161, 2.3839172119045497, 4.7072915736441026],
      },
      {
        name: "smooth subtraction",
        sdf: smoothSubtract(sphere, capsule, 0.375),
        samples: [0.8315594803123161, 2.3839172119045497, 4.7072915736441026],
      },
    ]
    for (const { sdf, samples } of cases) {
      for (const [index, point] of points.entries()) {
        const expected = samples[index]
        if (expected === undefined) throw new Error("missing SDF sample")
        expect(sdf(point)).toBe(expected)
      }
    }
  })
})
