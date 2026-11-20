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
  DOCTRINES,
  profileForDoctrine,
  type RangeBand,
  reachEdgeMm,
} from "./controller-profile"
import { topSpeed } from "./movement"
import type { FighterState } from "./types"

/** Clearance held outside the foe's melee edge, in mm (tunable). */
export const REACH_STANDOFF_MM = 80

/**
 * The widest centre gap a fighter can hold while giving ground to a foe closing
 * at top speed, in mm (FR-2). In the time the foe crosses one reach edge the
 * fighter can open `reachEdge * ownTopSpeed / foeTopSpeed` of that edge, so a
 * band beyond one edge plus that opening asks for ground the body cannot make.
 * Speeds are thousandths of a mm per ms (see `topSpeed`); the division is
 * integer, so identical inputs always agree. A fighter at least as fast as its
 * foe needs no cap: `Number.MAX_SAFE_INTEGER` leaves the doctrine band alone.
 */
export function maintainableGapMm(
  ownTopSpeed: number,
  foeTopSpeed: number,
  reachEdge: number,
): number {
  if (foeTopSpeed <= 0 || ownTopSpeed >= foeTopSpeed) {
    return Number.MAX_SAFE_INTEGER
  }
  return reachEdge + Math.trunc((reachEdge * ownTopSpeed) / foeTopSpeed)
}

/** Kite's authored band identifies a Kite profile without adding a profile field. */
const KITE_BAND = profileForDoctrine(DOCTRINES.kite, "obedient")

function isKiteBand(profile: ControllerProfile): boolean {
  return (
    profile.floorRangeMm === KITE_BAND.floorRangeMm &&
    profile.ceilingRangeMm === KITE_BAND.ceilingRangeMm
  )
}

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
  const edge = reachEdgeMm(me, foe)
  const band = bandFor(profile, edge)
  if (profile.floorRangeMm === undefined) return band
  const safeFloorMm = opponentReachMm(me, foe) + REACH_STANDOFF_MM
  const floorMm = Math.max(band.floorMm, safeFloorMm)
  const basePreferredMm = Math.max(band.preferredMm, floorMm)
  const baseCeilingMm = Math.max(band.ceilingMm, basePreferredMm)
  if (!isKiteBand(profile)) {
    return {
      preferredMm: basePreferredMm,
      floorMm,
      ceilingMm: baseCeilingMm,
    }
  }
  const cap = maintainableGapMm(topSpeed(me.spd), topSpeed(foe.spd), edge)
  if (cap === Number.MAX_SAFE_INTEGER) {
    return {
      preferredMm: basePreferredMm,
      floorMm,
      ceilingMm: baseCeilingMm,
    }
  }
  // One standoff beyond the maintainable edge is the widest hold this body can
  // keep. Pull floor, hold point and ceiling down together, but never inside
  // the foe's threat: the reach invariant wins if the two ever disagree.
  const heldGapMm = cap + REACH_STANDOFF_MM
  const clampedFloorMm = Math.max(safeFloorMm, Math.min(floorMm, heldGapMm))
  const clampedPreferredMm = Math.max(
    clampedFloorMm,
    Math.min(basePreferredMm, heldGapMm),
  )
  return {
    preferredMm: clampedPreferredMm,
    floorMm: clampedFloorMm,
    ceilingMm: Math.max(clampedPreferredMm, Math.min(baseCeilingMm, heldGapMm)),
  }
}
