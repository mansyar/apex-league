import type { PlaybackStep } from "@apex/sim"
import { generate } from "@apex/voxel"
import * as THREE from "three"
import { buildCreatureGroup } from "./creature"

/**
 * Creature staging for the broadcast arena: two living fighters on the
 * show floor. Positions persist between playback steps and glide smoothly
 * (a driver loop composes idle bob + stage chasing + transient actions),
 * so the fight reads as two creatures circling, closing, striking, and
 * retreating — not a sequence of poses snapping home. Pure presentation:
 * nothing here reads or writes GameState; the fight is already resolved.
 */

/**
 * Visual DNA seed shared with the ranch view: same creature, same look,
 * in the arena and on the ranch.
 */
export const visualSeedOf = (s: {
  hp: number
  atk: number
  def: number
  spd: number
}): number => (s.hp * 7 + s.atk * 13 + s.def * 17 + s.spd * 23) % 2 ** 31

/** How long one scripted action animates for, in ms (spar pacing is 900). */
const STEP_ANIM_MS = 600

/** Stage positions: the fighters start wide on the show floor's X axis. */
const HOME_X = 2.6

/** How close to the opponent's center the actor closes for a strike. */
const STRIKE_GAP = 1.15

/**
 * Show-floor bounds: fighters are clamped well inside the painted
 * boundary ring (8.3) and comfortably inside the broadcast framing, so
 * nobody leaves the arena or the camera's view. 2026-10-11 feedback:
 * creature movement must stay in-arena and on-camera.
 */
const BOUNDS_X = 3.2
const BOUNDS_Z = 1.8

/** Stage-glide rate, per second (higher = livelier chasing). */
const GLIDE = 7

/** Idle bob: the life a fighter shows at rest. */
const BOB_AMP = 0.045
const BOB_FREQ = 2.4

/**
 * Element hues from the shared type-color contract (product guidelines:
 * Fire 18°, Plant 110°, Water 205°, Electric 50°, Earth 28°, Wind 165°).
 * A projectile reads as its type at a glance, and the color survives
 * color-blindness checks when paired with the move icon in the HUD.
 */
const ELEMENT_HUE: Record<string, number> = {
  fire: 18,
  water: 205,
  plant: 110,
  electric: 50,
  earth: 28,
  wind: 165,
}
const ELEMENT_COLOR_FALLBACK = "#cfd6e4"

const elementColor = (element: string | undefined): string =>
  element === undefined
    ? ELEMENT_COLOR_FALLBACK
    : new THREE.Color()
        .setHSL(((ELEMENT_HUE[element] ?? 200) % 360) / 360, 0.75, 0.6)
        .getStyle()

/** One in-flight shot: a glowing core with an arced, lagging trail. */
const PROJECTILE_LIFE_MS = 700
const PROJECTILE_RADIUS = 0.22
const PROJECTILE_ARC = 0.55

/** Big-hit threshold: at/above this the punch lands as hit-stop + shake. */
const BIG_HIT_DAMAGE = 4

/** How long a victim's cells flash white, in ms. */
const FLASH_MS = 180

/** How long the frame freezes on a big hit, in ms (micro hit-stop). */
const HIT_STOP_MS = 90

interface Projectile {
  mesh: THREE.Mesh
  trail: THREE.Mesh[]
  from: THREE.Vector3
  to: THREE.Vector3
  start: number
}

/** Live shots, newest last; drained by the projectile frame loop in staging. */
const projectiles: Projectile[] = []

export interface FightCasting {
  /** Which creature stands on the left (home) side. */
  owned: { archetypeId: string; seed: number; name: string }
  /** Which creature stands on the right (away) side. */
  rival: { archetypeId: string; seed: number; name: string }
}

export interface Staging {
  /** Build and place both combatants facing each other. */
  cast(casting: FightCasting): void
  /** Drive one playback step: closes, strikes, recoils, dodges, falls. */
  applyStep(step: PlaybackStep, instant?: boolean): void
  /** Big-hit hook: main.ts points this at the broadcast camera shake. */
  setBigHitHandler(handler: (strength: number) => void): void
  /** 'reduced' suppresses bob, flash, and shake; combat stays legible. */
  setMotionPref(pref: "full" | "reduced"): void
  /** Remove the combatants (panel closed, back to idle ranch bowl). */
  clear(): void
}

interface Combatant {
  name: string
  group: THREE.Group
  home: THREE.Vector3
  /** Local "away" direction (X axis, ±1): where retreats and knockbacks go. */
  away: 1 | -1
  down: boolean
  /** Per-part base colors captured at cast time, keyed by part name. */
  baseColors: Map<THREE.Mesh, THREE.Color>
  /** Persistent show-floor position; the driver glides the mesh there. */
  stage: THREE.Vector3
  /** Smoothed current position (driver output, the glide state). */
  smooth: THREE.Vector3
  /** Transient action offset (lunge/flinch/hop), composed by the driver. */
  offset: THREE.Vector3
  /** Fall progress 0..1 for the down step; 0 = upright. */
  fall: number
  /** Per-fighter bob phase so the pair never breathes in lockstep. */
  phase: number
}

export function createStaging(arenaGroup: THREE.Group): Staging {
  let owned: Combatant | null = null
  let rival: Combatant | null = null
  let actionRaf: number | null = null
  let projectileRaf: number | null = null
  let flashRaf: number | null = null
  let driveRaf: number | null = null
  let lastDrive = 0
  /** Hit state: who is flashing and how far into it (ms since start). */
  let flash: { victim: Combatant; start: number } | null = null
  /** Freeze window on a big hit: action time does not advance inside it. */
  let hitStopUntil = 0
  /** Big-hit callback (camera punch); wired by main.ts to the scene shake. */
  let onBigHit: ((strength: number) => void) | null = null

  /** Visual intensity preference: 'full' shakes; 'reduced' keeps it calm. */
  let motionPref: "full" | "reduced" = "full"

  const easeOut = (t: number): number => 1 - (1 - t) * (1 - t)

  /** Wrap an angle delta into [-π, π) so yaw always takes the short way. */
  const shortestAngle = (a: number): number => {
    const turn = Math.PI * 2
    return ((((a + Math.PI) % turn) + turn) % turn) - Math.PI
  }

  // ── Living-fight driver ────────────────────────────────────────────────
  // One loop owns every fighter's pose every frame: glide to stage,
  // idle bob, face the rival, fall poses. Steps only change intents.
  const pair = (): Array<[Combatant, Combatant]> => {
    if (owned && rival)
      return [
        [owned, rival],
        [rival, owned],
      ]
    return []
  }

  const drive = (): void => {
    const now = performance.now()
    const dt = Math.min(0.1, (now - lastDrive) / 1000 || 1 / 60)
    lastDrive = now
    const bob = motionPref === "reduced" ? 0 : 1
    for (const [c, other] of pair()) {
      if (c.down) {
        // Topple onto the back, head away from the opponent, and stay.
        c.group.rotation.z = -c.away * (Math.PI / 2) * c.fall
        c.group.position.set(c.smooth.x, 0.28 * c.fall, c.smooth.z)
        continue
      }
      // Keep the stage target inside the show floor (knockbacks, retreats
      // and approach overshoot all funnel back into the painted ring).
      c.stage.x = Math.max(-BOUNDS_X, Math.min(BOUNDS_X, c.stage.x))
      c.stage.z = Math.max(-BOUNDS_Z, Math.min(BOUNDS_Z, c.stage.z))
      // Glide toward the stage target (exp smoothing, frame-rate safe).
      const k = 1 - Math.exp(-GLIDE * dt)
      c.smooth.lerp(c.stage, k)
      c.group.position.set(
        c.smooth.x + c.offset.x,
        c.smooth.y +
          c.offset.y +
          Math.sin(now * 0.001 * BOB_FREQ * 2 + c.phase) * BOB_AMP * bob,
        c.smooth.z + c.offset.z,
      )
      // Keep turning toward the rival (the rig fronts its local +Z).
      const dx = other.group.position.x - c.group.position.x
      const dz = other.group.position.z - c.group.position.z
      const desired = Math.atan2(dx, dz)
      c.group.rotation.y +=
        shortestAngle(desired - c.group.rotation.y) * (1 - Math.exp(-6 * dt))
    }
    driveRaf = requestAnimationFrame(drive)
  }

  /** Start (or restart) the driver; idempotent per cast. */
  const startDrive = (): void => {
    if (driveRaf !== null) cancelAnimationFrame(driveRaf)
    lastDrive = performance.now()
    driveRaf = requestAnimationFrame(drive)
  }

  const stop = (): void => {
    if (actionRaf !== null) {
      cancelAnimationFrame(actionRaf)
      actionRaf = null
    }
    if (projectileRaf !== null) {
      cancelAnimationFrame(projectileRaf)
      projectileRaf = null
    }
    if (flashRaf !== null) {
      cancelAnimationFrame(flashRaf)
      flashRaf = null
    }
    if (driveRaf !== null) {
      cancelAnimationFrame(driveRaf)
      driveRaf = null
    }
    disposeProjectiles()
    hitStopUntil = 0
  }

  // ── Hit fizz ───────────────────────────────────────────────────────────
  /**
   * Victim flash: push every Lambert color toward white for FLASH_MS,
   * then restore the cast-time palette. Per-mesh capture because a
   * creature is many materials, not one shared material.
   */
  const startFlash = (victim: Combatant): void => {
    if (motionPref === "reduced") return // calm reads: no brightness pop
    const now = performance.now()
    flash = { victim, start: now }
    // Snap to full white immediately; the decay loop unwinds it.
    for (const mesh of victim.baseColors.keys()) {
      const mat = mesh.material as THREE.MeshLambertMaterial
      mat.color.setRGB(1, 1, 1)
    }
    if (flashRaf === null) flashRaf = requestAnimationFrame(tickFlashL)
  }

  const tickFlashL = (): void => {
    tickFlash()
    flashRaf = flash ? requestAnimationFrame(tickFlashL) : null
  }

  /** Partway back from white by elapsed age (easeOut curve). */
  const tickFlash = (): void => {
    if (!flash) return
    const age = performance.now() - flash.start
    const w = 1 - easeOut(Math.min(1, age / FLASH_MS))
    for (const [mesh, base] of flash.victim.baseColors) {
      const mat = mesh.material as THREE.MeshLambertMaterial
      mat.color.setRGB(
        1 - w + base.r * w,
        1 - w + base.g * w,
        1 - w + base.b * w,
      )
    }
    if (age >= FLASH_MS) flash = null
  }

  /** Big-hit punch: freeze the frame briefly and shake the broadcast cam. */
  const bigHit = (damage: number | undefined): void => {
    const d = damage ?? 0
    if (d < BIG_HIT_DAMAGE) return
    hitStopUntil = performance.now() + HIT_STOP_MS
    if (motionPref === "full" && onBigHit)
      onBigHit(Math.min(0.09, 0.02 + d / 80))
  }

  // ── Projectiles ───────────────────────────────────────────────────────
  /** Release the pooled projectiles (scene swap, panel close). */
  const disposeProjectiles = (): void => {
    for (const p of projectiles) {
      arenaGroup.remove(p.mesh)
      p.mesh.geometry.dispose()
      ;(p.mesh.material as THREE.Material).dispose()
      for (const seg of p.trail) {
        arenaGroup.remove(seg)
        seg.geometry.dispose()
        ;(seg.material as THREE.Material).dispose()
      }
    }
    projectiles.length = 0
  }

  const stepProjectiles = (): void => {
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i]
      if (!p) continue
      const t = (performance.now() - p.start) / PROJECTILE_LIFE_MS
      const dir = p.to.clone().sub(p.from)
      const travel = Math.min(1, t)
      const pos = p.from.clone().addScaledVector(dir, travel)
      pos.y += Math.sin(travel * Math.PI) * PROJECTILE_ARC
      p.mesh.position.copy(pos)
      // Trail lags behind it along the same line, with the same arc lift.
      for (let s = 0; s < p.trail.length; s++) {
        const lag = Math.max(0, travel - (s + 1) * 0.09)
        const segPos = p.from.clone().addScaledVector(dir, lag)
        segPos.y += Math.sin(lag * Math.PI) * PROJECTILE_ARC
        p.trail[s]?.position.copy(segPos)
      }
      if (t >= 1) {
        // Impact punctures: vanish (the impact step supplies the reaction).
        arenaGroup.remove(p.mesh)
        for (const seg of p.trail) arenaGroup.remove(seg)
        p.mesh.geometry.dispose()
        ;(p.mesh.material as THREE.Material).dispose()
        for (const seg of p.trail) {
          seg.geometry.dispose()
          ;(seg.material as THREE.Material).dispose()
        }
        projectiles.splice(i, 1)
      }
    }
  }

  /** Drive shots each frame for as long as any are in flight. */
  const tickProjectiles = (): void => {
    stepProjectiles()
    projectileRaf =
      projectiles.length > 0 ? requestAnimationFrame(tickProjectiles) : null
  }

  /** A glowing core in the element hue plus a tapering additive orb trail. */
  const spawnProjectile = (
    from: Combatant,
    to: Combatant,
    element: string | undefined,
  ): void => {
    const color = new THREE.Color(elementColor(element))
    // Launch from the thrower's shoulder, land on the victim's chest.
    const origin = from.group.position.clone()
    origin.y += 0.8
    const target = to.group.position.clone()
    target.y += 0.6
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(PROJECTILE_RADIUS, 12, 10),
      new THREE.MeshBasicMaterial({ color }),
    )
    core.position.copy(origin)
    arenaGroup.add(core)

    const trail: THREE.Mesh[] = []
    for (let i = 0; i < 4; i++) {
      const seg = new THREE.Mesh(
        new THREE.SphereGeometry(PROJECTILE_RADIUS - (i + 1) * 0.033, 10, 8),
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
      start: performance.now(),
    })
    if (projectileRaf === null) {
      projectileRaf = requestAnimationFrame(tickProjectiles)
    }
  }

  // ── Step choreography ──────────────────────────────────────────────────
  /** Which combatant is the acting side of a step. */
  const spotOf = (
    actor: string,
    o: Combatant,
    r: Combatant,
  ): { actor: Combatant; target: Combatant } => {
    if (actor === "" || (o.name !== actor && r.name === actor)) {
      return { actor: r, target: o }
    }
    return { actor: o, target: r }
  }

  /** Knockback distance for a landed hit, scaled by how hard it landed. */
  const strikeReach = (damage: number | undefined): number => {
    const d = damage ?? 0
    return Math.min(0.9, Math.max(0.25, d / 8))
  }

  /** Jump a fighter's whole glide state straight to its stage. */
  const snapTo = (c: Combatant): void => {
    c.smooth.copy(c.stage)
    c.group.position.copy(c.stage)
    c.offset.set(0, 0, 0)
  }

  /**
   * Drive one step. Fighters hold their stage position between steps, so
   * the fight stays continuous — an approach that never got answered is
   * still standing there in the next beat.
   */
  const runStep = (
    step: PlaybackStep,
    instant: boolean,
    o: Combatant,
    r: Combatant,
  ): void => {
    if (actionRaf !== null) {
      cancelAnimationFrame(actionRaf)
      actionRaf = null
    }
    for (const c of [o, r]) c.offset.set(0, 0, 0)
    const side = spotOf(step.actor, o, r)

    switch (step.kind) {
      case "approach": {
        // The acting fighter closes to striking distance; the rival holds
        // ground (the glide does the walking).
        side.actor.stage.set(
          side.target.stage.x + side.actor.away * STRIKE_GAP,
          0,
          0,
        )
        if (instant) snapTo(side.actor)
        break
      }
      case "idle":
        // Hold the post; the driver keeps the breathing and facing alive.
        break
      case "melee": {
        // A real lunge: charge into contact on a sine, then recover. The
        // victim flinches backward off the contact through the tail.
        const contactX =
          side.target.stage.x + side.actor.away * (STRIKE_GAP - 0.35)
        const reach = -side.target.away * strikeReach(step.damage)
        if (instant) break
        actionRaf = startAction(
          (t, ao, at) => {
            ao.offset.x = (contactX - ao.stage.x) * Math.sin(t * Math.PI)
            if (t > 0.45) {
              const w = (t - 0.45) / 0.55
              at.offset.x = reach * Math.sin(w * Math.PI)
            }
          },
          o,
          r,
        )
        break
      }
      case "projectile": {
        // Anchor and wind: a small counter-recoil as the shot leaves.
        const recoil = side.actor.away * 0.35
        if (!instant) {
          spawnProjectile(side.actor, side.target, step.element)
          actionRaf = startAction(
            (t, ao) => {
              ao.offset.x = recoil * Math.sin(t * Math.PI)
            },
            o,
            r,
          )
        }
        break
      }
      case "impact": {
        if (!step.hit) {
          // A standing miss costs nothing; a dodge retreats off the lane
          // (a real creature gets out of the way, backward, and settles).
          if (step.missReason === "dodge") {
            side.target.stage.x += side.target.away * 0.9
            if (instant) snapTo(side.target)
          }
          break
        }
        // Solid hit: the knockback persists in the victim's stage, so the
        // next beat starts from the pushed-back position.
        side.target.stage.x += side.target.away * strikeReach(step.damage)
        if (!instant) {
          startFlash(side.target)
          bigHit(step.damage)
        } else {
          snapTo(side.target)
        }
        break
      }
      case "down": {
        // Fall on the back and stay down — the driver renders `fall`.
        side.actor.down = true
        if (instant) {
          side.actor.fall = 1
          snapTo(side.actor)
        } else {
          actionRaf = startAction(
            (t, ao) => {
              ao.fall = easeOut(t)
            },
            o,
            r,
          )
        }
        break
      }
      case "judge": {
        // Result stamp: the standing winner takes a small double hop. On a
        // draw both are already down and the pose stays as it fell.
        const standing = [o, r].filter((c) => !c.down)
        if (instant || standing.length === 0) break
        actionRaf = startAction(
          (t, ao, at) => {
            if (!ao.down) {
              ao.offset.y = Math.abs(Math.sin(t * Math.PI * 2)) * 0.35
            } else if (!at.down) {
              at.offset.y = Math.abs(Math.sin(t * Math.PI * 2)) * 0.35
            }
          },
          o,
          r,
        )
        break
      }
    }
  }

  /** One scripted action on staging's own clock (hit-stop aware). */
  const startAction = (
    run: (t: number, o: Combatant, r: Combatant) => void,
    o: Combatant,
    r: Combatant,
  ): number => {
    const start = performance.now()
    let raf: number | null = null
    const tick = (): void => {
      // Micro hit-stop: while the freeze window is open, action time
      // holds still (the window itself keeps draining on wall time).
      if (performance.now() < hitStopUntil) {
        raf = requestAnimationFrame(tick)
        return
      }
      const t = Math.min(1, (performance.now() - start) / STEP_ANIM_MS)
      run(t, o, r)
      if (t < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        raf = null
        actionRaf = null
      }
    }
    raf = requestAnimationFrame(tick)
    // The tick writes back into the outer slot via mutation on complete;
    // return the first frame id so cancel has something to cancel.
    return raf
  }

  return {
    cast(casting) {
      stop()
      // Drop the previous cast before building the new one.
      const disposeOld = (c: Combatant | null): void => {
        if (!c) return
        c.group.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry.dispose()
            const mat = obj.material
            if (Array.isArray(mat)) for (const m of mat) m.dispose()
            else mat.dispose()
          }
        })
        arenaGroup.remove(c.group)
      }
      disposeOld(owned)
      disposeOld(rival)
      owned = null
      rival = null

      const buildSpot = (
        info: FightCasting["owned"],
        away: 1 | -1,
      ): Combatant => {
        const { dna, build, def } = generate(info.archetypeId, info.seed)
        const group = buildCreatureGroup(dna, build, def.grid)
        group.traverse((obj) => {
          if (obj instanceof THREE.Mesh) obj.castShadow = true
        })
        const combatant: Combatant = {
          name: info.name,
          group,
          home: new THREE.Vector3(HOME_X * away, 0, 0),
          away,
          down: false,
          baseColors: new Map(),
          stage: new THREE.Vector3(HOME_X * away, 0, 0),
          smooth: new THREE.Vector3(HOME_X * away, 0, 0),
          offset: new THREE.Vector3(),
          fall: 0,
          phase: Math.random() * Math.PI * 2,
        }
        group.position.copy(combatant.stage)
        // The rig fronts its local +Z, so the left fighter turns +90° to
        // look down +X — the driver keeps the yaw continuously correct
        // from here; this initial copy just avoids a first-frame spin.
        const initialYaw = away === 1 ? -Math.PI / 2 : Math.PI / 2
        group.rotation.set(0, initialYaw, 0)
        arenaGroup.add(group)
        // Capture the cast-time palette per part so a hit flash returns
        // it to base later.
        group.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            const mat = obj.material as THREE.MeshLambertMaterial
            combatant.baseColors.set(obj, mat.color.clone())
          }
        })
        return combatant
      }

      owned = buildSpot(casting.owned, -1)
      rival = buildSpot(casting.rival, 1)
      flash = null
      startDrive()
    },
    applyStep(step, instant = false) {
      const o = owned
      const r = rival
      if (!o || !r) return
      runStep(step, instant, o, r)
    },
    setBigHitHandler(handler) {
      onBigHit = handler
    },
    setMotionPref(pref) {
      motionPref = pref
    },
    clear() {
      stop()
      for (const c of [owned, rival]) {
        if (!c) continue
        c.group.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry.dispose()
            const mat = obj.material
            if (Array.isArray(mat)) for (const m of mat) m.dispose()
            else mat.dispose()
          }
        })
        arenaGroup.remove(c.group)
      }
      owned = null
      rival = null
      flash = null
      hitStopUntil = 0
    },
  }
}
