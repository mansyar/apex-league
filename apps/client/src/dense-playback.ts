import {
  type FightStream,
  readFrame,
  STREAM_PHASE,
  type StreamFrame,
} from "@apex/sim"
import * as THREE from "three"
import { clamp01 } from "./anim"
import { bodyProfileOf, MM_TO_WORLD, simX, simZ } from "./arena-scale"
import { CONTACT_MARGIN_MM } from "./choreo-poses"
import type { DriveFighter } from "./fighter-driver"
import type { BurstStyle } from "./move-fx"
import {
  contactOffset,
  createPoseTracker,
  type PoseTracker,
} from "./pose-track"
import type { BattleEffects } from "./staging-fx"
import { koFall } from "./steps/pure"

/**
 * Dense playback (Continuous Arena Battle FR-13, AC-13): the client half of
 * the stream. The sim owns the fight; this module owns the mapping onto the
 * stage and the two things a viewer needs to read it:
 *
 * 1. **No snapping.** Every step is a stage target, not a teleport — the
 *    fighter driver glides, leans and walks toward it on its own clock, so
 *    the 50 Hz stream reads as continuous motion at any refresh rate.
 * 2. **Telegraphs.** A swing is only readable if it is announced. The
 *    stream's own attack phase drives a ground wedge in front of the
 *    attacker: it fades in and extends through `startup`, then snaps away
 *    when the blow commits. No new timer, no second source of truth.
 *
 * Blows also need contact: a drop in a side's hit points between steps
 * flashes the victim, pops a burst at the body, kicks the squash spring and
 * punches the camera. A body whose points reach zero topples through the
 * same KO reel the scripted path uses.
 */

/**
 * Sim millimetres → world units, owned by `arena-scale.ts`. The sim fights
 * in an 8 m × 6 m arena (`ARENA_BOUNDS`, ±4,000 × ±3,000 mm); at 0.0008
 * that is 6.4 × 4.8 world units, and each body is drawn at its own
 * simulated width (`2 * radiusMm * MM_TO_WORLD`) rather than a normalized
 * slot. One uniform factor, so a straight run in the sim is a straight run
 * on the floor and no diagonal ever skews.
 */
export { MM_TO_WORLD, simX, simZ }

/** How long a KO collapse takes, in stream steps (the reel's own length). */
const FALL_STEPS = 14

/** Fallback body radius when the cast supplies none, in mm. */
const DEFAULT_RADIUS_MM = bodyProfileOf(undefined).radiusMm
/** Radii used until the cast reports the pair's own. */
const DEFAULT_RADII: readonly [number, number] = [
  DEFAULT_RADIUS_MM,
  DEFAULT_RADIUS_MM,
]

/**
 * The fence-pin report: a low dust ring at the pinned feet. No flash —
 * Phase 4 owns the flash language — and no camera punch: the pin reads
 * through the full-intensity recoil pose plus this mark, not a shake.
 */
const PIN_BURST: BurstStyle = {
  puffs: 7,
  ring: true,
  gravity: 2.2,
  life: 600,
  flash: false,
  tint: "#9a9184",
  size: 1.1,
  flashGrow: 0,
}

/** Telegraph wedge: inner/outer radius, half-angle, and lift off the floor. */
const TELL_INNER = 0.3
const TELL_OUTER = 1.7
const TELL_HALF_ANGLE = 0.55
const TELL_LIFT = 0.03
/** Telegraph tint: warm amber, distinct from every element burst. */
const TELL_COLOR = 0xffb347

/** Big-hit camera punch strength, matching the hit-stop's own scale. */
const punchStrength = (damage: number): number =>
  Math.min(0.09, 0.02 + damage / 80)

/** One side's telegraph: a flat wedge that grows out of the attacker. */
interface Tell {
  group: THREE.Group
  mesh: THREE.Mesh
  material: THREE.MeshBasicMaterial
}

function createTell(arenaGroup: THREE.Group): Tell {
  const group = new THREE.Group()
  const geometry = new THREE.RingGeometry(
    TELL_INNER,
    TELL_OUTER,
    18,
    1,
    -Math.PI / 2 - TELL_HALF_ANGLE,
    TELL_HALF_ANGLE * 2,
  )
  const material = new THREE.MeshBasicMaterial({
    color: TELL_COLOR,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const mesh = new THREE.Mesh(geometry, material)
  // The ring is authored in the XY plane; lay it flat, then let the group's
  // yaw aim the wedge down the fighter's facing.
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = TELL_LIFT
  mesh.visible = false
  group.add(mesh)
  arenaGroup.add(group)
  return { group, mesh, material }
}

function disposeTell(arenaGroup: THREE.Group, tell: Tell): void {
  arenaGroup.remove(tell.group)
  tell.mesh.geometry.dispose()
  tell.material.dispose()
}

export interface DenseStage {
  /**
   * Show one stream step. Called once per display frame with the current
   * step; `fresh` work (damage, the topple, the pin report) only runs when
   * the step changes, so a paused or slow frame cannot replay a blow.
   * `radii` carries this pair's sim body radii in mm for the contact
   * distance; omitted means the default body on both sides.
   */
  apply(
    stream: FightStream,
    step: number,
    owned: DriveFighter,
    rival: DriveFighter,
    radii?: readonly [number, number],
  ): void
  /** Drop telegraphs and reaction state (new fight, panel closed). */
  reset(): void
  /** Free the telegraph meshes. */
  dispose(): void
}

export function createDenseStage(io: {
  arenaGroup: THREE.Group
  effects: BattleEffects
  /** Camera punch only — dense playback never freezes the stream. */
  shake: (strength: number) => void
}): DenseStage {
  const tells: [Tell, Tell] = [
    createTell(io.arenaGroup),
    createTell(io.arenaGroup),
  ]
  // Phase-1 poses: one step-counted tracker per side maps each frame onto
  // exactly one pose (the driver renders it). The KO path below still owns
  // a downed body — a "ko" pose never reaches the driver's pose channels.
  const poses: [PoseTracker, PoseTracker] = [
    createPoseTracker(),
    createPoseTracker(),
  ]
  // Reused per frame: playback must not allocate in the render loop.
  const blank = (): StreamFrame => ({
    x: 0,
    z: 0,
    facingX: 0,
    facingZ: 0,
    phase: 0,
    phaseT: 0,
    hp: 0,
    hitstunMs: 0,
    pinned: false,
  })
  const frames: [StreamFrame, StreamFrame] = [blank(), blank()]
  const lastHp: [number, number] = [0, 0]
  const downAt: [number, number] = [-1, -1]
  const thudded: [boolean, boolean] = [false, false]
  const wasPinned: [boolean, boolean] = [false, false]
  let lastStep = -1

  const showTell = (side: 0 | 1, c: DriveFighter, frame: StreamFrame): void => {
    const tell = tells[side]
    const charging = frame.phase === STREAM_PHASE.startup
    tell.mesh.visible = charging
    if (!charging) return
    const t = clamp01(frame.phaseT / 255)
    // Aim the wedge down the body's facing, at its feet.
    tell.group.position.set(c.group.position.x, 0, c.group.position.z)
    tell.group.rotation.y = Math.atan2(frame.facingX, frame.facingZ)
    const grow = 0.55 + t * 0.45
    tell.group.scale.setScalar(grow)
    tell.material.opacity = 0.16 + t * 0.62
  }

  const react = (c: DriveFighter, damage: number): void => {
    io.effects.startFlash(c)
    io.effects.spawnBurst(c.group.position, undefined)
    c.squash.v += 6 + damage * 0.35
    if (damage >= 4) io.shake(punchStrength(damage))
  }

  const topple = (
    side: 0 | 1,
    c: DriveFighter,
    step: number,
    fresh: boolean,
  ): void => {
    if (downAt[side] < 0) {
      downAt[side] = step
      thudded[side] = false
      c.down = true
      c.fall = 0
    }
    const t = clamp01((step - downAt[side]) / FALL_STEPS)
    const pose = koFall(t)
    if (pose.fall > 0) c.fall = pose.fall
    c.lean.pitch = pose.pitch
    if (fresh && pose.thud && !thudded[side]) {
      thudded[side] = true
      c.squash.v += 9
      io.effects.spawnBurst(c.group.position, undefined, {
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
  }

  return {
    apply(stream, step, owned, rival, radii?) {
      const fighters: [DriveFighter, DriveFighter] = [owned, rival]
      const fresh = step !== lastStep
      lastStep = step
      // Both frames before either pose: the contact gap needs the pair,
      // and the trackers must see the same step together.
      const self: [StreamFrame, StreamFrame] = [
        readFrame(stream, step, 0, frames[0]),
        readFrame(stream, step, 1, frames[1]),
      ]
      const pair = radii ?? DEFAULT_RADII
      const contactMm = pair[0] + pair[1] + CONTACT_MARGIN_MM
      // The clinch nudge: inside contact distance both stage targets slide
      // apart along the contact axis (bounded, deterministic) so the rigs
      // read as two bodies colliding, never one inside the other. A downed
      // body is owned by the topple, so the clinch releases at any KO.
      const clinch = self[0].hp > 0 && self[1].hp > 0
      const nudge = clinch
        ? contactOffset(self[0].x, self[0].z, self[1].x, self[1].z, contactMm)
        : { x0: 0, z0: 0, x1: 0, z1: 0 }
      const nudges: [{ x: number; z: number }, { x: number; z: number }] = [
        { x: nudge.x0, z: nudge.z0 },
        { x: nudge.x1, z: nudge.z1 },
      ]
      for (const side of [0, 1] as const) {
        const c = fighters[side]
        const frame = self[side]
        const foe = self[side === 0 ? 1 : 0]
        // The driver walks toward this target on its own clock — the stream
        // sets where the body belongs, never where it is.
        if (!c.down) {
          c.stage.x = simX(frame.x + nudges[side].x)
          c.stage.z = simZ(frame.z + nudges[side].z)
        }
        showTell(side, c, frame)
        const pose = poses[side].update(step, frame, foe, contactMm)
        c.pose = pose.pose
        c.poseK = pose.intensity
        // The fence pin reports on its rising edge: the recoil pose reads
        // at full intensity with planted feet (the driver parks the gait)
        // and this dust ring marks the pinned feet. No flash, no punch.
        if (fresh && frame.pinned && !wasPinned[side]) {
          io.effects.spawnBurst(c.group.position, undefined, PIN_BURST)
        }
        wasPinned[side] = frame.pinned
        if (fresh && lastHp[side] > 0 && frame.hp < lastHp[side]) {
          react(c, lastHp[side] - frame.hp)
        }
        if (frame.hp <= 0 || downAt[side] >= 0) topple(side, c, step, fresh)
        lastHp[side] = frame.hp
      }
    },
    reset() {
      for (const tell of tells) tell.mesh.visible = false
      for (const tracker of poses) tracker.reset()
      lastHp[0] = 0
      lastHp[1] = 0
      downAt[0] = -1
      downAt[1] = -1
      thudded[0] = false
      thudded[1] = false
      wasPinned[0] = false
      wasPinned[1] = false
      lastStep = -1
    },
    dispose() {
      for (const tell of tells) disposeTell(io.arenaGroup, tell)
    },
  }
}
