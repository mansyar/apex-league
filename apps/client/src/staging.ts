import type { PlaybackStep } from "@apex/sim"
import { generate } from "@apex/voxel"
import * as THREE from "three"
import { clamp01 } from "./anim"
import { type BodyProfile, profileFor } from "./choreo"
import { buildCreatureGroup } from "./creature"
import type { DirectorContext, DirectorStep } from "./director"
import { createFighterDriver, type DriveFighter } from "./fighter-driver"
import { disposeObject3D, lambertMaterialOf } from "./scene-utils"
import { createBattleEffects } from "./staging-fx"
import { createStepChoreo } from "./steps"

/**
 * Creature staging for the broadcast arena: two living fighters on the
 * show floor performing authored attack sequences. Each attack has real
 * grammar — walk to contact with a gait bob, anticipation wind-up, a
 * committed strike, follow-through, and a weighted victim reaction —
 * instead of tweening between home posts. Pure presentation: nothing
 * here reads or writes GameState; the fight is already resolved.
 */

/** Spar pacing at normal speed, in ms per step (the playback baseline). */
const NORMAL_STEP_MS = 900

/** How long one scripted attack animates for at the normal pace, in ms. */
const BASE_STEP_ANIM_MS = 620

/** Stage positions: the fighters start wide on the show floor's X lane. */
const HOME_X = 2.6

/**
 * Canonical arena slot: every fighter's horizontal footprint is scaled to
 * this length at cast time (fighting-game stage normalization). Gap
 * constants, camera framing, and authored choreography then stay
 * species-independent; silhouette and bulk still read, only overall
 * scale is equalized. The ranch and gallery keep natural sizes.
 */
const ARENA_FOOTPRINT = 1.7

/** Resting gap between fighters and the contact distance now live in
 * the steps registry (steps/pure.ts) - the only places they're used. */

/**
 * Show-floor bounds live in the fighter-driver module (the pose loop
 * clamps stage targets against them).
 */
export interface FightCasting {
  /** Which creature stands on the left (home) side. */
  owned: { archetypeId: string; seed: number; name: string; key?: string }
  /** Which creature stands on the right (away) side. */
  rival: { archetypeId: string; seed: number; name: string; key?: string }
}

export interface Staging {
  /** Build and place both combatants facing each other. */
  cast(casting: FightCasting): void
  /** Drive one playback step: closes, strikes, recoils, dodges, falls. */
  applyStep(step: PlaybackStep, instant?: boolean): void
  /** Big-hit hook: main.ts points this at the broadcast camera shake. */
  setBigHitHandler(handler: (strength: number) => void): void
  /**
   * Camera-director hook (FR6): the drive loop reports the live battle
   * context each frame; main.ts feeds it through nextShot into the scene.
   */
  setDirectorHandler(handler: ((ctx: DirectorContext) => void) | null): void
  /** 'reduced' suppresses gait, flash, and shake; combat stays legible. */
  setMotionPref(pref: "full" | "reduced"): void
  /**
   * Current spar pacing (ms per playback step) — action animations scale
   * with it so fast-forward speeds the whole fight up instead of cutting
   * swings off mid-animation.
   */
  setPace(msPerStep: number): void
  /** Remove the combatants (panel closed, back to idle ranch bowl). */
  clear(): void
}

interface Combatant {
  name: string
  /** Stable side key (`id ?? name`) — display names collide in mirrors. */
  key?: string
  group: THREE.Group
  home: THREE.Vector3
  /** Local "away" direction (X axis, ±1): where retreats and knockbacks go. */
  away: 1 | -1
  down: boolean
  /** Per-part base colors captured at cast time, keyed by part name. */
  baseColors: Map<THREE.Mesh, THREE.Color>
  /** The archetype's motion identity (FR5) — weights gait, breath, hurt. */
  profile: BodyProfile
  /** Persistent show-floor position; the driver walks the mesh there. */
  stage: THREE.Vector3
  /** Smoothed current position (driver output, the walk state). */
  smooth: THREE.Vector3
  /** Frame-to-frame velocity, for gait and lean. */
  velocity: THREE.Vector3
  /** Gait phase, advanced by distance travelled (drives the walk bob). */
  walkPhase: number
  /** Transient action offset (lunge/flinch/hop), composed by the driver. */
  offset: THREE.Vector3
  /** Squash state: s is the deformation, v its velocity (a damped spring). */
  squash: { s: number; v: number }
  /** Attack lean: pitch (x) and roll (z) authored by the running action. */
  lean: { pitch: number; roll: number }
  /** Fall progress 0..1 for the down step; 0 = upright. */
  fall: number
  /** Per-fighter bob phase so the pair never breathes in lockstep. */
  phase: number
  /**
   * The holder's base scale (identity) — the squash spring composes with
   * it. The rig's baked voxel scale lives untouched on the inner rig.
   */
  baseScale: number
}

export function createStaging(arenaGroup: THREE.Group): Staging {
  let owned: Combatant | null = null
  let rival: Combatant | null = null
  let actionRaf: number | null = null
  let driveRaf: number | null = null
  /** Current spar pacing (ms per playback step); animations scale off it. */
  let paceMs = NORMAL_STEP_MS
  /** Kind of the previously applied step - tells a ranged arrival
   * (projectile → impact) from a point-blank special (impact alone). */
  let prevStepKind: PlaybackStep["kind"] | null = null
  /** Camera-director plumbing: the latest step + when it started. */
  let directorHandler: ((ctx: DirectorContext) => void) | null = null
  let lastStep: PlaybackStep | null = null
  // Reused per frame - the feed runs on every drive tick, so allocating
  // fresh objects here would churn the GC in the render loop. The mapped
  // twin strips readonly for the scratch only; the public contract stays.
  type MutableDirectorStep = {
    -readonly [K in keyof DirectorStep]: DirectorStep[K]
  }
  type MutableDirectorContext = {
    -readonly [K in keyof DirectorContext]: DirectorContext[K]
  }
  const feedStep: MutableDirectorStep = {
    kind: "idle",
    t: 0,
    tick: 0,
    reaction: undefined,
    damage: undefined,
    ko: undefined,
  }
  const feedCtx: MutableDirectorContext = {
    step: null,
    actor: { x: 0, y: 0, z: 0 },
    target: { x: 0, y: 0, z: 0 },
    projectile: null,
  }
  let lastStepAt = 0
  /** Action animation length at the current pace, floor-clamped. */
  const animMs = (): number =>
    Math.max(120, BASE_STEP_ANIM_MS * (paceMs / NORMAL_STEP_MS))
  /** Big-hit callback (camera punch); wired by main.ts to the scene shake. */
  const onBigHit: { current: ((strength: number) => void) | null } = {
    current: null,
  }

  /** Visual intensity preference: 'full' shakes; 'reduced' keeps it calm. */
  let motionPref: "full" | "reduced" = "full"

  /**
   * The shared effect machinery: one loop drives flash, projectiles,
   * bursts, decals and the charge orb; the hit-stop clock it owns also
   * freezes the action clock and drive loop below.
   */
  const effects = createBattleEffects({
    arenaGroup,
    pref: () => motionPref,
    onBigHit,
  })

  /** Big-hit punch: freeze the frame briefly and shake the broadcast cam. */
  const bigHit = (damage: number | undefined): void => {
    effects.hitStop.trigger(damage, (s) => {
      if (motionPref === "full" && onBigHit.current) onBigHit.current(s)
    })
  }

  // ── Living-fight driver ────────────────────────────────────────────────
  // One loop owns every fighter's pose every frame: walk to stage with a
  // gait, weight (squash spring), lean into movement, face the rival,
  // render falls. Steps only set intents (stage targets, actions).
  const pair = (): Array<[Combatant, Combatant]> => {
    if (owned && rival)
      return [
        [owned, rival],
        [rival, owned],
      ]
    return []
  }

  // The pose loop itself lives in the fighter-driver module; the staging
  // factory keeps the rAF wiring, the step choreography, and the
  // camera-director feed.
  const driver = createFighterDriver({
    pair,
    pref: () => motionPref,
  })

  const drive = (): void => {
    const now = performance.now()
    driver.step(now)
    // Camera-director feed (FR6): report the live battle context every
    // frame. Melee/projectile steps run on the action clock; every other
    // beat paces by the step duration.
    if (directorHandler && owned && rival) {
      const step = lastStep
      const span =
        step !== null && (step.kind === "melee" || step.kind === "projectile")
          ? animMs()
          : paceMs
      const t =
        step === null ? 0 : clamp01((now - lastStepAt) / Math.max(1, span))
      if (step === null) {
        feedCtx.step = null
      } else {
        feedStep.kind = step.kind
        feedStep.t = t
        feedStep.tick = step.tick
        feedStep.reaction = step.reaction
        feedStep.damage = step.damage
        feedStep.ko = step.ko
        feedCtx.step = feedStep
      }
      feedCtx.actor = owned.group.position
      feedCtx.target = rival.group.position
      feedCtx.projectile = effects.firstProjectilePosition()
      directorHandler(feedCtx)
    }
    driveRaf = requestAnimationFrame(drive)
  }

  /** Start (or restart) the driver; idempotent per cast. */
  const startDrive = (): void => {
    if (driveRaf !== null) cancelAnimationFrame(driveRaf)
    driver.syncClock(performance.now())
    driveRaf = requestAnimationFrame(drive)
  }

  const stop = (): void => {
    if (actionRaf !== null) {
      cancelAnimationFrame(actionRaf)
      actionRaf = null
    }
    if (driveRaf !== null) {
      cancelAnimationFrame(driveRaf)
      driveRaf = null
    }
    // Cross-fight staleness: a fight ending on a projectile must not make
    // the NEXT fight's first point-blank special skip its launch body,
    // and stale last-step context must not fire a director cut at cast.
    prevStepKind = null
    lastStep = null
    lastStepAt = 0
    effects.disposeAll()
  }

  // ── Step choreography ──────────────────────────────────────────────────
  /**
   * Drive one step. Fighters hold their stage position between steps, so
   * the fight stays continuous — an approach that never got answered is
   * still standing there in the next beat. The per-kind choreography
   * lives in the steps/ registry; staging supplies the clocks and the
   * effect machinery through the StepIO port.
   */
  const choreo = createStepChoreo({
    effects,
    bigHit: (damage) => bigHit(damage),
    startAction: (run, ao, at) => {
      startAction(run, ao, at)
    },
    cancelAction: () => {
      if (actionRaf !== null) {
        cancelAnimationFrame(actionRaf)
        actionRaf = null
      }
    },
    animMs,
    paceRatio: () => paceMs / NORMAL_STEP_MS,
    reduced: () => motionPref === "reduced",
    prevKind: () => prevStepKind,
  })

  /** One scripted action on staging's own clock (hit-stop aware). */
  const startAction = (
    run: (t: number, o: DriveFighter, r: DriveFighter) => void,
    o: DriveFighter,
    r: DriveFighter,
  ): number => {
    const start = performance.now()
    const tick = (): void => {
      // Micro hit-stop: while the freeze window is open, action time
      // holds still (the window itself keeps draining on wall time).
      if (effects.hitStop.active()) {
        actionRaf = requestAnimationFrame(tick)
        return
      }
      const t = Math.min(1, (performance.now() - start) / animMs())
      run(t, o, r)
      if (t < 1) {
        actionRaf = requestAnimationFrame(tick)
      } else {
        actionRaf = null
      }
    }
    // Every reschedule writes the CURRENT frame id into the shared slot,
    // so a cancel from the next step always reaches the live loop.
    actionRaf = requestAnimationFrame(tick)
    return actionRaf
  }

  return {
    cast(casting) {
      stop()
      // The previous fight's scorch marks do not belong on the new floor.
      effects.disposeAllDecals()
      // Drop the previous cast before building the new one.
      const disposeOld = (c: Combatant | null): void => {
        if (!c) return
        disposeObject3D(c.group)
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
        const inner = buildCreatureGroup(dna, build, def.grid)
        inner.traverse((obj) => {
          if (obj instanceof THREE.Mesh) obj.castShadow = true
        })
        // Learnings §1: the rig is built in voxel grid units and its group
        // origin is the rig grid origin — not the creature's visible mass —
        // so yaw turns and KO topples on the raw rig read as an arc.
        // Re-anchor exactly like the ranch scene: measure the whole-
        // creature visual center, wrap the rig in an identity-scale holder,
        // and offset the child so the visual center sits on the holder
        // origin. All motion code below drives the holder.
        inner.updateMatrixWorld(true)
        const innerBox = new THREE.Box3().setFromObject(inner)
        const center = innerBox.getCenter(new THREE.Vector3())
        const group = new THREE.Group()
        group.add(inner)
        inner.position.set(-center.x, 0, -center.z)
        // Arena normalization: scale the holder so the whole-creature
        // footprint fits the canonical slot. Applied to the holder (not
        // the rig) so the baked voxel scale contract is untouched and the
        // squash spring keeps composing on top of it.
        const size = innerBox.getSize(new THREE.Vector3())
        const footprint = Math.max(size.x, size.z, 0.001)
        group.scale.setScalar(ARENA_FOOTPRINT / footprint)
        const combatant: Combatant = {
          name: info.name,
          key: info.key,
          group,
          home: new THREE.Vector3(HOME_X * away, 0, 0),
          away,
          down: false,
          baseColors: new Map(),
          profile: profileFor(info.archetypeId),
          stage: new THREE.Vector3(HOME_X * away, 0, 0),
          smooth: new THREE.Vector3(HOME_X * away, 0, 0),
          velocity: new THREE.Vector3(),
          walkPhase: 0,
          offset: new THREE.Vector3(),
          squash: { s: 0, v: 0 },
          lean: { pitch: 0, roll: 0 },
          fall: 0,
          phase: Math.random() * Math.PI * 2,
          baseScale: group.scale.x,
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
            const mat = lambertMaterialOf(obj)
            if (!mat) return
            combatant.baseColors.set(obj, mat.color.clone())
          }
        })
        return combatant
      }

      owned = buildSpot(casting.owned, -1)
      rival = buildSpot(casting.rival, 1)
      startDrive()
    },
    applyStep(step, instant = false) {
      const o = owned
      const r = rival
      if (!o || !r) return
      const kind = step.kind
      lastStep = step
      lastStepAt = performance.now()
      choreo.apply(step, instant, o, r)
      prevStepKind = kind
    },
    setBigHitHandler(handler) {
      onBigHit.current = handler
    },
    setDirectorHandler(handler) {
      directorHandler = handler
    },
    setMotionPref(pref) {
      motionPref = pref
    },
    setPace(msPerStep) {
      paceMs = msPerStep
    },
    clear() {
      stop()
      effects.disposeAllDecals()
      // Settle every palette back to base before disposal — a fighter
      // hit mid-flash in the final beat would otherwise carry the white
      // pop into the next fight (materials are fresh per cast, but the
      // screenshot timeline showed lingering whites between fights).
      for (const c of [owned, rival]) {
        if (!c) continue
        for (const [mesh, base] of c.baseColors) {
          lambertMaterialOf(mesh)?.color.copy(base)
        }
        c.group.rotation.set(0, c.group.rotation.y, 0)
        c.group.scale.setScalar(c.baseScale)
      }
      for (const c of [owned, rival]) {
        if (!c) continue
        disposeObject3D(c.group)
        arenaGroup.remove(c.group)
      }
      owned = null
      rival = null
    },
  }
}
