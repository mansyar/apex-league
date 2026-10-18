/**
 * The music-bed player (audio_foundation_20261017 FR4): two bundled CC0
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
 * Every failure is swallowed: audio must never break the game loop.
 */
import { type BedScene, bedUrl } from "./beds"
import { clampGain } from "./player"

/** Crossfade window in milliseconds. */
const FADE_MS = 1200

/** Fade step interval in milliseconds. */
const FADE_STEP_MS = 100

/** Bed loudness relative to the SFX mix (beds sit under the cues). */
const BED_VOLUME = 0.35

/** Per-tick volume travel (full fade spans FADE_MS). */
const STEP_DELTA = (BED_VOLUME * FADE_STEP_MS) / FADE_MS

export class MusicBeds {
  private readonly elements = new Map<BedScene, HTMLAudioElement>()
  private current: BedScene | null = null
  private muted = false
  private volume = 1
  /** Active fades: element → {target, done}. One interval drives them all. */
  private readonly fades = new Map<
    HTMLAudioElement,
    { target: number; done?: () => void }
  >()
  private ticker: number | null = null

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

  /** The current bed level: base loudness scaled by the music setting. */
  private target(): number {
    return BED_VOLUME * this.volume
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

  /** Schedules a linear volume ramp; replaces any fade already on this element. */
  private fade(el: HTMLAudioElement, target: number, done?: () => void): void {
    const existing = this.fades.get(el)
    if (existing) existing.done = undefined // superseded: no stale pause()
    this.fades.set(el, { target, done })
    if (this.ticker === null) {
      this.ticker = window.setInterval(() => this.tick(), FADE_STEP_MS)
    }
  }

  /** One mixer tick: every fading element steps toward its target. */
  private tick(): void {
    try {
      for (const [el, fade] of this.fades) {
        const delta = fade.target > el.volume ? STEP_DELTA : -STEP_DELTA
        const next = el.volume + delta
        const arrived =
          (delta > 0 && next >= fade.target) ||
          (delta < 0 && next <= fade.target)
        el.volume = arrived ? fade.target : next
        if (arrived) {
          this.fades.delete(el)
          fade.done?.()
        }
      }
      if (this.fades.size === 0 && this.ticker !== null) {
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
