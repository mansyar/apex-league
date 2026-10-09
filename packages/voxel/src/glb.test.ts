import { describe, expect, test } from "bun:test"
import { sdSphere, vec3 } from "./sdf"
import { meshGrid, type MeshePart } from "./mesher"
import { voxelize, type PartField } from "./voxelizer"
import { exportGlb, type GlbManifest, type GlbOutput } from "./glb"

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
function parseGlb(glb: Uint8Array): { json: Record<string, unknown>; binOffset: number; binLen: number } {
  const view = new DataView(glb.buffer, glb.byteOffset, glb.byteLength)
  const jsonLen = view.getUint32(12, true)
  const json = JSON.parse(new TextDecoder().decode(glb.subarray(20, 20 + jsonLen))) as Record<string, unknown>
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
    expect(pbr.baseColorFactor).toEqual([0.9, 0.7, 0.3, 1])
    expect(pbr.metallicFactor).toBe(0)
    for (const mesh of meshes) {
      const prim = (mesh.primitives as Array<Record<string, unknown>>)[0]
      if (!prim) throw new Error("missing primitive")
      const attrs = prim.attributes as Record<string, number>
      expect(attrs.POSITION).toBeDefined()
      expect(attrs.NORMAL).toBeDefined()
      expect(prim.indices).toBeDefined()
      expect(prim.mode).toBe(4)
    }
  })

  test("stores pivot-relative float positions and uint32 indices", () => {
    const { glb } = exportFixture()
    const { json, binOffset } = parseGlb(glb)
    const view = new DataView(glb.buffer, glb.byteOffset, glb.byteLength)
    const accessors = json.accessors as Array<Record<string, unknown>>
    const bufferViews = json.bufferViews as Array<Record<string, unknown>>
    const meshes = json.meshes as Array<Record<string, unknown>>
    const prim = (meshes[0]?.primitives as Array<Record<string, unknown>>)[0]
    if (!prim) throw new Error("missing primitive")
    const attrs = prim.attributes as Record<string, number>

    const posAcc = accessors[attrs.POSITION]
    if (!posAcc) throw new Error("missing position accessor")
    expect(posAcc.type).toBe("VEC3")
    expect(posAcc.count).toBe(20) // 5 faces x 4 verts (shared face hidden)
    expect(posAcc.min).toEqual([0, 0, 0])
    expect(posAcc.max).toEqual([1, 1, 1])

    // Decode the float buffer and compare to input positions minus pivot.
    const posView = bufferViews[attrs.POSITION]
    if (!posView) throw new Error("missing position bufferView")
    const base = binOffset + (posView.byteOffset as number)
    const floats: number[] = []
    for (let i = 0; i < ((posAcc.count as number) * 3); i++) {
      floats.push(view.getFloat32(base + i * 4, true))
    }
    const body = twoPartMeshes()[0]
    if (!body) throw new Error("missing body mesh")
    const pivot = [1, 1, 1]
    expect(floats.length).toBe(body.positions.length)
    for (let i = 0; i < floats.length; i++) {
      expect(floats[i]).toBeCloseTo(body.positions[i] - (pivot[i % 3]))
    }

    const idxAcc = accessors[prim.indices as number]
    if (!idxAcc) throw new Error("missing index accessor")
    expect(idxAcc.componentType).toBe(5125) // UNSIGNED_INT
    const idxView = bufferViews[prim.indices as number]
    if (!idxView) throw new Error("missing index bufferView")
    const idxBase = binOffset + (idxView.byteOffset as number)
    expect(view.getUint32(idxBase, true)).toBe(body.indices[0])
    expect(view.getUint32(idxBase + 4, true)).toBe(body.indices[1])
  })

  test("manifest records identity, pivots, and triangle count", () => {
    const { glb, manifest } = exportFixture()
    const m: GlbManifest = manifest
    expect(m.archetype).toBe("draconic")
    expect(m.seed).toBe(42)
    expect(m.generatorVersion).toBe(1)
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
      colors: { body: [0.9, 0.7, 0.3] },
      pivots: { body: [1, 1, 1], head: [1, 2, 1] },
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
