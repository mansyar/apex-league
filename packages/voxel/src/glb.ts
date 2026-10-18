import type { MeshePart } from "./mesher"
import { bakeVertexColors, type Palette } from "./vertex-color"

// Pure TypeScript GLB 2.0 writer for the voxel pipeline. Emits a rigid
// hierarchy contract: a root "creature" node (scale = voxel size) with one
// named, pivot-placed child node per part, so three.js can find and animate
// nodes procedurally without skinning.
//
// Colour travels as a per-vertex COLOR_0 attribute (glTF multiplies it into
// the material's baseColorFactor), so one part can carry several surface
// classes — belly, saddle, markings — inside a single draw call.

export const GENERATOR_VERSION = 2

/** World units per voxel; the shared scale contract between the GLB root
 * node and the live three.js scene. Single source of truth. */
export const VOXEL_SIZE = 0.045

const GLB_MAGIC = 0x46546c67 // "glTF"
const CHUNK_JSON = 0x4e4f534a // "JSON"
const CHUNK_BIN = 0x004e4942 // "BIN\0"
const COMPONENT_UNSIGNED_BYTE = 5121
const COMPONENT_UNSIGNED_SHORT = 5123
const COMPONENT_FLOAT = 5126
const COMPONENT_UNSIGNED_INT = 5125
const MODE_TRIANGLES = 4

export interface ExportInput {
  archetype: string
  seed: number
  /** Canonical DNA JSON, hashed into the manifest for integrity gating. */
  dnaJson: string
  /** World units per voxel; applied as the root node's uniform scale. */
  voxelSize: number
  colors: Record<string, [number, number, number]>
  /**
   * Optional per-part palettes indexed by surface class. When a part has no
   * palette its single `colors` entry is used for every vertex, which keeps
   * class-less builds byte-for-byte equivalent in appearance.
   */
  palettes?: Record<string, Palette>
  /** Rotation anchor per part in voxel units; mesh coords are stored relative to it. */
  pivots: Record<string, [number, number, number]>
  parts: MeshePart[]
}

export interface GlbManifest {
  archetype: string
  seed: number
  generatorVersion: number
  dnaHash: string
  glbHash: string
  triCount: number
  pivots: Record<string, [number, number, number]>
}

export interface GlbOutput {
  glb: Uint8Array
  manifest: GlbManifest
}

interface PreparedPart {
  name: string
  positions: Float32Array
  normals: Float32Array
  /** RGBA, 8 bits per channel, 4 bytes per vertex (keeps bufferViews aligned). */
  colors: Uint8Array
  /** 16-bit whenever a part fits in 65k vertices, so index data costs half. */
  indices: Uint16Array | Uint32Array
  min: [number, number, number]
  max: [number, number, number]
}

type JsonValue =
  | number
  | string
  | boolean
  | JsonValue[]
  | { [key: string]: JsonValue }
type JsonObject = { [key: string]: JsonValue }

function preparePart(
  part: MeshePart,
  pivot: [number, number, number],
  palette: Palette,
): PreparedPart {
  const positions = new Float32Array(part.positions.length)
  const min: [number, number, number] = [Infinity, Infinity, Infinity]
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < part.positions.length; i++) {
    const axis = i % 3
    const v = (part.positions[i] ?? 0) - (pivot[axis] ?? 0)
    positions[i] = v
    if (v < (min[axis] ?? Infinity)) min[axis] = v
    if (v > (max[axis] ?? -Infinity)) max[axis] = v
  }
  const colors = quantizeColors(bakeVertexColors(part, palette))
  const vertexCount = positions.length / 3
  const indices =
    vertexCount <= 65536
      ? Uint16Array.from(part.indices)
      : Uint32Array.from(part.indices)
  if (part.positions.length === 0) {
    return {
      name: part.name,
      positions,
      normals: new Float32Array(0),
      colors,
      indices,
      min: [0, 0, 0],
      max: [0, 0, 0],
    }
  }
  return {
    name: part.name,
    positions,
    normals: Float32Array.from(part.normals),
    colors,
    indices,
    min,
    max,
  }
}

function bytesOf(
  typed: Float32Array | Uint8Array | Uint16Array | Uint32Array,
): Uint8Array {
  return new Uint8Array(typed.buffer, typed.byteOffset, typed.byteLength)
}

/**
 * Pack baked RGB into RGBA bytes for glTF `COLOR_0`: 8 bits per channel is
 * ample for flat palette colours and costs 4 bytes per vertex instead of 12,
 * which keeps the committed GLBs inside the 150 KiB budget. Alpha is always
 * opaque. Width is 4 so every colour bufferView stays 4-byte aligned.
 */
function quantizeColors(rgb: Float32Array): Uint8Array {
  const vertexCount = rgb.length / 3
  const out = new Uint8Array(vertexCount * 4)
  for (let v = 0; v < vertexCount; v++) {
    for (let c = 0; c < 3; c++) {
      const value = rgb[v * 3 + c] ?? 0
      out[v * 4 + c] = Math.round(Math.min(1, Math.max(0, value)) * 255)
    }
    out[v * 4 + 3] = 255
  }
  return out
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}

function padTo4(bytes: Uint8Array, filler: number): Uint8Array {
  const remainder = bytes.length % 4
  if (remainder === 0) return bytes
  const out = new Uint8Array(bytes.length + (4 - remainder))
  out.set(bytes)
  out.fill(filler, bytes.length)
  return out
}

function sha256Hex(data: Uint8Array | string): string {
  const hasher = new Bun.CryptoHasher("sha256")
  hasher.update(data)
  return hasher.digest("hex")
}

export function exportGlb(input: ExportInput): GlbOutput {
  const prepared: PreparedPart[] = []
  for (const part of input.parts) {
    const pivot = input.pivots[part.name]
    if (!pivot) throw new Error(`part "${part.name}" has no pivot`)
    const base = input.colors[part.name]
    const palette = input.palettes?.[part.name] ?? (base ? [base] : null)
    if (!palette) throw new Error(`part "${part.name}" has no color or palette`)
    prepared.push(preparePart(part, pivot, palette))
  }

  const bufferChunks: Uint8Array[] = []
  const bufferViews: JsonObject[] = []
  const accessors: JsonObject[] = []
  const meshes: JsonObject[] = []
  const materials: JsonObject[] = []
  let byteOffset = 0

  /**
   * Append one bufferView and keep every subsequent view 4-byte aligned (the
   * glTF alignment rule). The padding is physical bytes, not just a skipped
   * offset, so 16-bit index chunks cannot misalign the next part.
   */
  const pushView = (
    typed: Float32Array | Uint8Array | Uint16Array | Uint32Array,
  ) => {
    const bytes = bytesOf(typed)
    const index = bufferViews.length
    bufferViews.push({
      buffer: 0,
      byteOffset,
      byteLength: bytes.byteLength,
    })
    bufferChunks.push(bytes)
    const pad = (4 - (bytes.byteLength % 4)) % 4
    if (pad > 0) bufferChunks.push(new Uint8Array(pad))
    byteOffset += bytes.byteLength + pad
    return index
  }

  for (let i = 0; i < prepared.length; i++) {
    const part = prepared[i]
    if (!part) throw new Error("missing part")

    const posViewIndex = pushView(part.positions)
    const normViewIndex = pushView(part.normals)
    const colorViewIndex = pushView(part.colors)
    const idxViewIndex = pushView(part.indices)

    const posAccIndex = accessors.length
    accessors.push({
      bufferView: posViewIndex,
      componentType: COMPONENT_FLOAT,
      count: part.positions.length / 3,
      type: "VEC3",
      min: part.min,
      max: part.max,
    })
    const normAccIndex = accessors.length
    accessors.push({
      bufferView: normViewIndex,
      componentType: COMPONENT_FLOAT,
      count: part.normals.length / 3,
      type: "VEC3",
    })
    const colorAccIndex = accessors.length
    accessors.push({
      bufferView: colorViewIndex,
      componentType: COMPONENT_UNSIGNED_BYTE,
      normalized: true,
      count: part.colors.length / 4,
      type: "VEC4",
    })
    const idxAccIndex = accessors.length
    accessors.push({
      bufferView: idxViewIndex,
      componentType:
        part.indices instanceof Uint16Array
          ? COMPONENT_UNSIGNED_SHORT
          : COMPONENT_UNSIGNED_INT,
      count: part.indices.length,
      type: "SCALAR",
    })

    meshes.push({
      name: part.name,
      primitives: [
        {
          attributes: {
            POSITION: posAccIndex,
            NORMAL: normAccIndex,
            COLOR_0: colorAccIndex,
          },
          indices: idxAccIndex,
          material: i,
          mode: MODE_TRIANGLES,
        },
      ],
    })
    materials.push({
      name: part.name,
      pbrMetallicRoughness: {
        // Colour lives in COLOR_0; a white base keeps the product at 1x.
        baseColorFactor: [1, 1, 1, 1],
        metallicFactor: 0,
        roughnessFactor: 1,
      },
    })
  }

  const bin = padTo4(concatBytes(bufferChunks), 0x00)

  const partNodes: JsonObject[] = prepared.map((part, i) => {
    const pivot = input.pivots[part.name]
    if (!pivot) throw new Error(`part "${part.name}" has no pivot`)
    return { name: part.name, mesh: i, translation: pivot }
  })
  const root: JsonObject = {
    name: "creature",
    scale: [input.voxelSize, input.voxelSize, input.voxelSize],
    children: partNodes.map((_, i) => i + 1),
  }

  const json: JsonObject = {
    asset: { version: "2.0", generator: `apex-voxel ${GENERATOR_VERSION}` },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [root, ...partNodes],
    meshes,
    materials,
    accessors,
    bufferViews,
    buffers: [{ byteLength: bin.length }],
  }

  const jsonPadded = padTo4(
    new TextEncoder().encode(JSON.stringify(json)),
    0x20,
  )
  const total = 12 + 8 + jsonPadded.length + 8 + bin.length
  const glb = new Uint8Array(total)
  const view = new DataView(glb.buffer)
  view.setUint32(0, GLB_MAGIC, true)
  view.setUint32(4, 2, true)
  view.setUint32(8, total, true)
  view.setUint32(12, jsonPadded.length, true)
  view.setUint32(16, CHUNK_JSON, true)
  glb.set(jsonPadded, 20)
  const binStart = 20 + jsonPadded.length
  view.setUint32(binStart, bin.length, true)
  view.setUint32(binStart + 4, CHUNK_BIN, true)
  glb.set(bin, binStart + 8)

  const triCount =
    prepared.reduce((sum, part) => sum + part.indices.length, 0) / 3
  const manifest: GlbManifest = {
    archetype: input.archetype,
    seed: input.seed,
    generatorVersion: GENERATOR_VERSION,
    dnaHash: sha256Hex(input.dnaJson),
    glbHash: sha256Hex(glb),
    triCount,
    pivots: input.pivots,
  }

  return { glb, manifest }
}
