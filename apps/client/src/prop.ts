/**
 * Static ranch scenery: builds a prop's voxel mesh from the @apex/voxel
 * prop registry. Props have no rig — pivots/parents stay empty and the
 * whole group is placed at a world position by the scene.
 */
import { generateProp, VOXEL_SIZE } from "@apex/voxel"
import * as THREE from "three"
import { buildCreatureMeshes } from "./creature"

export function buildPropGroup(propId: string, seed: number): THREE.Group {
  const { build, def } = generateProp(propId, seed)
  const group = new THREE.Group()
  group.name = propId
  for (const { part, geometry } of buildCreatureMeshes(build, def.grid)) {
    const rgb = build.colors[part.name] ?? [1, 0, 1]
    const material = new THREE.MeshLambertMaterial({
      color: new THREE.Color(rgb[0], rgb[1], rgb[2]),
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)
  }
  // Props are authored in their own small grid but must land at creature
  // world scale — same voxel-per-world-unit as the creature rig.
  group.scale.setScalar(VOXEL_SIZE)
  return group
}
