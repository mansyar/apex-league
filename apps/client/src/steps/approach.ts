import type { StepRunner } from "./context"
import { snapTo } from "./fire"
import { approachTarget, weave } from "./pure"

/** Walk to a strike-range stance on the target's flank: closes the lane
 * and sets up the weave for the attack that follows. The dense stream owns
 * the bodies (FR-13), so the stance is written only on the legacy path. */
export const approachStep: StepRunner = (step, instant, side, _o, _r, io) => {
  if (io.streamOwnsBodies()) return
  const target = approachTarget(side.target.stage, side.actor.away, weave(step))
  side.actor.stage.set(target.x, 0, target.z)
  if (instant) snapTo(side.actor)
}

/** Hold ground; the driver keeps the breath and facing alive. */
export const idleStep: StepRunner = () => {}
