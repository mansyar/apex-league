/**
 * Evolution gate — the pure decision of whether a creature matures from
 * baby to juvenile during a nightly settlement. Pure data and pure
 * functions only — no DOM, no rendering, no I/O.
 *
 * The design frame (spec R1): evolution is earned by age AND held-up care.
 * Age is the hard floor; a recent sickness or a low mood delays the night
 * it happens, but neglect can never block it forever.
 */

import type { Creature } from "./creature"

/**
 * The night of this day (inclusive) is the earliest a baby may evolve.
 * Ten full baby days: day 1 is the hatch day, and the gate closes on the
 * night that ends day 10.
 */
export const EVOLUTION_DAY = 10

/** Mood at or above which the care gate passes. */
export const EVOLUTION_MOOD = 40

/**
 * Clean nights required after a sickness night before the care gate
 * reopens. Any night involving sickness (already sick at lights-out or a
 * fresh onset) stamps the full value; clean nights decrement it.
 */
export const SICK_COOLDOWN_NIGHTS = 3

/** Why the gate answered the way it did, checked in precedence order. */
export type EvolutionReason =
  | "ready"
  | "not_baby"
  | "too_young"
  | "recently_sick"
  | "low_mood"

/** The gate verdict for one settlement night. */
export interface EvolutionVerdict {
  evolved: boolean
  reason: EvolutionReason
}

/**
 * Should this creature evolve during the settlement that closes `day`?
 * Pure: reads the (post-settlement) creature and returns a verdict; the
 * caller decides what to do with it. Reason precedence: not_baby >
 * too_young > recently_sick > low_mood > ready.
 */
export function evaluateEvolution(
  creature: Creature,
  day: number,
): EvolutionVerdict {
  if (creature.stage !== "baby") {
    return { evolved: false, reason: "not_baby" }
  }
  if (day < EVOLUTION_DAY) {
    return { evolved: false, reason: "too_young" }
  }
  if (creature.sickCooldown > 0) {
    return { evolved: false, reason: "recently_sick" }
  }
  if (creature.conditions.mood < EVOLUTION_MOOD) {
    return { evolved: false, reason: "low_mood" }
  }
  return { evolved: true, reason: "ready" }
}
