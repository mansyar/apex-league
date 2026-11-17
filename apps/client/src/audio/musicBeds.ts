/**
 * The music-bed player (audio_foundation_20261017 FR4): three bundled CC0
 * loops, one per scene, crossfaded on scene swaps and stopped while
 * muted. Imperative by design — the pure scene→bed table lives in
 * beds.ts; this file only drives browser audio primitives, so it is
 * verified manually (workflow: rendering/asset wiring tier).
 *
 * Crossfade shape: one interval drives every active fade — the outgoing
 * bed ramps to 0 while the incoming bed ramps up over the same window.
 * Fades never touch loop playback state — the elements keep looping
 * (paused at 0 volume) underneath so a swap back is instant and
 * gapless.
 *
 * Ducking (20261117-polish-showcase FR-4): the same single interval also
 * watches the pure envelope. When its gain crosses a window boundary the
 * current bed is re-targeted through a short ramp, so a priority cue dips
 * the music and the exact user level comes back after mute/scene changes.
 * No second timer is introduced.
 *
 * Every failure is swallowed: audio must never break the game loop.
 */
import { type BedScene, bedUrl } from "./beds"
import type { DuckEnvelope } from "./duck"
import { clampGain } from "./player"

/** Crossfade window in milliseconds. */
const FADE_MS = 1200

/** Duck-level ramp in milliseconds (a crossing re-target, not a crossfade). */
const DUCK_RAMP_MS = 200

/** Fade step interval in milliseconds. */
const FADE_STEP_MS = 100

/** Bed loudness relative to the SFX mix (beds sit under the cues). */
const BED_VOLUME = 0.35

/** Per-tick volume travel (full fade spans FADE_MS). */
const STEP_DELTA = (BED_VOLUME * FADE_STEP_MS) / FADE_MS

/** Faster per-tick travel for duck-level re-targets only. */
const DUCK_STEP_DELTA = (BED_VOLUME * FADE_STEP_MS) / DUCK_RAMP_MS

export class MusicBeds {
  private readonly elements = new Map<BedScene, HTMLAudioElement>()
  private current: BedScene | null = null
  private muted = false
  private volume = 1
  /** Pure duck window observed by the single mixer interval. */
  private duck: DuckEnvelope | null = null
  /** Last observed duck gain, so a window boundary triggers a re-target. */
  private lastDuckGain = 1
  /** Active fades: element → ramp. One interval drives them all. */
  private readonly fades = new Map<
    HTMLAudioElement,
    { target: number; delta: number; done?: () => void }
  >()
  private ticker: number | null = null

  /**
   * Attach the pure duck envelope. Called once at wiring time, before any
   * scene is set, so every later `target()` read composes the current gain.
   */
  setDuck(envelope: DuckEnvelope): void {
    this.duck = envelope
    this.lastDuckGain = this.duckGain()
  }

  /** The envelope's multiplier at now (1 when no envelope is attached). */
  private duckGain(): number {
    return this.duck ? this.duck.gain(Date.now()) : 1
  }

  /** Points the music at a scene (or away with `null`). Crossfades. */
  setScene(scene: BedScene | null): void {
    if (scene === this.current) return
    const from = this.current
    this.current = scene
    try {
      if (from) {
        const prev = this.element(from)
        this.fade(prev, 0, () => prev.pause())
      }
      if (scene && !this.muted && this.target() > 0) {
        const el = this.element(scene)
        el.loop = true
        if (el.paused) {
          el.volume = 0
          void el.play().catch(() => {})
        }
        this.fade(el, this.target())
      }
    } catch {
      // Silent no-op fallback — beds are polish, never load-bearing.
    }
  }

  /** Muted fades the audible bed out (elements keep looping for instant resume). */
  setMuted(muted: boolean): void {
    if (muted === this.muted) return
    this.muted = muted
    try {
      const scene = this.current
      if (!scene) return
      const el = this.element(scene)
      if (muted) {
        this.fade(el, 0, () => el.pause())
      } else {
        if (this.target() <= 0) return
        if (el.paused) {
          el.volume = 0
          void el.play().catch(() => {})
        }
        this.fade(el, this.target())
      }
    } catch {
      // Silent no-op fallback.
    }
  }

  /**
   * Re-attempt playback of the current bed. Called from the first-gesture
   * unlock: the boot-time `play()` is autoplay-rejected in real browsers
   * (no gesture yet), and a same-scene `setScene` no-ops, so without this
   * retry the ranch music stays silent until the first arena visit.
   */
  resume(): void {
    if (this.muted || !this.current || this.target() <= 0) return
    try {
      const el = this.element(this.current)
      if (el.paused) {
        el.volume = 0
        void el.play().catch(() => {})
        this.fade(el, this.target())
      }
    } catch {
      // Silent no-op fallback.
    }
  }

  /**
   * Apply the persisted music level (save v16, 0..1). Live fades follow the
   * new level; at 0 the bed fades out and pauses. Mute still overrides.
   */
  setVolume(volume: number): void {
    const next = clampGain(volume)
    if (next === this.volume) return
    this.volume = next
    if (this.muted || !this.current) return
    try {
      const el = this.element(this.current)
      const target = this.target()
      if (target <= 0) {
        this.fade(el, 0, () => el.pause())
        return
      }
      if (el.paused) {
        el.volume = 0
        void el.play().catch(() => {})
      }
      this.fade(el, target)
    } catch {
      // Silent no-op fallback.
    }
  }

  /**
   * The current bed level: base loudness × the user's music setting × the
   * duck multiplier. Pass `gain` to reuse one clock read across a tick;
   * outside a duck window the gain is exactly 1, so this is the exact user
   * level and restoration is byte-for-byte.
   */
  private target(gain = this.duckGain()): number {
    return BED_VOLUME * this.volume * gain
  }

  /** Lazily creates the looping element for a scene. */
  private element(scene: BedScene): HTMLAudioElement {
    let el = this.elements.get(scene)
    if (!el) {
      el = new Audio(bedUrl[scene])
      el.preload = "auto"
      this.elements.set(scene, el)
    }
    return el
  }

  /**
   * Schedules a linear volume ramp; replaces any fade already on this
   * element. `delta` is the per-tick travel: the default preserves the 1200ms
   * crossfade, while duck re-targets pass the faster 200ms travel.
   */
  private fade(
    el: HTMLAudioElement,
    target: number,
    done?: () => void,
    delta = STEP_DELTA,
  ): void {
    const existing = this.fades.get(el)
    if (existing) existing.done = undefined // superseded: no stale pause()
    this.fades.set(el, { target, delta, done })
    if (this.ticker === null) {
      this.ticker = window.setInterval(() => this.tick(), FADE_STEP_MS)
    }
  }

  /**
   * Re-target the audible bed through the short duck ramp after the envelope
   * crosses a window boundary. Mute/scene changes recompute `target()` with
   * the current gain, so this only handles the boundaries themselves.
   */
  private retargetDuck(gain: number): void {
    const scene = this.current
    if (!scene || this.muted) return
    try {
      const el = this.element(scene)
      const target = this.target(gain)
      if (target <= 0) {
        this.fade(el, 0, () => el.pause(), DUCK_STEP_DELTA)
        return
      }
      if (el.paused) {
        el.volume = 0
        void el.play().catch(() => {})
      }
      this.fade(el, target, undefined, DUCK_STEP_DELTA)
    } catch {
      // Silent no-op fallback — beds are polish, never load-bearing.
    }
  }

  /** One mixer tick: duck boundary first, then step every fading element. */
  private tick(): void {
    try {
      const gain = this.duckGain()
      if (gain !== this.lastDuckGain) {
        this.lastDuckGain = gain
        this.retargetDuck(gain)
      }
      for (const [el, fade] of this.fades) {
        const step = fade.target > el.volume ? fade.delta : -fade.delta
        const next = el.volume + step
        const arrived =
          (step > 0 && next >= fade.target) || (step < 0 && next <= fade.target)
        el.volume = arrived ? fade.target : next
        if (arrived) {
          this.fades.delete(el)
          fade.done?.()
        }
      }
      // Keep the single interval alive while a bed is current so the next
      // duck start/end is noticed even when no crossfade is in flight.
      if (
        this.fades.size === 0 &&
        this.current === null &&
        this.ticker !== null
      ) {
        window.clearInterval(this.ticker)
        this.ticker = null
      }
    } catch {
      if (this.ticker !== null) window.clearInterval(this.ticker)
      this.ticker = null
      this.fades.clear()
    }
  }
}
