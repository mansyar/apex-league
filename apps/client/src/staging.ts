import type { LifeStage, PlaybackStep } from "@apex/sim"
import type * as THREE from "three"
import { clamp01 } from "./anim"
import type { DirectorContext, DirectorStep } from "./director"
import { createFighterDriver, type DriveFighter } from "./fighter-driver"
import {
  buildSpot,
  type Combatant,
  disposeFighter,
  settlePalettes,
} from "./roster"
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

/** Resting gap between fighters and the contact distance now live in
 * the steps registry (steps/pure.ts) - the only places they're used. */

/**
 * Show-floor bounds live in the fighter-driver module (the pose loop
 * clamps stage targets against them).
 */
export interface FightCasting {
  /** Which creature stands on the left (home) side. The stage selects
   * the voxel build (champion track) — rivals may omit it. */
  owned: {
    archetypeId: string
    seed: number
    name: string
    key?: string
    stage?: LifeStage
    /** Earned form's accent wash (FR-10); legacy/unknown ids skip it. */
    branch?: string | null
  }
  /** Which creature stands on the right (away) side. */
  rival: {
    archetypeId: string
    seed: number
    name: string
    key?: string
    stage?: LifeStage
    branch?: string | null
  }
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
  /**
   * Suspend/resume the battle effect loop for a hidden tab (F5). An effect
   * caught mid-play is held and continues on return instead of running on
   * unseen or snapping to its end state.
   */
  setPaused(paused: boolean): void
  /** Remove the combatants (panel closed, back to idle ranch bowl). */
  clear(): void
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
    // The world holds for a hit-stop; the eye holds with it.
    glanceSuppressed: () => effects.hitStop.active(),
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
      disposeFighter(owned, arenaGroup)
      disposeFighter(rival, arenaGroup)
      owned = null
      rival = null

      owned = buildSpot(casting.owned, -1, arenaGroup)
      rival = buildSpot(casting.rival, 1, arenaGroup)
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
    setPaused(paused) {
      effects.setPaused(paused)
    },
    clear() {
      stop()
      effects.disposeAllDecals()
      settlePalettes([owned, rival])
      disposeFighter(owned, arenaGroup)
      disposeFighter(rival, arenaGroup)
      owned = null
      rival = null
    },
  }
}
