import { clamp01 } from "../anim"
import { type ReactionKind, reactionFor } from "../choreo"
import type { StepRunner } from "./context"
import { snapTo } from "./fire"
import { reelWobble } from "./pure"

/**
 * The reel beat (FR5): the victim is off-balance after a heavy blow.
 * Knockback also carries the sim's range change outward - the glide
 * does the traveling, the reel sells the physics.
 */
export const reelStep: StepRunner = (step, instant, side, _o, _r, io) => {
  const kind: ReactionKind = step.kind === "knockback" ? "knockback" : "stagger"
  const spec = reactionFor(kind, side.actor.profile)
  if (spec.slide > 0) side.actor.stage.x += side.actor.away * spec.slide
  if (instant) {
    snapTo(side.actor)
    return
  }
  io.startAction(
    (t, ao) => {
      if (t >= spec.reel) {
        ao.lean.pitch = 0
        ao.lean.roll = 0
        return
      }
      const w = reelWobble(t, spec.reel, spec.reelPitch)
      ao.lean.pitch = w.pitch
      ao.lean.roll = w.roll
    },
    side.actor,
    side.target,
  )
}
