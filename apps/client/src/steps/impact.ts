import { reactionFor } from "../choreo"
import type { StepRunner } from "./context"
import {
  arriveSpecial,
  contactReaction,
  fireSpecial,
  impulse,
  snapTo,
} from "./fire"
import { dodgeShift, heavyHit } from "./pure"

/**
 * Specials report their own landing here (the launch already fired). A
 * dodge is a real evasion: a dash off the lane in the contract's dodge
 * direction, weighted by the reaction library.
 */
export const impactStep: StepRunner = (step, instant, side, _o, _r, io) => {
  // Dense playback owns the bodies: the dodge and the snap are position,
  // so they belong to the legacy path only (Phase 11 rework 1).
  const ownPositions = !io.streamOwnsBodies()
  if (!step.hit) {
    if (step.missReason === "dodge") {
      const spec = reactionFor("dodge", side.target.profile)
      const shift = dodgeShift(side.target.away, spec.dash, step.dodgeDirection)
      if (ownPositions) {
        side.target.stage.x += shift.dx
        side.target.stage.z += shift.dz
      }
      if (instant) {
        impulse(io, side.target, spec.impulse)
        if (ownPositions) snapTo(side.target)
      }
    }
    return
  }
  if (instant) {
    contactReaction(
      io,
      step.damage,
      side.target,
      heavyHit(step),
      step.element,
      step.tick,
    )
    if (ownPositions) snapTo(side.target)
    if (step.element) arriveSpecial(io, step, side)
    return
  }
  if (step.element && io.prevKind() !== "projectile") {
    // Unified fire (FR5): point-blank specials replay their
    // launch body compressed - windup, micro-flight, then the
    // arrival burst and the victim's reaction when the shot lands.
    fireSpecial(io, step, side, true)
    return
  }
  contactReaction(
    io,
    step.damage,
    side.target,
    heavyHit(step),
    step.element,
    step.tick,
  )
  if (step.element) arriveSpecial(io, step, side)
}
