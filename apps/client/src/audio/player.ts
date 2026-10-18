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
export type CuePlayer = (cue: AnyCueId) => void

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
   * Play a cue if the gate allows it; never throws — a failing seam
   * degrades to silence, matching the no-audio fallback contract.
   */
  play(cue: AnyCueId): void {
    if (!isAudible({ unlocked: this.unlocked, muted: this.muted })) return
    try {
      this.playCue(cue)
    } catch {
      // Silent no-op fallback: broken audio must never break the arena.
    }
  }
}
