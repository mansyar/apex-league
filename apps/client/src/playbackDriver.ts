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
  buildPlaybackScript,
} from "@apex/sim"
import type { BattleHudFighter } from "./battleHud"
import { prefersReducedMotionOs } from "./motion"
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
}

export interface PlaybackDriverHandlers {
  /** One playback step should play in the arena (instant = reduced path). */
  onStep: (step: PlaybackStep, instant: boolean) => void
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
}

export interface PlaybackDriverOptions {
  /**
   * Pace override (ms per playback step per speed). Defaults to the
   * shipped broadcast pacing; tests collapse it to keep the suite fast.
   */
  pace?: (speed: PlaybackSpeed) => number
}

/**
 * The final blow plays in slow motion (FR8): the wait around a terminal
 * KO step (and the live pace the arena animates to) stretches by this
 * factor, then eases back to the broadcast rhythm.
 */
export const KO_DILATION = 2.5

/** The pacing math, pure: a KO step dilates the base wait, others do not. */
export const dilatedPace = (base: number, ko: boolean): number =>
  ko ? Math.round(base * KO_DILATION) : base

/** How many step-lengths the dust settles for before the stamp lands. */
export const STAMP_BEATS = 1.2

/**
 * The verdict stamp beat (FR8): the run's terminal wait before the stamp
 * fires. It stretches on a KO so the collapse and dust ring finish
 * breathing before the verdict slams in.
 */
export const stampDelay = (base: number, ko: boolean): number =>
  Math.round(base * (ko ? KO_DILATION : 1) * STAMP_BEATS)

export function createPlaybackDriver(
  handlers: PlaybackDriverHandlers,
  options: PlaybackDriverOptions = {},
): PlaybackDriver {
  const paceFor = (speed: PlaybackSpeed): number =>
    options.pace?.(speed) ?? PLAYBACK_SPEED_MS[speed]

  let timer: ReturnType<typeof setTimeout> | null = null
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
  }

  // Reduced motion = the saved in-app setting, or the hardened OS query
  // (see motion.ts for the double-report hardening and window guard).
  const reducedMotion = (): boolean =>
    handlers.motionPref?.() === true || prefersReducedMotionOs()

  // True while the current run sits in the KO slow-motion beat.
  let dilated = false

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
      timer = setTimeout(
        () => finish(verdict),
        stampDelay(pace(), last?.ko === true),
      )
      return
    }
    // The wait BEFORE this event belongs to the previous step: a KO blow
    // holds the arena in slow motion through its aftermath.
    const prior = index > 0 ? steps[index - 1] : undefined
    timer = setTimeout(
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
      // A run stopped mid-KO-beat must not leak slow motion into the
      // next one (the flag self-heals later, but announce cleanly).
      dilated = false
      const steps = buildPlaybackScript(verdict.events)
      // buildPlaybackScript is a 1:1 event→step map; fail loud if the sim
      // ever grows an unmapped event kind instead of silently desyncing
      // the HUD from the log.
      if (steps.length !== verdict.events.length) {
        throw new Error(
          `Playback script out of sync: ${steps.length} steps for ${verdict.events.length} events`,
        )
      }
      lastRun = { fight, verdict, events: verdict.events, steps }
      replaying = false
      if (reducedMotion()) {
        runInstant = true
        // Full log at once, no timers (FR11); Replay slowly gives a
        // text-only stepped path for those who want the build-up anyway.
        // The staging jumps straight to its final posture (post-step of
        // the last event).
        for (let i = 0; i < verdict.events.length; i++) {
          const event = verdict.events[i]
          const step = steps[i] ?? steps[steps.length - 1]
          if (event) handlers.onLine(event.line)
          if (step) handlers.onStep(step, true)
        }
        finish(verdict)
        return "instant"
      }
      runInstant = false
      speed = "normal"
      handlers.onPace?.(pace())
      play(verdict.events, 0, verdict, steps)
      return "paced"
    },

    replay() {
      if (!lastRun) return
      clearTimer()
      dilated = false
      replaying = true
      speed = "normal"
      handlers.onPace?.(pace())
      handlers.onReplayStart?.(lastRun)
      play(lastRun.events, 0, lastRun.verdict, lastRun.steps)
    },

    speedToggle() {
      speed = toggleSpeed(speed)
      // Keep the KO slow motion through a mid-beat toggle: the arena
      // would otherwise snap back to full speed mid-collapse.
      handlers.onPace?.(dilatedPace(pace(), dilated))
      return speed
    },

    stop() {
      clearTimer()
    },
  }
}
