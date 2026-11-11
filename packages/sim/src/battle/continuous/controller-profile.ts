/**
 * The controller's doctrine table (FR-11, FR-12, FR-15): where a fighter wants
 * the fight, and how hard it works to keep it there. The doctrine owns the
 * band, the strafe intent and the dodge policy; temperament only shades
 * intensity inside the band, so a `rush` creature on Kite still kites — harder,
 * never closer. Bands are measured from the reach edge (innate reach plus both
 * radii), never authored as fixed millimetres: the old rows sat inside two
 * touching bodies, so "preferred" was contact and the retreat had nowhere.
 */

import type { Temperament } from "../../species"
import { BODY_RADIUS_MM, getFrameData } from "../frames"
import { BASIC_MOVE } from "../moves"
import type { FighterState } from "./types"

/** The four plans a player may pick (FR-11). */
export type DoctrineId = "press" | "circle" | "kite" | "counter"

/** Every doctrine, in pick order. */
export const DOCTRINE_IDS: readonly DoctrineId[] = Object.freeze([
  "press",
  "circle",
  "kite",
  "counter",
])

/** One doctrine: where it stands, how it circles, and what it dodges. */
export interface Doctrine {
  readonly id: DoctrineId
  /** Short name for the HUD and the coach's room. */
  readonly label: string
  /** Floor of the band, in thousandths of the reach edge. */
  readonly floorPermille: number
  /** Ceiling of the band, in thousandths of the reach edge. */
  readonly ceilingPermille: number
  /** Share of the cycle spent pressing, before temperament shading. */
  readonly aggression: number
  /** Share of the cycle spent circling, before temperament shading. */
  readonly strafeBias: number
  /** Distance at which an inbound shot is dodged, in mm. */
  readonly dodgeThresholdMm: number
  /** Commit on every press slot, or only into a recovering foe. */
  readonly commit: "always" | "punish"
  /** Circle toward the foe's back rather than a fixed side. */
  readonly seeksRear: boolean
}

/**
 * The four frozen doctrines (FR-11): Press closes and presses, Circle works
 * the mid band and hunts the rear arc, Kite holds the long band and gives
 * ground below it, Counter waits in the mid band and punishes recovery.
 */
export const DOCTRINES: Readonly<Record<DoctrineId, Doctrine>> = Object.freeze({
  press: Object.freeze({
    id: "press",
    label: "Press",
    // Phase 8 (FR-20): see the lever table; 1500 ends the standoff.
    floorPermille: 700,
    ceilingPermille: 1500,
    aggression: 85,
    strafeBias: 10,
    dodgeThresholdMm: 2200,
    commit: "always",
    seeksRear: false,
  }),
  circle: Object.freeze({
    id: "circle",
    label: "Circle",
    floorPermille: 1150,
    ceilingPermille: 1700,
    aggression: 65,
    strafeBias: 45,
    dodgeThresholdMm: 2600,
    commit: "always",
    seeksRear: true,
  }),
  kite: Object.freeze({
    id: "kite",
    label: "Kite",
    // Phase 8 (FR-20): press reaches 1500, so kite stands outside it at 1600.
    floorPermille: 1600,
    ceilingPermille: 2050,
    aggression: 55,
    strafeBias: 30,
    dodgeThresholdMm: 3200,
    commit: "always",
    seeksRear: false,
  }),
  counter: Object.freeze({
    id: "counter",
    label: "Counter",
    floorPermille: 1150,
    ceilingPermille: 1650,
    aggression: 55,
    strafeBias: 30,
    dodgeThresholdMm: 2800,
    commit: "punish",
    seeksRear: false,
  }),
})

/** Short names, for the HUD and the coach's room. */
export const DOCTRINE_LABELS: Readonly<Record<DoctrineId, string>> =
  Object.freeze({
    press: "Press",
    circle: "Circle",
    kite: "Kite",
    counter: "Counter",
  })

/**
 * Legacy saves and the gauge clock name two tactics; map them forward. A
 * `balanced` plan closes and strikes, so it becomes Press; `specials` works the
 * kit at distance, so it becomes Kite. Phase 5 removes the legacy names with
 * the save migration.
 */
export function doctrineForTactic(tactic: "balanced" | "specials"): DoctrineId {
  return tactic === "specials" ? "kite" : "press"
}

/** The legacy name a doctrine writes while a save still stores a tactic. */
export function tacticForDoctrine(
  doctrine: DoctrineId,
): "balanced" | "specials" {
  return doctrine === "circle" || doctrine === "kite" ? "specials" : "balanced"
}

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
  /** Doctrine floor at the reference edge; absent on a legacy row. */
  readonly floorRangeMm?: number
  /** Doctrine ceiling at the reference edge; absent on a legacy row. */
  readonly ceilingRangeMm?: number
  /** Doctrine commit policy; absent means every press slot commits. */
  readonly commit?: "always" | "punish"
  /** Doctrine circle intent; absent means a fixed side. */
  readonly seeksRear?: boolean
}

/** The tuning table's shape: exactly one profile per temperament. */
export type ProfileTable = Readonly<Record<Temperament, ControllerProfile>>

/** Half-width of the legacy band above the preferred range, in mm (tunable). */
export const RANGE_BAND_MM = 400

/**
 * The share of preferred range at which a legacy row gives ground, in
 * thousandths (tunable, FR-2): inside 0.6x it retreats until preferred is
 * reached, so the threshold is a commitment, not a coin flip.
 */
export const RETREAT_FRACTION_PERMILLE = 600

/**
 * How far above the reach edge a legacy row may hold, in thousandths of the
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

/** One distance at the reference edge, from thousandths of the edge. */
function rangeMm(permille: number): number {
  return Math.trunc((REFERENCE_REACH_EDGE_MM * permille) / 1000)
}

/** One frozen legacy row, in field order: aggression, strafe, dodge. */
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
 * Kept for the legacy profile tests and the gauge clock's shape; a real
 * continuous fight composes a doctrine profile instead (FR-12).
 */
export const CONTROLLER_PROFILES: ProfileTable = Object.freeze({
  rush: profile(85, 10, 2200),
  slow: profile(60, 30, 3000),
  obedient: profile(75, 20, 2600),
})

/** The profile for one temperament, without a doctrine (legacy rows). */
export function profileFor(temperament: Temperament): ControllerProfile {
  return CONTROLLER_PROFILES[temperament]
}

/**
 * Temperament's shade on the doctrine's intensity, never on its band: rush
 * commits and dodges harder, slow hangs back and circles a little more. The
 * values are percentages and millimetres, added inside `profileForDoctrine`.
 */
const TEMPERAMENT_SHADE: Readonly<
  Record<Temperament, { aggression: number; strafe: number; dodge: number }>
> = Object.freeze({
  rush: Object.freeze({ aggression: 10, strafe: -5, dodge: 400 }),
  slow: Object.freeze({ aggression: -10, strafe: 5, dodge: -400 }),
  obedient: Object.freeze({ aggression: 0, strafe: 0, dodge: 0 }),
})

/** A share of the cycle, clamped to a percentage. */
function share(value: number): number {
  return Math.min(100, Math.max(0, value))
}

/**
 * One side's controller tuning: the doctrine's band and intent, with the
 * temperament's shade applied to aggression, strafe share and dodge reach. The
 * floor and ceiling come from the doctrine alone, so no temperament can cross
 * them (FR-12, AC-12).
 */
export function profileForDoctrine(
  doctrine: Doctrine,
  temperament: Temperament,
): ControllerProfile {
  const shade = TEMPERAMENT_SHADE[temperament]
  const centre = Math.trunc(
    (doctrine.floorPermille + doctrine.ceilingPermille) / 2,
  )
  return Object.freeze({
    aggression: share(doctrine.aggression + shade.aggression),
    preferredRangeMm: rangeMm(centre),
    strafeBias: share(doctrine.strafeBias + shade.strafe),
    dodgeThresholdMm: Math.max(0, doctrine.dodgeThresholdMm + shade.dodge),
    floorRangeMm: rangeMm(doctrine.floorPermille),
    ceilingRangeMm: rangeMm(doctrine.ceilingPermille),
    commit: doctrine.commit,
    seeksRear: doctrine.seeksRear,
  })
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

/** A doctrine's band for the pair actually fighting, in mm. */
export interface RangeBand {
  /** The hold point inside the band, in mm. */
  readonly preferredMm: number
  /** The floor: below it the fighter gives ground, in mm. */
  readonly floorMm: number
  /** The ceiling: above it the fighter closes, in mm. */
  readonly ceilingMm: number
}

// R1 (F5): a floor at or below the reach edge is inert (pinned dead zone).
function scaleRange(mm: number, reachEdge: number): number {
  return Math.max(
    reachEdge,
    Math.trunc((mm * reachEdge) / REFERENCE_REACH_EDGE_MM),
  )
}

/**
 * The band a profile holds for this pair, in mm. A doctrine profile carries
 * its own floor and ceiling, so the band is exactly the doctrine's; a legacy
 * row keeps the old 0.6x floor and one-band ceiling. The hold point is clamped
 * inside the band, so temperament's shade can never move it out (AC-12).
 */
export function bandFor(
  profile: ControllerProfile,
  reachEdge: number,
): RangeBand {
  const preferredMm = preferredRangeFor(profile, reachEdge)
  if (
    profile.floorRangeMm === undefined ||
    profile.ceilingRangeMm === undefined
  ) {
    return {
      preferredMm,
      floorMm: Math.trunc((preferredMm * RETREAT_FRACTION_PERMILLE) / 1000),
      ceilingMm: preferredMm + RANGE_BAND_MM,
    }
  }
  const floorMm = scaleRange(profile.floorRangeMm, reachEdge)
  const ceilingMm = Math.max(
    floorMm,
    scaleRange(profile.ceilingRangeMm, reachEdge),
  )
  return {
    preferredMm: Math.min(ceilingMm, Math.max(floorMm, preferredMm)),
    floorMm,
    ceilingMm,
  }
}
