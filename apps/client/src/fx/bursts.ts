import * as THREE from "three"
import { type BurstStyle, elementColor } from "../move-fx"
import { burstPhysics, PROJECTILE_RADIUS, SHOT_TARGET_Y } from "./fx-data"
import { burstVelocity, fadeOver, swayDrift } from "./fx-math"
import type { EffectLoop } from "./loop"

/**
 * The burst layer, moved verbatim out of `staging-fx.ts`: elemental pops —
 * an expanding glow flash plus fragments that scatter, fall, shrink and fade.
 */

/** One flying fragment of the element burst. */
interface BurstParticle {
  mesh: THREE.Mesh
  /** World-space velocity, units per second. */
  vel: THREE.Vector3
  /** Angular speed around the travel axis, radians per second. */
  spin: number
  /** Phase offset for the lateral sway sine, radians. */
  swayPhase: number
}

/**
 * A live elemental burst: an expanding glow flash plus fragments that
 * scatter outward, fall under gravity, shrink and fade.
 */
interface Burst {
  /** Expanding glow shell, removed once its fade completes. */
  flash: THREE.Mesh | null
  /** Flying fragments, scattered outward and falling. */
  particles: BurstParticle[]
  /** Accumulated burst age (ms), frozen during a hit-stop. */
  elapsed: number
  /** Total burst duration (ms). */
  life: number
  /** How far the glow shell swells over the burst (scale units). */
  flashGrow: number
  /** Downward pull on the fragments, units per second squared. */
  gravity: number
  /** Lateral sine drift on the fragments, units per second. */
  sway: number
}

export interface BurstLayerHost {
  arenaGroup: THREE.Group
  loop: EffectLoop
  /** Motion preference provider (reduced keeps visuals calm). */
  pref: () => "full" | "reduced"
  /** Free a burst's meshes. */
  killMesh: (mesh: THREE.Object3D) => void
}

export interface BurstLayer {
  /** An elemental pop where a blow connects or a shot lands. */
  spawn(
    at: THREE.Vector3,
    element: string | undefined,
    style?: BurstStyle,
  ): void
  /** Free every live burst. */
  disposeAll(): void
}

export function createBurstLayer(host: BurstLayerHost): BurstLayer {
  const { arenaGroup, loop, killMesh } = host
  const bursts: Burst[] = []

  const disposeBurst = (burst: Burst): void => {
    if (burst.flash) {
      killMesh(burst.flash)
      burst.flash = null
    }
    for (const part of burst.particles) {
      arenaGroup.remove(part.mesh)
      part.mesh.geometry.dispose()
      ;(part.mesh.material as THREE.Material).dispose()
    }
    burst.particles.length = 0
  }

  /** Advance every live burst: flash swells and fades, fragments scatter. */
  const burstStep = (dtMs: number): boolean => {
    const dt = dtMs / 1000
    for (let i = bursts.length - 1; i >= 0; i--) {
      const burst = bursts[i]
      if (!burst) continue
      burst.elapsed += dtMs
      const k = Math.min(1, burst.elapsed / burst.life)
      if (burst.flash) {
        const flashMat = burst.flash.material as THREE.MeshBasicMaterial
        burst.flash.scale.setScalar(1 + k * burst.flashGrow)
        flashMat.opacity = fadeOver(0.55, k)
      }
      for (const part of burst.particles) {
        part.vel.y -= burst.gravity * dt
        part.mesh.position.addScaledVector(part.vel, dt)
        if (burst.sway > 0) {
          part.mesh.position.x += swayDrift(
            burst.elapsed,
            part.swayPhase,
            burst.sway,
            dt,
          )
        }
        part.mesh.rotation.x += part.spin * dtMs
        part.mesh.rotation.y += part.spin * 0.7 * dtMs
        part.mesh.scale.setScalar(Math.max(0.05, 1 - k))
        ;(part.mesh.material as THREE.MeshBasicMaterial).opacity = fadeOver(
          0.85,
          k,
        )
      }
      if (k >= 1) {
        disposeBurst(burst)
        bursts.splice(i, 1)
      }
    }
    return bursts.length > 0
  }

  const spawn = (
    at: THREE.Vector3,
    element: string | undefined,
    style: BurstStyle = {},
  ): void => {
    if (host.pref() === "reduced") return
    const color = new THREE.Color(style.tint ?? elementColor(element))
    const size = style.size ?? 1
    const puffs = style.puffs ?? 6
    const base = at.clone()
    base.y += SHOT_TARGET_Y
    let flashShell: THREE.Mesh | null = null
    if (style.flash !== false) {
      flashShell = new THREE.Mesh(
        new THREE.SphereGeometry(PROJECTILE_RADIUS * 1.2 * size, 12, 10),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.55,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      )
      flashShell.position.copy(base)
      arenaGroup.add(flashShell)
    }
    const particles: BurstParticle[] = []
    for (let i = 0; i < puffs; i++) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(PROJECTILE_RADIUS * 0.4 * size, 8, 6),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.85,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      )
      mesh.position.copy(base)
      const vel = burstVelocity({
        index: i,
        puffs,
        ring: style.ring === true,
        j1: Math.random(),
        j2: Math.random(),
        j3: Math.random(),
        j4: Math.random(),
      })
      particles.push({
        mesh,
        vel: new THREE.Vector3(vel.vx, vel.vy, vel.vz),
        spin: vel.spin,
        swayPhase: Math.random() * Math.PI * 2,
      })
      arenaGroup.add(mesh)
    }
    const physics = burstPhysics(element)
    bursts.push({
      flash: flashShell,
      particles,
      elapsed: 0,
      life: style.life ?? 520,
      flashGrow: style.flashGrow ?? 2.4,
      gravity: style.gravity ?? physics.gravity,
      sway: style.sway ?? physics.sway,
    })
    loop.add(burstStep)
  }

  return {
    spawn,
    disposeAll() {
      for (const b of bursts) disposeBurst(b)
      bursts.length = 0
    },
  }
}
