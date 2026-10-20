import * as THREE from "three"
import {
  elementColor,
  lookFor,
  PROJECTILE_LIFE_MS,
  type ShotLook,
} from "../move-fx"
import { SHOT_ORIGIN_Y, SHOT_TARGET_Y } from "./fx-data"
import { pulseScale, shotArc, trailLag, wobbleZ } from "./fx-math"
import type { EffectLoop } from "./loop"
import { buildShotCore, buildTrail } from "./shot-geometry"

/**
 * The projectile layer, moved verbatim out of `staging-fx.ts`: in-flight
 * shots (a glowing core with an arced, lagging trail) advanced on the shared
 * effect loop.
 */

/** One in-flight shot: a glowing core with an arced, lagging trail. */
interface Projectile {
  mesh: THREE.Object3D
  trail: THREE.Mesh[]
  from: THREE.Vector3
  to: THREE.Vector3
  elapsed: number
  life: number
  look: ShotLook
}

export interface ProjectileLayerHost {
  arenaGroup: THREE.Group
  loop: EffectLoop
  /** Free a shot's meshes — cores may be Groups (fire/plant flavors). */
  killMesh: (mesh: THREE.Object3D) => void
}

export interface ProjectileLayer {
  /** Launch a shot from the thrower's mouth line at the victim's chest. */
  spawn(
    from: { group: THREE.Group },
    to: { group: THREE.Group },
    element: string | undefined,
    opts?: { size?: number; life?: number; spread?: number },
  ): void
  /** Position of the oldest shot in flight, for camera-director framing. */
  firstPosition(): THREE.Vector3 | null
  /** Free every shot still in flight. */
  disposeAll(): void
}

export function createProjectileLayer(
  host: ProjectileLayerHost,
): ProjectileLayer {
  const { arenaGroup, loop, killMesh } = host
  const projectiles: Projectile[] = []

  // Scratch vectors hoisted out of the frame loop - the quality gate
  // forbids per-frame allocations while the fight is live.
  const shotDir = new THREE.Vector3()
  const shotPos = new THREE.Vector3()
  const segPos = new THREE.Vector3()

  /** Free the shot's core + trail meshes and drop it from the pool. */
  const retireShot = (p: Projectile, index: number): void => {
    killMesh(p.mesh)
    for (const seg of p.trail) {
      arenaGroup.remove(seg)
      seg.geometry.dispose()
      ;(seg.material as THREE.Material).dispose()
    }
    projectiles.splice(index, 1)
  }

  /** Advance the shots: returns false when none are in flight. */
  const projectileStep = (dtMs: number): boolean => {
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i]
      if (!p) continue
      p.elapsed += dtMs
      const t = p.elapsed / p.life
      shotDir.copy(p.to).sub(p.from)
      const travel = Math.min(1, t)
      shotPos.copy(p.from).addScaledVector(shotDir, travel)
      // Look-driven flight: arc lift, wobble, spin, pulse per element.
      shotPos.y += shotArc(travel, p.look.arc)
      if (p.look.wobble !== undefined && p.look.wobble > 0) {
        // Water streams with a slight side-to-side ripple across the lane.
        shotPos.z += wobbleZ(p.elapsed, p.look.wobble)
      }
      p.mesh.position.copy(shotPos)
      if (p.look.spin !== undefined && p.look.spin > 0) {
        // Seeds tumble; embers corkscrew around the travel axis.
        p.mesh.rotation.z += p.look.spin * dtMs
        p.mesh.rotation.x += p.look.spin * 0.6 * dtMs
      }
      if (p.look.pulse !== undefined && p.look.pulse > 0) {
        const s = pulseScale(p.elapsed, p.look.pulse)
        p.mesh.scale.setScalar(s)
      } else if ((p.look.stretch ?? 1) > 1.2) {
        // Teardrops and seeds keep facing downrange (their +Z is stretched).
        p.mesh.lookAt(
          shotPos.x + shotDir.x,
          p.mesh.position.y,
          shotPos.z + shotDir.z,
        )
      }
      // Trail lags behind it along the same line, with the same arc lift.
      for (let s = 0; s < p.trail.length; s++) {
        const lag = trailLag(travel, s)
        segPos.copy(p.from).addScaledVector(shotDir, lag)
        segPos.y += shotArc(lag, p.look.arc)
        p.trail[s]?.position.copy(segPos)
      }
      if (t >= 1) {
        // Impact punctures: vanish (the impact step supplies the reaction).
        retireShot(p, i)
      }
    }
    return projectiles.length > 0
  }

  /** A glowing core in the element hue plus a tapering additive orb trail. */
  const spawn = (
    from: { group: THREE.Group },
    to: { group: THREE.Group },
    element: string | undefined,
    opts?: { size?: number; life?: number; spread?: number },
  ): void => {
    const size = opts?.size ?? 1
    const color = new THREE.Color(elementColor(element))
    const look = lookFor(element)
    // Launch from the thrower's mouth line, land on the victim's chest.
    // `spread` fans the landing point sideways across the lane (z) for
    // volley choreography.
    const origin = from.group.position.clone()
    origin.y += SHOT_ORIGIN_Y
    const target = to.group.position.clone()
    target.y += SHOT_TARGET_Y
    if (opts?.spread) target.z += opts.spread
    // Core built from the look descriptor (FR5): ember + halo, seed
    // cluster, teardrop, or the neutral orb.
    const core = buildShotCore(look, color, size)
    core.position.copy(origin)
    arenaGroup.add(core)

    // Trail segments stream behind the shot in its element's family.
    const trail = buildTrail(look, color, size)
    for (const seg of trail) {
      seg.position.copy(origin)
      arenaGroup.add(seg)
    }
    projectiles.push({
      mesh: core,
      trail,
      from: origin,
      to: target,
      elapsed: 0,
      life: opts?.life ?? PROJECTILE_LIFE_MS,
      look,
    })
    // The shared loop's clock makes stale-tick re-anchoring unnecessary.
    loop.add(projectileStep)
  }

  return {
    spawn,
    firstPosition() {
      return projectiles[0]?.mesh.position ?? null
    },
    disposeAll() {
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i]
        if (p) retireShot(p, i)
      }
    },
  }
}
