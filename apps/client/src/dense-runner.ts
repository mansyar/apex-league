/**
 * The dense playhead (FR-13, AC-13): one resolved fight's 50 Hz trace played
 * against wall time, so the arena draws every step instead of stepping
 * between poses.
 *
 * The runner owns the clock arithmetic and the log cursor — where the
 * playhead is, how fast it runs, which line has spoken, and when the run is
 * over. The caller keeps the verdict stamp beat and what a frame means.
 * Split out of `playbackDriver` so that module stays under the size cap.
 */

import {
  type BattleEvent,
  type BattleResult,
  type FightStream,
  type PlaybackStep,
  stepIndexAt,
} from "@apex/sim"
import { denseSpeedFactor } from "./pacing"
import type { PlaybackSpeed } from "./playbackSpeed"

/**
 * The display clock the dense path runs on: it samples fight time once per
 * animation frame. Injectable so the playback tests drive it by hand
 * instead of waiting on real frames.
 */
export interface DenseClock {
  now(): number
  request(fn: () => void): unknown
  cancel(handle: unknown): void
}

/** Animation frames on wall time: the shipped clock. */
export const defaultDenseClock: DenseClock = {
  now: () => performance.now(),
  request: (fn) => requestAnimationFrame(fn),
  cancel: (handle) => cancelAnimationFrame(handle as number),
}

/** Everything one playthrough needs from its owner. */
export interface DenseRunInput {
  readonly stream: FightStream
  readonly verdict: Readonly<BattleResult>
  /** The log, 1:1 with `steps`; line i speaks when the playhead reaches it. */
  readonly events: readonly BattleEvent[]
  readonly steps: readonly PlaybackStep[]
  readonly onLine: (line: string) => void
  /** A step is due in the arena (instant = false on the dense path). */
  readonly onStep: (step: PlaybackStep) => void
  /** Wall time to hold after the last step, for the verdict stamp beat. */
  readonly holdMs: () => number
  /** Divisor applied to the rate once the killing blow speaks (KO dilation). */
  readonly slowBy: number
  /** Draw one step; called once on start with step 0, then per frame. */
  readonly onFrame?: (stream: FightStream, step: number) => void
  readonly finish: (verdict: Readonly<BattleResult>) => void
}

export interface DenseRunner {
  /** Play `input` from step 0 at the current speed. */
  start(input: DenseRunInput, speed: PlaybackSpeed): void
  /** Change the playback rate mid-run (the speed pill). */
  setSpeed(speed: PlaybackSpeed): void
  /** Hold the playhead for a hidden tab; the run is kept, not dropped. */
  pause(): void
  /** Resume where the fight stood; a held stamp beat moves with it. */
  resume(): void
  stop(): void
  readonly running: boolean
}

interface Run {
  input: DenseRunInput
  /** Index of the next log line to speak. */
  index: number
  elapsedMs: number
  lastNow: number
  factor: number
  handle: unknown
  /** Wall instant the verdict stamp lands, set when the stream ends. */
  endAt: number | null
  pausedAt: number
}

export function createDenseRunner(
  clock: DenseClock = defaultDenseClock,
): DenseRunner {
  let run: Run | null = null

  const schedule = (): void => {
    if (!run || run.handle !== null) return
    run.handle = clock.request(() => frame())
  }

  /** Speak every log line the playhead has reached, in order. */
  const speakThrough = (current: Run, step: number): void => {
    const { input } = current
    for (;;) {
      const event = input.events[current.index]
      if (!event || event.tick > step) return
      const playback = input.steps[current.index]
      current.index++
      input.onLine(event.line)
      if (!playback) continue
      input.onStep(playback)
      // The killing blow eases into slow motion, as on the paced path.
      if (playback.ko === true) {
        current.factor = Math.max(current.factor / input.slowBy, 0.05)
      }
    }
  }

  const frame = (): void => {
    const current = run
    if (!current) return
    current.handle = null
    const now = clock.now()
    const dt = Math.max(0, now - current.lastNow)
    current.lastNow = now
    current.elapsedMs += dt * current.factor
    const { input } = current
    const step = stepIndexAt(input.stream, current.elapsedMs)
    speakThrough(current, step)
    input.onFrame?.(input.stream, step)
    if (step >= input.stream.steps - 1) {
      // The dust settles on the same beat the paced path holds for.
      if (current.endAt === null) current.endAt = now + input.holdMs()
      if (now >= current.endAt) {
        run = null
        input.finish(input.verdict)
        return
      }
    }
    schedule()
  }

  return {
    start(input, speed) {
      if (run && run.handle !== null) clock.cancel(run.handle)
      run = {
        input,
        index: 0,
        elapsedMs: 0,
        lastNow: clock.now(),
        factor: denseSpeedFactor(speed),
        handle: null,
        endAt: null,
        pausedAt: 0,
      }
      // Draw the opening pose immediately: the cast should not hold a stale
      // stance for one frame before the stream takes over.
      input.onFrame?.(input.stream, 0)
      schedule()
    },
    setSpeed(speed) {
      if (run) run.factor = denseSpeedFactor(speed)
    },
    pause() {
      if (!run) return
      if (run.handle !== null) {
        clock.cancel(run.handle)
        run.handle = null
      }
      run.pausedAt = clock.now()
    },
    resume() {
      if (!run) return
      const now = clock.now()
      if (run.endAt !== null) run.endAt += now - run.pausedAt
      run.lastNow = now
      schedule()
    },
    stop() {
      if (run && run.handle !== null) clock.cancel(run.handle)
      run = null
    },
    get running() {
      return run !== null
    },
  }
}
