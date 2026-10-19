import { describe, expect, test } from "bun:test"
import {
  exportGlb,
  GENERATOR_VERSION,
  type GlbManifest,
  type GlbOutput,
} from "./glb"
import { type MeshePart, meshGrid } from "./mesher"
import { sdSphere, vec3 } from "./sdf"
import { type PartField, voxelize } from "./voxelizer"

const DNA_JSON = '{"archetype":"draconic","seed":42}'

function twoPartMeshes(): MeshePart[] {
  const fields: PartField[] = [
    { name: "body", sdf: sdSphere(vec3(1.5, 1.5, 1.5), 0.49) },
    { name: "head", sdf: sdSphere(vec3(1.5, 2.5, 1.5), 0.49) },
  ]
  return meshGrid(voxelize(fields, 3))
}

function exportFixture(): GlbOutput {
  return exportGlb({
    archetype: "draconic",
    seed: 42,
    dnaJson: DNA_JSON,
    voxelSize: 0.05,
    colors: {
      body: [0.9, 0.7, 0.3],
      head: [0.9, 0.7, 0.3],
    },
    pivots: {
      body: [1, 1, 1],
      head: [1, 2, 1],
    },
    parts: twoPartMeshes(),
  })
}

/** Parse the GLB container into its JSON text and BIN byte offset. */
function parseGlb(glb: Uint8Array): {
  json: Record<string, unknown>
  binOffset: number
  binLen: number
} {
  const view = new DataView(glb.buffer, glb.byteOffset, glb.byteLength)
  const jsonLen = view.getUint32(12, true)
  const json = JSON.parse(
    new TextDecoder().decode(glb.subarray(20, 20 + jsonLen)),
  ) as Record<string, unknown>
  const binOffset = 20 + jsonLen
  const binLen = view.getUint32(binOffset, true)
  return { json, binOffset: binOffset + 8, binLen }
}

describe("glb exporter", () => {
  test("writes a valid GLB 2.0 container", () => {
    const { glb } = exportFixture()
    const view = new DataView(glb.buffer, glb.byteOffset, glb.byteLength)
    expect(view.getUint32(0, true)).toBe(0x46546c67) // "glTF"
    expect(view.getUint32(4, true)).toBe(2)
    expect(view.getUint32(8, true)).toBe(glb.byteLength)
    const jsonLen = view.getUint32(12, true)
    expect(view.getUint32(16, true)).toBe(0x4e4f534a) // "JSON"
    expect(jsonLen % 4).toBe(0)
    const binOffset = 20 + jsonLen
    expect(view.getUint32(binOffset + 4, true)).toBe(0x004e4942) // "BIN\0"
    const binLen = view.getUint32(binOffset, true)
    expect(binLen % 4).toBe(0)
    expect(view.getUint32(8, true)).toBe(binOffset + 8 + binLen)
  })

  test("declares the node hierarchy contract", () => {
    const { json } = parseGlb(exportFixture().glb)
    const nodes = json.nodes as Array<Record<string, unknown>>
    const root = nodes[0]
    if (!root) throw new Error("missing root node")
    expect(root.name).toBe("creature")
    expect(root.children).toEqual([1, 2])
    expect(root.scale).toEqual([0.05, 0.05, 0.05])
    const body = nodes[1]
    if (!body) throw new Error("missing body node")
    expect(body.name).toBe("body")
    expect(body.mesh).toBe(0)
    expect(body.translation).toEqual([1, 1, 1])
    const head = nodes[2]
    if (!head) throw new Error("missing head node")
    expect(head.name).toBe("head")
    expect(head.mesh).toBe(1)
    expect(head.translation).toEqual([1, 2, 1])
    expect(json.scenes).toEqual([{ nodes: [0] }])
  })

  test("emits one mesh and material per part", () => {
    const { json } = parseGlb(exportFixture().glb)
    const meshes = json.meshes as Array<Record<string, unknown>>
    expect(meshes.map((m) => m.name)).toEqual(["body", "head"])
    const materials = json.materials as Array<Record<string, unknown>>
    expect(materials.length).toBe(2)
    const pbr = materials[0]?.pbrMetallicRoughness as Record<string, unknown>
    // Colour now travels per-vertex; the material base stays white so the
    // shader product is exactly COLOR_0.
    expect(pbr.baseColorFactor).toEqual([1, 1, 1, 1])
    expect(pbr.metallicFactor).toBe(0)
    for (const mesh of meshes) {
      const prim = (mesh.primitives as Array<Record<string, unknown>>)[0]
      if (!prim) throw new Error("missing primitive")
      const attrs = prim.attributes as Record<string, number>
      expect(attrs.POSITION).toBeDefined()
      expect(attrs.NORMAL).toBeDefined()
      expect(attrs.COLOR_0).toBeDefined()
      expect(prim.indices).toBeDefined()
      expect(prim.mode).toBe(4)
    }
  })

  test("bakes a part's colour into an 8-bit normalized COLOR_0 attribute", () => {
    const { glb } = exportFixture()
    const { json, binOffset } = parseGlb(glb)
    const accessors = json.accessors as Array<Record<string, unknown>>
    const bufferViews = json.bufferViews as Array<Record<string, unknown>>
    const meshes = json.meshes as Array<Record<string, unknown>>
    const first = meshes[0]
    if (!first) throw new Error("missing mesh")
    const prim = (first.primitives as Array<Record<string, unknown>>)[0]
    if (!prim) throw new Error("missing primitive")
    const attrs = prim.attributes as Record<string, number>
    const colorIndex = attrs.COLOR_0
    if (colorIndex === undefined) throw new Error("missing COLOR_0")
    const colorAcc = accessors[colorIndex]
    if (!colorAcc) throw new Error("missing color accessor")
    expect(colorAcc.componentType).toBe(5121) // UNSIGNED_BYTE
    expect(colorAcc.normalized).toBe(true)
    expect(colorAcc.type).toBe("VEC4")
    const view = bufferViews[colorAcc.bufferView as number]
    if (!view) throw new Error("missing color bufferView")
    const start = binOffset + (view.byteOffset as number)
    const bytes = new Uint8Array(glb.buffer, glb.byteOffset + start, 4)
    // Palette values are held as float32 before packing, so quantise the same
    // way the exporter does (0.9f * 255 = 229.4999 -> 229, not 230).
    const q = (c: number) =>
      Math.round((new Float32Array([c])[0] as number) * 255)
    expect([...bytes]).toEqual([q(0.9), q(0.7), q(0.3), 255])
  })

  test("stores pivot-relative float positions and 16-bit indices", () => {
    const { glb } = exportFixture()
    const { json, binOffset } = parseGlb(glb)
    const view = new DataView(glb.buffer, glb.byteOffset, glb.byteLength)
    const accessors = json.accessors as Array<Record<string, unknown>>
    const bufferViews = json.bufferViews as Array<Record<string, unknown>>
    const meshes = json.meshes as Array<Record<string, unknown>>
    const first = meshes[0]
    if (!first) throw new Error("missing mesh")
    const prim = (first.primitives as Array<Record<string, unknown>>)[0]
    if (!prim) throw new Error("missing primitive")
    const attrs = prim.attributes as Record<string, number>
    const posIndex = attrs.POSITION
    const normIndex = attrs.NORMAL
    const idxIndex = prim.indices
    if (
      posIndex === undefined ||
      normIndex === undefined ||
      typeof idxIndex !== "number"
    ) {
      throw new Error("missing accessor references")
    }

    const posAcc = accessors[posIndex]
    if (!posAcc) throw new Error("missing position accessor")
    expect(posAcc.type).toBe("VEC3")
    expect(posAcc.count).toBe(20) // 5 faces x 4 verts (shared face hidden)
    expect(posAcc.min).toEqual([0, 0, 0])
    expect(posAcc.max).toEqual([1, 1, 1])

    // Decode the float buffer and compare to input positions minus pivot.
    const posView = bufferViews[posIndex]
    if (!posView) throw new Error("missing position bufferView")
    const base = binOffset + (posView.byteOffset as number)
    const floats: number[] = []
    for (let i = 0; i < (posAcc.count as number) * 3; i++) {
      floats.push(view.getFloat32(base + i * 4, true))
    }
    const body = twoPartMeshes()[0]
    if (!body) throw new Error("missing body mesh")
    const pivot = [1, 1, 1]
    expect(floats.length).toBe(body.positions.length)
    for (let i = 0; i < floats.length; i++) {
      expect(floats[i]).toBeCloseTo(
        (body.positions[i] ?? 0) - (pivot[i % 3] ?? 0),
      )
    }

    const idxAcc = accessors[idxIndex]
    if (!idxAcc) throw new Error("missing index accessor")
    // Small parts use 16-bit indices; the 32-bit fallback only exists for
    // parts over 65,536 vertices, which no archetype reaches.
    expect(idxAcc.componentType).toBe(5123) // UNSIGNED_SHORT
    const idxView = bufferViews[idxIndex]
    if (!idxView) throw new Error("missing index bufferView")
    const idxBase = binOffset + (idxView.byteOffset as number)
    expect(view.getUint16(idxBase, true)).toBe(body.indices[0] ?? -1)
    expect(view.getUint16(idxBase + 2, true)).toBe(body.indices[1] ?? -1)
  })

  test("manifest records identity, pivots, and triangle count", () => {
    const { glb, manifest } = exportFixture()
    const m: GlbManifest = manifest
    expect(m.archetype).toBe("draconic")
    expect(m.seed).toBe(42)
    expect(m.generatorVersion).toBe(GENERATOR_VERSION)
    expect(m.triCount).toBe(20) // 2 parts x 5 faces x 2 tris
    expect(m.pivots).toEqual({ body: [1, 1, 1], head: [1, 2, 1] })
    const dnaHasher = new Bun.CryptoHasher("sha256")
    dnaHasher.update(DNA_JSON)
    expect(m.dnaHash).toBe(dnaHasher.digest("hex"))
    const glbHasher = new Bun.CryptoHasher("sha256")
    glbHasher.update(glb)
    expect(m.glbHash).toBe(glbHasher.digest("hex"))
  })

  test("same input produces byte-identical output", () => {
    const a = exportFixture()
    const b = exportFixture()
    expect(Buffer.from(a.glb).equals(Buffer.from(b.glb))).toBe(true)
    expect(a.manifest.glbHash).toBe(b.manifest.glbHash)
    expect(a.manifest.dnaHash).toBe(b.manifest.dnaHash)
  })

  test("throws when a part lacks a pivot or color", () => {
    const base = {
      archetype: "draconic",
      seed: 42,
      dnaJson: DNA_JSON,
      voxelSize: 0.05,
      colors: { body: [0.9, 0.7, 0.3] } as Record<
        string,
        [number, number, number]
      >,
      pivots: { body: [1, 1, 1], head: [1, 2, 1] } as Record<
        string,
        [number, number, number]
      >,
      parts: twoPartMeshes(),
    }
    expect(() => exportGlb(base)).toThrow(/color/)
    expect(() =>
      exportGlb({
        ...base,
        colors: { body: [0.9, 0.7, 0.3], head: [1, 1, 1] },
        pivots: { body: [1, 1, 1] },
      }),
    ).toThrow(/pivot/)
  })
})
