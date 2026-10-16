import * as THREE from "three"
import type { ShotLook } from "../move-fx"
import { PROJECTILE_RADIUS, trailOpacity, trailRadius } from "./fx-data"

/**
 * Deterministic shot-mesh factories (FR5): the core built from a look
 * descriptor, and the tapering additive trail behind it. Pure builders —
 * no loop state, no per-frame work — so the visual identity of each
 * element's shot lives in one auditable place.
 */

/** Build the shot's core meshes from its look descriptor (FR5). */
export function buildShotCore(
  look: ShotLook,
  color: THREE.Color,
  size: number,
): THREE.Object3D {
  if (look.geometry === "ember") {
    // Ember: a faceted hot shard inside an additive glow halo.
    const core = new THREE.Group()
    core.add(
      new THREE.Mesh(
        new THREE.IcosahedronGeometry(PROJECTILE_RADIUS * 0.8 * size, 0),
        new THREE.MeshBasicMaterial({ color }),
      ),
    )
    core.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(PROJECTILE_RADIUS * 1.55 * size, 12, 10),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: look.glow ?? 0.3,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      ),
    )
    return core
  }
  if (look.geometry === "seedCluster") {
    // Seed cluster: three facets orbiting a shared center, tumbling.
    const core = new THREE.Group()
    const geo = new THREE.OctahedronGeometry(PROJECTILE_RADIUS * 0.55 * size, 0)
    const mat = new THREE.MeshBasicMaterial({ color })
    for (let i = 0; i < 3; i++) {
      const seed = new THREE.Mesh(geo, mat)
      const angle = (i / 3) * Math.PI * 2
      seed.position.set(
        Math.cos(angle) * 0.15 * size,
        Math.sin(angle) * 0.15 * size,
        0,
      )
      core.add(seed)
    }
    return core
  }
  // Teardrop and orb share the sphere core; stretch points it downrange.
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(PROJECTILE_RADIUS * size, 12, 10),
    new THREE.MeshBasicMaterial({ color }),
  )
  if ((look.stretch ?? 1) > 1.2) core.scale.set(0.72, 0.72, look.stretch ?? 1)
  return core
}

/** Trail segments stream behind the shot in its element's family. */
export function buildTrail(
  look: ShotLook,
  color: THREE.Color,
  size: number,
): THREE.Mesh[] {
  const trail: THREE.Mesh[] = []
  for (let i = 0; i < 4; i++) {
    const r = trailRadius(size, i)
    const geo =
      look.trail === "embers"
        ? new THREE.IcosahedronGeometry(r * 0.8, 0)
        : look.trail === "seeds"
          ? new THREE.OctahedronGeometry(r * 0.8, 0)
          : new THREE.SphereGeometry(r, 10, 8)
    const seg = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: trailOpacity(i),
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    )
    trail.push(seg)
  }
  return trail
}
