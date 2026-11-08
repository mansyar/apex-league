/**
 * The controller's archetype table: how each temperament closes range, presses,
 * circles, and what it considers worth dodging.
 *
 * Continuous Arena Battle FR-11 and Spacing FR-1. One row per temperament
 * serves rivals and bosses alike, and nothing rolls: a profile's shares
 * partition a fixed ten-decision cycle, so the rhythm comes from the table, not
 * from a random source. Extracted from ./controller when the dodge burst pushed
 * that module past the 12 KB cap; the public surface is unchanged because
 * ./controller re-exports every name here.
 *
 * A preferred range is measured from the reach edge, never authored as a fixed
 * millimetre count: the edge is the innate strike's reach plus both bodies'
 * radii, and each row holds somewhere between that edge and the band above it.
 * The old fixed rows (450/550/650 mm) sat inside two touching bodies — 440-560
 * mm across — so "preferred" was contact, the retreat had nowhere to go, and
 * the fight read as a clinch (baseline: median engagement 539 mm, contact 54.8%
 * of fight time).
 */

import type { Temperament } from "../../species"
import { BODY_RADIUS_MM, getFrameData } from "../frames"
import { BASIC_MOVE } from "../moves"
import type { FighterState } from "./types"

/** One archetype's tuning, read by rivals and bosses alike. */
export interface ControllerProfile {
  /** Share of each cycle spent pressing the attack, in percent. */
  readonly aggression: number
  /**
   * Centre of the range band the fighter holds, in mm, measured for the
   * reference body pair. `preferredRangeFor` carries the ratio to the pair
   * actually in the ring, so a large body holds a larger range.
   */
  readonly preferredRangeMm: number
  /** Share of each cycle spent circling, in percent. */
  readonly strafeBias: number
  /** Distance at which an inbound shot is worth dodging, in mm. */
  readonly dodgeThresholdMm: number
}

/** The tuning table's shape: exactly one profile per temperament. */
export type ProfileTable = Readonly<Record<Temperament, ControllerProfile>>

/**
 * How far above the reach edge a temperament may hold, in thousandths of the
 * edge (tunable, FR-1): 500 lets the calmest row stand at 1.5x the edge, and
 * `aggression` places each row inside that band — the more a fighter presses,
 * the closer to the edge it stands.
 */
export const PREFERRED_REACH_BAND_PERMILLE = 500

/**
 * The reach edge of the reference body pair, in mm: the innate strike's
 * authored reach plus two default radii. Rows are authored at this edge, and
 * `preferredRangeFor` scales the row's ratio onto the pair in the ring.
 */
const REFERENCE_REACH_MM =
  getFrameData(BASIC_MOVE.id)?.reachMm ?? BODY_RADIUS_MM
export const REFERENCE_REACH_EDGE_MM = REFERENCE_REACH_MM + 2 * BODY_RADIUS_MM

/** One row's preferred range at the reference edge, in mm. */
function preferredMm(aggression: number): number {
  const above = Math.trunc(
    ((100 - aggression) * PREFERRED_REACH_BAND_PERMILLE) / 100,
  )
  return Math.trunc((REFERENCE_REACH_EDGE_MM * (1000 + above)) / 1000)
}

/** One frozen row, in field order: aggression, strafe, dodge. */
function profile(
  aggression: number,
  strafeBias: number,
  dodgeThresholdMm: number,
): ControllerProfile {
  return Object.freeze({
    aggression,
    preferredRangeMm: preferredMm(aggression),
    strafeBias,
    dodgeThresholdMm,
  })
}

/**
 * One table for the whole roster: `rush` closes and presses, `slow` hangs
 * back and circles, and `obedient` — the neutral default — sits between them.
 * Each row's range is derived from its aggression, so the band always sits at
 * or outside the reach edge and a fighter can hit from where it stands: a band
 * held out at shot range made two cautious fighters trade shots that both
 * dodged, and the fight stalled (Phase 10 measurement). The record type makes a
 * missing temperament a compile error, not a silent fallback, and no species
 * gets a row of its own.
 */
export const CONTROLLER_PROFILES: ProfileTable = Object.freeze({
  rush: profile(85, 10, 2200),
  slow: profile(60, 30, 3000),
  obedient: profile(75, 20, 2600),
})

/** The profile for one temperament. */
export function profileFor(temperament: Temperament): ControllerProfile {
  return CONTROLLER_PROFILES[temperament]
}

/**
 * The centre-to-centre gap at which the innate strike's edge reaches `foe`, in
 * mm (FR-1, FR-18): the authored reach plus both bodies' radii. This is the
 * edge a preferred range is measured from, so the two agree by construction.
 */
export function reachEdgeMm(me: FighterState, foe: FighterState): number {
  const reach = getFrameData(BASIC_MOVE.id)?.reachMm ?? BODY_RADIUS_MM
  return reach + me.radiusMm + foe.radiusMm
}

/**
 * The preferred range for the pair actually fighting, in mm (FR-1): the row's
 * ratio to the reference edge applied to this pair's own edge. It never sits
 * inside the reach edge — a range at contact distance is not a range — and
 * because the ratio is fixed per row, a body pair is always held at the same
 * share of its own reach.
 */
export function preferredRangeFor(
  profile: ControllerProfile,
  reachEdge: number,
): number {
  const scaled = Math.trunc(
    (profile.preferredRangeMm * reachEdge) / REFERENCE_REACH_EDGE_MM,
  )
  return Math.max(reachEdge, scaled)
}
