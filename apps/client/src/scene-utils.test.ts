import { describe, expect, test } from "bun:test"
import * as THREE from "three"
import { disposeObject3D } from "./scene-utils"

/** A mesh whose geometry/material record their dispose() calls. */
function trackedMesh(materials: number): {
  mesh: THREE.Mesh
  disposed: () => boolean
} {
  const geometry = new THREE.BufferGeometry()
  const mats: THREE.Material[] = []
  for (let i = 0; i < materials; i++) mats.push(new THREE.MeshBasicMaterial())
  let disposed = false
  geometry.dispose = () => {
    disposed = true
  }
  for (const m of mats)
    m.dispose = () => {
      disposed = true
    }
  const mesh = new THREE.Mesh(geometry, materials === 1 ? mats[0] : mats)
  return { mesh, disposed: () => disposed }
}

describe("disposeObject3D", () => {
  test("disposes the geometry and material of a bare mesh", () => {
    const { mesh, disposed } = trackedMesh(1)
    disposeObject3D(mesh)
    expect(disposed()).toBe(true)
  })

  test("disposes every mesh inside a group tree", () => {
    const root = new THREE.Group()
    const a = trackedMesh(1)
    const b = trackedMesh(2)
    const nested = new THREE.Group()
    nested.add(b.mesh)
    root.add(a.mesh, nested)
    disposeObject3D(root)
    expect(a.disposed()).toBe(true)
    expect(b.disposed()).toBe(true)
  })

  test("handles multi-material (array) meshes", () => {
    const { mesh, disposed } = trackedMesh(2)
    disposeObject3D(mesh)
    expect(disposed()).toBe(true)
  })

  test("does not throw on an empty group", () => {
    expect(() => disposeObject3D(new THREE.Group())).not.toThrow()
  })

  test("does not mutate the object hierarchy (removal stays with the caller)", () => {
    const parent = new THREE.Group()
    const child = trackedMesh(1)
    parent.add(child.mesh)
    disposeObject3D(parent)
    expect(parent.children).toContain(child.mesh)
  })
})
