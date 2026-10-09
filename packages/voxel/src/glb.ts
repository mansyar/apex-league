import type { MeshePart } from "./mesher"

// Pure TypeScript GLB 2.0 writer for the voxel pipeline. Emits a rigid
// hierarchy contract: a root "creature" node (scale = voxel size) with one
// named, pivot-placed child node per part, so three.js can find and animate
// nodes procedurally without skinning.

export const GENERATOR_VERSION = 1

/** World units per voxel; the shared scale contract between the GLB root
 * node and the live three.js scene. Single source of truth. */
export const VOXEL_SIZE = 0.045

const GLB_MAGIC = 0x46546c67 // "glTF"
const CHUNK_JSON = 0x4e4f534a // "JSON"
const CHUNK_BIN = 0x004e4942 // "BIN\0"
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
  indices: Uint32Array
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
  if (part.positions.length === 0) {
    return {
      name: part.name,
      positions,
      normals: new Float32Array(0),
      indices: new Uint32Array(0),
      min: [0, 0, 0],
      max: [0, 0, 0],
    }
  }
  return {
    name: part.name,
    positions,
    normals: Float32Array.from(part.normals),
    indices: Uint32Array.from(part.indices),
    min,
    max,
  }
}

function bytesOf(typed: Float32Array | Uint32Array): Uint8Array {
  return new Uint8Array(typed.buffer, typed.byteOffset, typed.byteLength)
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
    prepared.push(preparePart(part, pivot))
  }

  const bufferChunks: Uint8Array[] = []
  const bufferViews: JsonObject[] = []
  const accessors: JsonObject[] = []
  const meshes: JsonObject[] = []
  const materials: JsonObject[] = []
  let byteOffset = 0

  for (let i = 0; i < prepared.length; i++) {
    const part = prepared[i]
    if (!part) throw new Error("missing part")
    const color = input.colors[part.name]
    if (!color) throw new Error(`part "${part.name}" has no color`)

    const posViewIndex = bufferViews.length
    bufferViews.push({
      buffer: 0,
      byteOffset,
      byteLength: part.positions.byteLength,
    })
    byteOffset += part.positions.byteLength
    bufferChunks.push(bytesOf(part.positions))

    const normViewIndex = bufferViews.length
    bufferViews.push({
      buffer: 0,
      byteOffset,
      byteLength: part.normals.byteLength,
    })
    byteOffset += part.normals.byteLength
    bufferChunks.push(bytesOf(part.normals))

    const idxViewIndex = bufferViews.length
    bufferViews.push({
      buffer: 0,
      byteOffset,
      byteLength: part.indices.byteLength,
    })
    byteOffset += part.indices.byteLength
    bufferChunks.push(bytesOf(part.indices))

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
    const idxAccIndex = accessors.length
    accessors.push({
      bufferView: idxViewIndex,
      componentType: COMPONENT_UNSIGNED_INT,
      count: part.indices.length,
      type: "SCALAR",
    })

    meshes.push({
      name: part.name,
      primitives: [
        {
          attributes: { POSITION: posAccIndex, NORMAL: normAccIndex },
          indices: idxAccIndex,
          material: i,
          mode: MODE_TRIANGLES,
        },
      ],
    })
    materials.push({
      name: part.name,
      pbrMetallicRoughness: {
        baseColorFactor: [color[0], color[1], color[2], 1],
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
