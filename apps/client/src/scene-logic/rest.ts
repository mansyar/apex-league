/**
 * Scene logic - the rest ceremony: curl down, hold a deep-sleep beat, wake
 * with a stretch. Split out of scene-logic.ts (ranch_decomposition);
 * behavior unchanged.
 */
import { smoothstep } from "./math"
// ---------------------------------------------------------------------------
// Rest ceremony (ranch_rituals_20261018 FR3)
// ---------------------------------------------------------------------------

// After a successful Rest the creature curls down where it stands, holds a
// deep-sleep beat with slower deeper breathing (applied by ranch-motion),
// then wakes with a stretch. Position-clock like the feed/evolution
// machines — dt-clamped steps, so a paused tab or a long frame can never
// skip a phase. Reduced motion skips the curl/wake animation: a still
// short sleep, no stretch arc.

export type RestPhase = "idle" | "curl" | "sleep" | "wake"

export interface RestDrive {
  phase: RestPhase
  /** Curl-down amount 0..1 (1 = fully curled asleep). */
  curl: number
  /** Wake-stretch amount 0..1 (0 outside the wake phase). */
  stretch: number
  /** True while the machine owns the creature. */
  active: boolean
  /** True when the ceremony has finished (or never started). */
  done: boolean
}

/** Curl-down time, deep-sleep hold, and wake-stretch time (seconds). */
export const REST_CURL_TIME = 0.8
export const REST_SLEEP_TIME = 4
export const REST_WAKE_TIME = 1.2
/** Reduced motion: no animations, a shorter still hold. */
export const REST_SLEEP_TIME_REDUCED = 2

export interface RestMachine {
  /** Begin a rest where the creature stands. */
  begin(reducedMotion: boolean): void
  /** Advance one clamped-dt step. */
  advance(dt: number): RestDrive
}

export function createRestCeremony(): RestMachine {
  let phase: RestPhase = "idle"
  let elapsed = 0
  let reduced = false

  const begin = (reducedMotion: boolean): void => {
    reduced = reducedMotion
    elapsed = 0
    if (reducedMotion) {
      // Still sleep: no curl animation, no stretch arc.
      phase = "sleep"
      return
    }
    phase = "curl"
  }

  const advance = (dt: number): RestDrive => {
    const step = Math.min(Math.max(dt, 0), 0.1)
    if (phase === "curl") {
      elapsed += step
      const k = Math.min(1, elapsed / REST_CURL_TIME)
      if (k >= 1) {
        phase = "sleep"
        elapsed = 0
        return {
          phase: "sleep",
          curl: 1,
          stretch: 0,
          active: true,
          done: false,
        }
      }
      return {
        phase: "curl",
        curl: smoothstep(k),
        stretch: 0,
        active: true,
        done: false,
      }
    }
    if (phase === "sleep") {
      elapsed += step
      const limit = reduced ? REST_SLEEP_TIME_REDUCED : REST_SLEEP_TIME
      if (elapsed >= limit) {
        if (reduced) {
          phase = "idle"
          elapsed = 0
          return {
            phase: "idle",
            curl: 0,
            stretch: 0,
            active: false,
            done: true,
          }
        }
        phase = "wake"
        elapsed = 0
        return { phase: "wake", curl: 1, stretch: 0, active: true, done: false }
      }
      return { phase: "sleep", curl: 1, stretch: 0, active: true, done: false }
    }
    if (phase === "wake") {
      elapsed += step
      const k = Math.min(1, elapsed / REST_WAKE_TIME)
      if (k >= 1) {
        phase = "idle"
        return { phase: "idle", curl: 0, stretch: 0, active: false, done: true }
      }
      return {
        phase: "wake",
        curl: 1 - smoothstep(k),
        stretch: Math.sin(k * Math.PI),
        active: true,
        done: false,
      }
    }
    return { phase: "idle", curl: 0, stretch: 0, active: false, done: true }
  }

  return { begin, advance }
}
