import type { StepRunner } from "./context"
import { fireSpecial } from "./fire"

/**
 * Ranged special: the full-pacing launch body. Point-blank specials
 * replay the same body compressed from the impact step - unified fire
 * (FR5). With no flight to show (instant), the following impact step
 * resolves the hit on the spot.
 */
export const projectileStep: StepRunner = (step, instant, side, _o, _r, io) => {
  if (instant) return
  fireSpecial(io, step, side, false)
}
