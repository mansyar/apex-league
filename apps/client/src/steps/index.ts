import type { PlaybackStep, PlaybackStepKind } from "@apex/sim"
import type { DriveFighter } from "../fighter-driver"
import { approachStep, idleStep } from "./approach"
import type { Side, StepIO, StepRunner } from "./context"
import { downStep } from "./down"
import { impactStep } from "./impact"
import { judgeStep } from "./judge"
import { meleeStep } from "./melee"
import { projectileStep } from "./projectile"
import { spotOf } from "./pure"
import { reelStep } from "./reel"

/**
 * The step choreography registry: one runner per playback step kind.
 * Adding a step kind means adding one entry here, never editing the
 * engine. staging.ts calls createStepChoreo once and hands it the
 * fight's clocks and effect machinery through the StepIO port.
 */
const RUNNERS: Record<PlaybackStepKind, StepRunner> = {
  approach: approachStep,
  idle: idleStep,
  melee: meleeStep,
  projectile: projectileStep,
  impact: impactStep,
  stagger: reelStep,
  knockback: reelStep,
  down: downStep,
  judge: judgeStep,
}

export function createStepChoreo(io: StepIO): {
  apply(
    step: PlaybackStep,
    instant: boolean,
    o: DriveFighter,
    r: DriveFighter,
  ): void
} {
  return {
    apply(step, instant, o, r) {
      io.cancelAction()
      // A step that interrupts a charging Lance must not leave the orb.
      io.effects.clearCharge()
      for (const c of [o, r]) {
        c.offset.set(0, 0, 0)
        c.lean.pitch = 0
        c.lean.roll = 0
      }
      const side: Side = spotOf(step.actorKey ?? step.actor, o, r)
      const run = RUNNERS[step.kind]
      if (run) run(step, instant, side, o, r, io)
    },
  }
}
