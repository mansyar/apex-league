import type { StreamFrame } from "@apex/sim"
import {
  PLAIN_HITSTUN_MS,
  POISE_BREAK_MS,
  poseForFrame,
  RECOIL_FLOOR,
  RECOIL_TRAVEL_MM,
  type StreamPoseState,
} from "./choreo-poses"

/**
 * Step-counted pose state for one side (presentation mapping Phase 2).
 * Split from `choreo-poses.ts` when that module hit the client size cap:
 * the mapping (one frame plus its motion onto one pose) lives there, the
 * step-to-step memory lives here. The memory is stream-derived only —
 * previous positions, latched windows, the last-seen pose — so replay
 * hashes stay byte-identical.
 */

/** Cap on one side's clinch nudge, in mm — the offset reports, not shoves. */
const CONTACT_PUSH_MAX_MM = 60

/** Step-counted pose state for one side: the latches behind the holds. */
export interface PoseTracker {
  /**
   * Map this step's frame, holding a break's crumple until it ends and a
   * recoil until its hitstun is served. The foe's frame plus this pair's
   * contact distance unlock the press. A same-step repeat returns the
   * cached pose, so a slow frame can never stack or flicker anything.
   */
  update(
    step: number,
    frame: StreamFrame,
    foe?: StreamFrame,
    contactMm?: number,
  ): StreamPoseState
  /** Forget every latch (new fight, panel closed). */
  reset(): void
}

/**
 * Track one side's pose across steps. A break-length hitstun latches a
 * crumple for the whole break window (POISE_BREAK_MS counted in stream
 * steps): the break outlasts its hitstun, and without the latch the tail
 * would decay into a flinch — a longer flinch instead of a distinct pose.
 * A knockback slide latches a recoil the same way: the slide halves every
 * step and drops below the trip wire while the window is still served, and
 * the tail must stay a recoil, never a flinch. A same-step repeat returns
 * the cached pose, so a slow frame can never stack a latch or flicker a
 * roll, and a plain hit can never trip the crumple (hitstun never exceeds
 * plain length without a break behind it).
 */
export function createPoseTracker(stepMs = 20): PoseTracker {
  const per = stepMs > 0 ? stepMs : 20
  const holdSteps = Math.ceil(POISE_BREAK_MS / per)
  let breakUntil = -1
  let prev: { x: number; z: number } | null = null
  let recoilHold = false
  let seenStep = -1
  let seen: StreamPoseState = { pose: "none", intensity: 0 }
  return {
    update(step, frame, foe?, contactMm?) {
      if (step === seenStep) return seen
      seenStep = step
      if (frame.hp <= 0) {
        breakUntil = -1
        recoilHold = false
        prev = { x: frame.x, z: frame.z }
        seen = { pose: "ko", intensity: 1 }
        return seen
      }
      if (frame.hitstunMs > PLAIN_HITSTUN_MS) {
        if (step + holdSteps > breakUntil) breakUntil = step + holdSteps
      }
      const travelMm = prev ? Math.hypot(frame.x - prev.x, frame.z - prev.z) : 0
      prev = { x: frame.x, z: frame.z }
      if (step < breakUntil) {
        seen = { pose: "crumple", intensity: 1 }
        return seen
      }
      if (
        frame.hitstunMs > 0 &&
        (frame.pinned || travelMm >= RECOIL_TRAVEL_MM)
      ) {
        recoilHold = true
      } else if (frame.hitstunMs <= 0) {
        recoilHold = false
      }
      const gapMm = foe
        ? Math.hypot(foe.x - frame.x, foe.z - frame.z)
        : undefined
      seen = poseForFrame(frame, { travelMm, gapMm, contactMm })
      if (recoilHold && frame.hitstunMs > 0 && seen.pose === "flinch") {
        seen = { pose: "recoil", intensity: RECOIL_FLOOR }
      }
      return seen
    },
    reset() {
      breakUntil = -1
      prev = null
      recoilHold = false
      seenStep = -1
      seen = { pose: "none", intensity: 0 }
    },
  }
}

/**
 * The clinch nudge for one pair, in sim millimetres: each side's share of
 * the overlap, split half each along the contact axis. Zero when the pair
 * stands clear of contact. Deterministic — pure arithmetic over the two
 * frames — so the render offset can never desync a replay.
 */
export function contactOffset(
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  contactMm: number,
): { x0: number; z0: number; x1: number; z1: number } {
  const dx = x0 - x1
  const dz = z0 - z1
  const gap = Math.hypot(dx, dz)
  if (!(contactMm - gap > 0)) return { x0: 0, z0: 0, x1: 0, z1: 0 }
  const push = Math.min((contactMm - gap) / 2, CONTACT_PUSH_MAX_MM)
  if (gap > 0) {
    const ux = dx / gap
    const uz = dz / gap
    return { x0: ux * push, z0: uz * push, x1: -ux * push, z1: -uz * push }
  }
  // Coincident centres never survive the sim's separation; split along x
  // so the offset still has an axis if one ever arrives.
  return { x0: -push, z0: 0, x1: push, z1: 0 }
}
