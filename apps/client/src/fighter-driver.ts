import * as THREE from "three"
import {
  approach,
  breath as breathSine,
  gait as gaitBob,
  stepSquash,
} from "./anim"
import { type BodyProfile, idleSway } from "./choreo"
import { driveFace, type FaceEyes } from "./face-motion"

/**
 * The living-fight driver: one loop owns every fighter's pose every
 * frame — walk to stage with a gait, weight (squash spring), lean into
 * movement, face the rival, render falls. Extracted from staging.ts so
 * the pose math has pure, unit-tested seams; the per-fighter state
 * (stage, smooth, squash, lean…) still lives on the combatants, and the
 * staging factory keeps the rAF wiring and the camera-director feed.
 */
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
 * Show-floor bounds: fighters are clamped well inside the painted
 * boundary ring (8.3) and comfortably inside the broadcast framing, so
 * nobody leaves the arena or the camera's view.
 */
const BOUNDS_X = 3.2
const BOUNDS_Z = 1.8

/** How deep the squash spring dips the body into the floor. */
const SQUASH_DIP = 0.42
/** Lift of a fallen body so it still reads on the floor. */
const DOWN_LIFT = 0.28
/** Yaw-follow strength of the face-the-rival ease. */
const FACE_RATE = 9
/** Gait cadence: walk cycles per unit of travelled distance. */
const GAIT_PER_SPEED = 5.2

/** Wrap an angle delta into [-π, π) so yaw always takes the short way. */
export function shortestAngle(a: number): number {
  const turn = Math.PI * 2
  return ((((a + Math.PI) % turn) + turn) % turn) - Math.PI
}

/** Squash-and-stretch scale for a fighter: x/z widen, y flattens. A
 * downed body floors its collapse so the topple never inverts the mesh. */
export function composeScale(
  base: number,
  squash: number,
  downed: boolean,
): { x: number; y: number; z: number } {
  return {
    x: base * (1 + squash * 0.34),
    y: downed
      ? base * Math.max(0.05, 1 - squash * 0.5)
      : base * (1 - squash * 0.5),
    z: base * (1 + squash * 0.34),
  }
}

/** Compose the body position: walk position + action offset + gait bob +
 * breath at rest, all minus the squash dip (weight). The floor is a hard
 * clamp — no pose may sink the creature below it. */
export function composePosition(
  smooth: { x: number; y: number; z: number },
  offset: { x: number; y: number; z: number },
  gait: number,
  breath: number,
  sway: number,
  squashS: number,
): { x: number; y: number; z: number } {
  return {
    x: smooth.x + offset.x,
    y: Math.max(0, smooth.y + offset.y + gait + breath - squashS * SQUASH_DIP),
    z: smooth.z + offset.z + sway,
  }
}

/** One step of the face-the-rival ease: yaw closes on the desired angle
 * along the wrapped short path, weighted by the approach factor. */
export function yawStep(
  current: number,
  desired: number,
  factor: number,
): number {
  return current + shortestAngle(desired - current) * factor
}

/** Forward lean target for the current speed, scaled by the archetype's
 * body-language profile and clamped so sprints never fold the body. */
export function leanTarget(speed: number, profileLeanPitch: number): number {
  return Math.min(LEAN_MAX, speed * LEAN_PER_SPEED * profileLeanPitch)
}

/** Advance the gait phase by distance travelled; cadence scales with the
 * archetype's gait frequency. */
export function advanceWalkPhase(
  phase: number,
  speed: number,
  dt: number,
  gaitFreq: number,
): number {
  return phase + speed * dt * GAIT_PER_SPEED * gaitFreq
}

/** Keep a stage target inside the show floor (knockbacks, retreats and
 * approach overshoot all funnel back into the painted ring). */
export function clampStage(x: number, z: number): { x: number; z: number } {
  return {
    x: Math.max(-BOUNDS_X, Math.min(BOUNDS_X, x)),
    z: Math.max(-BOUNDS_Z, Math.min(BOUNDS_Z, z)),
  }
}

/** The downed fighter's pose: toppled onto the back, body along the
 * floor, head away from the standing rival, at a slight lift so the body
 * reads on the floor. The KO reel (FR8) pitches the body back through
 * lean before the topple takes over — the same lean channel the strike
 * phases use. */
export function topplePose(
  away: number,
  fall: number,
  leanPitch: number,
): { rotX: number; rotZ: number; y: number } {
  return {
    rotZ: -away * (Math.PI / 2) * fall,
    rotX: leanPitch,
    y: DOWN_LIFT * fall,
  }
}

/**
 * The pose-relevant slice of a combatant. staging.ts's full Combatant
 * satisfies this structurally — the driver reads and mutates only what
 * the pose loop owns.
 */
export interface DriveFighter {
  /** Display name - the step registry's fallback identity match. */
  name: string
  /** Stable side key ("left"/"right") - wins over the name in mirror matches. */
  key?: string
  group: THREE.Group
  stage: THREE.Vector3
  smooth: THREE.Vector3
  velocity: THREE.Vector3
  offset: THREE.Vector3
  /** Squash state: s is the deformation, v its velocity (a damped spring). */
  squash: { s: number; v: number }
  /** Gait phase, advanced by distance travelled (drives the walk bob). */
  walkPhase: number
  /** Per-fighter bob phase so the pair never breathes in lockstep. */
  phase: number
  /** The holder's base scale (identity) — the squash composes with it. */
  baseScale: number
  /** Eye parts, cached at cast time (face idle looks nothing up per frame). */
  eyes?: FaceEyes
  /** Blink/glance schedule seed — the creature's own seed, not the clock. */
  faceSeed?: number
  profile: BodyProfile
  down: boolean
  /** Local "away" direction (X axis, ±1): where knockbacks go. */
  away: 1 | -1
  /** Fall progress 0..1 for the down step; 0 = upright. */
  fall: number
  /** Attack lean: pitch (x) and roll (z) authored by the running action. */
  lean: { pitch: number; roll: number }
  /**
   * Each Lambert mesh's unlit color, captured at cast - the white-out
   * flash restores from it. Carried here so the step handlers can flash
   * a victim without downcasting to staging's concrete combatant.
   */
  baseColors: Map<THREE.Mesh, THREE.Color>
}

export interface FighterDriver {
  /** Advance one drive frame at wall-clock `now` (ms). */
  step(now: number): void
  /** Re-anchor the dt clock (start/restart — no giant first-step dt). */
  syncClock(now: number): void
}

export function createFighterDriver(io: {
  /** The (actor, other) pairs to pose each frame, both directions. */
  pair: () => Array<[DriveFighter, DriveFighter]>
  /** Live visual-intensity preference: 'reduced' zeroes gait/sway. */
  pref: () => "full" | "reduced"
  /** Extra glance suppression (hit-stop): the eye freezes, the lid still blinks. */
  glanceSuppressed?: () => boolean
}): FighterDriver {
  let last = 0
  // Scratch vector hoisted out of the always-running driver loop.
  const glideFrom = new THREE.Vector3()

  const step = (now: number): void => {
    // 1/30 cap keeps the SQUASH spring (ω ≈ 14.5 rad/s) well inside its
    // symplectic-Euler stability window even after a tab-return hitch.
    const dt = Math.min(1 / 30, (now - last) / 1000 || 1 / 60)
    last = now
    const life = io.pref() === "reduced" ? 0 : 1
    // Face idle runs for every fighter on every frame — including a downed
    // one, whose eyes are still attached to its head. Reduced motion keeps
    // the blink (a lid, not travel) and parks the glance; hit-stop freezes
    // the glance too, so the eye does not wander while the world is held.
    const seconds = now / 1000
    const glanceSuppressed = life === 0 || (io.glanceSuppressed?.() ?? false)
    for (const [c, other] of io.pair()) {
      if (c.eyes) {
        driveFace(c.eyes, c.faceSeed ?? 0, seconds, {
          suppressed: glanceSuppressed,
        })
      }
      // Squash spring integrates for everyone — the KO landing impulse
      // needs it even while the down branch owns the pose.
      c.squash = stepSquash(c.squash, dt, SQUASH_K, SQUASH_D)
      // Downed fighter: the driver keeps rendering the topple (the fall
      // action only lives for the fall beat; afterwards the driver owns
      // the pose).
      if (c.down) {
        const pose = topplePose(c.away, c.fall, c.lean.pitch)
        c.group.rotation.z = pose.rotZ
        c.group.rotation.x = pose.rotX
        c.group.position.set(c.smooth.x, pose.y, c.smooth.z)
        const sq = c.squash.s
        const downScale = composeScale(c.baseScale, sq, true)
        c.group.scale.set(downScale.x, downScale.y, downScale.z)
        continue
      }
      const clamped = clampStage(c.stage.x, c.stage.z)
      c.stage.x = clamped.x
      c.stage.z = clamped.z
      // Walk toward the stage target (exp smoothing, frame-rate safe).
      glideFrom.copy(c.smooth)
      c.smooth.lerp(c.stage, approach(0, 1, GLIDE, dt))
      // Frame velocity from measured motion — the gait's tempo source.
      c.velocity.copy(c.smooth).sub(glideFrom).divideScalar(dt)
      const speed = Math.hypot(c.velocity.x, c.velocity.z)
      c.walkPhase = advanceWalkPhase(c.walkPhase, speed, dt, c.profile.gaitFreq)
      // Lean into movement: pitch with forward speed, roll with the gait.
      const pitch = leanTarget(speed, c.profile.leanPitch)
      c.lean.pitch = approach(c.lean.pitch, pitch, 8, dt)
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
      const pos = composePosition(
        c.smooth,
        c.offset,
        gait,
        breath,
        sway,
        c.squash.s,
      )
      c.group.position.set(pos.x, pos.y, pos.z)
      const upScale = composeScale(c.baseScale, c.squash.s, false)
      c.group.scale.set(upScale.x, upScale.y, upScale.z)
      // Face the rival every frame; yaw leads, pitch/roll support.
      const dx = other.group.position.x - c.group.position.x
      const dz = other.group.position.z - c.group.position.z
      const desired = Math.atan2(dx, dz)
      c.group.rotation.y = yawStep(
        c.group.rotation.y,
        desired,
        approach(0, 1, FACE_RATE, dt),
      )
      c.group.rotation.x = c.lean.pitch
      c.group.rotation.z = c.lean.roll
    }
  }

  return {
    step,
    syncClock: (now: number): void => {
      last = now
    },
  }
}
