import {
  CHAMPION_STAT_BOOST,
  EVOLUTION_STAT_BOOST,
  type PlaybackStep,
} from "@apex/sim"
import { generate } from "@apex/voxel"
import * as THREE from "three"
import { buildCreatureGroup } from "./creature"
import { elementHue } from "./element"

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

/** Resting gap between fighters (the size of a neutral stance). */
const STANCE_GAP = 1.9

/** Contact distance an attack pushes into (bodies nearly touch). */
const CONTACT_GAP = 0.72

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

/**
 * Element hues come from ui/element.ts, which re-derives them from the
 * sim's canonical ELEMENT_HUE contract (Fire 18°, Plant 110°, Water 205°,
 * Electric 50°, Earth 28°, Wind 165°). A projectile reads as its type at
 * a glance, and the color survives color-blindness checks when paired
 * with the move icon in the HUD.
 */
const ELEMENT_COLOR_FALLBACK = "#cfd6e4"

const elementColor = (element: string | undefined): string =>
  element === undefined
    ? ELEMENT_COLOR_FALLBACK
    : new THREE.Color()
        .setHSL((elementHue(element) % 360) / 360, 0.75, 0.6)
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

/** Attack grammar, as fractions of the action's total length. */
const WINDUP_END = 0.26
const CONTACT_T = 0.46

interface Projectile {
  mesh: THREE.Mesh
  trail: THREE.Mesh[]
  from: THREE.Vector3
  to: THREE.Vector3
  /** Accumulated in-flight time (ms), frozen during a hit-stop. */
  elapsed: number
}

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
  group: THREE.Group
  home: THREE.Vector3
  /** Local "away" direction (X axis, ±1): where retreats and knockbacks go. */
  away: 1 | -1
  down: boolean
  /** Per-part base colors captured at cast time, keyed by part name. */
  baseColors: Map<THREE.Mesh, THREE.Color>
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
  /** The rig's baked voxel scale — the squash spring composes with it. */
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

  const easeOut = (t: number): number => 1 - (1 - t) * (1 - t)
  const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3
  const clamp01 = (t: number): number => Math.min(1, Math.max(0, t))

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
      c.squash.v += (-SQUASH_K * c.squash.s - SQUASH_D * c.squash.v) * dt
      c.squash.s += c.squash.v * dt
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
      const k = 1 - Math.exp(-GLIDE * dt)
      c.smooth.lerp(c.stage, k)
      // Frame velocity from measured motion — the gait's tempo source.
      c.velocity.copy(c.smooth).sub(glideFrom).divideScalar(dt)
      const speed = Math.hypot(c.velocity.x, c.velocity.z)
      c.walkPhase += speed * dt * 5.2
      // Lean into movement: pitch with forward speed, roll with the gait.
      const leanTarget = Math.min(LEAN_MAX, speed * LEAN_PER_SPEED)
      c.lean.pitch += (leanTarget - c.lean.pitch) * (1 - Math.exp(-8 * dt))
      c.lean.roll *= Math.exp(-6 * dt)

      // Compose the pose: walk position + action offset + gait bob +
      // breath at rest, all scaled by the squash spring (weight).
      const gait = Math.abs(Math.sin(c.walkPhase * Math.PI)) * GAIT_AMP * life
      const breath =
        Math.sin(now * 0.001 * BREATH_FREQ * 2 + c.phase) *
        BREATH_AMP *
        (speed < 0.15 ? 1 : 0)
      c.group.position.set(
        c.smooth.x + c.offset.x,
        Math.max(
          0,
          c.smooth.y + c.offset.y + gait + breath - c.squash.s * 0.42,
        ),
        c.smooth.z + c.offset.z,
      )
      const sq = c.squash.s
      // Compose with the rig's baked voxel scale, never replace it — a
      // bare set() blows the voxel-local coordinates up 10× and the
      // fighter's meshes land outside the arena.
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
        shortestAngle(desired - c.group.rotation.y) * (1 - Math.exp(-9 * dt))
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

  // Scratch vectors hoisted out of the frame loop — the quality gate
  // forbids per-frame allocations while the fight is live.
  const shotDir = new THREE.Vector3()
  const shotPos = new THREE.Vector3()
  const segPos = new THREE.Vector3()

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
      shotPos.y += Math.sin(travel * Math.PI) * PROJECTILE_ARC
      p.mesh.position.copy(shotPos)
      // Trail lags behind it along the same line, with the same arc lift.
      for (let s = 0; s < p.trail.length; s++) {
        const lag = Math.max(0, travel - (s + 1) * 0.09)
        segPos.copy(p.from).addScaledVector(shotDir, lag)
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
    // Launch from the thrower's mouth line, land on the victim's chest.
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
      elapsed: 0,
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
    at.stage.x -= at.away * knock
    at.stage.z += (Math.random() - 0.5) * 0.3
    impulse(at, 0.85)
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
    const side = spotOf(step.actor, o, r)

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
            if (t < WINDUP_END) {
              // Anticipation: coil back on the approach line, drop weight.
              const w = t / WINDUP_END
              ao.offset.copy(dir).multiplyScalar(-0.22 * Math.sin(w * Math.PI))
              ao.offset.y = -0.05 * Math.sin(w * Math.PI)
              ao.lean.roll = 0.05 * Math.sin(w * Math.PI)
            } else if (t < CONTACT_T) {
              // The strike: uncoil fast down the line (easeOutCubic).
              const w = clamp01((t - WINDUP_END) / (CONTACT_T - WINDUP_END))
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
              const w = clamp01((t - CONTACT_T) / (1 - CONTACT_T))
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
    },
  }
}
