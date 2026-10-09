import type { PartField, VoxelGrid } from "./voxelizer"

/**
 * Measured dimensional ratios for one creature build. Ratios are
 * dimensionless (extents over extents), so budgets are meaningful across
 * archetype grid sizes.
 */
export interface MeasuredRatios {
  /** Mean exposed-leg y-extent divided by body y-extent. */
  "legLength/bodyHeight": number
  /** Neck y-extent divided by body z-extent. */
  "neckLength/bodyLength": number
  /** Head y-extent divided by body y-extent. */
  "headHeight/bodyHeight": number
  /** Body z-extent divided by body y-extent (torso chunkiness). */
  "bodyLength/bodyHeight": number
}

interface Extents {
  x: number
  y: number
  z: number
}

/** Extents (max - min + 1) of a point set; empty sets measure 0. */
function extentsOf(points: Iterable<[number, number, number]>): Extents {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  let count = 0
  for (const [x, y, z] of points) {
    count++
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
    if (z < minZ) minZ = z
    if (z > maxZ) maxZ = z
  }
  if (count === 0) return { x: 0, y: 0, z: 0 }
  return { x: maxX - minX + 1, y: maxY - minY + 1, z: maxZ - minZ + 1 }
}

type RatioKey = keyof MeasuredRatios

/**
 * Computes the standard ratio set from per-part extents. Leg parts are any
 * part whose name starts with "leg"; body/neck/head are exact names. Parts
 * missing from the build are treated as zero-extent (ratios may violate
 * budgets, which is the correct signal for a malformed build).
 */
function ratiosFromParts(
  extents: Map<string, Extents>,
  legNames: string[],
): MeasuredRatios {
  const body = extents.get("body") ?? { x: 0, y: 0, z: 0 }
  const neck = extents.get("neck") ?? { x: 0, y: 0, z: 0 }
  const head = extents.get("head") ?? { x: 0, y: 0, z: 0 }

  let legY = 0
  for (const name of legNames) legY += (extents.get(name) ?? { y: 0 }).y
  const legMean = legNames.length > 0 ? legY / legNames.length : 0

  return {
    "legLength/bodyHeight": legMean / body.y,
    "neckLength/bodyLength": neck.y / body.z,
    "headHeight/bodyHeight": head.y / body.y,
    "bodyLength/bodyHeight": body.z / body.y,
  }
}

/** Measures ratios from an already-voxelized grid (exact, full cost). */
export function measureRatios(grid: VoxelGrid): MeasuredRatios {
  const extents = new Map<string, Extents>()
  const legNames: string[] = []
  for (const part of grid.parts) {
    extents.set(part.name, extentsOf(part.voxels))
    if (part.name.startsWith("leg")) legNames.push(part.name)
  }
  return ratiosFromParts(extents, legNames)
}

/**
 * Audit sampling box in grid coordinates, derived from the authoring
 * convention every archetype follows: creature centered at grid/2 on x/z,
 * ground at y = 0, and at most ~32 voxels tall / ~26 voxels deep from
 * center (drake.ts and bovine.ts both fit well inside). Parts reaching
 * outside are clipped; budgets are calibrated on this same box so the
 * measurement basis stays consistent across archetypes.
 */
function auditBox(grid: number): {
  xMin: number
  xMax: number
  yMin: number
  yMax: number
  zMin: number
  zMax: number
} {
  const o = grid / 2
  return {
    xMin: o - 12,
    xMax: o + 12,
    yMin: 0,
    yMax: 32,
    zMin: o - 26,
    zMax: o + 26,
  }
}
/** Lattice step in grid units (2 ≈ every other voxel row). */
const AUDIT_STEP = 2

/**
 * Measures ratios by sampling the part fields directly on a coarse lattice
 * in the archetype's own coordinate space (paint order respected, mirroring
 * the voxelizer's first-part-wins rule). `grid` anchors the audit box per
 * the authoring convention. Fast enough to sweep hundreds of seeds inside
 * the test budget; calibrate budgets on this basis, not on full-grid
 * voxelization.
 */
export function measureRatiosFromFields(
  fields: PartField[],
  grid: number,
): MeasuredRatios {
  const owners = new Map<string, Array<[number, number, number]>>()
  for (const field of fields) owners.set(field.name, [])
  const legNames = fields
    .map((f) => f.name)
    .filter((name) => name.startsWith("leg"))

  const box = auditBox(grid)
  for (let x = box.xMin; x <= box.xMax; x += AUDIT_STEP) {
    for (let y = box.yMin; y <= box.yMax; y += AUDIT_STEP) {
      for (let z = box.zMin; z <= box.zMax; z += AUDIT_STEP) {
        for (const field of fields) {
          if (field.sdf({ x, y, z }) <= 0) {
            owners.get(field.name)?.push([x, y, z])
            break
          }
        }
      }
    }
  }

  const extents = new Map<string, Extents>()
  for (const [name, points] of owners) extents.set(name, extentsOf(points))
  return ratiosFromParts(extents, legNames)
}

export type { RatioKey }
