import * as THREE from "three"
import { approach, stepSquash } from "./anim"
import { ARENA_HALF_X, ARENA_HALF_Z } from "./arena-scale"
import type { BodyProfile } from "./choreo"
import type { StreamPose } from "./choreo-poses"
import { driveFace, type FaceEyes } from "./face-motion"
import { applyUprightPose, composeScale } from "./pose-apply"

/** Pose-math helpers, owned by pose-apply.ts (R2/F7 split). */
export {
  composePosition,
  composeScale,
  shortestAngle,
  yawStep,
} from "./pose-apply"

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

/** Forward lean into movement, radians per unit of speed. */
const LEAN_PER_SPEED = 0.045
const LEAN_MAX = 0.14

/** Squash-and-stretch spring (weight): stiffness and damping. */
const SQUASH_K = 210
const SQUASH_D = 13

/**
 * Show-floor bounds: fighters are clamped to the painted boundary, which is
 * drawn from the same `ARENA_BOUNDS` the resolver uses (`arena-scale.ts`),
 * so nobody leaves the paint or the camera's view. The stream already
 * respects its own fence, so a streamed fight is never bent to fit.
 */
const BOUNDS_X = ARENA_HALF_X
const BOUNDS_Z = ARENA_HALF_Z

/** Lift of a fallen body so it still reads on the floor. */
const DOWN_LIFT = 0.28
/** Gait cadence: walk cycles per unit of travelled distance. */
const GAIT_PER_SPEED = 5.2

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
  /**
   * The live stream pose (flinch/crumple/crouch/roll/recoil/press) and
   * its 0..1 intensity. Dense playback sets both every step; the driver
   * renders them. Absent means no pose — the legacy paths never set one,
   * so they read untouched.
   */
  pose?: StreamPose
  poseK?: number
  /** Roll tip -1..1 (R1/F3). */
  poseLateral?: number
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
        driveFace(c.eyes, c.faceSeed ?? 0, seconds, glanceSuppressed)
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

      // The upright pose math lives in pose-apply.ts (R2/F7 split) — the
      // driver keeps the glide, the lean, and the downed branch.
      applyUprightPose(c, other, { now, dt, life, speed })
    }
  }

  return {
    step,
    syncClock: (now: number): void => {
      last = now
    },
  }
}
