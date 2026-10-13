import type { StepRunner } from "./context"
import { impulse } from "./fire"
import { judgeHop } from "./pure"

/**
 * Result stamp: the standing winner takes a double victory hop — each
 * hop stretches on the rise and squashes on the landing.
 */
export const judgeStep: StepRunner = (step, instant, side, o, r, io) => {
  const standing = [o, r].filter((c) => !c.down)
  const winner = standing[0]
  if (instant || !winner) return
  const hopRef = { hops: 0 }
  const landedRef = { count: 0 }
  io.startAction(
    (t, ao) => {
      const f = judgeHop(t)
      ao.offset.y = f.lift
      if (f.rising && f.localT < 0.25 && hopRef.hops < 2) {
        hopRef.hops++
        impulse(io, ao, -0.4)
      }
      // One thud per completed hop — an edge trigger, not a
      // per-frame repeat.
      if (!f.rising && f.localT > 0.9 && landedRef.count < hopRef.hops) {
        landedRef.count++
        impulse(io, ao, 0.55)
      }
    },
    winner,
    winner === o ? r : o,
  )
}
