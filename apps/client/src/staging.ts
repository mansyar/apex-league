import {
  CHAMPION_STAT_BOOST,
  ELEMENT_HUE,
  EVOLUTION_STAT_BOOST,
  PLAYBACK_PHASES,
  type PlaybackStep,
} from "@apex/sim"
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

/**
 * Creature staging for the broadcast arena: two living fighters on the
 * show floor performing authored attack sequences. Each attack has real
 * grammar — walk to contact with a gait bob, anticipation wind-up, a
 * committed strike, follow-through, and a weighted victim reaction —
 * instead of tweening between home posts. Pure presentation: nothing
 * here reads or writes GameState; the fight is already resolved.
 */

/**
 * Visual DNA seed shared with the ranch view: same creature, same look,
 * in the arena and on the ranch.
 *
 * Stage-aware: evolution boosts the rolled base stats (+3/+2/+2/+1), which
 * would otherwise re-roll the individual's DNA mid-life. The juvenile's
 * boosted contributions are subtracted back out so the visual seed — and
 * therefore the individual — stays the one rolled at creation. If a later
 * stage adds another boost, extend the offset here.
 */
export const visualSeedOf = (
  s: {
    hp: number
    atk: number
    def: number
    spd: number
  },
  stage: "baby" | "juvenile" | "champion" = "baby",
): number => {
  const off =
    stage === "juvenile"
      ? EVOLUTION_STAT_BOOST
      : stage === "champion"
        ? CHAMPION_STAT_BOOST // cumulative: juvenile + champion boost
        : { hp: 0, atk: 0, def: 0, spd: 0 }
  return (
    ((s.hp - off.hp) * 7 +
      (s.atk - off.atk) * 13 +
      (s.def - off.def) * 17 +
      (s.spd - off.spd) * 23) %
    2 ** 31
  )
}

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

/**
 * Attack grammar, as fractions of the action's total length. The melee
 * strike now reads its boundaries from the enriched playback contract
 * (PLAYBACK_PHASES.melee — windup ends 0.26, contact lands 0.46); the
 * projectile shot still times its launch off CONTACT_T until its
 * bespoke Phase 2 choreography retunes the row.
 */
const CONTACT_T = 0.46

interface Projectile {
  mesh: THREE.Object3D
  trail: THREE.Mesh[]
  from: THREE.Vector3
  to: THREE.Vector3
  /** Accumulated in-flight time (ms), frozen during a hit-stop. */
  elapsed: number
  /** Flight duration (ms) - bespoke shots can fly slower or faster. */
  life: number
  /** How this shot reads in flight (FR5). */
  look: ShotLook
}

/**
 * How a shot reads in flight (FR5): geometry family, glow, flight
 * dynamics, and trail style - declared per element and interpreted by
 * the shot builder. A new element slots in by adding one entry.
 */
interface ShotLook {
  /** Core geometry family built by the interpreter. */
  geometry: "ember" | "teardrop" | "seedCluster" | "orb"
  /** Additive halo opacity at the core (0 = none). */
  glow?: number
  /** Core size pulse amplitude (0 = none). */
  pulse?: number
  /** Lateral wobble amplitude in world units (0 = none). */
  wobble?: number
  /** Spin rate around the travel axis, radians per ms. */
  spin?: number
  /** Stretches the core along travel (teardrop) - 1 = round. */
  stretch?: number
  /** Arc-lift multiplier over PROJECTILE_ARC. */
  arc?: number
  /** Trail segment family streaming behind the shot. */
  trail: "embers" | "droplets" | "seeds" | "orbs"
}

const SHOT_LOOKS: Record<string, ShotLook> = {
  fire: {
    geometry: "ember",
    glow: 0.32,
    pulse: 0.18,
    arc: 0.7,
    spin: 0.012,
    trail: "embers",
  },
  water: {
    geometry: "teardrop",
    stretch: 1.5,
    wobble: 0.05,
    pulse: 0.05,
    arc: 0.55,
    trail: "droplets",
  },
  plant: {
    geometry: "seedCluster",
    spin: 0.02,
    arc: 1.4,
    trail: "seeds",
  },
}

const lookFor = (element: string | undefined): ShotLook =>
  (element !== undefined ? SHOT_LOOKS[element] : undefined) ?? {
    geometry: "orb",
    arc: 1,
    trail: "orbs",
  }

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
  let projectileRaf: number | null = null
  let flashRaf: number | null = null
  let driveRaf: number | null = null
  let lastDrive = 0
  /** Live shots, newest last; drained by the projectile frame loop. */
  const projectiles: Projectile[] = []
  /** Wall-clock anchors for the per-loop dt accumulation. */
  let lastProjectileTick = 0
  let lastFlashTick = 0
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
  /** Hit state: who is flashing and how far into it (accumulated ms). */
  let flash: { victim: Combatant; age: number } | null = null
  /** Freeze window on a big hit: action time does not advance inside it. */
  let hitStopUntil = 0
  /** Big-hit callback (camera punch); wired by main.ts to the scene shake. */
  let onBigHit: ((strength: number) => void) | null = null

  /** Visual intensity preference: 'full' shakes; 'reduced' keeps it calm. */
  let motionPref: "full" | "reduced" = "full"

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
      feedCtx.projectile = projectiles[0]?.mesh.position ?? null
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
    clearCharge()
    // Cross-fight staleness: a fight ending on a projectile must not make
    // the NEXT fight's first point-blank special skip its launch body,
    // and stale last-step context must not fire a director cut at cast.
    prevStepKind = null
    lastStep = null
    lastStepAt = 0
    if (projectileRaf !== null) {
      cancelAnimationFrame(projectileRaf)
      projectileRaf = null
    }
    if (burstRaf !== null) {
      cancelAnimationFrame(burstRaf)
      burstRaf = null
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
  const lambertOf = (mesh: THREE.Mesh): THREE.MeshLambertMaterial | null =>
    mesh.material instanceof THREE.MeshLambertMaterial ? mesh.material : null

  /** Put a victim's palette back exactly as captured at cast time. */
  const restoreVictim = (victim: Combatant): void => {
    for (const [mesh, base] of victim.baseColors) {
      lambertOf(mesh)?.color.copy(base)
    }
  }

  const startFlash = (victim: Combatant): void => {
    if (motionPref === "reduced") return // calm reads: no brightness pop
    // Restore the outgoing victim first — replacing the slot mid-decay
    // would otherwise strand them partially white until clear().
    if (flash) restoreVictim(flash.victim)
    flash = { victim, age: 0 }
    lastFlashTick = performance.now()
    // Snap to full white immediately; the decay loop unwinds it.
    for (const mesh of victim.baseColors.keys()) {
      lambertOf(mesh)?.color.setRGB(1, 1, 1)
    }
    if (flashRaf === null) flashRaf = requestAnimationFrame(tickFlashL)
  }

  const tickFlashL = (): void => {
    tickFlash()
    flashRaf = flash ? requestAnimationFrame(tickFlashL) : null
  }

  /** Partway back from white by accumulated age (easeOut curve). */
  const tickFlash = (): void => {
    if (!flash) return
    const now = performance.now()
    // Hit-stop freezes the flash too — the whole frame holds.
    flash.age += now < hitStopUntil ? 0 : Math.min(100, now - lastFlashTick)
    lastFlashTick = now
    const w = 1 - easeOut(Math.min(1, flash.age / FLASH_MS))
    for (const [mesh, base] of flash.victim.baseColors) {
      const mat = lambertOf(mesh)
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
      killShotMesh(p.mesh)
      for (const seg of p.trail) {
        arenaGroup.remove(seg)
        seg.geometry.dispose()
        ;(seg.material as THREE.Material).dispose()
      }
    }
    projectiles.length = 0
    for (const b of bursts) disposeBurst(b)
    bursts.length = 0
  }

  // Scratch vectors hoisted out of the frame loop — the quality gate
  // forbids per-frame allocations while the fight is live.
  const shotDir = new THREE.Vector3()
  const shotPos = new THREE.Vector3()
  const segPos = new THREE.Vector3()

  /** Free a shot's meshes — cores may be Groups (fire/plant flavors). */
  const killShotMesh = (mesh: THREE.Object3D): void => {
    arenaGroup.remove(mesh)
    mesh.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose()
        ;(o.material as THREE.Material).dispose()
      }
    })
  }

  const stepProjectiles = (): void => {
    const now = performance.now()
    // Hit-stop freezes the shot mid-air along with everything else.
    const dtMs =
      now < hitStopUntil ? 0 : Math.min(100, now - lastProjectileTick || 16.7)
    lastProjectileTick = now
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
        killShotMesh(p.mesh)
        for (const seg of p.trail) {
          arenaGroup.remove(seg)
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

  // ─── Element bursts ─────────────────────────────────────────────
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

  /** Tunables for one burst - element styles share the same machine. */
  interface BurstStyle {
    /** Fragment count. */
    puffs?: number
    /** Scatter on a flat horizontal ring instead of a random sphere. */
    ring?: boolean
    /** Downward pull, units per second squared (element default). */
    gravity?: number
    /** Lateral sine drift on fragments, units per second (element default). */
    sway?: number
    /** Burst duration in ms (default 520). */
    life?: number
    /** How far the glow shell swells (default 2.4). */
    flashGrow?: number
    /** Radius multiplier for flash and fragments (default 1). */
    size?: number
    /** Override the element hue (e.g. dust grays). */
    tint?: string
    /** Set false for non-emissive bursts (dust) with no glow shell. */
    flash?: boolean
  }

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

  const bursts: Burst[] = []
  let burstRaf: number | null = null
  let lastBurstTick = 0

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

  /**
   * An elemental pop where a blow connects or a shot lands: a growing,
   * fading glow shell plus fragments that scatter outward and fall.
   * Style presets give each tier-3 special its own kind of bloom.
   */
  const spawnBurst = (
    at: THREE.Vector3,
    element: string | undefined,
    style: BurstStyle = {},
  ): void => {
    if (motionPref === "reduced") return
    const color = new THREE.Color(style.tint ?? elementColor(element))
    const size = style.size ?? 1
    const puffs = style.puffs ?? 6
    const base = at.clone()
    base.y += 0.6
    let flash: THREE.Mesh | null = null
    if (style.flash !== false) {
      flash = new THREE.Mesh(
        new THREE.SphereGeometry(PROJECTILE_RADIUS * 1.2 * size, 12, 10),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.55,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      )
      flash.position.copy(base)
      arenaGroup.add(flash)
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
      flash,
      particles,
      elapsed: 0,
      life: style.life ?? 520,
      flashGrow: style.flashGrow ?? 2.4,
      gravity: style.gravity ?? ELEMENT_BURST[element ?? ""]?.gravity ?? 7,
      sway: style.sway ?? ELEMENT_BURST[element ?? ""]?.sway ?? 0,
    })
    if (burstRaf === null) {
      lastBurstTick = performance.now()
      burstRaf = requestAnimationFrame(tickBursts)
    }
  }

  /** Advance every live burst: flash swells and fades, fragments scatter. */
  const tickBursts = (): void => {
    burstRaf = null
    const now = performance.now()
    const dtMs =
      now < hitStopUntil ? 0 : Math.min(100, now - lastBurstTick || 16.7)
    lastBurstTick = now
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
    if (bursts.length > 0) burstRaf = requestAnimationFrame(tickBursts)
  }

  // -- Hit decals (FR7) ---------------------------------------------------
  // Scorch marks burned into the show floor where blows land: a dark
  // element-tinted circle that pops in and fades. Pooled - the oldest
  // mark yields once the cap is hit.

  interface Decal {
    mesh: THREE.Mesh
    /** Accumulated age (ms), frozen during a hit-stop. */
    elapsed: number
    life: number
  }

  const decals: Decal[] = []
  let decalRaf: number | null = null
  let lastDecalTick = 0
  const DECAL_MAX = 6
  const DECAL_LIFE_MS = 1800

  const disposeDecal = (decal: Decal): void => {
    arenaGroup.remove(decal.mesh)
    decal.mesh.geometry.dispose()
    ;(decal.mesh.material as THREE.Material).dispose()
  }

  /** Burn a floor mark under a landed blow; strength scales the mark. */
  const spawnDecal = (
    at: THREE.Vector3,
    element: string | undefined,
    strength: number,
  ): void => {
    if (motionPref === "reduced") return
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
    if (decalRaf === null) {
      lastDecalTick = performance.now()
      decalRaf = requestAnimationFrame(tickDecals)
    }
  }

  /** Advance every decal: quick pop-in, long fade. */
  const tickDecals = (): void => {
    decalRaf = null
    const now = performance.now()
    const dtMs =
      now < hitStopUntil ? 0 : Math.min(100, now - lastDecalTick || 16.7)
    lastDecalTick = now
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
    if (decals.length > 0) decalRaf = requestAnimationFrame(tickDecals)
  }

  /** Strip every decal (panel teardown). */
  const disposeAllDecals = (): void => {
    for (const decal of decals) disposeDecal(decal)
    decals.length = 0
  }

  /** The tier-4 Lance's charging orb, swelling at the thrower's mouth. */
  let chargeMesh: THREE.Mesh | null = null

  /** Grow (or create) the charge orb at the caster's mouth line. */
  const setCharge = (
    who: Combatant,
    element: string | undefined,
    scale: number,
  ): void => {
    if (motionPref === "reduced") return
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

  /** Release (and free) the charge orb. */
  const clearCharge = (): void => {
    if (!chargeMesh) return
    killShotMesh(chargeMesh)
    chargeMesh = null
  }

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
    from: Combatant,
    to: Combatant,
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
    // Re-anchor the clock so a shot fired right after a volley drained
    // does not inherit the drained loop's stale tick as free flight.
    lastProjectileTick = performance.now()
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
    startFlash(at)
    bigHit(damage)
    spawnDecal(at.group.position, element, damage ?? 4)
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
  interface Posture {
    /** Windup coil pitch amplitude (signed; hold => half-sine). */
    pitch?: number
    /** Hold the coil at full depth (half-sine) instead of a full sine. */
    hold?: boolean
    /** Windup roll amplitude (full sine). */
    roll?: number
    /** Windup vertical rise amplitude (full sine, signed). */
    rise?: number
    /** Quadratic backward pull into the windup. */
    coilX?: number
    /** Recoil pitch amplitude (positive, full sine). */
    pitchOut?: number
    /** Recoil horizontal sweep: [pull-back, overshoot]. */
    sweepX?: [number, number]
    /** Recoil vertical rise. */
    riseOut?: number
  }

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
  interface ShotSpec {
    size: number
    life: number
    /** Lateral z offset for fanned volleys. */
    spread?: number
    /** Release beat as a fraction of the launch action. */
    at: number
  }

  /** Everything a move declares about firing and landing. */
  interface MoveFx {
    /** Windup fraction of the launch action at full pacing. */
    wind: number
    /** Projectiles released (one entry per shot; volleys list several). */
    shots: ShotSpec[]
    /** Flash at the thrower's mouth on the first release. */
    muzzle?: BurstStyle
    /** Backward impulse on each release beat. */
    kick: number
    /** A charge orb swelling at the mouth through the windup. */
    charge?: { from: number; to: number }
    /** Launch body posture: windup curve and recoil curve. */
    pose: { windup: Posture; recoil: Posture }
    /** Arrival treatment where the shot lands, plus the victim shove. */
    arrival: { burst: BurstStyle; lanes?: number[]; shove: number }
    /** Point-blank compression: squeezed windup, micro-flight, beats. */
    compressed?: { wind: number; flight: number; beats: number[] }
  }

  const MOVE_FX: Record<string, MoveFx> = {
    cinder_shot: {
      wind: 0.55,
      shots: [{ size: 1.8, life: 850, at: 0.55 }],
      muzzle: {},
      kick: -0.55,
      pose: {
        windup: {
          pitch: -0.24,
          hold: true,
          roll: 0.08,
          rise: 0.05,
          coilX: 0.2,
        },
        recoil: { pitchOut: 0.14, sweepX: [0.2, -0.5] },
      },
      arrival: {
        burst: { puffs: 9, size: 1.6, life: 460, gravity: 9, flashGrow: 2.8 },
        shove: -0.5,
      },
    },
    blaze_bolt: {
      wind: 0.6,
      shots: [{ size: 1.05, life: 300, at: 0.6 }],
      muzzle: { puffs: 7, size: 1.2, life: 380, gravity: 6, flashGrow: 2.6 },
      kick: -0.6,
      charge: { from: 0.25, to: 1.3 },
      pose: {
        windup: {
          pitch: -0.26,
          hold: true,
          roll: 0.09,
          rise: 0.06,
          coilX: 0.24,
        },
        recoil: { pitchOut: 0.16, sweepX: [0.24, -0.55] },
      },
      arrival: {
        burst: { puffs: 9, size: 1.5, life: 460, gravity: 9, flashGrow: 2.8 },
        shove: -0.55,
      },
    },
    bramble_dart: {
      wind: 0.5,
      shots: [{ size: 2.2, life: 1000, at: 0.5 }],
      kick: -0.5,
      pose: {
        windup: { pitch: -0.3, hold: true, rise: -0.04, coilX: 0.26 },
        recoil: { pitchOut: 0.2, sweepX: [0.26, -0.6] },
      },
      arrival: {
        burst: { puffs: 10, size: 1.3, life: 700, gravity: 6, flashGrow: 3 },
        shove: -0.45,
      },
    },
    splash_bolt: {
      wind: 0.52,
      shots: [{ size: 1.6, life: 620, at: 0.52 }],
      kick: -0.45,
      pose: {
        windup: { pitch: -0.18, rise: -0.08, coilX: 0.18 },
        recoil: { pitchOut: 0.13, sweepX: [0.18, -0.45], riseOut: 0.05 },
      },
      arrival: {
        burst: { puffs: 12, size: 1.2, life: 600, gravity: 8, flashGrow: 3 },
        shove: -0.5,
      },
    },
    spore_burst: {
      wind: 0.26,
      shots: [
        { size: 1, life: 700, spread: -0.5, at: 0.36 },
        { size: 1, life: 700, spread: 0, at: 0.48 },
        { size: 1, life: 700, spread: 0.5, at: 0.6 },
      ],
      kick: -0.18,
      pose: {
        windup: { pitch: -0.1, rise: -0.05, coilX: 0.1 },
        recoil: { pitchOut: 0.06, sweepX: [0.1, -0.3] },
      },
      arrival: {
        burst: {
          puffs: 10,
          ring: true,
          gravity: 1.2,
          life: 900,
          flashGrow: 3.4,
          size: 1.4,
        },
        shove: 0,
      },
      compressed: { wind: 0.3, flight: 220, beats: [0.38, 0.44, 0.5] },
    },
    foam_volley: {
      wind: 0.26,
      shots: [
        { size: 0.75, life: 520, spread: 0, at: 0.28 },
        { size: 0.75, life: 520, spread: 0, at: 0.4 },
        { size: 0.75, life: 520, spread: 0, at: 0.52 },
      ],
      kick: -0.12,
      pose: {
        windup: { pitch: -0.1, rise: -0.05, coilX: 0.1 },
        recoil: { pitchOut: 0.06, sweepX: [0.1, -0.3] },
      },
      arrival: {
        burst: { size: 0.8, life: 380 },
        lanes: [-0.3, 0, 0.3],
        shove: -0.4,
      },
      compressed: { wind: 0.3, flight: 220, beats: [0.38, 0.44, 0.5] },
    },
  }

  /** Shared tier 1-2 launch archetype; also the fallback for unknown ids. */
  const DEFAULT_FX: MoveFx = {
    wind: CONTACT_T,
    shots: [{ size: 1, life: PROJECTILE_LIFE_MS, at: CONTACT_T }],
    kick: -0.35,
    pose: {
      windup: { pitch: -0.16, roll: 0.06, rise: 0.04, coilX: 0.14 },
      recoil: { pitchOut: 0.09, sweepX: [0.14, -0.34] },
    },
    arrival: { burst: {}, shove: 0 },
  }

  const fxFor = (moveId: string | undefined): MoveFx =>
    (moveId !== undefined ? MOVE_FX[moveId] : undefined) ?? DEFAULT_FX

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
        spawnBurst(p, step.element, fx.arrival.burst)
      }
    } else {
      spawnBurst(at, step.element, fx.arrival.burst)
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
            setCharge(
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
          spawnProjectile(side.actor, side.target, step.element, {
            size: shot.size,
            life: compressed ? flight : shot.life,
            spread: shot.spread ?? 0,
          })
          impulse(ao, fx.kick)
          if (firedRef.n === 0) {
            if (fx.charge) clearCharge()
            if (fx.muzzle) {
              const mouth = side.actor.group.position.clone()
              mouth.y += 0.2
              spawnBurst(mouth, step.element, fx.muzzle)
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
    clearCharge()
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
                spawnBurst(ao.group.position, step.element, {
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
      if (performance.now() < hitStopUntil) {
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
      disposeAllDecals()
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
            const mat = lambertOf(obj)
            if (!mat) return
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
      const kind = step.kind
      lastStep = step
      lastStepAt = performance.now()
      runStep(step, instant, o, r)
      prevStepKind = kind
    },
    setBigHitHandler(handler) {
      onBigHit = handler
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
      disposeAllDecals()
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
      for (const b of bursts) disposeBurst(b)
      bursts.length = 0
    },
  }
}
