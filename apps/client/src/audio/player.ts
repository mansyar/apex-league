/**
 * The imperative audio player for arena battle and ranch care cues
 * (audio_foundation_20261017 FR1; ranch_rituals_20261018 FR5). Two layers,
 * kept apart for testability:
 *
 * - The pure gate (`isAudible`) — the autoplay-unlock and mute contract.
 *   Browsers refuse audio before the first user gesture, so the player
 *   boots locked and only opens up when wiring calls `unlock()` from a
 *   real gesture handler (pointerdown/keydown).
 * - The injected imperative seam (`CuePlayer`) — the DOM-touching playback
 *   implementation supplied by the caller. Tests inject a recorder; the
 *   real one (audio/playCue.ts, Phase 3) builds `Audio` elements. A seam
 *   that throws (no audio hardware, missing codec) is swallowed here so
 *   audio can never take the arena down — the silent no-op fallback.
 */
import type { AnyCueId } from "./cueUrls"

/** The gate state: unlocked-by-gesture and the persisted mute toggle. */
export interface Gate {
  /** True once a real user gesture has authorized playback. */
  readonly unlocked: boolean
  /** The persisted mute preference. */
  readonly muted: boolean
}

/** The imperative playback seam: actually make a cue sound (or not). */
export type CuePlayer = (cue: AnyCueId, gain: number) => void

/** The persisted mix, both buses 0..1 (save v16). */
export interface VolumeMix {
  music: number
  sfx: number
}

/**
 * Clamp a bus level into 0..1. Non-finite input (a hand-edited save or a
 * broken range control) lands at 0 rather than poisoning the gain math.
 */
export function clampGain(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

/**
 * Whether a play request should reach the seam. Both conditions must hold:
 * the browser blocks playback until a gesture anyway, and the mute toggle
 * is honored at the gate so even the imperative layer never sees muted
 * requests.
 */
export function isAudible(gate: Gate): boolean {
  return gate.unlocked && !gate.muted
}

/**
 * The player wrapper: gate + never-throws dispatch. All state lives in
 * plain fields; wiring owns the gesture listener and settings persistence
 * (Phases 2–3) and drives them through `unlock()` / `setMuted()`.
 */
export class AudioPlayer {
  private unlocked = false
  private muted = false
  private music = 1
  private sfx = 1

  constructor(private readonly playCue: CuePlayer) {}

  /** Called from a real user-gesture handler to authorize playback. */
  unlock(): void {
    this.unlocked = true
  }

  /** Apply the persisted (or toggled) mute preference. */
  setMuted(muted: boolean): void {
    this.muted = muted
  }

  /**
   * Apply the persisted mix (save v16). Values are clamped; 0 is silent and
   * the music level is exposed for the bed player to follow.
   */
  setVolumes(volumes: VolumeMix): void {
    this.music = clampGain(volumes.music)
    this.sfx = clampGain(volumes.sfx)
  }

  /** The current music bus level, 0..1 (read by the bed player). */
  get musicGain(): number {
    return this.music
  }

  /**
   * Play a cue if the gate allows it; never throws — a failing seam
   * degrades to silence, matching the no-audio fallback contract. A zero
   * SFX level skips the seam entirely.
   */
  play(cue: AnyCueId): void {
    if (!isAudible({ unlocked: this.unlocked, muted: this.muted })) return
    if (this.sfx <= 0) return
    try {
      this.playCue(cue, this.sfx)
    } catch {
      // Silent no-op fallback: broken audio must never break the arena.
    }
  }
}
