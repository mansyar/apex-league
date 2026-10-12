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
import { type BodyProfile, hurtImpulse, idleSway, profileFor } from "./choreo"
import { buildCreatureGroup } from "./creature"

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
  /** Element look of this shot (FR5 shared archetype, flavored per element). */
  flavor: ShotFlavor
}

/**
 * One shared ranged attack choreography (FR5 tier 1–2): the launch body
 * and flight timing never change — only the shot's *look* does. Fire
 * flies flat and hot, water streams low, plant lobs high; anything else
 * keeps the neutral orb.
 */
interface ShotFlavor {
  /** Arc-lift multiplier over PROJECTILE_ARC. */
  arc: number
  /** Core size pulse amplitude (0 = none). */
  pulse: number
  /** Lateral wobble amplitude in world units (0 = none). */
  wobble: number
  /** Spin rate around the travel axis, radians per ms. */
  spin: number
  /** Stretches the core along travel (teardrop) — 1 = round. */
  stretch: number
}

const SHOT_FLAVORS: Record<string, ShotFlavor> = {
  fire: { arc: 0.7, pulse: 0.18, wobble: 0, spin: 0.012, stretch: 1 },
  water: { arc: 0.55, pulse: 0.05, wobble: 0.05, spin: 0, stretch: 1.5 },
  plant: { arc: 1.4, pulse: 0, wobble: 0, spin: 0.02, stretch: 1 },
}

const shotFlavor = (element: string | undefined): ShotFlavor =>
  (element !== undefined ? SHOT_FLAVORS[element] : undefined) ??
  ({ arc: 1, pulse: 0, wobble: 0, spin: 0, stretch: 1 } satisfies ShotFlavor)

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
        c.group.rotation.z = -c.away * (Math.PI / 2) * c.fall
        c.group.rotation.x = 0
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
      const t = p.elapsed / PROJECTILE_LIFE_MS
      shotDir.copy(p.to).sub(p.from)
      const travel = Math.min(1, t)
      shotPos.copy(p.from).addScaledVector(shotDir, travel)
      // Flavored arc lift: fire flat and hot, water low, plant a high lob.
      shotPos.y += Math.sin(travel * Math.PI) * PROJECTILE_ARC * p.flavor.arc
      if (p.flavor.wobble > 0) {
        // Water streams with a slight side-to-side ripple.
        shotPos.x += Math.sin(p.elapsed * 0.02) * p.flavor.wobble
      }
      p.mesh.position.copy(shotPos)
      if (p.flavor.spin > 0) {
        // Seeds tumble; embers corkscrew around the travel axis.
        p.mesh.rotation.z += p.flavor.spin * dtMs
        p.mesh.rotation.x += p.flavor.spin * 0.6 * dtMs
      }
      if (p.flavor.pulse > 0) {
        const s = 1 + p.flavor.pulse * Math.sin(p.elapsed * 0.045)
        p.mesh.scale.setScalar(s)
      } else if (p.flavor.stretch > 1.2) {
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
        segPos.y += Math.sin(lag * Math.PI) * PROJECTILE_ARC * p.flavor.arc
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
   */
  const spawnBurst = (at: THREE.Vector3, element: string | undefined): void => {
    if (motionPref === "reduced") return
    const color = new THREE.Color(elementColor(element))
    const base = at.clone()
    base.y += 0.6
    const flash = new THREE.Mesh(
      new THREE.SphereGeometry(PROJECTILE_RADIUS * 1.2, 12, 10),
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
    const particles: BurstParticle[] = []
    const count = 6
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(PROJECTILE_RADIUS * 0.4, 8, 6),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.85,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      )
      mesh.position.copy(base)
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.8
      const speed = 1.4 + Math.random() * 1.2
      particles.push({
        mesh,
        vel: new THREE.Vector3(
          Math.cos(angle) * speed,
          0.9 + Math.random() * 1.1,
          Math.sin(angle) * speed * 0.6,
        ),
        spin: (Math.random() - 0.5) * 0.02,
      })
      arenaGroup.add(mesh)
    }
    bursts.push({ flash, particles, elapsed: 0, life: 520 })
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
      const burst = bursts[i]!
      burst.elapsed += dtMs
      const k = Math.min(1, burst.elapsed / burst.life)
      if (burst.flash) {
        const flashMat = burst.flash.material as THREE.MeshBasicMaterial
        burst.flash.scale.setScalar(1 + k * 2.4)
        flashMat.opacity = 0.55 * (1 - k)
      }
      for (const part of burst.particles) {
        part.vel.y -= 7 * dt
        part.mesh.position.addScaledVector(part.vel, dt)
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

  /** A glowing core in the element hue plus a tapering additive orb trail. */
  const spawnProjectile = (
    from: Combatant,
    to: Combatant,
    element: string | undefined,
  ): void => {
    const color = new THREE.Color(elementColor(element))
    const flavor = shotFlavor(element)
    // Launch from the thrower's mouth line, land on the victim's chest.
    const origin = from.group.position.clone()
    origin.y += 0.8
    const target = to.group.position.clone()
    target.y += 0.6
    // Core geometry per flavor (FR5): fire = ember + additive glow halo;
    // plant = a tumbling seed cluster; water = teardrop; else the orb.
    let core: THREE.Object3D
    if (element === "fire") {
      core = new THREE.Group()
      const ember = new THREE.Mesh(
        new THREE.IcosahedronGeometry(PROJECTILE_RADIUS * 0.8, 0),
        new THREE.MeshBasicMaterial({ color }),
      )
      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(PROJECTILE_RADIUS * 1.55, 12, 10),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.32,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      )
      core.add(ember, halo)
    } else if (element === "plant") {
      core = new THREE.Group()
      const seedGeo = new THREE.OctahedronGeometry(PROJECTILE_RADIUS * 0.55, 0)
      const seedMat = new THREE.MeshBasicMaterial({ color })
      for (let i = 0; i < 3; i++) {
        const seed = new THREE.Mesh(seedGeo, seedMat)
        const angle = (i / 3) * Math.PI * 2
        seed.position.set(Math.cos(angle) * 0.15, Math.sin(angle) * 0.15, 0)
        core.add(seed)
      }
    } else {
      core = new THREE.Mesh(
        new THREE.SphereGeometry(PROJECTILE_RADIUS, 12, 10),
        new THREE.MeshBasicMaterial({ color }),
      )
      if (flavor.stretch > 1.2) core.scale.set(0.72, 0.72, flavor.stretch)
    }
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
      elapsed: 0,
      flavor,
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

  /**
   * The victim reaction at an attack's contact moment: shove the stage
   * (persistent), squash the body (weight), flash and stop the frame on
   * big hits. One helper so basic and special hits look like the same
   * physical impact.
   */
  const contactReaction = (damage: number | undefined, at: Combatant): void => {
    const knock = strikeReach(damage)
    // Knockback pushes the victim OUTWARD (own away side, same convention
    // as the dodge dash) — a minus here drags the pair into each other
    // with every landed hit.
    at.stage.x += at.away * knock
    at.stage.z += (Math.random() - 0.5) * 0.3
    impulse(at, hurtImpulse(at.profile, 0.85))
    startFlash(at)
    bigHit(damage)
  }

  /** Lateral weave: alternate attack sides so no two hits share a lane. */
  const weave = (step: PlaybackStep): number =>
    (step.tick % 2 === 0 ? 1 : -1) * 0.55

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
          if (hit) contactReaction(step.damage, side.target)
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
                  contactReaction(step.damage, at)
                } else if (dodged) {
                  // The target slipped: a quick dash off the lane.
                  at.stage.x += at.away * 0.85
                  impulse(at, -0.3)
                }
              }
              if (hit && w > 0.6) impulse(ao, 0.12) // attacker settles heavy
            }
          },
          o,
          r,
        )
        break
      }
      case "projectile": {
        // Ranged attack: rear coil, snap release at the launch moment,
        // then a recoil the body carries. The shot leaves at CONTACT_T,
        // not at step start, so the wind-up reads before the fire.
        if (instant) {
          // No flight to show: the following impact step resolves the
          // hit on the spot, so spawning a 700ms orb would just hang.
          break
        }
        const firedRef = { done: false }
        actionRaf = startAction(
          (t, ao) => {
            if (t < CONTACT_T) {
              // Wind-up: rear coil, slight rise, mirrored roll.
              const w = t / CONTACT_T
              ao.lean.pitch = -0.16 * Math.sin(w * Math.PI)
              ao.lean.roll = 0.06 * Math.sin(w * Math.PI)
              ao.offset.y = 0.04 * Math.sin(w * Math.PI)
              ao.offset.x = -side.actor.away * 0.14 * (w * w)
            } else {
              // Release: snap forward, launch, and ride the recoil back.
              if (!firedRef.done) {
                firedRef.done = true
                spawnProjectile(side.actor, side.target, step.element)
                impulse(ao, -0.35) // stretch on the snap
              }
              const w = clamp01((t - CONTACT_T) / (1 - CONTACT_T))
              ao.lean.pitch = 0.09 * Math.sin(w * Math.PI)
              ao.offset.x =
                -side.actor.away * (0.14 - 0.34 * Math.sin(w * Math.PI))
            }
          },
          o,
          r,
        )
        break
      }
      case "impact": {
        // Specials report their own landing here (the launch already
        // fired). A dodge is a real evasion: a dash off the lane.
        if (!step.hit) {
          if (step.missReason === "dodge") {
            side.target.stage.x += side.target.away * 0.85
            if (instant) {
              impulse(side.target, -0.3)
              snapTo(side.target)
            }
          }
          break
        }
        if (instant) {
          contactReaction(step.damage, side.target)
          snapTo(side.target)
        } else {
          reactionAction(step.damage, side.target)
        }
        // Elemental burst at the strike point for specials (FR5).
        if (step.element) {
          spawnBurst(side.target.group.position, step.element)
        }
        break
      }
      case "down": {
        // Fall on the back and stay down — the action drives `fall`, the
        // driver renders the topple while the squash adds landing weight.
        side.actor.down = true
        if (instant) {
          side.actor.fall = 1
          snapTo(side.actor)
          impulse(side.actor, 0.9)
        } else {
          let thudded = false
          actionRaf = startAction(
            (t, ao) => {
              ao.fall = easeOut(clamp01(t / 0.7))
              if (t > 0.55 && !thudded) {
                thudded = true
                impulse(ao, 0.9)
              }
            },
            o,
            r,
          )
        }
        break
      }
      case "judge": {
        // Result stamp: the standing winner takes a double victory hop —
        // each hop stretches on the rise and squashes on the landing.
        const standing = [o, r].filter((c) => !c.down)
        if (instant || standing.length === 0) break
        const hopRef = { hops: 0 }
        const landedRef = { count: 0 }
        actionRaf = startAction(
          (t, ao) => {
            if (ao.down) return
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
          o,
          r,
        )
        break
      }
    }
  }

  /**
   * The victim-only portion of a special landing: knockback persists in
   * the stage, the body squashes and settles, flash + hit-stop fire.
   */
  const reactionAction = (damage: number | undefined, at: Combatant): void => {
    contactReaction(damage, at)
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
        const footprint = Math.max(size.x, size.z)
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
      runStep(step, instant, o, r)
    },
    setBigHitHandler(handler) {
      onBigHit = handler
    },
    setMotionPref(pref) {
      motionPref = pref
    },
    setPace(msPerStep) {
      paceMs = msPerStep
    },
    clear() {
      stop()
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
