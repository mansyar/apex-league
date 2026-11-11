import {
  type FightStream,
  readFrame,
  STREAM_PHASE,
  type StreamFrame,
} from "@apex/sim"
import type * as THREE from "three"
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
import { createReducedReporter } from "./reduced-flash"
import type { BattleEffects } from "./staging-fx"
import { koFall } from "./steps/pure"
import { createTellSet, type TellSet } from "./tell-wedge"

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

/**
 * The KO dissolve: the downed body breaks into settling dust at the floor.
 * Same dust palette as the pin report (the pinned read stays consistent),
 * grounded so it erupts from the feet rather than the chest line, and
 * covered by the burst layer's cap like every other accent. No flash —
 * Phase 4 owns the flash language.
 */
const KO_DISSOLVE: BurstStyle = {
  puffs: 9,
  ring: true,
  gravity: 2.2,
  life: 750,
  flash: false,
  tint: "#9a9184",
  size: 1.3,
  flashGrow: 0,
  grounded: true,
}

/** Big-hit camera punch strength, matching the hit-stop's own scale. */
const punchStrength = (damage: number): number =>
  Math.min(0.09, 0.02 + damage / 80)

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
  /** Reduced-motion read: flashes replace poses, bursts and the wedge. */
  pref?: () => "full" | "reduced"
}): DenseStage {
  const tells: TellSet = createTellSet(io.arenaGroup)
  // Reduced-motion reports (FR-9): static flashes own every entry edge.
  // Full motion never touches the reporter; reduced never touches bursts.
  const reducedUi = createReducedReporter({ arenaGroup: io.arenaGroup })
  const reduced = (): boolean => io.pref?.() === "reduced"
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

  // The reach-derived telegraph: length and arc come from the committed
  // move's reachMm plus the attacker's body radius (tell-wedge owns the
  // estimator and the meshes); aiming stays down the stream facing.
  const showTell = (
    side: 0 | 1,
    c: DriveFighter,
    frame: StreamFrame,
    radiusMm: number,
    stepMs: number,
    step: number,
  ): void => {
    tells.update(side, c.group, frame, radiusMm, stepMs, step)
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
      io.effects.spawnBurst(c.group.position, undefined, KO_DISSOLVE)
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
        // Reduced motion hides the wedge: the startup entry flashes once.
        const charging = frame.phase === STREAM_PHASE.startup
        if (reduced()) {
          reducedUi.startup(side, charging, fresh, c.group.position)
        } else {
          showTell(
            side,
            c,
            frame,
            pair[side] ?? DEFAULT_RADIUS_MM,
            stream.stepMs,
            step,
          )
        }
        const pose = poses[side].update(step, frame, foe, contactMm)
        c.pose = pose.pose
        c.poseK = pose.intensity
        // Reduced motion reports dodges and clinches the full path poses.
        if (reduced()) {
          reducedUi.pose(side, pose.pose, frame.pinned, fresh, c.group.position)
        }
        // The fence pin reports on its rising edge: the recoil pose reads
        // at full intensity with planted feet (the driver parks the gait)
        // and this dust ring marks the pinned feet. No flash, no punch.
        if (fresh && frame.pinned && !wasPinned[side]) {
          if (reduced()) {
            reducedUi.pin(c.group.position)
          } else {
            io.effects.spawnBurst(c.group.position, undefined, PIN_BURST)
          }
        }
        wasPinned[side] = frame.pinned
        if (fresh && lastHp[side] > 0 && frame.hp < lastHp[side]) {
          // The KO owns its own report (topple below): a killing blow must
          // flash once as the ko, never twice as a hit plus a ko.
          if (reduced()) {
            if (frame.hp > 0) {
              reducedUi.hit(pose.pose, frame.pinned, c.group.position)
            }
          } else {
            react(c, lastHp[side] - frame.hp)
          }
        }
        if (frame.hp <= 0 || downAt[side] >= 0) {
          if (reduced()) {
            reducedUi.ko(side, step, fresh, c, c.group.position)
          } else {
            topple(side, c, step, fresh)
          }
        }
        lastHp[side] = frame.hp
      }
    },
    reset() {
      tells.reset()
      reducedUi.reset()
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
      tells.dispose()
      reducedUi.disposeAll()
    },
  }
}
