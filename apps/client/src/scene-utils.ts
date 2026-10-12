import * as THREE from "three"

/** Free GPU resources of every mesh under `root` (inclusive): geometry and
 * materials, single or array. Does NOT detach the object from its parent —
 * removal from the scene graph stays with the caller, matching the varied
 * call sites (scene vs arenaGroup vs gallery list). */
export function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return
    obj.geometry.dispose()
    const mat = obj.material
    if (Array.isArray(mat)) {
      for (const m of mat) m.dispose()
    } else {
      mat.dispose()
    }
  })
}

/** The mesh's Lambert material, or null for any other material type.
 *  Voxel creatures are Lambert-shaded; the palette capture at cast time
 *  and the hit-flash restore both need this exact material. */
export function lambertMaterialOf(
  mesh: THREE.Mesh,
): THREE.MeshLambertMaterial | null {
  return mesh.material instanceof THREE.MeshLambertMaterial
    ? mesh.material
    : null
}
