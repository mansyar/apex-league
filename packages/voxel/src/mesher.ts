import { aoFactor, aoLevel } from "./ao"
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
  /**
   * Ambient-occlusion brightness per position vertex, in (0, 1]. Baked here
   * rather than in the shader so the exporter and the client agree exactly.
   */
  ao: number[]
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

function emptyMeshPart(name: string): MeshePart {
  return {
    name,
    positions: [],
    normals: [],
    indices: [],
    classes: [],
    ao: [],
  }
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
  const res2 = res * res
  const owner = new Int16Array(res2 * res).fill(-1)
  const voxelClass = new Int16Array(res2 * res)
  grid.parts.forEach((part, partIndex) => {
    part.voxels.forEach((voxel, k) => {
      const [x, y, z] = voxel
      const cell = x * res2 + y * res + z
      owner[cell] = partIndex
      voxelClass[cell] = part.classes?.[k] ?? 0
    })
  })

  // A slice has at most one visible face per cell. Recording its owner once
  // lets every part reuse the same scan instead of rescanning the whole slice.
  const maskSize = res2
  const faceOwner = new Int16Array(maskSize)
  const faceDirection = new Int8Array(maskSize)
  const faceClass = new Int32Array(maskSize)
  const faceAo = new Int32Array(maskSize)

  const result: MeshePart[] = Array.from(
    { length: grid.parts.length },
    (_, partIndex) => emptyMeshPart(grid.parts[partIndex]?.name ?? "unnamed"),
  )

  for (let d = 0; d < 3; d++) {
    const u = (d + 1) % 3
    const v = (d + 2) % 3
    const strideD = d === 0 ? res2 : d === 1 ? res : 1
    const strideU = u === 0 ? res2 : u === 1 ? res : 1
    const strideV = v === 0 ? res2 : v === 1 ? res : 1

    /**
     * Corner-occlusion signature for the face of one cell, packed as four
     * 2-bit levels. `plane` is the empty layer the face looks into; the three
     * occluders for a corner are the two edge neighbours and the diagonal in
     * that layer, exactly the classic voxel rule.
     */
    const faceSignature = (plane: number, i: number, j: number): number => {
      const planeBase = plane * strideD + i * strideU + j * strideV
      const solid = (uCoord: number, vCoord: number): number => {
        if (
          plane < 0 ||
          plane >= res ||
          uCoord < 0 ||
          vCoord < 0 ||
          uCoord >= res ||
          vCoord >= res
        ) {
          return 0
        }
        const cell =
          planeBase + (uCoord - i) * strideU + (vCoord - j) * strideV
        return owner[cell] === -1 ? 0 : 1
      }
      const corner = (du: number, dv: number): number => {
        const su = du === 0 ? -1 : 1
        const sv = dv === 0 ? -1 : 1
        return aoLevel(
          solid(i + su, j + dv),
          solid(i + su, j + sv),
          solid(i + du, j + sv),
        )
      }
      const c0 = corner(0, 0)
      const c1 = corner(1, 0)
      const c2 = corner(1, 1)
      const c3 = corner(0, 1)
      return c0 | (c1 << 2) | (c2 << 4) | (c3 << 6)
    }

    for (let slice = -1; slice < res; slice++) {
      // -2 marks no face; non-negative values identify the owning part.
      faceOwner.fill(-2)
      const planeBase = slice * strideD
      const neighborBase = (slice + 1) * strideD
      for (let jv = 0; jv < res; jv++) {
        for (let ju = 0; ju < res; ju++) {
          const offset = ju * strideU + jv * strideV
          const cell = planeBase + offset
          const neighborCell = neighborBase + offset
          const a = slice < 0 ? -1 : (owner[cell] ?? -1)
          const b = slice + 1 >= res ? -1 : (owner[neighborCell] ?? -1)
          const maskIndex = ju * res + jv
          if (a >= 0 && b === -1) {
            faceOwner[maskIndex] = a
            faceDirection[maskIndex] = 1
            faceClass[maskIndex] = voxelClass[cell] ?? 0
            faceAo[maskIndex] = faceSignature(slice + 1, ju, jv)
          } else if (b >= 0 && a === -1) {
            faceOwner[maskIndex] = b
            faceDirection[maskIndex] = -1
            faceClass[maskIndex] = voxelClass[neighborCell] ?? 0
            faceAo[maskIndex] = faceSignature(slice, ju, jv)
          }
        }
      }

      // Parts are visited in list order, so each part's buffer still receives
      // its quads in axis → slice → (u, v) order.
      for (let partIndex = 0; partIndex < result.length; partIndex++) {
        const output = result[partIndex]
        if (!output) throw new Error("missing mesh output")
        const { positions, normals, indices, classes, ao } = output

        // Greedy rectangle merge over this part's faces in the shared mask.
        for (let j = 0; j < res; j++) {
          for (let i = 0; i < res; ) {
            const cell = i * res + j
            const m =
              faceOwner[cell] === partIndex ? (faceDirection[cell] ?? 0) : 0
            if (m === 0) {
              i++
              continue
            }
            const cls = faceClass[cell] ?? 0
            const sig = faceAo[cell] ?? 0
            const same = (k: number, row: number): boolean => {
              const other = k * res + row
              return (
                faceOwner[other] === partIndex &&
                faceDirection[other] === m &&
                (faceClass[other] ?? 0) === cls &&
                (faceAo[other] ?? 0) === sig
              )
            }
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

            // Corner levels follow the quad's own winding order, so the
            // -d faces (which wind the other way) get their signature
            // reversed rather than mirrored on screen.
            let a0 = sig & 3
            let a1 = (sig >> 2) & 3
            let a2 = (sig >> 4) & 3
            let a3 = (sig >> 6) & 3
            if (m < 0) {
              const a1Reversed = a1
              a1 = a3
              a3 = a1Reversed
            }
            ao.push(aoFactor(a0), aoFactor(a1), aoFactor(a2), aoFactor(a3))

            // Split along the diagonal whose ends are darker: interpolating a
            // bright-to-bright seam is what makes AO quads look folded.
            if (a0 + a2 > a1 + a3) {
              indices.push(
                start,
                start + 1,
                start + 3,
                start + 1,
                start + 2,
                start + 3,
              )
            } else {
              indices.push(
                start,
                start + 1,
                start + 2,
                start,
                start + 2,
                start + 3,
              )
            }

            for (let jj = 0; jj < h; jj++) {
              for (let k = 0; k < w; k++) {
                faceOwner[(i + k) * res + (j + jj)] = -2
              }
            }
            i += w
          }
        }
      }
    }
  }
  return result
}
