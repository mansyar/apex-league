/**
 * The shared playback driver (live-cup track, Phase C): the timer chain,
 * fast-forward toggle, reduced-motion instant dump, and slow-replay
 * fallback, extracted from spar.ts so the cup's arena matches reuse the
 * exact same pacing contract. The driver owns no DOM — it speaks through
 * callbacks, so spar and cup each wire their own chrome.
 */

import type { PlaybackStep } from "@apex/sim"
import {
  type BattleEvent,
  type BattleResult,
  type FightStream,
  streamOf,
} from "@apex/sim"
import type { BattleHudFighter } from "./battleHud"
import {
  createDenseRunner,
  type DenseClock,
  defaultDenseClock,
} from "./dense-runner"
import { dumpInstant } from "./instant-dump"
import { resolveMotionPref } from "./motion"
import { dilatedPace, KO_DILATION, stampDelay } from "./pacing"
import { scriptFor } from "./playback-script"
import {
  PLAYBACK_SPEED_MS,
  type PlaybackSpeed,
  toggleSpeed,
} from "./playbackSpeed"

/** Both fighters as arena casts keyed the way the battle HUD reads them. */
export interface PlaybackFight {
  owned: BattleHudFighter
  rival: BattleHudFighter
}

/** One complete run: verdict plus its 1:1 playback script. */
export interface PlaybackRun {
  fight: PlaybackFight
  verdict: Readonly<BattleResult>
  events: readonly BattleEvent[]
  steps: readonly PlaybackStep[]
  /** The dense trace, when this fight was resolved in this session (FR-13). */
  stream?: FightStream
}

export interface PlaybackDriverHandlers {
  /** One playback step should play in the arena (instant = reduced path). */
  onStep: (step: PlaybackStep, instant: boolean) => void
  /**
   * One dense stream step should be drawn (FR-13). Present only while a
   * fight resolved in this session is playing: the arena maps the step onto
   * the stage instead of stepping between scripted poses.
   */
  onFrame?: (stream: FightStream, step: number) => void
  /** The announcer line for the current event (the log / feed). */
  onLine: (text: string) => void
  /** A replay pass is starting: the UI resets its log and stamp chrome. */
  onReplayStart?: (run: PlaybackRun) => void
  /**
   * The run reached its verdict. `replayed` = this finish ended a slow
   * replay pass; `instant` = the run was a reduced-motion dump (the UI
   * shows the replay pill from it).
   */
  onFinish: (info: {
    verdict: Readonly<BattleResult>
    replayed: boolean
    instant: boolean
  }) => void
  /** Pacing changed: the arena scales action animations to ms per step. */
  onPace?: (msPerStep: number) => void
  /**
   * Live read of the saved reduced-motion preference, so an in-app
   * "reduced" setting gates the playback even when the OS is motion-ok.
   */
  motionPref?: () => boolean
}

export interface PlaybackDriver {
  /**
   * Start a run: reduced motion → instant dump + finish; else paced.
   * Returns the path taken so the UI can arm the right pills immediately.
   */
  start(
    fight: PlaybackFight,
    verdict: Readonly<BattleResult>,
  ): "instant" | "paced"
  /** Replay the last run slowly (guarded: needs a finished run). */
  replay(): void
  /** Normal ⇄ fast; returns the new speed so the UI can relabel. */
  speedToggle(): PlaybackSpeed
  /** Cancel any in-flight timer chain. */
  stop(): void
  /**
   * Suspend/resume the chain for a hidden tab (F5). A beat caught mid-wait
   * resumes with its remaining time, so the fight picks up where it stood
   * instead of firing a burst of overdue steps.
   */
  setPaused(paused: boolean): void
}

export interface PlaybackDriverOptions {
  /**
   * Pace override (ms per playback step per speed). Defaults to the
   * shipped broadcast pacing; tests collapse it to keep the suite fast.
   */
  pace?: (speed: PlaybackSpeed) => number
  /** Dense playback clock; defaults to animation frames on wall time. */
  clock?: DenseClock
}

export function createPlaybackDriver(
  handlers: PlaybackDriverHandlers,
  options: PlaybackDriverOptions = {},
): PlaybackDriver {
  const paceFor = (speed: PlaybackSpeed): number =>
    options.pace?.(speed) ?? PLAYBACK_SPEED_MS[speed]
  /** Dense playback samples fight time on this clock (frames by default). */
  const clock = options.clock ?? defaultDenseClock

  let timer: ReturnType<typeof setTimeout> | null = null
  /**
   * The continuation the live timer will run, with the instant it was due.
   * Kept so a hidden tab can suspend the chain mid-step (F5) and re-arm the
   * same continuation for its remaining time.
   */
  let pending: { run: () => void; dueAt: number } | null = null
  /** Suspended for a hidden tab; the chain is held, not dropped. */
  let isPaused = false
  let speed: PlaybackSpeed = "normal"
  let lastRun: PlaybackRun | null = null
  // True while a Replay slowly pass is in flight; finish() reports it so
  // the UI can re-arm the pill.
  let replaying = false
  // True when the current run was a reduced-motion instant dump.
  let runInstant = false

  const pace = (): number => paceFor(speed)

  const clearTimer = (): void => {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
    pending = null
  }

  /**
   * Arm the next beat. The continuation and its due instant are remembered so
   * `setPaused` can hold and re-arm the exact same beat.
   */
  const arm = (run: () => void, ms: number): void => {
    // A paused driver never arms: only the resume path re-arms a held beat.
    if (isPaused) return
    pending = { run, dueAt: performance.now() + ms }
    timer = setTimeout(() => {
      pending = null
      run()
    }, ms)
  }

  // Reduced motion = the saved in-app setting, or the hardened OS query
  // (see motion.ts for the double-report hardening and window guard).
  const reducedMotion = (): boolean =>
    resolveMotionPref(handlers.motionPref?.())

  // True while the current run sits in the KO slow-motion beat.
  let dilated = false

  // ── Dense playback (FR-13) ────────────────────────────────────────────
  // A fight resolved in this session carries its 50 Hz trace. Playing that
  // is a playhead over fight time, not a timer per event: every frame the
  // playhead advances, the arena draws that step, and the event log still
  // speaks at the tick each line belongs to. A verdict with no trace (a
  // restored save, a legacy replay) keeps the paced step path above. The
  // clock arithmetic lives in dense-runner.ts.
  const dense = createDenseRunner(clock)

  /** Start the dense path over a run (fresh start or a replay). */
  const startDense = (run: PlaybackRun, stream: FightStream): void => {
    const last = run.steps[run.steps.length - 1]
    dense.start(
      {
        stream,
        verdict: run.verdict,
        events: run.events,
        steps: run.steps,
        onLine: handlers.onLine,
        onStep: (step) => handlers.onStep(step, false),
        holdMs: () => stampDelay(pace(), last?.ko === true),
        slowBy: KO_DILATION,
        onFrame: handlers.onFrame,
        finish,
      },
      speed,
    )
  }

  const finish = (verdict: Readonly<BattleResult>): void => {
    clearTimer()
    if (dilated) {
      dilated = false
      handlers.onPace?.(pace())
    }
    const replayed = replaying
    replaying = false
    handlers.onFinish({ verdict, replayed, instant: runInstant })
  }

  /**
   * Step the log with a delay. Reduced motion already showed everything;
   * fast-forward only shortens the delay — there is no skip-to-end (FR11).
   * A terminal KO step dilates: the arena's live pace rises for the slow
   * beat and the wait after the blow stretches, then both ease back.
   */
  const play = (
    events: readonly BattleEvent[],
    index: number,
    verdict: Readonly<BattleResult>,
    steps: readonly PlaybackStep[],
  ): void => {
    const event = events[index]
    if (!event) {
      // Terminal branch: the dust-settle hold before the verdict stamp
      // lands (FR8). A KO run ends on a dilated beat, so the hold rides
      // the slow motion instead of snapping back to speed.
      const last = steps[steps.length - 1]
      arm(() => finish(verdict), stampDelay(pace(), last?.ko === true))
      return
    }
    // The wait BEFORE this event belongs to the previous step: a KO blow
    // holds the arena in slow motion through its aftermath.
    const prior = index > 0 ? steps[index - 1] : undefined
    arm(
      () => {
        clearTimer()
        handlers.onLine(event.line)
        const step = steps[index]
        if (step) {
          handlers.onStep(step, false)
          // The KO beat itself: raise the live pace so the arena animates
          // the blow in slow motion (staging scales action lengths to it).
          if (step.ko === true && !dilated) {
            dilated = true
            handlers.onPace?.(dilatedPace(pace(), true))
          } else if (step.ko !== true && dilated) {
            dilated = false
            handlers.onPace?.(pace())
          }
        }
        play(events, index + 1, verdict, steps)
      },
      // Dilation is announced when the KO step fires (above); the wall
      // clock wait after it stretches so the beat can breathe.
      index > 0 && prior?.ko === true ? dilatedPace(pace(), true) : pace(),
    )
  }

  return {
    start(fight, verdict) {
      clearTimer()
      dense.stop()
      // A run stopped mid-KO-beat must not leak slow motion into the
      // next one (the flag self-heals later, but announce cleanly).
      dilated = false
      const steps = scriptFor(verdict)
      // The dense trace exists only for a fight resolved in this session;
      // a restored verdict falls back to the paced step path unchanged.
      const stream = streamOf(verdict)
      lastRun = { fight, verdict, events: verdict.events, steps, stream }
      replaying = false
      if (reducedMotion()) {
        runInstant = true
        // Full log at once, no timers (FR11); Replay slowly gives a
        // text-only stepped path for those who want the build-up anyway.
        // The staging jumps straight to its final posture (post-step of
        // the last event).
        dumpInstant(verdict.events, steps, handlers.onLine, handlers.onStep)
        finish(verdict)
        return "instant"
      }
      runInstant = false
      speed = "normal"
      if (stream) {
        // The dense path owns pacing: the stream plays at its own 50 Hz,
        // scaled by the pill, so there is no step pace to announce.
        startDense(lastRun, stream)
        return "paced"
      }
      handlers.onPace?.(pace())
      play(verdict.events, 0, verdict, steps)
      return "paced"
    },

    replay() {
      if (!lastRun) return
      clearTimer()
      dense.stop()
      dilated = false
      replaying = true
      speed = "normal"
      handlers.onPace?.(pace())
      handlers.onReplayStart?.(lastRun)
      if (lastRun.stream) {
        startDense(lastRun, lastRun.stream)
        return
      }
      play(lastRun.events, 0, lastRun.verdict, lastRun.steps)
    },

    speedToggle() {
      speed = toggleSpeed(speed)
      dense.setSpeed(speed)
      // Keep the KO slow motion through a mid-beat toggle: the arena
      // would otherwise snap back to full speed mid-collapse.
      handlers.onPace?.(dilatedPace(pace(), dilated))
      return speed
    },

    stop() {
      clearTimer()
      dense.stop()
    },

    setPaused(next) {
      if (next === isPaused) return
      isPaused = next
      if (dense.running) {
        if (next) dense.pause()
        else dense.resume()
        return
      }
      if (next) {
        // Hold the beat: drop the timer, keep the continuation.
        if (timer !== null) {
          clearTimeout(timer)
          timer = null
        }
        return
      }
      // Re-arm the same continuation for whatever was left of its wait.
      const held = pending
      if (!held) return
      arm(held.run, Math.max(0, held.dueAt - performance.now()))
    },
  }
}
