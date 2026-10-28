import * as THREE from "three"
import { jitter } from "../anim"
import type { ShotLook } from "../move-fx"
import { PROJECTILE_RADIUS, trailOpacity, trailRadius } from "./fx-data"
import { buildSpearCore } from "./shot-spear"

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
  if (look.geometry === "streak") {
    // Streak: a wind-only faceted needle (FR-4) — an octahedron pulled
    // hard along travel, so it reads pale and fast next to water's
    // smooth teardrop. Fixed geometry and materials only, no randomness
    // at build time, like the boulder.
    const needle = new THREE.Mesh(
      new THREE.OctahedronGeometry(PROJECTILE_RADIUS * 0.75 * size, 0),
      new THREE.MeshBasicMaterial({ color }),
    )
    needle.scale.set(0.55, 0.55, look.stretch ?? 2)
    return needle
  }
  if (look.geometry === "fork") {
    // Fork: Spark's jagged 3-segment arc — three thin additive bars linked
    // joint to joint downrange (+z) with a lateral zigzag, so the shot
    // reads as a crackle rather than a fireball. Fixed joints only, no
    // randomness at build time.
    const fork = new THREE.Group()
    const barMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const joints = [
      new THREE.Vector3(0, 0.02 * size, -0.55 * size),
      new THREE.Vector3(0.17 * size, 0.16 * size, -0.18 * size),
      new THREE.Vector3(-0.15 * size, -0.12 * size, 0.18 * size),
      new THREE.Vector3(0.08 * size, 0.05 * size, 0.55 * size),
    ]
    for (let i = 0; i < joints.length - 1; i++) {
      const from = joints[i]
      const to = joints[i + 1]
      if (from === undefined || to === undefined) continue
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(0.075 * size, 0.075 * size, from.distanceTo(to)),
        barMat,
      )
      bar.position.copy(from).add(to).multiplyScalar(0.5)
      bar.lookAt(to)
      fork.add(bar)
    }
    return fork
  }
  if (look.geometry === "chunk") {
    // Chunk: Cinder Shot's heavy lobbed mass — a squashed irregular
    // icosahedron (detail 1, finer facets than the ember shard) veined with
    // three additive crack slivers. Fixed geometry and transforms only,
    // like the boulder.
    const chunk = new THREE.Group()
    const rock = new THREE.Mesh(
      new THREE.IcosahedronGeometry(PROJECTILE_RADIUS * 1.0 * size, 1),
      new THREE.MeshBasicMaterial({ color }),
    )
    rock.scale.set(1.15, 0.8, 0.95)
    rock.rotation.set(0.5, 0.9, 0.2)
    chunk.add(rock)
    const crackMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const crackPos: Array<[number, number, number]> = [
      [0.14, 0.08, 0.1],
      [-0.1, -0.06, 0.14],
      [0.02, 0.14, -0.1],
    ]
    const crackRot: Array<[number, number, number]> = [
      [0.4, 0.9, 0.2],
      [1.1, 0.3, 0.7],
      [0.7, 1.4, 1.0],
    ]
    for (let i = 0; i < crackPos.length; i++) {
      const pos = crackPos[i]
      const rot = crackRot[i]
      if (pos === undefined || rot === undefined) continue
      const crack = new THREE.Mesh(
        new THREE.BoxGeometry(0.34 * size, 0.05 * size, 0.05 * size),
        crackMat,
      )
      crack.position.set(pos[0] * size, pos[1] * size, pos[2] * size)
      crack.rotation.set(rot[0], rot[1], rot[2])
      chunk.add(crack)
    }
    return chunk
  }
  if (look.geometry === "needle") {
    // Needle: Flare Dart's molten dart (fire-scoped) — a single stretched
    // cone with no halo, so the pierce reads sharp with no bloom. A cone,
    // never the octahedron wind pulls into its streak.
    const dart = new THREE.Mesh(
      new THREE.ConeGeometry(
        PROJECTILE_RADIUS * 0.42 * size,
        PROJECTILE_RADIUS * 3.4 * size,
        8,
      ),
      new THREE.MeshBasicMaterial({ color }),
    )
    // Tip downrange: the cone's apex (+y) rotates onto +z.
    dart.rotation.x = Math.PI / 2
    return dart
  }
  // Spear: Pyre Lance's piercing lance (Phase 7 rework) — delegated
  // to shot-spear.ts so this registry stays under the module size cap.
  if (look.geometry === "spear") return buildSpearCore(color, size)
  if (look.geometry === "jet") {
    // Jet: Pyre Wall's ring flame pillar — a tapered additive column around
    // a brighter core, standing straight up (+y) where the ring erupts
    // rather than along the shot's travel.
    const jet = new THREE.Group()
    const pillarMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    jet.add(
      new THREE.Mesh(
        new THREE.CylinderGeometry(
          PROJECTILE_RADIUS * 0.5 * size,
          PROJECTILE_RADIUS * 1.1 * size,
          PROJECTILE_RADIUS * 7 * size,
          7,
        ),
        pillarMat,
      ),
    )
    jet.add(
      new THREE.Mesh(
        new THREE.CylinderGeometry(
          PROJECTILE_RADIUS * 0.22 * size,
          PROJECTILE_RADIUS * 0.55 * size,
          PROJECTILE_RADIUS * 5.4 * size,
          6,
        ),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.9,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      ),
    )
    return jet
  }
  // Teardrop and orb share the sphere core; stretch points it downrange.
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(PROJECTILE_RADIUS * size, 12, 10),
    new THREE.MeshBasicMaterial({ color }),
  )
  if ((look.stretch ?? 1) > 1.2) core.scale.set(0.72, 0.72, look.stretch ?? 1)
  return core
}

/** Motes ringing the charge-gather effect (Blaze Bolt draw-in). */
export const GATHER_MOTES = 10

/**
 * Build the charge-gather effect: a swelling central orb ringed by motes
 * placed on a shell by a golden-angle lattice plus seeded jitter, so the
 * same seed always draws the same draw-in. A static arrangement — the
 * charge step animates the inward pull (Phase 3).
 */
export function buildGather(
  color: THREE.Color,
  size: number,
  seed = 1,
): THREE.Group {
  const gather = new THREE.Group()
  gather.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(PROJECTILE_RADIUS * 1.1 * size, 12, 10),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    ),
  )
  const moteGeo = new THREE.OctahedronGeometry(
    PROJECTILE_RADIUS * 0.28 * size,
    0,
  )
  const moteMat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const shell = PROJECTILE_RADIUS * 5 * size
  for (let i = 0; i < GATHER_MOTES; i++) {
    const phi =
      Math.acos(1 - (2 * (i + 0.5)) / GATHER_MOTES) +
      jitter(seed, `gather:phi:${i}`, 0.2)
    const theta = i * 2.399963 + jitter(seed, `gather:theta:${i}`, 0.25)
    const radius =
      shell + jitter(seed, `gather:radius:${i}`, PROJECTILE_RADIUS * 1.2 * size)
    const mote = new THREE.Mesh(moteGeo, moteMat)
    mote.position.set(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta),
    )
    gather.add(mote)
  }
  return gather
}

/**
 * One trail segment's facet shape: embers are shards, seeds are octahedra,
 * streaks are stretched octahedra, dust is a flat tetrahedral facet, and
 * droplets/orbs stay round.
 */
function trailGeometry(
  family: ShotLook["trail"],
  r: number,
): THREE.BufferGeometry {
  if (family === "embers") return new THREE.IcosahedronGeometry(r * 0.8, 0)
  if (family === "seeds") return new THREE.OctahedronGeometry(r * 0.8, 0)
  if (family === "streaks") {
    // Wind-only slivers (FR-4): faceted like plant's seeds but pulled
    // along travel, so the tail reads as speed, not scatter.
    const sliver = new THREE.OctahedronGeometry(r * 0.7, 0)
    sliver.scale(0.6, 0.6, 1.7)
    return sliver
  }
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
        // way embers, droplets, seeds, streaks, and orbs do.
        blending:
          look.trail === "dust" ? THREE.NormalBlending : THREE.AdditiveBlending,
        depthWrite: false,
      }),
    )
    trail.push(seg)
  }
  return trail
}
