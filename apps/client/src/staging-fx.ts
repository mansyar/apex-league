/**
 * Battle effect machinery (pure presentation): the consolidated effect
 * loop and the hit-stop clock shared by every visual subsystem of the
 * fight - flash, projectiles, bursts, decals, charge orb.
 *
 * The loop core (HitStop + EffectLoop) is deterministic and test-covered
 * with a fake clock; the mesh subsystems built on top are verified
 * visually (pure rendering, per the workflow's TDD scope).
 */
import * as THREE from "three"
import { easeOut } from "./anim"
import {
  type BurstStyle,
  elementColor,
  lookFor,
  PROJECTILE_ARC,
  PROJECTILE_LIFE_MS,
  type ShotLook,
} from "./move-fx"
import { disposeObject3D, lambertMaterialOf } from "./scene-utils"

/** Big-hit threshold: at/above this the punch lands as hit-stop + shake. */
export const BIG_HIT_DAMAGE = 4

/** How long the frame freezes on a big hit, in ms (micro hit-stop). */
export const HIT_STOP_MS = 90

/**
 * The micro hit-stop clock: on a big hit the whole frame (every effect
 * AND the fight's action time) holds still for a beat. The window itself
 * drains on wall time, so `active` is a pure time comparison.
 */
export class HitStop {
  private until = 0

  constructor(private readonly now: () => number = () => performance.now()) {}

  /**
   * Open the freeze window when `damage` reaches the threshold. Returns
   * whether it fired; `onBigHit` (the broadcast camera punch) is called
   * with a strength scaled by the damage and capped at 0.09.
   */
  trigger(
    damage: number | undefined,
    onBigHit?: (strength: number) => void,
  ): boolean {
    const d = damage ?? 0
    if (d < BIG_HIT_DAMAGE) return false
    this.until = this.now() + HIT_STOP_MS
    onBigHit?.(Math.min(0.09, 0.02 + d / 80))
    return true
  }

  /** True while the freeze window is open (the frame holds). */
  active(): boolean {
    return this.now() < this.until
  }

  /** Close any open window (clear, panel close). */
  reset(): void {
    this.until = 0
  }
}

/**
 * One loop for every effect subsystem: a single RAF drives each
 * registered step with the frame delta (frozen to 0 during a hit-stop),
 * and the loop stops itself the moment all steps report idle.
 *
 * A step returns `true` while it has live work and `false` when it is
 * done (the loop unregisters it). Adding the first step starts the loop;
 * late joiners share the running loop's clock, so a shot fired mid-volley
 * gets a normal frame delta instead of a stale re-anchor.
 */
export class EffectLoop {
  private steps = new Set<(dtMs: number) => boolean>()
  private raf: number | null = null
  private last = 0
  /** Suspended for a hidden tab: steps stay registered, no frame is pending. */
  private paused = false
  /**
   * Snapshot buffer for the frame walk. Reused every frame - the quality
   * gate forbids per-frame allocations - because a step that spawns
   * another effect must not be visited in the same frame.
   */
  private readonly snapshot: Array<(dtMs: number) => boolean> = []

  constructor(
    /** True while a hit-stop is holding the frame (dt becomes 0). */
    private readonly isFrozen: () => boolean = () => false,
    private readonly now: () => number = () => performance.now(),
    // Wrapped, never passed by reference: `requestAnimationFrame` throws
    // "Illegal invocation" when invoked with a foreign receiver.
    private readonly schedule: (cb: (t: number) => void) => number = (cb) =>
      requestAnimationFrame(cb),
    private readonly cancel: (id: number) => void = (id) =>
      cancelAnimationFrame(id),
  ) {}

  /** Register a step; starts the loop if it is not running. */
  add(step: (dtMs: number) => boolean): void {
    this.steps.add(step)
    if (this.raf === null && !this.paused) {
      this.last = this.now()
      this.raf = this.schedule(this.tick)
    }
  }

  /**
   * Cancel the pending frame and drop every registered step (panel close
   * / scene swap). Clearing matters: a step left behind would run again
   * the next time something restarts the loop.
   */
  stop(): void {
    if (this.raf !== null) this.cancel(this.raf)
    this.raf = null
    this.last = 0
    this.paused = false
    this.steps.clear()
  }

  /**
   * Suspend for a hidden tab (F5). The pending frame is cancelled but the
   * steps stay registered, so an in-flight effect is held mid-play rather
   * than finished off-screen or lost.
   */
  pause(): void {
    if (this.paused) return
    this.paused = true
    if (this.raf !== null) this.cancel(this.raf)
    this.raf = null
  }

  /**
   * Resume after `pause`. The clock is re-anchored here, so the first frame
   * back is one normal delta instead of the whole hidden span — the jump
   * that would otherwise snap an effect to its end state.
   */
  resume(): void {
    if (!this.paused) return
    this.paused = false
    if (this.steps.size === 0) return
    this.last = this.now()
    this.raf = this.schedule(this.tick)
  }

  private readonly tick = (): void => {
    const now = this.now()
    // Hit-stop holds every effect: dt collapses to 0, but `last` still
    // advances so the unfreeze frame is one normal delta, not the whole
    // frozen span.
    const dt = this.isFrozen() ? 0 : Math.min(100, now - this.last || 16.7)
    this.last = now
    const snapshot = this.snapshot
    snapshot.length = 0
    for (const step of this.steps) snapshot.push(step)
    for (const step of snapshot) {
      if (!step(dt)) this.steps.delete(step)
    }
    this.raf = this.steps.size > 0 ? this.schedule(this.tick) : null
  }
}

// ---------------------------------------------------------------------------
// Effect subsystems
// ---------------------------------------------------------------------------

/** Structural view of a fighter for the flash subsystem (staging's Combatant satisfies it). */
export interface FlashVictim {
  baseColors: Map<THREE.Mesh, THREE.Color>
}

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

interface Decal {
  mesh: THREE.Mesh
  /** Accumulated age (ms), frozen during a hit-stop. */
  elapsed: number
  life: number
}

const PROJECTILE_RADIUS = 0.22

/** How long a victim's cells flash white, in ms. */
const FLASH_MS = 180

/**
 * Element-flavored fragment physics (FR7): fire embers are buoyant and
 * rise while flickering, water droplets fall heavy and fast, plant motes
 * float on a sideways drift. Anything else keeps the neutral scatter.
 */
const ELEMENT_BURST: Record<string, { gravity: number; sway: number }> = {
  fire: { gravity: -2.2, sway: 0.5 },
  water: { gravity: 10, sway: 0 },
  plant: { gravity: 1.8, sway: 1.0 },
}

const DECAL_MAX = 6
const DECAL_LIFE_MS = 1800

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

  /** Put a victim's palette back exactly as captured at cast time. */
  const restoreVictim = (victim: FlashVictim): void => {
    for (const [mesh, base] of victim.baseColors) {
      lambertMaterialOf(mesh)?.color.copy(base)
    }
  }

  /** Hit state: who is flashing and how far into it (accumulated ms). */
  let flash: { victim: FlashVictim; age: number } | null = null

  /** Partway back from white by accumulated age; returns false when done. */
  const flashStep = (dt: number): boolean => {
    if (!flash) return false
    // dt is already frozen to 0 during a hit-stop - the whole frame holds.
    flash.age += dt
    const w = 1 - easeOut(Math.min(1, flash.age / FLASH_MS))
    for (const [mesh, base] of flash.victim.baseColors) {
      const mat = lambertMaterialOf(mesh)
      if (!mat) continue
      mat.color.setRGB(
        1 - w + base.r * w,
        1 - w + base.g * w,
        1 - w + base.b * w,
      )
    }
    if (flash.age >= FLASH_MS) {
      restoreVictim(flash.victim)
      flash = null
    }
    return flash !== null
  }

  const startFlash = (victim: FlashVictim): void => {
    if (host.pref() === "reduced") return // calm reads: no brightness pop
    // Restore the outgoing victim first - replacing the slot mid-decay
    // would otherwise strand them partially white until clear().
    if (flash) restoreVictim(flash.victim)
    flash = { victim, age: 0 }
    // Snap to full white immediately; the decay loop unwinds it.
    for (const mesh of victim.baseColors.keys()) {
      lambertMaterialOf(mesh)?.color.setRGB(1, 1, 1)
    }
    loop.add(flashStep)
  }

  const projectiles: Projectile[] = []
  const bursts: Burst[] = []
  const decals: Decal[] = []

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
      shotPos.y +=
        Math.sin(travel * Math.PI) * PROJECTILE_ARC * (p.look.arc ?? 1)
      if (p.look.wobble !== undefined && p.look.wobble > 0) {
        // Water streams with a slight side-to-side ripple across the lane.
        shotPos.z += Math.sin(p.elapsed * 0.02) * p.look.wobble
      }
      p.mesh.position.copy(shotPos)
      if (p.look.spin !== undefined && p.look.spin > 0) {
        // Seeds tumble; embers corkscrew around the travel axis.
        p.mesh.rotation.z += p.look.spin * dtMs
        p.mesh.rotation.x += p.look.spin * 0.6 * dtMs
      }
      if (p.look.pulse !== undefined && p.look.pulse > 0) {
        const s = 1 + p.look.pulse * Math.sin(p.elapsed * 0.045)
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
        const lag = Math.max(0, travel - (s + 1) * 0.09)
        segPos.copy(p.from).addScaledVector(shotDir, lag)
        segPos.y += Math.sin(lag * Math.PI) * PROJECTILE_ARC * (p.look.arc ?? 1)
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
        flashMat.opacity = 0.55 * (1 - k)
      }
      for (const part of burst.particles) {
        part.vel.y -= burst.gravity * dt
        part.mesh.position.addScaledVector(part.vel, dt)
        if (burst.sway > 0) {
          part.mesh.position.x +=
            Math.sin(burst.elapsed * 0.004 + part.swayPhase) * burst.sway * dt
        }
        part.mesh.rotation.x += part.spin * dtMs
        part.mesh.rotation.y += part.spin * 0.7 * dtMs
        part.mesh.scale.setScalar(Math.max(0.05, 1 - k))
        ;(part.mesh.material as THREE.MeshBasicMaterial).opacity =
          0.85 * (1 - k)
      }
      if (k >= 1) {
        disposeBurst(burst)
        bursts.splice(i, 1)
      }
    }
    return bursts.length > 0
  }

  const disposeDecal = (decal: Decal): void => {
    arenaGroup.remove(decal.mesh)
    decal.mesh.geometry.dispose()
    ;(decal.mesh.material as THREE.Material).dispose()
  }

  /** Advance every decal: quick pop-in, long fade. */
  const decalStep = (dtMs: number): boolean => {
    for (let i = decals.length - 1; i >= 0; i--) {
      const decal = decals[i]
      if (!decal) continue
      decal.elapsed += dtMs
      const k = Math.min(1, decal.elapsed / decal.life)
      decal.mesh.scale.setScalar(easeOut(Math.min(1, k * 5)))
      ;(decal.mesh.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - k)
      if (k >= 1) {
        disposeDecal(decal)
        decals.splice(i, 1)
      }
    }
    return decals.length > 0
  }

  const disposeAllDecals = (): void => {
    for (const decal of decals) disposeDecal(decal)
    decals.length = 0
  }

  /** The tier-4 Lance's charging orb, swelling at the thrower's mouth. */
  let chargeMesh: THREE.Mesh | null = null

  /** Build the shot's core meshes from its look descriptor (FR5). */
  const buildShotCore = (
    look: ShotLook,
    color: THREE.Color,
    size: number,
  ): THREE.Object3D => {
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
      const geo = new THREE.OctahedronGeometry(
        PROJECTILE_RADIUS * 0.55 * size,
        0,
      )
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
    origin.y += 0.8
    const target = to.group.position.clone()
    target.y += 0.6
    if (opts?.spread) target.z += opts.spread
    // Core built from the look descriptor (FR5): ember + halo, seed
    // cluster, teardrop, or the neutral orb.
    const core = buildShotCore(look, color, size)
    core.position.copy(origin)
    arenaGroup.add(core)

    // Trail segments stream behind the shot in its element's family.
    const trail: THREE.Mesh[] = []
    for (let i = 0; i < 4; i++) {
      const r = Math.max(0.05, PROJECTILE_RADIUS * size - (i + 1) * 0.033)
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
          opacity: 0.55 - i * 0.1,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      )
      seg.position.copy(origin)
      arenaGroup.add(seg)
      trail.push(seg)
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
    base.y += 0.6
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
      const angle = (i / puffs) * Math.PI * 2 + Math.random() * 0.8
      const speed = (style.ring ? 1.1 : 1.4) + Math.random() * 1.2
      particles.push({
        mesh,
        vel: new THREE.Vector3(
          Math.cos(angle) * speed,
          style.ring ? 0.15 + Math.random() * 0.25 : 0.9 + Math.random() * 1.1,
          Math.sin(angle) * speed * (style.ring ? 1 : 0.6),
        ),
        spin: (Math.random() - 0.5) * 0.02,
        swayPhase: Math.random() * Math.PI * 2,
      })
      arenaGroup.add(mesh)
    }
    bursts.push({
      flash: flashShell,
      particles,
      elapsed: 0,
      life: style.life ?? 520,
      flashGrow: style.flashGrow ?? 2.4,
      gravity: style.gravity ?? ELEMENT_BURST[element ?? ""]?.gravity ?? 7,
      sway: style.sway ?? ELEMENT_BURST[element ?? ""]?.sway ?? 0,
    })
    loop.add(burstStep)
  }

  const spawnDecal = (
    at: THREE.Vector3,
    element: string | undefined,
    strength: number,
  ): void => {
    if (host.pref() === "reduced") return
    if (decals.length >= DECAL_MAX) {
      const oldest = decals.shift()
      if (oldest) disposeDecal(oldest)
    }
    const color = new THREE.Color(elementColor(element)).multiplyScalar(0.22)
    const mesh = new THREE.Mesh(
      new THREE.CircleGeometry(Math.min(0.55, 0.22 + strength * 0.02), 14),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    )
    mesh.rotation.x = -Math.PI / 2
    // A touch above the floor, stacked per decal, so marks never z-fight.
    mesh.position.set(at.x, 0.026 + decals.length * 0.004, at.z)
    mesh.scale.setScalar(0.2)
    arenaGroup.add(mesh)
    decals.push({ mesh, elapsed: 0, life: DECAL_LIFE_MS })
    loop.add(decalStep)
  }

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
      chargeMesh.position.set(at.x, at.y + 0.8, at.z)
      arenaGroup.add(chargeMesh)
    }
    // The caster may drift while charging - keep the orb on the mouth line.
    const at = who.group.position
    chargeMesh.position.set(at.x, at.y + 0.8, at.z)
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
    disposeAllDecals()
    clearCharge()
    flash = null
    hitStop.reset()
  }

  return {
    hitStop,
    setPaused(paused: boolean) {
      if (paused) loop.pause()
      else loop.resume()
    },
    startFlash,
    spawnProjectile,
    spawnBurst,
    spawnDecal,
    setCharge,
    clearCharge,
    firstProjectilePosition() {
      return projectiles[0]?.mesh.position ?? null
    },
    disposeAllDecals,
    disposeAll,
  }
}
