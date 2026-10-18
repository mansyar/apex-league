import type { VoxelGrid } from "./voxelizer"

export interface MeshePart {
  name: string
  /** Flat xyz triples, 4 per quad. */
  positions: number[]
  /** Flat xyz normals, one per position vertex. */
  normals: number[]
  /** Triangle indices, 6 per quad (two CCW triangles). */
  indices: number[]
  /**
   * Opaque surface-class id per position vertex (one per vertex, not per
   * quad). Merged quads never span two classes, so all four vertices of a
   * quad share one id; the class is resolved to RGB at bake time.
   */
  classes: number[]
}

type Triple = [number, number, number]

function set(t: Triple, axis: number, value: number): void {
  if (axis === 0) t[0] = value
  else if (axis === 1) t[1] = value
  else t[2] = value
}

function addComponents(a: Triple, b: Triple): Triple {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

/**
 * Greedy-meshes every part of a voxel grid.
 *
 * A face is emitted only when the neighboring voxel is EMPTY — faces shared
 * with another part are hidden (the creature is one solid union). Faces of
 * the same part facing the same direction in a rectangle merge into single
 * quads, which keeps the triangle budget low.
 *
 * Deterministic: output depends only on grid contents; quads are emitted in
 * axis → slice → (u, v) scan order.
 */
export function meshGrid(grid: VoxelGrid): MeshePart[] {
  const res = grid.resolution
  const owner = new Int16Array(res * res * res).fill(-1)
  const voxelClass = new Int16Array(res * res * res)
  const voxelIndex = (x: number, y: number, z: number) =>
    x * res * res + y * res + z
  grid.parts.forEach((part, partIndex) => {
    part.voxels.forEach((voxel, k) => {
      const [x, y, z] = voxel
      const cell = voxelIndex(x, y, z)
      owner[cell] = partIndex
      voxelClass[cell] = part.classes?.[k] ?? 0
    })
  })

  // -1 out of bounds counts as empty, so boundary faces stay visible.
  const at = (x: number, y: number, z: number) =>
    x < 0 || y < 0 || z < 0 || x >= res || y >= res || z >= res
      ? -1
      : owner[voxelIndex(x, y, z)]

  const result: MeshePart[] = []
  for (let partIndex = 0; partIndex < grid.parts.length; partIndex++) {
    const positions: number[] = []
    const normals: number[] = []
    const indices: number[] = []
    const classes: number[] = []

    for (let d = 0; d < 3; d++) {
      const u = (d + 1) % 3
      const v = (d + 2) % 3
      const x: Triple = [0, 0, 0]
      const q: Triple = [0, 0, 0]
      set(q, d, 1)

      for (let slice = -1; slice < res; slice++) {
        set(x, d, slice)
        // Mask of face directions on this slice: +1 face points +d (owner
        // side), -1 face points -d (neighbor side). maskClass holds the class
        // of the voxel that owns each face, so merges stop at a colour seam.
        const mask = new Int8Array(res * res)
        const maskClass = new Int32Array(res * res)
        for (let jv = 0; jv < res; jv++) {
          for (let ju = 0; ju < res; ju++) {
            set(x, u, ju)
            set(x, v, jv)
            const a = at(x[0], x[1], x[2])
            const b = at(x[0] + q[0], x[1] + q[1], x[2] + q[2])
            if (a === partIndex && b === -1) {
              mask[ju * res + jv] = 1
              maskClass[ju * res + jv] =
                voxelClass[voxelIndex(x[0], x[1], x[2])] ?? 0
            } else if (b === partIndex && a === -1) {
              mask[ju * res + jv] = -1
              maskClass[ju * res + jv] =
                voxelClass[voxelIndex(x[0] + q[0], x[1] + q[1], x[2] + q[2])] ??
                0
            }
          }
        }

        // Greedy rectangle merge over the mask.
        for (let j = 0; j < res; j++) {
          for (let i = 0; i < res; ) {
            const m = mask[i * res + j] ?? 0
            if (m === 0) {
              i++
              continue
            }
            const cls = maskClass[i * res + j] ?? 0
            const same = (k: number, row: number): boolean =>
              mask[k * res + row] === m &&
              (maskClass[k * res + row] ?? 0) === cls
            let w = 1
            while (i + w < res && same(i + w, j)) w++
            let h = 1
            expand: while (j + h < res) {
              for (let k = 0; k < w; k++) {
                if (!same(i + k, j + h)) break expand
              }
              h++
            }

            // Emit the merged quad on the plane between the two slices.
            const base: Triple = [0, 0, 0]
            set(base, d, slice + 1)
            set(base, u, i)
            set(base, v, j)
            const du: Triple = [0, 0, 0]
            set(du, u, w)
            const dv: Triple = [0, 0, 0]
            set(dv, v, h)
            const cornerPlusDv = addComponents(base, dv)
            const cornerBoth = addComponents(addComponents(base, du), dv)
            const cornerPlusDu = addComponents(base, du)
            const quad =
              m > 0
                ? [base, cornerPlusDu, cornerBoth, cornerPlusDv]
                : [base, cornerPlusDv, cornerBoth, cornerPlusDu]
            const normal: Triple = [0, 0, 0]
            set(normal, d, m)

            const start = positions.length / 3
            for (const p of quad) {
              positions.push(p[0], p[1], p[2])
              normals.push(normal[0], normal[1], normal[2])
              classes.push(cls)
            }
            indices.push(
              start,
              start + 1,
              start + 2,
              start,
              start + 2,
              start + 3,
            )

            for (let jj = 0; jj < h; jj++) {
              for (let k = 0; k < w; k++) mask[(i + k) * res + (j + jj)] = 0
            }
            i += w
          }
        }
      }
    }

    const part = grid.parts[partIndex]
    result.push({
      name: part?.name ?? "unnamed",
      positions,
      normals,
      indices,
      classes,
    })
  }
  return result
}
