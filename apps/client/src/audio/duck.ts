/**
 * The music-ducking envelope (20261117-polish-showcase FR-4): a pure window
 * that dips the music bed under priority cues and hands the exact user level
 * back when it closes. No DOM, no timers and no clock of its own — every
 * caller passes `now`, so the whole contract is bun-testable and the mixer
 * decides when to re-read it.
 */
import type { AnyCueId } from "./cueUrls"

/** Fraction of the user's music level applied while a duck window is open. */
export const DUCK_FACTOR = 0.28

/** Default duck window length in milliseconds. */
export const DUCK_MS = 900

/**
 * Priority cues: KO/verdict punctuation and the cup-transition, evolution and
 * graduation cues (and their calm variants). Routine UI navigation/confirm
 * and ordinary battle/care cues stay at the user's level — ducking those
 * would pump the music on every click or impact.
 */
const DUCK_CUES: ReadonlySet<AnyCueId> = new Set<AnyCueId>([
  "ko",
  "ko-bell",
  "verdict-0",
  "verdict-1",
  "cup-transition",
  "cup-transition-calm",
  "evolution",
  "evolution-calm",
  "graduation",
  "graduation-calm",
])

/** Whether a cue is loud enough punctuation to dip the music under it. */
export function ducksFor(cue: AnyCueId): boolean {
  return DUCK_CUES.has(cue)
}

/**
 * One caller-clocked window. `duck()` starts or extends it; `gain()` is the
 * multiplier on the user's music level — exactly `DUCK_FACTOR` inside the
 * window and exactly 1 outside, so restoration is exact instead of an
 * accumulation of ramp error.
 */
export class DuckEnvelope {
  /** Caller-clock timestamp at which the window closes. */
  private until = Number.NEGATIVE_INFINITY

  /** Start a window at `now`, extending one that is already open. */
  duck(now: number, ms = DUCK_MS): void {
    this.until = Math.max(this.until, now + ms)
  }

  /** Multiplier at `now`: DUCK_FACTOR inside the window, exactly 1 outside. */
  gain(now: number): number {
    return now < this.until ? DUCK_FACTOR : 1
  }

  /** Cancel any active window immediately. */
  clear(): void {
    this.until = Number.NEGATIVE_INFINITY
  }
}
