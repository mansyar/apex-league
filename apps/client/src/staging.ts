import { PLAYBACK_PHASES, type PlaybackStep } from "@apex/sim"
import { generate } from "@apex/voxel"
import * as THREE from "three"
import {
  approach,
  breath as breathSine,
  clamp01,
  easeOut,
  easeOutCubic,
  gait as gaitBob,
  phaseAt,
  stepSquash,
} from "./anim"
import {
  type BodyProfile,
  idleSway,
  profileFor,
  type ReactionKind,
  reactionFor,
} from "./choreo"
import { buildCreatureGroup } from "./creature"
import type { DirectorContext, DirectorStep } from "./director"
import { elementHue } from "./element"
import {
  fxFor,
  type MoveFx,
  type Posture,
  PROJECTILE_LIFE_MS,
  type ShotSpec,
} from "./move-fx"
import { disposeObject3D, lambertMaterialOf } from "./scene-utils"
import { createBattleEffects } from "./staging-fx"

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

/** Resting gap between fighters (the size of a neutral stance). */
const STANCE_GAP = 2.1

/** Contact distance an attack pushes into (bodies nearly touch). */
const CONTACT_GAP = 1.8

/**
 * Show-floor bounds: fighters are clamped well inside the painted
 * boundary ring (8.3) and comfortably inside the broadcast framing, so
 * nobody leaves the arena or the camera's view.
 */
const BOUNDS_X = 3.2
const BOUNDS_Z = 1.8

/** Stage-glide rate (exp smoothing) — the pace of a purposeful walk. */
const GLIDE = 4.5

/** Idle breathing + gait amplitudes (reduced motion zeroes the gait). */
const BREATH_AMP = 0.03
const BREATH_FREQ = 2.2
const GAIT_AMP = 0.085
/** Forward lean into movement, radians per unit of speed. */
const LEAN_PER_SPEED = 0.045
const LEAN_MAX = 0.14

/** Squash-and-stretch spring (weight): stiffness and damping. */
const SQUASH_K = 210
const SQUASH_D = 13

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
  let lastDrive = 0
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

  /** Wrap an angle delta into [-π, π) so yaw always takes the short way. */
  const shortestAngle = (a: number): number => {
    const turn = Math.PI * 2
    return ((((a + Math.PI) % turn) + turn) % turn) - Math.PI
  }

  /** Kick the squash spring (positive = squash, negative = stretch). */
  const impulse = (c: Combatant, amount: number): void => {
    if (motionPref === "reduced") amount *= 0.4
    c.squash.v += amount
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

  // Scratch vector hoisted out of the always-running driver loop.
  const glideFrom = new THREE.Vector3()

  const drive = (): void => {
    const now = performance.now()
    // 1/30 cap keeps the SQUASH spring (ω ≈ 14.5 rad/s) well inside its
    // symplectic-Euler stability window even after a tab-return hitch.
    const dt = Math.min(1 / 30, (now - lastDrive) / 1000 || 1 / 60)
    lastDrive = now
    const life = motionPref === "reduced" ? 0 : 1
    for (const [c, other] of pair()) {
      // Squash spring integrates for everyone — the KO landing impulse
      // needs it even while the down branch owns the pose.
      c.squash = stepSquash(c.squash, dt, SQUASH_K, SQUASH_D)
      // Downed fighter: the driver keeps rendering the topple (the fall
      // action only lives for the fall beat; afterwards the driver owns
      // the pose). Head points away from the standing rival.
      if (c.down) {
        // Topple onto the back, body along the floor, head away from the
        // standing rival, at a slight lift so the body reads on the floor.
        // The KO reel (FR8) pitches the body back through lean before the
        // topple takes over - the same lean channel the strike phases use.
        c.group.rotation.z = -c.away * (Math.PI / 2) * c.fall
        c.group.rotation.x = c.lean.pitch
        c.group.position.set(c.smooth.x, 0.28 * c.fall, c.smooth.z)
        const sq = c.squash.s
        const base = c.baseScale
        c.group.scale.set(
          base * (1 + sq * 0.34),
          base * Math.max(0.05, 1 - sq * 0.5),
          base * (1 + sq * 0.34),
        )
        continue
      }
      // Keep the stage target inside the show floor (knockbacks, retreats
      // and approach overshoot all funnel back into the painted ring).
      c.stage.x = Math.max(-BOUNDS_X, Math.min(BOUNDS_X, c.stage.x))
      c.stage.z = Math.max(-BOUNDS_Z, Math.min(BOUNDS_Z, c.stage.z))
      // Walk toward the stage target (exp smoothing, frame-rate safe).
      glideFrom.copy(c.smooth)
      c.smooth.lerp(c.stage, approach(0, 1, GLIDE, dt))
      // Frame velocity from measured motion — the gait's tempo source.
      c.velocity.copy(c.smooth).sub(glideFrom).divideScalar(dt)
      const speed = Math.hypot(c.velocity.x, c.velocity.z)
      c.walkPhase += speed * dt * 5.2 * c.profile.gaitFreq
      // Lean into movement: pitch with forward speed, roll with the gait.
      const leanTarget = Math.min(
        LEAN_MAX,
        speed * LEAN_PER_SPEED * c.profile.leanPitch,
      )
      c.lean.pitch = approach(c.lean.pitch, leanTarget, 8, dt)
      c.lean.roll = approach(c.lean.roll, 0, 6, dt)

      // Compose the pose: walk position + action offset + gait bob +
      // breath at rest, all scaled by the squash spring (weight). The
      // archetype's body-language profile (FR5) weights every term.
      const rest = speed < 0.15 ? 1 : 0
      const gait = gaitBob(c.walkPhase, GAIT_AMP * c.profile.gaitAmp, life)
      const breath = breathSine(
        now,
        BREATH_FREQ * 2 * c.profile.breathFreq,
        BREATH_AMP * c.profile.breathAmp * rest,
        c.phase,
      )
      const sway = idleSway(c.profile, now, c.phase) * rest
      c.group.position.set(
        c.smooth.x + c.offset.x,
        Math.max(
          0,
          c.smooth.y + c.offset.y + gait + breath - c.squash.s * 0.42,
        ),
        c.smooth.z + c.offset.z + sway,
      )
      const sq = c.squash.s
      // Compose with the holder's base scale, never replace it. The baked
      // voxel scale lives on the inner rig; a bare set() here would blow
      // the voxel-local coordinates up 10× and the fighter's meshes would
      // land outside the arena.
      const base = c.baseScale
      c.group.scale.set(
        base * (1 + sq * 0.34),
        base * (1 - sq * 0.5),
        base * (1 + sq * 0.34),
      )
      // Face the rival every frame; yaw leads, pitch/roll support.
      const dx = other.group.position.x - c.group.position.x
      const dz = other.group.position.z - c.group.position.z
      const desired = Math.atan2(dx, dz)
      c.group.rotation.y +=
        shortestAngle(desired - c.group.rotation.y) * approach(0, 1, 9, dt)
      c.group.rotation.x = c.lean.pitch
      c.group.rotation.z = c.lean.roll
    }
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
    lastDrive = performance.now()
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
  /** Which combatant is the acting side of a step. */
  const spotOf = (
    actor: string,
    o: Combatant,
    r: Combatant,
  ): { actor: Combatant; target: Combatant } => {
    // Match on the stable key when present: in a mirror match both
    // fighters answer to the same display name, so name matching maps
    // every step onto the same (wrong) combatant.
    const keyOf = (c: Combatant): string => c.key ?? c.name
    if (actor === "" || (keyOf(o) !== actor && keyOf(r) === actor)) {
      return { actor: r, target: o }
    }
    return { actor: o, target: r }
  }

  /** Knockback distance for a landed hit, scaled by how hard it landed. */
  const strikeReach = (damage: number | undefined): number => {
    const d = damage ?? 0
    return Math.min(0.9, Math.max(0.25, d / 8))
  }

  /** Jump a fighter's whole walk state straight to its stage. */
  const snapTo = (c: Combatant): void => {
    c.smooth.copy(c.stage)
    c.velocity.set(0, 0, 0)
    c.offset.set(0, 0, 0)
  }

  /** True when a landing blow carries a heavy reaction (the victim reels). */
  const heavyHit = (step: PlaybackStep): boolean =>
    step.reaction === "stagger" || step.reaction === "knockback"

  /**
   * The victim reaction at an attack's contact moment: squash the body
   * (profile-weighted from the reaction library), flash and stop the
   * frame on big hits. Heavy reactions skip the stage shove - the
   * outward movement belongs to the follow-up stagger/knockback reel
   * (the sim's range shift), not a second nudge. One helper so basic
   * and special hits look like the same physical impact.
   */
  const contactReaction = (
    damage: number | undefined,
    at: Combatant,
    heavy = false,
    element?: string,
  ): void => {
    if (!heavy) {
      const knock = strikeReach(damage)
      // Knockback pushes the victim OUTWARD (own away side, same convention
      // as the dodge dash) - a minus here drags the pair into each other
      // with every landed hit.
      at.stage.x += at.away * knock
      at.stage.z += (Math.random() - 0.5) * 0.3
    }
    const kind: ReactionKind = heavy ? "stagger" : "glance"
    impulse(at, reactionFor(kind, at.profile).impulse)
    effects.startFlash(at)
    bigHit(damage)
    effects.spawnDecal(at.group.position, element, damage ?? 4)
  }

  /** Lateral weave: alternate attack sides so no two hits share a lane. */
  const weave = (step: PlaybackStep): number =>
    (step.tick % 2 === 0 ? 1 : -1) * 0.55

  /**
   * Drive one step. Fighters hold their stage position between steps, so
   * the fight stays continuous — an approach that never got answered is
   * still standing there in the next beat.
   */

  /**
   * Declarative per-move fire choreography (FR5, unified fire): every
   * special - ranged or point-blank - launches through the same
   * pipeline. A new move slots in by adding one registry entry; tuning
   * a move is editing that entry, never the engine.
   */

  /** Apply a posture phase to a fighter at normalized progress w. */
  const applyPosture = (
    p: Posture,
    w: number,
    ao: Combatant,
    away: number,
  ): void => {
    const half = Math.sin((w * Math.PI) / 2)
    const full = Math.sin(w * Math.PI)
    if (p.pitch !== undefined) {
      ao.lean.pitch = p.pitch * (p.hold ? half : full)
    }
    if (p.roll !== undefined) ao.lean.roll = p.roll * full
    if (p.rise !== undefined) ao.offset.y = p.rise * full
    if (p.coilX !== undefined) ao.offset.x = -away * p.coilX * (w * w)
    if (p.pitchOut !== undefined) ao.lean.pitch = p.pitchOut * full
    if (p.sweepX !== undefined) {
      ao.offset.x = -away * (p.sweepX[0] + p.sweepX[1] * full)
    }
    if (p.riseOut !== undefined) ao.offset.y = p.riseOut * full
  }

  /** One projectile release: geometry, flight time, lateral offset. */

  /** Everything a move declares about firing and landing. */

  /**
   * The per-move arrival treatment where a special lands - shared by
   * ranged arrivals (the impact step) and point-blank micro-flights.
   */
  const arriveSpecial = (
    step: PlaybackStep,
    side: { actor: Combatant; target: Combatant },
  ): void => {
    const fx = fxFor(step.moveId)
    const at = side.target.group.position.clone()
    if (fx.arrival.lanes) {
      for (const dz of fx.arrival.lanes) {
        const p = at.clone()
        p.z += dz
        effects.spawnBurst(p, step.element, fx.arrival.burst)
      }
    } else {
      effects.spawnBurst(at, step.element, fx.arrival.burst)
    }
    if (fx.arrival.shove !== 0) impulse(side.target, fx.arrival.shove)
  }

  /**
   * Unified special fire (FR5): run the move's launch body and release
   * its shots. Ranged fire runs at full pacing from the projectile
   * step (arrival is a separate impact step); point-blank fire
   * compresses the same body into the impact step with a micro-flight,
   * and the victim reacts when the shot actually lands.
   */
  const fireSpecial = (
    step: PlaybackStep,
    side: { actor: Combatant; target: Combatant },
    compressed: boolean,
  ): void => {
    const fx = fxFor(step.moveId)
    const away = side.actor.away
    const wind = compressed ? (fx.compressed?.wind ?? 0.32) : fx.wind
    // Scale the fixed micro-flight with the live pace, exactly like
    // animMs() does - otherwise fast-forward clamps animMs() to 120 ms
    // while the flight stays at full length and landBeat escapes [0, 1],
    // silently dropping the victim's reaction, burst, and decal.
    const flight = compressed
      ? (fx.compressed?.flight ?? Math.min(300, animMs() * 0.5)) *
        (paceMs / NORMAL_STEP_MS)
      : (fx.shots[0]?.life ?? PROJECTILE_LIFE_MS)
    const beats =
      compressed && fx.compressed?.beats !== undefined
        ? fx.compressed.beats
        : compressed
          ? fx.shots.map(() => wind)
          : fx.shots.map((s) => s.at)
    const firedRef = { n: 0 }
    const landedRef = { done: false }
    // Point-blank: the shot lands inside this action; the victim
    // reacts at the landing beat, not before it. Clamped so a degenerate
    // schedule still fires the landing at the action's end.
    const landBeat = compressed
      ? Math.min(1, (beats[0] ?? wind) + flight / animMs())
      : Number.POSITIVE_INFINITY
    actionRaf = startAction(
      (t, ao) => {
        if (t < wind) {
          const w = t / wind
          applyPosture(fx.pose.windup, w, ao, away)
          if (fx.charge) {
            effects.setCharge(
              side.actor,
              step.element,
              fx.charge.from + w * (fx.charge.to - fx.charge.from),
            )
          }
          return
        }
        // Release the shots on their beats.
        while (firedRef.n < fx.shots.length) {
          const beat = beats[firedRef.n]
          const shot = fx.shots[firedRef.n]
          if (beat === undefined || shot === undefined || t < beat) break
          effects.spawnProjectile(side.actor, side.target, step.element, {
            size: shot.size,
            life: compressed ? flight : shot.life,
            spread: shot.spread ?? 0,
          })
          impulse(ao, fx.kick)
          if (firedRef.n === 0) {
            if (fx.charge) effects.clearCharge()
            if (fx.muzzle) {
              const mouth = side.actor.group.position.clone()
              mouth.y += 0.2
              effects.spawnBurst(mouth, step.element, fx.muzzle)
            }
          }
          firedRef.n += 1
        }
        // Point-blank: the shot lands inside this action.
        if (compressed && !landedRef.done && t >= landBeat) {
          landedRef.done = true
          arriveSpecial(step, side)
          contactReaction(
            step.damage,
            side.target,
            heavyHit(step),
            step.element,
          )
        }
        const release = beats[0] ?? wind
        const w = clamp01((t - release) / Math.max(0.01, 1 - release))
        applyPosture(fx.pose.recoil, w, ao, away)
      },
      side.actor,
      side.target,
    )
  }

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
    // A step that interrupts a charging Lance must not leave the orb.
    effects.clearCharge()
    for (const c of [o, r]) {
      c.offset.set(0, 0, 0)
      c.lean.pitch = 0
      c.lean.roll = 0
    }
    const side = spotOf(step.actorKey ?? step.actor, o, r)

    switch (step.kind) {
      case "approach": {
        // Walk to a strike-range stance on the target's flank: closes the
        // lane and sets up the weave for the attack that follows.
        side.actor.stage.set(
          side.target.stage.x + side.actor.away * STANCE_GAP,
          0,
          side.target.stage.z + weave(step),
        )
        if (instant) snapTo(side.actor)
        break
      }
      case "idle":
        // Hold ground; the driver keeps the breath and facing alive.
        break
      case "melee": {
        // Authored attack: wind-up (coil back), committed strike into
        // contact, then a weighted recovery. A hit lands at contact
        // (knockback, squash, flash); a miss is a whiff the target
        // slipped (dodge dash) or simply avoids.
        const hit = step.hit !== false
        const missed = !hit
        const dodged = missed && step.missReason === "dodge"
        if (instant) {
          // Resolve instantly: run the contact consequences with no anim.
          if (hit)
            contactReaction(
              step.damage,
              side.target,
              heavyHit(step),
              step.element,
            )
          if (dodged) {
            side.target.stage.x += side.target.away * 0.85
            snapTo(side.target)
          }
          side.actor.stage.set(
            side.target.stage.x + side.actor.away * STANCE_GAP,
            0,
            side.target.stage.z,
          )
          snapTo(side.actor)
          break
        }
        const from = side.actor.group.position.clone()
        const toPos = side.target.group.position.clone()
        // Strike into contact, stop just short of a body overlap.
        const dir = toPos.clone().sub(from)
        dir.y = 0
        const dist = dir.length()
        dir.normalize()
        dir.x += weave(step) * 0.12
        dir.normalize()
        const contact = from
          .clone()
          .addScaledVector(dir, Math.max(0.45, dist - CONTACT_GAP))
        let landed = false
        actionRaf = startAction(
          (t, ao, at) => {
            // Phase timing comes from the enriched playback contract
            // (FR3) — the melee boundaries here are the contract's own
            // numbers, so choreography and script agree by construction.
            const melee = phaseAt(t, PLAYBACK_PHASES.melee)
            if (melee.phase === "windup") {
              // Anticipation: coil back on the approach line, drop weight.
              const w = melee.local
              ao.offset.copy(dir).multiplyScalar(-0.22 * Math.sin(w * Math.PI))
              ao.offset.y = -0.05 * Math.sin(w * Math.PI)
              ao.lean.roll = 0.05 * Math.sin(w * Math.PI)
            } else if (melee.phase === "contact") {
              // The strike: uncoil fast down the line (easeOutCubic).
              const w = melee.local
              ao.offset
                .copy(dir)
                .multiplyScalar(
                  -0.22 + (contact.distanceTo(from) + 0.22) * easeOutCubic(w),
                )
              ao.offset.y = -0.05 * (1 - w) + 0.06 * w
              ao.lean.pitch = 0.1 * Math.sin(w * Math.PI)
              ao.lean.roll = -0.05 * (1 - w)
              if (w > 0.3) impulse(ao, -0.28) // stretch while committing
            } else {
              // Follow-through + recovery: settle back to stance spacing.
              const w = melee.local
              ao.offset
                .copy(contact)
                .sub(from)
                .multiplyScalar(1 - easeOut(w))
              ao.lean.pitch = 0.1 * (1 - easeOut(w))
              ao.lean.roll = -0.05 * (1 - easeOut(w))
              if (!landed) {
                landed = true
                if (hit) {
                  contactReaction(step.damage, at, heavyHit(step), step.element)
                } else if (dodged) {
                  // The target slipped: a quick dash off the lane.
                  at.stage.x += at.away * 0.85
                  impulse(at, -0.3)
                }
              }
              if (hit && w > 0.6) impulse(ao, 0.12) // attacker settles heavy
            }
          },
          side.actor,
          side.target,
        )
        break
      }
      case "projectile": {
        // Ranged special: the full-pacing launch body. Point-blank
        // specials replay the same body compressed from the impact
        // step - unified fire (FR5).
        if (instant) {
          // No flight to show: the following impact step resolves the
          // hit on the spot.
          break
        }
        fireSpecial(step, side, false)
        break
      }
      case "impact": {
        // Specials report their own landing here (the launch already
        // fired). A dodge is a real evasion: a dash off the lane.
        if (!step.hit) {
          if (step.missReason === "dodge") {
            // A real evasion: dash off the lane in the contract's
            // dodge direction, weighted by the reaction library.
            const spec = reactionFor("dodge", side.target.profile)
            side.target.stage.x += side.target.away * spec.dash
            side.target.stage.z += step.dodgeDirection === "left" ? 0.45 : -0.45
            if (instant) {
              impulse(side.target, spec.impulse)
              snapTo(side.target)
            }
          }
          break
        }
        if (instant) {
          contactReaction(
            step.damage,
            side.target,
            heavyHit(step),
            step.element,
          )
          snapTo(side.target)
          if (step.element) arriveSpecial(step, side)
          break
        }
        if (step.element && prevStepKind !== "projectile") {
          // Unified fire (FR5): point-blank specials replay their
          // launch body compressed - windup, micro-flight, then the
          // arrival burst and the victim's reaction when the shot lands.
          fireSpecial(step, side, true)
          break
        }
        reactionAction(step.damage, side.target, heavyHit(step), step.element)
        if (step.element) arriveSpecial(step, side)
        break
      }
      case "stagger":
      case "knockback": {
        // The reel beat (FR5): the victim is off-balance after a heavy
        // blow. Knockback also carries the sim's range change outward -
        // the glide does the traveling, the reel sells the physics.
        const spec = reactionFor(step.kind, side.actor.profile)
        if (spec.slide > 0) side.actor.stage.x += side.actor.away * spec.slide
        if (instant) {
          snapTo(side.actor)
          break
        }
        actionRaf = startAction(
          (t, ao) => {
            if (t >= spec.reel) {
              ao.lean.pitch = 0
              ao.lean.roll = 0
              return
            }
            const w = Math.sin((clamp01(t / spec.reel) * Math.PI) / 2)
            ao.lean.pitch = -spec.reelPitch * w
            ao.lean.roll = spec.reelPitch * 0.4 * Math.sin(t * Math.PI * 3)
          },
          side.actor,
          side.target,
        )
        break
      }
      case "down": {
        // Fall on the back and stay down - the action drives `fall`, the
        // driver renders the topple while the squash adds landing weight.
        side.actor.down = true
        const spec = reactionFor("down", side.actor.profile)
        if (instant) {
          side.actor.fall = 1
          snapTo(side.actor)
          impulse(side.actor, spec.impulse)
        } else if (step.ko === true) {
          // FR8 signature: the legs give in stages. A stagger wind-up
          // pitches the body back, then the collapse takes over - the
          // dilated pace (driver FR8) stretches the whole beat, and the
          // landing kicks up a dust ring instead of an element pop.
          let thudded = false
          actionRaf = startAction(
            (t, ao) => {
              if (t < 0.35) {
                const w = t / 0.35
                ao.lean.pitch = -0.32 * Math.sin(w * Math.PI * 0.5)
                return
              }
              const u = clamp01((t - 0.35) / 0.65)
              ao.fall = easeOut(u)
              ao.lean.pitch = -0.32 * (1 - u * 0.4)
              if (u > 0.3 && !thudded) {
                thudded = true
                impulse(ao, spec.impulse)
                effects.spawnBurst(ao.group.position, step.element, {
                  puffs: 9,
                  ring: true,
                  gravity: 2.2,
                  life: 750,
                  flash: false,
                  tint: "#9a9184",
                  size: 1.3,
                  flashGrow: 0,
                })
              }
            },
            side.actor,
            side.target,
          )
        } else {
          let thudded = false
          actionRaf = startAction(
            (t, ao) => {
              ao.fall = easeOut(clamp01(t / spec.reel))
              if (t > 0.55 && !thudded) {
                thudded = true
                impulse(ao, spec.impulse)
              }
            },
            side.actor,
            side.target,
          )
        }
        break
      }
      case "judge": {
        // Result stamp: the standing winner takes a double victory hop —
        // each hop stretches on the rise and squashes on the landing.
        const standing = [o, r].filter((c) => !c.down)
        const winner = standing[0]
        if (instant || !winner) break
        const hopRef = { hops: 0 }
        const landedRef = { count: 0 }
        actionRaf = startAction(
          (t, ao) => {
            const w = t * Math.PI * 2
            ao.offset.y = Math.abs(Math.sin(w)) * 0.35
            const rising = Math.sin(w) > 0
            const localT = (t * 2) % 1
            if (rising && localT < 0.25 && hopRef.hops < 2) {
              hopRef.hops++
              impulse(ao, -0.4)
            }
            // One thud per completed hop — an edge trigger, not a
            // per-frame repeat.
            if (!rising && localT > 0.9 && landedRef.count < hopRef.hops) {
              landedRef.count++
              impulse(ao, 0.55)
            }
          },
          winner,
          winner === o ? r : o,
        )
        break
      }
    }
  }

  /**
   * The victim-only portion of a special landing: knockback persists in
   * the stage, the body squashes and settles, flash + hit-stop fire.
   */
  const reactionAction = (
    damage: number | undefined,
    at: Combatant,
    heavy = false,
    element?: string,
  ): void => {
    contactReaction(damage, at, heavy, element)
  }

  /** One scripted action on staging's own clock (hit-stop aware). */
  const startAction = (
    run: (t: number, o: Combatant, r: Combatant) => void,
    o: Combatant,
    r: Combatant,
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
      runStep(step, instant, o, r)
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
          ;(mesh.material as THREE.MeshLambertMaterial).color.copy(base)
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
