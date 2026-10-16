import type { BattleResult, PlaybackStep } from "@apex/sim"
import type { createBattleHud } from "./battleHud"
import { reasonLine, renderSpeedButton, winningSideKey } from "./battleUI"
import {
  createPlaybackDriver,
  type PlaybackDriver,
  type PlaybackFight,
  type PlaybackRun,
} from "./playbackDriver"
import type { FightCasting } from "./staging"

export type { PlaybackFight }

/**
 * The shared battle-session shell: everything a fight needs between "the
 * whistle blows" and "back to where you came from", factored out of the
 * spar and cup screens that used to wire it by hand. Consumers own their
 * chrome (panels, chips, logs); the shell owns the driver wiring, the
 * broadcast HUD updates, the speed pill, and the verdict stamp.
 */

/** Injectable timer seam so the hold choreography tests without real clocks. */
export interface TimerPort {
  set(fn: () => void, ms: number): unknown
  clear(handle: unknown): void
}

export const defaultTimerPort: TimerPort = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
}

/**
 * The finish-hold state machine: at most one pending exit at a time.
 * `begin` supersedes any earlier hold (cancel-then-set); `cancel` drops a
 * pending exit without running it.
 */
export function createFinishHold(timers: TimerPort): {
  begin(run: () => void, ms: number): void
  cancel(): void
  pending(): boolean
} {
  let handle: unknown = null
  return {
    begin(run, ms) {
      if (handle !== null) timers.clear(handle)
      handle = timers.set(() => {
        handle = null
        run()
      }, ms)
    },
    cancel() {
      if (handle === null) return
      timers.clear(handle)
      handle = null
    },
    pending: () => handle !== null,
  }
}

/**
 * Spar stamp wording: the title names the winner; in a mirror match both
 * plates read the same display name, so the label is qualified by side
 * (the sim reports hpAfter/finalHp under stable side keys, not names).
 */
export function sparStampTitle(
  verdict: Readonly<BattleResult>,
  fight: PlaybackFight | null,
): string {
  if (verdict.winner === null) return "A drawn spar"
  if (!fight) return `Victory — ${verdict.winner}`
  const key = winningSideKey(verdict)
  const mirror = fight.owned.name === fight.rival.name
  if (key === fight.owned.key) {
    return mirror
      ? `Victory — your ${verdict.winner}`
      : `Victory — ${verdict.winner}`
  }
  if (key === fight.rival.key) {
    return mirror
      ? `Victory — rival ${verdict.winner}`
      : `Victory — ${verdict.winner}`
  }
  return `Victory — ${verdict.winner}`
}

/** Cup stamp wording: outcome-first, side-qualified for mirror matches. */
export function cupStampTitle(
  verdict: Readonly<BattleResult>,
  fight: PlaybackFight,
): string {
  if (verdict.winner === null) return "A draw"
  if (fight.owned.name !== fight.rival.name) {
    return verdict.winner === fight.owned.name ? "Victory" : "Defeat"
  }
  // Mirror match: qualify by side (the sim reports under stable keys).
  return winningSideKey(verdict) === fight.owned.key
    ? "Victory — your fighter"
    : "Defeat — the rival"
}

export interface BattleSessionIo {
  /** The broadcast HUD the shell drives (created over the consumer's overlay). */
  hud: ReturnType<typeof createBattleHud>
  /** The fast/slow pill; the shell wires its click and visibility. */
  speedButton: HTMLButtonElement
  /** One playback step plays in the arena (the consumer also forwards it). */
  onStep: (step: PlaybackStep, instant: boolean) => void
  /** The announcer line for the current event (log / feed). */
  onLine: (text: string) => void
  /** A replay pass is starting (optional; only the spar resets a log here). */
  onReplayStart?: (run: PlaybackRun) => void
  /** The fight is starting: cast the combatants onto the broadcast stage. */
  onFightStart: (casting: FightCasting) => void
  /** Pacing changed: the arena scales action animations to ms per step. */
  onPace: (msPerStep: number) => void
  /** Live reduced-motion read gating the playback (undefined = OS read). */
  motionPref?: () => boolean
  /** Stamp wording (spar names the winner; the cup reads victory/defeat). */
  stampTitle: (verdict: Readonly<BattleResult>, fight: PlaybackFight) => string
  /** Consumer-specific post-finish choreography (after stamp + pill hide). */
  onFinish: (info: {
    verdict: Readonly<BattleResult>
    replayed: boolean
    instant: boolean
  }) => void
}

export interface BattleSession {
  /** The underlying driver, for anything the shell does not cover. */
  driver: PlaybackDriver
  /**
   * Start a fight: show the HUD fighters, fire onFightStart, then start
   * the playback. On the paced path the speed pill is armed; on the
   * reduced-motion instant path it stays hidden (there is nothing to
   * speed up in a text dump).
   */
  begin(
    fight: PlaybackFight,
    verdict: Readonly<BattleResult>,
    casting: FightCasting,
  ): "instant" | "paced"
  /** Cancel any in-flight timer chain. */
  stop(): void
  /**
   * Suspend/resume the playback for a hidden tab (F5); the fight holds its
   * place and resumes on return.
   */
  setPaused(paused: boolean): void
  /** Replay the last run slowly. */
  replay(): void
  /** Hide the broadcast HUD. */
  hideHud(): void
  /** The shared finish-hold machine (the cup walks home on it). */
  hold: ReturnType<typeof createFinishHold>
}

export function createBattleSession(io: BattleSessionIo): BattleSession {
  const hold = createFinishHold(defaultTimerPort)
  let lastFight: PlaybackFight | null = null

  const driver = createPlaybackDriver({
    onStep: (step, instant) => {
      io.onStep(step, instant)
      io.hud.update(step)
    },
    onLine: io.onLine,
    onReplayStart: io.onReplayStart,
    onFinish: ({ verdict, replayed, instant }) => {
      // Verdict as a broadcast stamp over the full-bleed arena; the
      // subline carries the ending reason. The speed pill belongs to a
      // live run only.
      io.hud.stamp(
        io.stampTitle(verdict, lastFight as PlaybackFight),
        reasonLine(verdict),
      )
      io.speedButton.style.display = "none"
      io.onFinish({ verdict, replayed, instant })
    },
    onPace: io.onPace,
    motionPref: io.motionPref,
  })

  io.speedButton.addEventListener("click", () => {
    renderSpeedButton(io.speedButton, driver.speedToggle())
  })

  return {
    driver,
    hold,
    begin(fight, verdict, casting) {
      lastFight = fight
      io.hud.show(fight)
      io.onFightStart(casting)
      const path = driver.start(fight, verdict)
      if (path === "paced") {
        renderSpeedButton(io.speedButton, "paced")
        io.speedButton.style.display = ""
      }
      return path
    },
    stop: () => {
      driver.stop()
      hold.cancel()
    },
    setPaused: (paused) => {
      driver.setPaused(paused)
    },
    replay: () => {
      driver.replay()
    },
    hideHud: () => {
      io.hud.hide()
    },
  }
}
