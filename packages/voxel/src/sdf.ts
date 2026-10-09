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

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
}

function length(a: Vec3): number {
  return Math.sqrt(dot(a, a))
}

/** Distance field of a sphere. */
export function sdSphere(center: Vec3, radius: number): Sdf {
  return (p) => length(sub(p, center)) - radius
}

/**
 * Distance field of an axis-aligned box.
 * Inigo Quilez's exact box formula.
 */
export function sdBox(center: Vec3, halfExtents: Vec3): Sdf {
  return (p) => {
    const q = {
      x: Math.abs(p.x - center.x) - halfExtents.x,
      y: Math.abs(p.y - center.y) - halfExtents.y,
      z: Math.abs(p.z - center.z) - halfExtents.z,
    }
    const outside = length({
      x: Math.max(q.x, 0),
      y: Math.max(q.y, 0),
      z: Math.max(q.z, 0),
    })
    return outside + Math.min(Math.max(q.x, Math.max(q.y, q.z)), 0)
  }
}

/** Distance field of a capsule (segment from `a` to `b`, radius `radius`). */
export function sdCapsule(a: Vec3, b: Vec3, radius: number): Sdf {
  return (p) => {
    const pa = sub(p, a)
    const ba = sub(b, a)
    const t = Math.max(0, Math.min(1, dot(pa, ba) / dot(ba, ba)))
    return (
      length({ x: pa.x - ba.x * t, y: pa.y - ba.y * t, z: pa.z - ba.z * t }) -
      radius
    )
  }
}

/** Moves a distance field by an offset. */
export function translate(sdf: Sdf, offset: Vec3): Sdf {
  return (p) => sdf(sub(p, offset))
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
