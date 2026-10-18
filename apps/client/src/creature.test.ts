import { describe, expect, test } from "bun:test"
import { generate } from "@apex/voxel"
import * as THREE from "three"
import { buildCreatureGroup, buildCreatureMeshes } from "./creature"

describe("creature colour path", () => {
  // Colour used to arrive as one material colour per part. It now arrives as a
  // per-vertex COLOR attribute (albedo x ambient occlusion) with a white base,
  // so the shading must resolve to exactly the palette colour darkened by the
  // mesh's baked occlusion — no more, no less.
  test("a part renders its palette colour darkened by baked occlusion", () => {
    const { build, def } = generate("draconic", 42)
    let checked = 0
    let shaded = 0
    for (const { part, geometry } of buildCreatureMeshes(build, def.grid)) {
      const albedo = build.colors[part.name]
      if (!albedo) throw new Error(`no colour for part ${part.name}`)
      const colour = geometry.getAttribute("color")
      expect(colour.itemSize).toBe(3)
      expect(colour.count).toBe(part.ao.length)
      for (let i = 0; i < colour.count; i++) {
        const light = part.ao[i] ?? 1
        expect(colour.getX(i)).toBeCloseTo(albedo[0] * light, 5)
        expect(colour.getY(i)).toBeCloseTo(albedo[1] * light, 5)
        expect(colour.getZ(i)).toBeCloseTo(albedo[2] * light, 5)
        if (light < 1) shaded++
      }
      checked++
    }
    expect(checked).toBeGreaterThan(5)
    // Occlusion must actually reach the vertex buffer, not just the mesher.
    expect(shaded).toBeGreaterThan(0)
  })

  test("materials take colour from vertices, so every part shares one shader", () => {
    const { dna, build, def } = generate("draconic", 42)
    const creature = buildCreatureGroup(dna, build, def.grid)
    let meshes = 0
    creature.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      const material = object.material
      if (!(material instanceof THREE.MeshLambertMaterial)) {
        throw new Error(`expected Lambert material on ${object.name}`)
      }
      expect(material.vertexColors).toBe(true)
      meshes++
    })
    expect(meshes).toBeGreaterThan(5)
  })

  test("grey mode stays flat and unlit by vertex colours", () => {
    const { dna, build, def } = generate("draconic", 42)
    const creature = buildCreatureGroup(dna, build, def.grid, { grey: true })
    creature.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      const material = object.material
      if (!(material instanceof THREE.MeshLambertMaterial)) return
      expect(material.vertexColors).toBe(false)
    })
  })
})
