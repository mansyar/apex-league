import { approach, breath as breathSine, gait as gaitBob } from "./anim"
import { idleSway } from "./choreo"
import { poseAdjust } from "./choreo-poses"
import type { DriveFighter } from "./fighter-driver"

/**
 * Upright pose application for one fighter (presentation mapping Phase R2).
 * Split from `fighter-driver.ts` when that module neared the client size
 * cap: the per-frame pose math (gait/breath/sway compose, stream-pose ride,
 * facing ease) lives here, the drive loop (glide, lean, downed branch)
 * stays there. Presentation-only — pose application never feeds the sim —
 * so replay hashes stay byte-identical.
 */

/** Idle breathing + gait amplitudes (reduced motion zeroes the gait). */
const BREATH_AMP = 0.03
const BREATH_FREQ = 2.2
const GAIT_AMP = 0.085

/** How deep the squash spring dips the body into the floor. */
const SQUASH_DIP = 0.42

/** Yaw-follow strength of the face-the-rival ease. */
const FACE_RATE = 9

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

/** Inputs the drive loop owns; the pose math only reads them. */
export interface UprightPoseInput {
  /** Wall-clock now in ms (breath/sway phases). */
  now: number
  /** Clamped frame dt in seconds (the yaw ease). */
  dt: number
  /** Visual intensity: 1 full, 0 reduced (gait/sway parked). */
  life: 0 | 1
  /** Frame speed from measured motion (the gait tempo + rest gate). */
  speed: number
}

/**
 * Apply one upright frame: compose walk + offset + gait + breath + sway
 * under the squash spring, ride the live stream pose on top, and face the
 * rival. Moved verbatim from the fighter-driver step loop (R2/F7) — the
 * driver keeps the glide, the lean, and the downed branch.
 */
export function applyUprightPose(
  c: DriveFighter,
  other: DriveFighter,
  input: UprightPoseInput,
): void {
  const { now, dt, life, speed } = input
  // Compose the pose: walk position + action offset + gait bob +
  // breath at rest, all scaled by the squash spring (weight). The
  // archetype's body-language profile (FR5) weights every term. A roll
  // tucks while the glide carries the travel and a recoil plants its
  // feet — the gait bob would skate either, so both poses park it.
  const rest = speed < 0.15 ? 1 : 0
  const padj = poseAdjust(
    c.pose ?? "none",
    c.poseK ?? 0,
    c.away,
    life,
    c.poseLateral ?? 0,
  )
  const gait =
    gaitBob(c.walkPhase, GAIT_AMP * c.profile.gaitAmp, life) *
    (c.pose === "roll" || c.pose === "recoil" ? 0 : 1)
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
  // Phase-1 stream poses ride on the fighter's own channels, over the
  // composed pose — a flinch can never fight the gait it interrupts.
  // (padj is composed above so the roll/recoil can park the gait.)
  c.group.position.set(pos.x + padj.dx, Math.max(0, pos.y + padj.dy), pos.z)
  const upScale = composeScale(c.baseScale, c.squash.s + padj.squash, false)
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
  c.group.rotation.x = c.lean.pitch + padj.pitch
  c.group.rotation.z = c.lean.roll + padj.roll
}
