/**
 * The opponent's reach, and the band that respects it (FR-14).
 *
 * A fighter's standing threat is its melee edge: the reach of the move it is
 * committed to (its innate strike when idle or winding a shot) plus both body
 * radii. A doctrine band whose floor sits inside that edge is lifted just
 * outside it, so the fighter can fire from where it cannot be struck. The
 * ceiling and hold point are untouched unless the lift would cross them, and
 * legacy rows keep their old shape.
 */

import { BODY_RADIUS_MM, getFrameData } from "../frames"
import { BASIC_MOVE, getMove } from "../moves"
import {
  bandFor,
  type ControllerProfile,
  type RangeBand,
  reachEdgeMm,
} from "./controller-profile"
import type { FighterState } from "./types"

/** Clearance held outside the foe's melee edge, in mm (tunable). */
export const REACH_STANDOFF_MM = 80

/**
 * The centre gap at which the foe's own melee threat reaches this body, in mm:
 * the committed melee row's reach, or the innate strike when the foe is idle
 * or winding a shot, plus both radii.
 */
export function opponentReachMm(me: FighterState, foe: FighterState): number {
  const attack = foe.attack
  const move = attack ? getMove(attack.moveId) : undefined
  const row = attack && move?.melee ? getFrameData(attack.moveId) : undefined
  const reach =
    row?.reachMm ?? getFrameData(BASIC_MOVE.id)?.reachMm ?? BODY_RADIUS_MM
  return reach + me.radiusMm + foe.radiusMm
}

/**
 * The band a doctrine holds, lifted clear of the foe's melee threat: a floor
 * inside the threat moves to one standoff beyond it, and the hold point and
 * ceiling follow only as far as they must. A legacy row (no doctrine floor)
 * is returned exactly as `bandFor` built it.
 */
export function threatBandFor(
  profile: ControllerProfile,
  me: FighterState,
  foe: FighterState,
): RangeBand {
  const band = bandFor(profile, reachEdgeMm(me, foe))
  if (profile.floorRangeMm === undefined) return band
  const floorMm = Math.max(
    band.floorMm,
    opponentReachMm(me, foe) + REACH_STANDOFF_MM,
  )
  const preferredMm = Math.max(band.preferredMm, floorMm)
  return {
    preferredMm,
    floorMm,
    ceilingMm: Math.max(band.ceilingMm, preferredMm),
  }
}
