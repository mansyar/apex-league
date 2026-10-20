/**
 * Battle effect machinery (pure presentation): the subsystems built on
 * top of the shared effect loop - flash, projectiles, bursts, charge
 * orb - plus the spawn/dispose surface staging drives.
 *
 * The pure core lives in `fx/` (loop, data registry, math, shot
 * geometry) and so does every effect family (`flash`, `decal`,
 * `projectiles`, `bursts`, `charge`); this file is the wiring that
 * composes those pieces over the arena group and verifies visually
 * (pure rendering, per the workflow's TDD scope).
 */
import type * as THREE from "three"
import { createBurstLayer } from "./fx/bursts"
import { createChargeOrb } from "./fx/charge"
import { createDecalLayer } from "./fx/decal"
import { createFlashLayer, type FlashVictim } from "./fx/flash"
import { EffectLoop, HitStop } from "./fx/loop"
import { createProjectileLayer } from "./fx/projectiles"
import type { BurstStyle } from "./move-fx"
import { disposeObject3D } from "./scene-utils"

export type { FlashVictim } from "./fx/flash"
// The loop core's public seam is preserved through this module.
export { BIG_HIT_DAMAGE, EffectLoop, HIT_STOP_MS, HitStop } from "./fx/loop"

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

  /** Free a shot's meshes - cores may be Groups (fire/plant flavors). */
  const killMesh = (mesh: THREE.Object3D): void => {
    disposeObject3D(mesh)
    arenaGroup.remove(mesh)
  }

  const projectiles = createProjectileLayer({ arenaGroup, loop, killMesh })
  const bursts = createBurstLayer({
    arenaGroup,
    loop,
    pref: host.pref,
    killMesh,
  })
  const charge = createChargeOrb({ arenaGroup, pref: host.pref, killMesh })

  return {
    hitStop,
    setPaused(paused: boolean) {
      if (paused) loop.pause()
      else loop.resume()
    },
    startFlash(victim: FlashVictim) {
      flashLayer.start(victim)
    },
    spawnProjectile: projectiles.spawn,
    spawnBurst: bursts.spawn,
    spawnDecal(
      at: THREE.Vector3,
      element: string | undefined,
      strength: number,
    ) {
      decalLayer.spawn(at, element, strength)
    },
    setCharge: charge.set,
    clearCharge: charge.clear,
    firstProjectilePosition() {
      return projectiles.firstPosition()
    },
    disposeAllDecals() {
      decalLayer.disposeAll()
    },
    disposeAll() {
      loop.stop()
      projectiles.disposeAll()
      bursts.disposeAll()
      decalLayer.disposeAll()
      charge.clear()
      flashLayer.clear()
      hitStop.reset()
    },
  }
}
