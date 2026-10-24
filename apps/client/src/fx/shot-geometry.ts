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
  if (look.geometry === "boulder") {
    // Boulder: a flat, heavy slab with one chipped facet. Fixed geometry and
    // materials only - no randomness at build time - so two identical shots
    // are identical meshes. No glow: Earth is the one non-luminous core.
    const core = new THREE.Group()
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(PROJECTILE_RADIUS * 1.05 * size, 0),
      new THREE.MeshBasicMaterial({ color }),
    )
    rock.scale.set(1.15, 0.72, 1)
    core.add(rock)
    const chip = new THREE.Mesh(
      new THREE.TetrahedronGeometry(PROJECTILE_RADIUS * 0.5 * size, 0),
      new THREE.MeshBasicMaterial({ color }),
    )
    chip.position.set(0.1 * size, 0.09 * size, -0.06 * size)
    chip.rotation.set(0.6, 0.4, 0.2)
    core.add(chip)
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

/**
 * One trail segment's facet shape: embers are shards, seeds are octahedra,
 * dust is a flat tetrahedral facet, and droplets/orbs stay round.
 */
function trailGeometry(
  family: ShotLook["trail"],
  r: number,
): THREE.BufferGeometry {
  if (family === "embers") return new THREE.IcosahedronGeometry(r * 0.8, 0)
  if (family === "seeds") return new THREE.OctahedronGeometry(r * 0.8, 0)
  if (family === "dust") return new THREE.TetrahedronGeometry(r * 0.9, 0)
  return new THREE.SphereGeometry(r, 10, 8)
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
    const geo = trailGeometry(look.trail, r)
    const seg = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: trailOpacity(i),
        // Dust is non-luminous grit: it must not add light to the lane the
        // way embers, droplets, seeds, and orbs do.
        blending:
          look.trail === "dust" ? THREE.NormalBlending : THREE.AdditiveBlending,
        depthWrite: false,
      }),
    )
    trail.push(seg)
  }
  return trail
}
