/**
 * Scene logic - the treat ceremony: settle, balm, recover. Split out of
 * scene-logic.ts (ranch_decomposition); behavior unchanged.
 */
import { smoothstep } from "./math"
// ---------------------------------------------------------------------------
// Treat ceremony
// ---------------------------------------------------------------------------

/** The treat ceremony's phases: settle into a subdued posture, the balm
 * moment (relief sparkle window while subdued), then recover back to the
 * normal stance. */
export type TreatPhase = "idle" | "settle" | "balm" | "recover"

/** Per-frame pose drive for the treat ceremony (ranch_rituals_20261018
 * FR4). `subdued` eases the creature into a quiet, lowered stance while
 * the balm does its work; `relief` arcs 0 → 1 → 0 across the balm hold and
 * gates the sparkle burst. */
export interface TreatDrive {
  phase: TreatPhase
  /** 0 = normal stance, 1 = fully subdued (slumped) posture. */
  subdued: number
  /** Relief sparkle intensity (0 outside the balm moment; reduced motion
   * keeps it at 0 — no decorative pulse). */
  relief: number
  /** True while the machine owns the creature. */
  active: boolean
  /** True when the ceremony has finished (or never started). */
  done: boolean
}

/** Settle-into-subdued, balm hold, and recover times (seconds). */
export const TREAT_SETTLE_TIME = 0.6
export const TREAT_BALM_TIME = 1.4
export const TREAT_RECOVER_TIME = 0.8
/** Reduced motion: no easing to watch, a shorter still hold. */
export const TREAT_BALM_TIME_REDUCED = 0.8

export interface TreatMachine {
  /** Begin the treat ceremony where the creature stands. */
  begin(reducedMotion: boolean): void
  /** Advance one clamped-dt step. */
  advance(dt: number): TreatDrive
}

export function createTreatCeremony(): TreatMachine {
  let phase: TreatPhase = "idle"
  let elapsed = 0
  let reduced = false

  const begin = (reducedMotion: boolean): void => {
    reduced = reducedMotion
    elapsed = 0
    if (reducedMotion) {
      // Still subdued hold: no settle/recover easing, no relief pulse.
      phase = "balm"
      return
    }
    phase = "settle"
  }

  const advance = (dt: number): TreatDrive => {
    const step = Math.min(Math.max(dt, 0), 0.1)
    if (phase === "settle") {
      elapsed += step
      const k = Math.min(1, elapsed / TREAT_SETTLE_TIME)
      if (k >= 1) {
        phase = "balm"
        elapsed = 0
        return {
          phase: "balm",
          subdued: 1,
          relief: 0,
          active: true,
          done: false,
        }
      }
      return {
        phase: "settle",
        subdued: smoothstep(k),
        relief: 0,
        active: true,
        done: false,
      }
    }
    if (phase === "balm") {
      elapsed += step
      const limit = reduced ? TREAT_BALM_TIME_REDUCED : TREAT_BALM_TIME
      if (elapsed >= limit) {
        if (reduced) {
          phase = "idle"
          elapsed = 0
          return {
            phase: "idle",
            subdued: 0,
            relief: 0,
            active: false,
            done: true,
          }
        }
        phase = "recover"
        elapsed = 0
        return {
          phase: "recover",
          subdued: 1,
          relief: 0,
          active: true,
          done: false,
        }
      }
      const k = elapsed / TREAT_BALM_TIME
      return {
        phase: "balm",
        subdued: 1,
        relief: reduced ? 0 : Math.sin(k * Math.PI),
        active: true,
        done: false,
      }
    }
    if (phase === "recover") {
      elapsed += step
      const k = Math.min(1, elapsed / TREAT_RECOVER_TIME)
      if (k >= 1) {
        phase = "idle"
        return {
          phase: "idle",
          subdued: 0,
          relief: 0,
          active: false,
          done: true,
        }
      }
      return {
        phase: "recover",
        subdued: 1 - smoothstep(k),
        relief: 0,
        active: true,
        done: false,
      }
    }
    return { phase: "idle", subdued: 0, relief: 0, active: false, done: true }
  }

  return { begin, advance }
}
