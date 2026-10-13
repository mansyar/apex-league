import { reactionFor } from "../choreo"
import type { StepRunner } from "./context"
import { impulse, snapTo } from "./fire"
import { koFall, softFall } from "./pure"

/** The KO landing kicks up a dust ring instead of an element pop. */
const DUST_RING = {
  puffs: 9,
  ring: true,
  gravity: 2.2,
  life: 750,
  flash: false,
  tint: "#9a9184",
  size: 1.3,
  flashGrow: 0,
} as const

/**
 * Fall on the back and stay down - the action drives `fall`, the driver
 * renders the topple while the squash adds landing weight. The KO reel
 * (FR8) gives the legs a staged give; the dilated pace stretches the
 * whole beat, and the landing kicks up a dust ring instead of an
 * element pop.
 */
export const downStep: StepRunner = (step, instant, side, _o, _r, io) => {
  side.actor.down = true
  const spec = reactionFor("down", side.actor.profile)
  if (instant) {
    side.actor.fall = 1
    snapTo(side.actor)
    impulse(io, side.actor, spec.impulse)
    return
  }
  if (step.ko === true) {
    let thudded = false
    io.startAction(
      (t, ao) => {
        const f = koFall(t)
        ao.lean.pitch = f.pitch
        if (f.fall > 0) ao.fall = f.fall
        if (f.thud && !thudded) {
          thudded = true
          impulse(io, ao, spec.impulse)
          io.effects.spawnBurst(ao.group.position, step.element, DUST_RING)
        }
      },
      side.actor,
      side.target,
    )
  } else {
    let thudded = false
    io.startAction(
      (t, ao) => {
        const f = softFall(t, spec.reel)
        ao.fall = f.fall
        if (f.thud && !thudded) {
          thudded = true
          impulse(io, ao, spec.impulse)
        }
      },
      side.actor,
      side.target,
    )
  }
}
