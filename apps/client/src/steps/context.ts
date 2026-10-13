import type { PlaybackStep } from "@apex/sim"
import type { DriveFighter } from "../fighter-driver"
import type { BattleEffects } from "../staging-fx"

/**
 * Shared plumbing for the step choreography modules. staging.ts owns
 * the fight's clocks and handlers; the per-kind step runners receive
 * them through this port object so the modules stay renderer-free and
 * the geometry helpers stay pure.
 */
/** The acting side of a step and its victim. */
export interface Side {
  actor: DriveFighter
  target: DriveFighter
}

export interface StepIO {
  /** The shared effect machinery (flash, bursts, projectiles, hit-stop). */
  effects: BattleEffects
  /** Big-hit punch: freeze the frame briefly and shake the broadcast cam. */
  bigHit(damage: number | undefined): void
  /**
   * One scripted action on staging's own clock (hit-stop aware). The
   * returned frame handle is tracked by staging; callers never cancel
   * manually — the next step's prelude does it.
   */
  startAction(
    run: (t: number, ao: DriveFighter, at: DriveFighter) => void,
    ao: DriveFighter,
    at: DriveFighter,
  ): void
  /** Cancel the running action, if any (each step preempts the last). */
  cancelAction(): void
  /** Action animation length at the current pace, floor-clamped. */
  animMs(): number
  /** Live pace as a ratio against the normal spar pacing (fast-forward). */
  paceRatio(): number
  /** True when visual intensity is reduced (no shake, dampened springs). */
  reduced(): boolean
  /** Kind of the previously applied step (unified-fire arrival check). */
  prevKind(): PlaybackStep["kind"] | null
}

/** One step runner: perform a single playback step's choreography. */
export type StepRunner = (
  step: PlaybackStep,
  instant: boolean,
  side: Side,
  o: DriveFighter,
  r: DriveFighter,
  io: StepIO,
) => void
