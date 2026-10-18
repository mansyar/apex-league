import { describe, expect, test } from "bun:test"
import { generate } from "@apex/voxel"
import * as THREE from "three"
import { buildCreatureGroup } from "./creature"

describe("creature colour path", () => {
  // Colour used to arrive as one material colour per part. It now arrives as a
  // per-vertex COLOR attribute with a white base, so a class-less build must
  // resolve to exactly the palette colour it rendered with before.
  test("a class-less part renders its palette colour through vertex colours", () => {
    const { dna, build, def } = generate("draconic", 42)
    const creature = buildCreatureGroup(dna, build, def.grid)

    let checked = 0
    creature.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      const material = object.material
      if (!(material instanceof THREE.MeshLambertMaterial)) {
        throw new Error(`expected Lambert material on ${object.name}`)
      }
      expect(material.vertexColors).toBe(true)
      const expected = build.colors[object.name]
      if (!expected) throw new Error(`no colour for part ${object.name}`)
      const colour = object.geometry.getAttribute("color")
      expect(colour.itemSize).toBe(3)
      expect(colour.count).toBe(object.geometry.getAttribute("position").count)
      for (let i = 0; i < colour.count; i++) {
        expect(colour.getX(i)).toBeCloseTo(expected[0], 6)
        expect(colour.getY(i)).toBeCloseTo(expected[1], 6)
        expect(colour.getZ(i)).toBeCloseTo(expected[2], 6)
      }
      checked++
    })
    expect(checked).toBeGreaterThan(5)
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
