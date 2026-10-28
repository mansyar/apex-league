import * as THREE from "three"
import { PROJECTILE_RADIUS } from "./fx-data"

/**
 * Spear core: Pyre Lance's piercing lance (Phase 7 rework) — a thin
 * shaft driving a conical head through a flattened guard collar, all
 * streaming downrange (+z) where the projectile layer aims the shot.
 * Fixed geometry and materials only, no randomness at build time.
 *
 * Lives here (not in shot-geometry.ts) so the geometry registry stays
 * under the client module size cap.
 */
export function buildSpearCore(color: THREE.Color, size: number): THREE.Group {
  const spear = new THREE.Group()
  const spearMat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const shaftLen = PROJECTILE_RADIUS * 6 * size
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(
      PROJECTILE_RADIUS * 0.16 * size,
      PROJECTILE_RADIUS * 0.16 * size,
      shaftLen,
      6,
    ),
    spearMat,
  )
  // The cylinder stands up (+y): lay it onto +z, trailing the head.
  shaft.rotation.x = Math.PI / 2
  shaft.position.z = -shaftLen / 2
  spear.add(shaft)
  const headLen = PROJECTILE_RADIUS * 1.8 * size
  const head = new THREE.Mesh(
    new THREE.ConeGeometry(PROJECTILE_RADIUS * 0.5 * size, headLen, 8),
    spearMat,
  )
  // Apex downrange: the cone's tip (+y) rotates onto +z, its base at
  // the shaft's front end.
  head.rotation.x = Math.PI / 2
  head.position.z = headLen / 2
  spear.add(head)
  const guard = new THREE.Mesh(
    new THREE.OctahedronGeometry(PROJECTILE_RADIUS * 0.75 * size, 0),
    spearMat,
  )
  // A wide collar at the shaft/head junction, thin downrange.
  guard.scale.set(1, 1, 0.35)
  spear.add(guard)
  return spear
}
