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
}

export function createStaging(arenaGroup: THREE.Group): Staging {
  let owned: Combatant | null = null
  let rival: Combatant | null = null
  let raf: number | null = null
  let anim: {
    start: number
    run: (t: number, o: Combatant, r: Combatant) => void
  } | null = null

  const stop = (): void => {
    if (raf !== null) {
      cancelAnimationFrame(raf)
      raf = null
    }
  }

  const easeOut = (t: number): number => 1 - (1 - t) * (1 - t)

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
        }
        group.position.copy(combatant.home)
        // Face the opponent across the show floor.
        group.rotation.y = away === 1 ? Math.PI / 2 : -Math.PI / 2
        arenaGroup.add(group)
        return combatant
      }

      owned = buildSpot(casting.owned, -1)
      rival = buildSpot(casting.rival, 1)
    },
    applyStep(step, instant = false) {
      const o = owned
      const r = rival
      if (!o || !r) return
      runStep(step, instant, o, r)
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
    },
  }
}
