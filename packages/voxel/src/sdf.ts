/**
 * Signed distance field primitives and combinators.
 *
 * An Sdf maps a point to its signed distance to a surface (negative inside,
 * positive outside). Creatures are composed by blending primitives with
 * smooth unions, which produces organic-looking volumes instead of blocky
 * intersections.
 */

export interface Vec3 {
  x: number
  y: number
  z: number
}

export function vec3(x: number, y: number, z: number): Vec3 {
  return { x, y, z }
}

/** A signed distance function over 3D space. */
export type Sdf = (p: Vec3) => number

/** Distance field of a sphere. */
export function sdSphere(center: Vec3, radius: number): Sdf {
  return (p) => {
    const x = p.x - center.x
    const y = p.y - center.y
    const z = p.z - center.z
    return Math.sqrt(x * x + y * y + z * z) - radius
  }
}

/**
 * Distance field of an axis-aligned box.
 * Inigo Quilez's exact box formula.
 */
export function sdBox(center: Vec3, halfExtents: Vec3): Sdf {
  return (p) => {
    const qx = Math.abs(p.x - center.x) - halfExtents.x
    const qy = Math.abs(p.y - center.y) - halfExtents.y
    const qz = Math.abs(p.z - center.z) - halfExtents.z
    const x = Math.max(qx, 0)
    const y = Math.max(qy, 0)
    const z = Math.max(qz, 0)
    const outside = Math.sqrt(x * x + y * y + z * z)
    return outside + Math.min(Math.max(qx, Math.max(qy, qz)), 0)
  }
}

/** Distance field of a capsule (segment from `a` to `b`, radius `radius`). */
export function sdCapsule(a: Vec3, b: Vec3, radius: number): Sdf {
  return (p) => {
    const pax = p.x - a.x
    const pay = p.y - a.y
    const paz = p.z - a.z
    const bax = b.x - a.x
    const bay = b.y - a.y
    const baz = b.z - a.z
    const t = Math.max(
      0,
      Math.min(
        1,
        (pax * bax + pay * bay + paz * baz) /
          (bax * bax + bay * bay + baz * baz),
      ),
    )
    const x = pax - bax * t
    const y = pay - bay * t
    const z = paz - baz * t
    return Math.sqrt(x * x + y * y + z * z) - radius
  }
}

/** Moves a distance field by an offset. */
export function translate(sdf: Sdf, offset: Vec3): Sdf {
  return (p) => sdf({ x: p.x - offset.x, y: p.y - offset.y, z: p.z - offset.z })
}

/**
 * Distance field of an ellipsoid with per-axis radii (Quilez's exact form).
 *
 * Unlike a stretched sphere this stays a usable distance estimate near the
 * surface, so it voxelizes cleanly at a handful of voxels across — the regime
 * every face feature lives in.
 */
export function sdEllipsoid(center: Vec3, radii: Vec3): Sdf {
  return (p) => {
    const x = p.x - center.x
    const y = p.y - center.y
    const z = p.z - center.z
    const k0 = Math.sqrt(
      (x / radii.x) * (x / radii.x) +
        (y / radii.y) * (y / radii.y) +
        (z / radii.z) * (z / radii.z),
    )
    const k1 = Math.sqrt(
      (x / (radii.x * radii.x)) * (x / (radii.x * radii.x)) +
        (y / (radii.y * radii.y)) * (y / (radii.y * radii.y)) +
        (z / (radii.z * radii.z)) * (z / (radii.z * radii.z)),
    )
    // The centre is the one point where both scalings vanish.
    if (k1 === 0) return -Math.min(radii.x, radii.y, radii.z)
    return (k0 * (k0 - 1)) / k1
  }
}

/**
 * Distance field of a round cone: two spheres of radius `r1` at `a` and `r2`
 * at `b` joined by their common tangent surface. With `r1 === r2` this is
 * exactly a capsule.
 *
 * Requires a real tangent surface (`|r1 - r2| <= |b - a|`); degenerate inputs
 * fall back to the union of the two spheres rather than returning NaN.
 */
export function sdRoundCone(a: Vec3, b: Vec3, r1: number, r2: number): Sdf {
  const bax = b.x - a.x
  const bay = b.y - a.y
  const baz = b.z - a.z
  const l2 = bax * bax + bay * bay + baz * baz
  const rr = r1 - r2
  // Squared cone length; non-positive means the spheres overlap.
  const a2 = l2 - rr * rr
  const fallback = union(sdSphere(a, r1), sdSphere(b, r2))
  const useFallback = l2 === 0 || a2 <= 0
  const signRr = Math.sign(rr)
  const il2 = 1 / l2
  return (p) => {
    if (useFallback) return fallback(p)
    const pax = p.x - a.x
    const pay = p.y - a.y
    const paz = p.z - a.z
    const y = pax * bax + pay * bay + paz * baz
    const z = y - l2
    const xx = pax * l2 - bax * y
    const xy = pay * l2 - bay * y
    const xz = paz * l2 - baz * y
    const x2 = xx * xx + xy * xy + xz * xz
    const y2 = y * y * l2
    const z2 = z * z * l2
    const k = signRr * rr * rr * x2
    // Near the thin cap, near the thick cap, then the conical flank.
    if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2
    if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1
    return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1
  }
}

/**
 * Smooth subtraction: carves `cutter` out of `base`, melting the rim over `k`
 * instead of leaving a machined edge. Non-positive `k` is treated as a hard
 * subtraction.
 *
 * This is what seats an eye socket in a skull: the recess is a spherical
 * cavity whose lip fades into the head rather than a drilled hole.
 */
export function smoothSubtract(base: Sdf, cutter: Sdf, k: number): Sdf {
  return (p) => {
    const d1 = cutter(p)
    const d2 = base(p)
    if (k <= 0) return Math.max(d2, -d1)
    const h = Math.max(0, Math.min(1, 0.5 - (0.5 * (d2 + d1)) / k))
    return d2 * (1 - h) - d1 * h + k * h * (1 - h)
  }
}

/** Hard union: minimum of both fields. */
export function union(a: Sdf, b: Sdf): Sdf {
  return (p) => Math.min(a(p), b(p))
}

/**
 * Smooth union with polynomial smoothing (Quilez smin).
 * `k` controls the blend width: near the seam the surfaces melt together
 * instead of forming a crevice.
 */
export function smoothUnion(a: Sdf, b: Sdf, k: number): Sdf {
  return (p) => {
    const ha = Math.max(k - Math.abs(a(p) - b(p)), 0) / k
    return Math.min(a(p), b(p)) - ha * ha * k * 0.25
  }
}
