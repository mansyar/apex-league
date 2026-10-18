/**
 * Shared three.js creature assembly from @apex/voxel generator output.
 * Parts are built pivot-relative (same contract as the GLB exporter), so
 * rotating a mesh around its pivot animates the joint.
 */
import type { CreatureBuild, Dna } from "@apex/voxel"
import {
  bakeVertexColors,
  DRAKE_GRID,
  type MeshePart,
  meshGrid,
  type Palette,
  VOXEL_SIZE,
  voxelize,
} from "@apex/voxel"
import * as THREE from "three"

/** A part's palette, or the single colour it has always rendered in. */
function paletteFor(build: CreatureBuild, partName: string): Palette {
  return build.palettes?.[partName] ?? [build.colors[partName] ?? [1, 0, 1]]
}

export function buildCreatureMeshes(
  build: CreatureBuild,
  grid: number = DRAKE_GRID,
): Array<{ part: MeshePart; geometry: THREE.BufferGeometry }> {
  const voxels = voxelize(build.fields, grid)
  const meshes = meshGrid(voxels)
  return meshes.map((part) => {
    const pivot = build.pivots[part.name]
    const px = pivot?.[0] ?? 0
    const py = pivot?.[1] ?? 0
    const pz = pivot?.[2] ?? 0
    const positions = new Float32Array(part.positions.length)
    for (let i = 0; i < part.positions.length; i += 3) {
      positions[i] = (part.positions[i] ?? 0) - px
      positions[i + 1] = (part.positions[i + 1] ?? 0) - py
      positions[i + 2] = (part.positions[i + 2] ?? 0) - pz
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute(
      "normal",
      new THREE.BufferAttribute(new Float32Array(part.normals), 3),
    )
    geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(
        bakeVertexColors(part, paletteFor(build, part.name)),
        3,
      ),
    )
    geometry.setIndex(part.indices)
    return { part, geometry }
  })
}

export function buildCreatureGroup(
  dna: Dna,
  build: CreatureBuild,
  grid: number = DRAKE_GRID,
  options: { grey?: boolean } = {},
): THREE.Group {
  const creature = new THREE.Group()
  for (const { part, geometry } of buildCreatureMeshes(build, grid)) {
    const material = options.grey
      ? new THREE.MeshLambertMaterial({ color: 0x9a9a9a })
      : new THREE.MeshLambertMaterial({ vertexColors: true })
    const mesh = new THREE.Mesh(geometry, material)
    const pivot = build.pivots[part.name]
    mesh.position.set(pivot?.[0] ?? 0, pivot?.[1] ?? 0, pivot?.[2] ?? 0)
    mesh.name = part.name
    creature.add(mesh)
  }
  // Wire the rig hierarchy declared by the archetype: re-parent each child
  // under its parent with position compensation so meshes keep their world
  // placement. Offsets come from the declared pivots (not live positions) so
  // multi-level chains stay correct. Animating a parent (body breath, head
  // bob, tail sway) now carries its children instead of separating at joints.
  const pivotOf = (name: string): THREE.Vector3 => {
    const p = build.pivots[name]
    if (!p) throw new Error(`part "${name}" has no pivot`)
    return new THREE.Vector3(p[0], p[1], p[2])
  }
  for (const [childName, parentName] of Object.entries(build.parents)) {
    const child = creature.getObjectByName(childName)
    const parent = creature.getObjectByName(parentName)
    if (!child || !parent) continue
    const offset = pivotOf(childName).sub(pivotOf(parentName))
    parent.add(child)
    child.position.copy(offset)
  }
  creature.scale.setScalar(VOXEL_SIZE)
  creature.userData.dna = dna
  return creature
}
