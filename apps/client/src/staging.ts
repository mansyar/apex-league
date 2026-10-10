import type { PlaybackStep } from "@apex/sim"
import { generate } from "@apex/voxel"
import * as THREE from "three"
import { buildCreatureGroup } from "./creature"

/**
 * Creature staging for the broadcast arena (spec FR): both combatants
 * stand on opposing sides and answer the playback script — approach runs,
 * melee lunges, projectile recoil, impact recoil/dodges, and the fall.
 * Pure presentation: nothing here reads or writes GameState; the fight is
 * already resolved and the events only drive posture.
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

/** How long one scripted step animates for, in ms (spar pacing is 900). */
const STEP_ANIM_MS = 600

/** Stage positions: the fighters start wide on the show floor's X axis. */
const HOME_X = 2.6

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

/** One in-flight shot: a small core with a tapered additive trail. */
const PROJECTILE_LIFE_MS = 450

interface Projectile {
  mesh: THREE.Mesh
  trail: THREE.Mesh[]
  from: THREE.Vector3
  to: THREE.Vector3
  start: number
}

/** Live shots, newest last; drained by the projectile frame loop in staging. */

/** Big-hit threshold: at/above this the punch lands as hit-stop + shake. */
const BIG_HIT_DAMAGE = 4

/** How long a victim's cells flash white, in ms. */
const FLASH_MS = 180

/** How long the frame freezes on a big hit, in ms (micro hit-stop). */
const HIT_STOP_MS = 90

export interface FightCasting {
  /** Which creature stands on the left (home) side. */
  owned: { archetypeId: string; seed: number; name: string }
  /** Which creature stands on the right (away) side. */
  rival: { archetypeId: string; seed: number; name: string }
}

export interface Staging {
  /** Build and place both combatants facing each other. */
  cast(casting: FightCasting): void
  /** Drive one playback step: positions, lunges, recoil, dodges, falls. */
  applyStep(step: PlaybackStep, instant?: boolean): void
  /** Big-hit hook: main.ts points this at the broadcast camera shake. */ setBigHitHandler(
    handler: (strength: number) => void,
  ): void
  /** 'reduced' suppresses camera shake (flashes stay off with it). */
  setMotionPref(pref: "full" | "reduced"): void
  /** Remove the combatants (panel closed, back to idle ranch bowl). */
  clear(): void
}

interface Combatant {
  name: string
  group: THREE.Group
  home: THREE.Vector3
  /** Local "away" direction (X axis, ±1): where lunges and dodges aim. */
  away: 1 | -1
  down: boolean
  /** Per-part base colors captured at cast time, keyed by part name. */
  baseColors: Map<THREE.Mesh, THREE.Color>
}

export function createStaging(arenaGroup: THREE.Group): Staging {
  let owned: Combatant | null = null
  let rival: Combatant | null = null
  let raf: number | null = null
  let projectileRaf: number | null = null
  const projectiles: Projectile[] = []
  let anim: {
    start: number
    run: (t: number, o: Combatant, r: Combatant) => void
  } | null = null
  /** Hit state: who is flashing and how far into it (ms since start). */
  let flash: { victim: Combatant; start: number } | null = null
  /** Freeze window on a big hit: pose time does not advance inside it. */
  let hitStopUntil = 0
  /** Big-hit callback (camera punch); wired by main.ts to the scene shake. */
  let onBigHit: ((strength: number) => void) | null = null

  const stop = (): void => {
    if (raf !== null) {
      cancelAnimationFrame(raf)
      raf = null
    }
    if (projectileRaf !== null) {
      cancelAnimationFrame(projectileRaf)
      projectileRaf = null
    }
    if (flashRaf !== null) {
      cancelAnimationFrame(flashRaf)
      flashRaf = null
    }
    disposeProjectiles()
    hitStopUntil = 0
  }

  /** Visual intensity preference: 'full' shakes; 'reduced' keeps it calm. */
  let motionPref: "full" | "reduced" = "full"

  const easeOut = (t: number): number => 1 - (1 - t) * (1 - t)

  /**
   * Victim flash: push every Lambert color toward white for FLASH_MS,
   * then restore the cast-time palette. Plural material/part per creature,
   * so the capture lives on the Combatant, not a single shared material.
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

  let flashRaf: number | null = null
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
      // Core flies, trail lags behind it along the same line.
      p.mesh.position.copy(p.from).addScaledVector(dir, travel)
      for (let s = 0; s < p.trail.length; s++) {
        const lag = Math.max(0, travel - (s + 1) * 0.08)
        p.trail[s]?.position.copy(p.from).addScaledVector(dir, lag)
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
    // Launch from the thrower's shoulder line, land on the victim's chest.
    const origin = new THREE.Vector3(from.home.x, 0.8, from.home.z)
    const target = new THREE.Vector3(to.home.x, 0.8, to.home.z)
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 10, 8),
      new THREE.MeshBasicMaterial({ color }),
    )
    core.position.copy(origin)
    arenaGroup.add(core)

    const trail: THREE.Mesh[] = []
    for (let i = 0; i < 4; i++) {
      const seg = new THREE.Mesh(
        new THREE.SphereGeometry(0.09 - i * 0.015, 8, 6),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.4 - i * 0.08,
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

  /** X distance for one step's motion, scaled by how hard it landed. */
  const strikeReach = (damage: number | undefined): number => {
    const d = damage ?? 0
    return Math.min(0.9, Math.max(0.25, d / 8))
  }

  /**
   * Drive one step. Each step starts from the fighters' home posts so
   * the script stays strictly treeless: kind → pose, never cumulative.
   */
  const runStep = (
    step: PlaybackStep,
    instant: boolean,
    o: Combatant,
    r: Combatant,
  ): void => {
    o.group.position.copy(o.home)
    r.group.position.copy(r.home)
    o.group.rotation.set(0, o.group.rotation.y, 0)
    r.group.rotation.set(0, r.group.rotation.y, 0)
    o.group.position.y = 0
    r.group.position.y = 0
    const side = spotOf(step.actor, o, r)

    switch (step.kind) {
      case "approach": {
        // The acting fighter closes toward center, stopping at striking
        // distance; the other plants.
        const dx = (side.actor.away * -1.2) as number
        anim = instant
          ? null
          : {
              start: performance.now(),
              run: (t, ao) => {
                ao.group.position.x = ao.home.x + dx * easeOut(t)
              },
            }
        break
      }
      case "idle":
        // Hold the post; motion stays procedural (steps keep both planted).
        anim = null
        break
      case "melee": {
        // Lunge in on a sine and return; the victim flinches on contact.
        const reach = -side.actor.away * 1.1
        const flinch = -side.target.away * strikeReach(step.damage)
        anim = instant
          ? null
          : {
              start: performance.now(),
              run: (t, ao, at) => {
                const swing = Math.sin(t * Math.PI)
                ao.group.position.x = ao.home.x + reach * swing
                if (t > 0.45) {
                  const w = (t - 0.45) / 0.55
                  at.group.position.x = at.home.x + flinch * w
                }
              },
            }
        break
      }
      case "projectile": {
        // Anchor and wind: a small counter-recoil as the shot leaves.
        const recoil = side.actor.away * 0.35
        anim = instant
          ? null
          : {
              start: performance.now(),
              run: (t, ao) => {
                ao.group.position.x = ao.home.x + recoil * easeOut(t)
              },
            }
        if (!instant) {
          spawnProjectile(side.actor, side.target, step.element)
        }
        break
      }
      case "impact": {
        if (!step.hit) {
          // A standing miss costs nothing; a dodge sidesteps off the lane.
          const dodge = step.missReason === "dodge"
          anim = instant
            ? null
            : {
                start: performance.now(),
                run: (t, _ao, at) => {
                  if (!dodge) return
                  const dx = Math.sin(t * Math.PI) * 0.8
                  at.group.position.set(
                    at.home.x,
                    at.home.y,
                    at.home.z + dx * at.away,
                  )
                },
              }
          if (instant && dodge) {
            side.target.group.position.z =
              side.target.home.z + 0.8 * side.target.away
          }
          break
        }
        // Solid hit: knock the victim back off their home post.
        const knock = -side.target.away * strikeReach(step.damage)
        if (!instant) {
          startFlash(side.target)
          bigHit(step.damage)
        }
        anim = instant
          ? null
          : {
              start: performance.now(),
              run: (t, _ao, at) => {
                at.group.position.x = at.home.x + knock * easeOut(t)
              },
            }
        if (instant) {
          side.target.group.position.x = side.target.home.x + knock
        }
        break
      }
      case "down": {
        // Fall on the back, away from the opponent, and stay down.
        side.actor.down = true
        const backTilt = -Math.PI / 2
        const sink = side.actor.away * 0.6
        const applyFall = (ao: Combatant, w: number): void => {
          ao.group.rotation.x = backTilt * w
          ao.group.position.y = 0.35 * w
          ao.group.position.x = ao.home.x + sink * w
        }
        if (instant) applyFall(side.actor, 1)
        else
          anim = {
            start: performance.now(),
            run: (t) => applyFall(side.actor, easeOut(t)),
          }
        break
      }
      case "judge": {
        // Result stamp: the standing winner takes a small double hop. On a
        // draw both are already down and the pose stays as it fell.
        const standing = [o, r].filter((c) => !c.down)
        if (instant || standing.length === 0) {
          anim = null
          break
        }
        anim = {
          start: performance.now(),
          run: (t, ao) => {
            if (ao.down) return
            ao.group.position.y =
              ao.home.y + Math.abs(Math.sin(t * Math.PI * 2)) * 0.35
          },
        }
        break
      }
    }

    stop()
    if (!anim) return
    const a = anim
    const tickAnim = (): void => {
      // Micro hit-stop: while the freeze window is open, pose time holds
      // still (the window itself continues draining on wall time).
      if (performance.now() < hitStopUntil) {
        raf = requestAnimationFrame(tickAnim)
        return
      }
      const t = Math.min(1, (performance.now() - a.start) / STEP_ANIM_MS)
      a.run(t, o, r)
      if (t < 1) raf = requestAnimationFrame(tickAnim)
      else raf = null
    }
    raf = requestAnimationFrame(tickAnim)
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
        }
        group.position.copy(combatant.home)
        // Face the opponent across the show floor.
        group.rotation.y = away === 1 ? Math.PI / 2 : -Math.PI / 2
        arenaGroup.add(group)
        // Capture the cast-time palette per part so a hit flash returns it
        // to base later (multiple Lambert materials per creature, so per-mesh).
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
      anim = null
      flash = null
      hitStopUntil = 0
    },
  }
}
