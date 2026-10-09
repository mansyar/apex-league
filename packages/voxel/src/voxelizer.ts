import { type Sdf, vec3 } from "./sdf"

/** A named signed distance field — one anatomical part of a creature. */
export interface PartField {
  name: string
  sdf: Sdf
}

export type Voxel = [x: number, y: number, z: number]

export interface VoxeledPart {
  name: string
  voxels: Voxel[]
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
  const index = (x: number, y: number, z: number) =>
    x * resolution * resolution + y * resolution + z

  const voxelsPerPart: Voxel[][] = parts.map(() => [])
  for (let x = 0; x < resolution; x++) {
    for (let y = 0; y < resolution; y++) {
      for (let z = 0; z < resolution; z++) {
        const p = vec3(x + 0.5, y + 0.5, z + 0.5)
        for (let i = 0; i < parts.length; i++) {
          const field = parts[i]
          if (field && field.sdf(p) <= 0) {
            owner[index(x, y, z)] = i
            break
          }
        }
      }
    }
  }

  for (let x = 0; x < resolution; x++) {
    for (let y = 0; y < resolution; y++) {
      for (let z = 0; z < resolution; z++) {
        const partIndex = owner[index(x, y, z)]
        if (partIndex !== undefined && partIndex >= 0) {
          voxelsPerPart[partIndex]?.push([x, y, z])
        }
      }
    }
  }

  return {
    resolution,
    parts: parts.map((field, i) => ({
      name: field.name,
      voxels: voxelsPerPart[i] ?? [],
    })),
  }
}
