/**
 * The controller's archetype table: how each temperament closes range, presses,
 * circles, and what it considers worth dodging.
 *
 * Continuous Arena Battle FR-11. One row per temperament serves rivals and
 * bosses alike, and nothing rolls: a profile's shares partition a fixed
 * ten-decision cycle, so the rhythm comes from the table, not from a random
 * source. Extracted from ./controller when the dodge burst pushed that module
 * past the 12 KB cap; the public surface is unchanged because ./controller
 * re-exports every name here.
 */

import type { Temperament } from "../../species"

/** One archetype's tuning, read by rivals and bosses alike. */
export interface ControllerProfile {
  /** Share of each cycle spent pressing the attack, in percent. */
  readonly aggression: number
  /** Centre of the range band the fighter holds, in mm. */
  readonly preferredRangeMm: number
  /** Share of each cycle spent circling, in percent. */
  readonly strafeBias: number
  /** Distance at which an inbound shot is worth dodging, in mm. */
  readonly dodgeThresholdMm: number
}

/** The tuning table's shape: exactly one profile per temperament. */
export type ProfileTable = Readonly<Record<Temperament, ControllerProfile>>

/** One frozen row, in field order: aggression, range, strafe, dodge. */
function profile(
  aggression: number,
  preferredRangeMm: number,
  strafeBias: number,
  dodgeThresholdMm: number,
): ControllerProfile {
  return Object.freeze({
    aggression,
    preferredRangeMm,
    strafeBias,
    dodgeThresholdMm,
  })
}

/**
 * One table for the whole roster: `rush` closes and presses, `slow` hangs
 * back and circles, and `obedient` — the neutral default — sits between them.
 * Every band sits just outside the innate strike's reach, so the preferred
 * range is a place a fighter can hit from: a band held out at shot range made
 * two cautious fighters trade shots that both dodged, and the fight stalled
 * (Phase 10 measurement). The record type makes a missing temperament a
 * compile error, not a silent fallback, and no species gets a row of its own.
 */
export const CONTROLLER_PROFILES: ProfileTable = Object.freeze({
  rush: profile(85, 450, 10, 2200),
  slow: profile(60, 650, 30, 3000),
  obedient: profile(75, 550, 20, 2600),
})

/** The profile for one temperament. */
export function profileFor(temperament: Temperament): ControllerProfile {
  return CONTROLLER_PROFILES[temperament]
}
