/**
 * Battle effect machinery (pure presentation): the subsystems built on
 * top of the shared effect loop - flash, projectiles, bursts, charge
 * orb - plus the spawn/dispose surface staging drives.
 *
 * The pure core lives in `fx/` (loop, data registry, math, shot
 * geometry); this file is the wiring that composes those pieces over the
 * arena group and verifies visually (pure rendering, per the workflow's
 * TDD scope).
 */
import * as THREE from "three"
import { createDecalLayer } from "./fx/decal"
import { createFlashLayer, type FlashVictim } from "./fx/flash"
import {
  burstPhysics,
  PROJECTILE_RADIUS,
  SHOT_ORIGIN_Y,
  SHOT_TARGET_Y,
} from "./fx/fx-data"
import {
  burstVelocity,
  fadeOver,
  pulseScale,
  shotArc,
  swayDrift,
  trailLag,
  wobbleZ,
} from "./fx/fx-math"
import { EffectLoop, HitStop } from "./fx/loop"
import { buildShotCore, buildTrail } from "./fx/shot-geometry"
import {
  type BurstStyle,
  elementColor,
  lookFor,
  PROJECTILE_LIFE_MS,
  type ShotLook,
} from "./move-fx"
import { disposeObject3D } from "./scene-utils"

export type { FlashVictim } from "./fx/flash"
// The loop core's public seam is preserved through this module.
export { BIG_HIT_DAMAGE, EffectLoop, HIT_STOP_MS, HitStop } from "./fx/loop"

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

/** Everything the presentation layer needs from the effect machinery. */
export interface BattleEffects {
  /** Shared hit-stop clock (also drives the action clock and drive loop). */
  hitStop: HitStop
  /**
   * Suspend/resume the shared effect loop for a hidden tab (F5). Effects in
   * flight are held mid-play and continue on return.
   */
  setPaused(paused: boolean): void
  /** Spawn the victim's white-out flash. */
  startFlash(victim: FlashVictim): void
  /** Launch a shot from the thrower's mouth line at the victim's chest. */
  spawnProjectile(
    from: { group: THREE.Group },
    to: { group: THREE.Group },
    element: string | undefined,
    opts?: { size?: number; life?: number; spread?: number },
  ): void
  /** An elemental pop where a blow connects or a shot lands. */
  spawnBurst(
    at: THREE.Vector3,
    element: string | undefined,
    style?: BurstStyle,
  ): void
  /** Burn a floor mark under a landed blow; strength scales the mark. */
  spawnDecal(
    at: THREE.Vector3,
    element: string | undefined,
    strength: number,
  ): void
  /** Grow (or create) the tier-4 charge orb at the caster's mouth line. */
  setCharge(
    who: { group: THREE.Group },
    element: string | undefined,
    scale: number,
  ): void
  /** Release (and free) the charge orb. */
  clearCharge(): void
  /** Position of the oldest shot in flight, for camera-director framing. */
  firstProjectilePosition(): THREE.Vector3 | null
  /** Strip every decal (panel teardown). */
  disposeAllDecals(): void
  /** Free everything (between-fight stop and full clear are both safe). */
  disposeAll(): void
}

/**
 * Build the battle effect subsystems over one shared effect loop. The
 * staging driver keeps owning choreography; it calls the spawn/dispose
 * surface below and reads `hitStop` for its action clock.
 */
export function createBattleEffects(host: {
  arenaGroup: THREE.Group
  /** Motion preference provider (reduced keeps visuals calm). */
  pref: () => "full" | "reduced"
  /** Broadcast camera punch sink, wired by staging.setBigHitHandler. */
  onBigHit: { current: ((strength: number) => void) | null }
}): BattleEffects {
  const { arenaGroup } = host
  const hitStop = new HitStop()
  const loop = new EffectLoop(() => hitStop.active())
  const flashLayer = createFlashLayer({ loop, pref: host.pref })
  const decalLayer = createDecalLayer({ arenaGroup, loop, pref: host.pref })

  const projectiles: Projectile[] = []
  const bursts: Burst[] = []

  // Scratch vectors hoisted out of the frame loop - the quality gate
  // forbids per-frame allocations while the fight is live.
  const shotDir = new THREE.Vector3()
  const shotPos = new THREE.Vector3()
  const segPos = new THREE.Vector3()

  /** Free a shot's meshes - cores may be Groups (fire/plant flavors). */
  const killShotMesh = (mesh: THREE.Object3D): void => {
    disposeObject3D(mesh)
    arenaGroup.remove(mesh)
  }

  /** Free the shot's core + trail meshes and drop it from the pool. */
  const retireShot = (p: Projectile, index: number): void => {
    killShotMesh(p.mesh)
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

  const disposeBurst = (burst: Burst): void => {
    if (burst.flash) {
      killShotMesh(burst.flash)
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

  /** A glowing core in the element hue plus a tapering additive orb trail. */
  const spawnProjectile = (
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

  const spawnBurst = (
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

  /** The tier-4 Lance's charging orb, swelling at the thrower's mouth. */
  let chargeMesh: THREE.Mesh | null = null

  const setCharge = (
    who: { group: THREE.Group },
    element: string | undefined,
    scale: number,
  ): void => {
    if (host.pref() === "reduced") return
    if (!chargeMesh) {
      chargeMesh = new THREE.Mesh(
        new THREE.SphereGeometry(PROJECTILE_RADIUS * 1.1, 12, 10),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(elementColor(element)),
          transparent: true,
          opacity: 0.75,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      )
      const at = who.group.position
      chargeMesh.position.set(at.x, at.y + SHOT_ORIGIN_Y, at.z)
      arenaGroup.add(chargeMesh)
    }
    // The caster may drift while charging - keep the orb on the mouth line.
    const at = who.group.position
    chargeMesh.position.set(at.x, at.y + SHOT_ORIGIN_Y, at.z)
    chargeMesh.scale.setScalar(scale)
  }

  const clearCharge = (): void => {
    if (!chargeMesh) return
    killShotMesh(chargeMesh)
    chargeMesh = null
  }

  const disposeAll = (): void => {
    loop.stop()
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i]
      if (p) retireShot(p, i)
    }
    for (const b of bursts) disposeBurst(b)
    bursts.length = 0
    decalLayer.disposeAll()
    clearCharge()
    flashLayer.clear()
    hitStop.reset()
  }

  return {
    hitStop,
    setPaused(paused: boolean) {
      if (paused) loop.pause()
      else loop.resume()
    },
    startFlash(victim: FlashVictim) {
      flashLayer.start(victim)
    },
    spawnProjectile,
    spawnBurst,
    spawnDecal(
      at: THREE.Vector3,
      element: string | undefined,
      strength: number,
    ) {
      decalLayer.spawn(at, element, strength)
    },
    setCharge,
    clearCharge,
    firstProjectilePosition() {
      return projectiles[0]?.mesh.position ?? null
    },
    disposeAllDecals() {
      decalLayer.disposeAll()
    },
    disposeAll,
  }
}
