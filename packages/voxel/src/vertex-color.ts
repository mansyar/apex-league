/**
 * Vertex-colour baking: resolves a mesh's opaque surface-class ids into RGB.
 *
 * The mesher deliberately stays palette-free — it emits class ids, not colours
 * — so the same geometry can be baked grey for silhouette review, baked with
 * the real palette in game, or (from the ambient-occlusion pass onwards)
 * multiplied by a per-vertex lighting term, all without re-meshing.
 *
 * Output order matches the mesh's vertex order (4 floats' worth of RGB per
 * vertex, 3 components), ready for a three.js `color` BufferAttribute or a
 * glTF `COLOR_0` accessor.
 */
import type { MeshePart } from "./mesher"

/** RGB triples in [0, 1], indexed by surface-class id. */
export type Palette = ReadonlyArray<readonly [number, number, number]>

/** A palette miss is a bug, not a style choice — make it loud. */
const MISSING_CLASS: readonly [number, number, number] = [1, 0, 1]

/**
 * Bakes `part.classes` through `palette` into a flat RGB buffer.
 *
 * A class id the palette does not define bakes magenta so a mis-wired palette
 * shows up on screen immediately instead of silently rendering black.
 */
export function bakeVertexColors(
  part: MeshePart,
  palette: Palette,
): Float32Array {
  const vertexCount = part.positions.length / 3
  const out = new Float32Array(vertexCount * 3)
  for (let v = 0; v < vertexCount; v++) {
    const cls = part.classes[v] ?? 0
    const rgb = palette[cls] ?? MISSING_CLASS
    out[v * 3] = rgb[0]
    out[v * 3 + 1] = rgb[1]
    out[v * 3 + 2] = rgb[2]
  }
  return out
}
