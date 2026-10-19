import { type Sdf, type Vec3, vec3 } from "./sdf"

/** A named signed distance field — one anatomical part of a creature. */
export interface PartField {
  name: string
  sdf: Sdf
  /**
   * Optional surface classifier: given a claimed voxel's centre in grid space,
   * returns an opaque surface-class id (an index into the archetype's palette,
   * not a colour). Only called for voxels this part actually claims, so the
   * archetype pays for classification exactly on the surface it owns.
   */
  classify?: (p: Vec3) => number
}

export type Voxel = [x: number, y: number, z: number]

export interface VoxeledPart {
  name: string
  voxels: Voxel[]
  /**
   * Surface-class id per voxel, index-aligned with `voxels`. Optional so a
   * hand-built grid (tests, fixtures) can omit it and be treated as class 0.
   */
  classes?: number[]
}

export interface VoxelGrid {
  resolution: number
  parts: VoxeledPart[]
}

/**
 * Samples every part field on a resolution³ grid.
 *
 * Parts are processed in list order (paint order): a voxel claimed by an
 * earlier part cannot be re-claimed by a later one, so put outer details
 * (horns, tail tips) after bulk volumes (torso) in the archetype.
 *
 * Voxel centers sit at integer + 0.5; inside means Sdf(p) <= 0.
 * Output voxels are emitted in a stable (x, y, z) scan order.
 */
export function voxelize(parts: PartField[], resolution: number): VoxelGrid {
  const owner = new Int32Array(resolution * resolution * resolution).fill(-1)
  const classGrid = new Int16Array(resolution * resolution * resolution)
  const index = (x: number, y: number, z: number) =>
    x * resolution * resolution + y * resolution + z

  const voxelsPerPart: Voxel[][] = parts.map(() => [])
  const classesPerPart: number[][] = parts.map(() => [])
  for (let x = 0; x < resolution; x++) {
    for (let y = 0; y < resolution; y++) {
      for (let z = 0; z < resolution; z++) {
        const p = vec3(x + 0.5, y + 0.5, z + 0.5)
        for (let i = 0; i < parts.length; i++) {
          const field = parts[i]
          if (field && field.sdf(p) <= 0) {
            const cell = index(x, y, z)
            owner[cell] = i
            const cls = field.classify?.(p) ?? 0
            classGrid[cell] = cls
            break
          }
        }
      }
    }
  }

  for (let x = 0; x < resolution; x++) {
    for (let y = 0; y < resolution; y++) {
      for (let z = 0; z < resolution; z++) {
        const cell = index(x, y, z)
        const partIndex = owner[cell]
        if (partIndex !== undefined && partIndex >= 0) {
          voxelsPerPart[partIndex]?.push([x, y, z])
          classesPerPart[partIndex]?.push(classGrid[cell] ?? 0)
        }
      }
    }
  }

  return {
    resolution,
    parts: parts.map((field, i) => ({
      name: field.name,
      voxels: voxelsPerPart[i] ?? [],
      classes: classesPerPart[i] ?? [],
    })),
  }
}
