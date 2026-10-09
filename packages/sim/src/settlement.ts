/**
 * Nightly creature settlement — the fixed-order tick applied when a day
 * advances. The creature sleeps through the night; care during the previous
 * day shaped the inputs, and this settlement produces tomorrow's starting
 * hand. Pure: takes a creature and an Rng, returns a new creature.
 */

import type { Creature, CreatureConditions } from "./creature"
import type { Rng } from "./rng"

/** Hunger lost every night (the creature wakes hungrier). */
export const HUNGER_DECAY_PER_DAY = 15

/** Nightly energy recovery by sleep quality (starving / sick compound). */
export const NIGHT_RECOVERY = Object.freeze({
  rested: 60,
  sick: 30,
  starving: 20,
  starvingAndSick: 10,
})

/** Health level at which a newly-sick creature starts. */
export const SICKNESS_ONSET_HEALTH = 60

/** Health lost per night while sickness goes untreated. */
export const SICKNESS_WORSENING_PER_DAY = 15

/** Health never falls below this — no death, only misery. */
export const HEALTH_FLOOR = 10

/** Base nightly chance of falling sick for a well-cared-for creature. */
export const SICKNESS_BASE_CHANCE = 0.05

/** Extra sickness chance while starving. */
export const SICKNESS_STARVING_CHANCE = 0.2

/** Extra sickness chance while exhausted (energy below threshold). */
export const SICKNESS_EXHAUSTED_CHANCE = 0.1

/** Energy at or below which the creature counts as exhausted. */
export const EXHAUSTED_ENERGY = 30

/** Hunger at or below which the creature counts as starving. */
export const STARVING_HUNGER = 0

/** Mood gained overnight after a well-cared-for day. */
export const MOOD_WELL_CARED_BONUS = 5

/** Mood lost overnight for each misery factor (starving / sick / drained). */
export const MOOD_MISERY_PENALTY = 10

/** Extra mood penalty for waking starving. */
export const MOOD_STARVING_PENALTY = 15

/** Mood lost overnight when energy ends below the drained threshold. */
export const MOOD_DRAINED_PENALTY = 5

/** Bond lost overnight without a bonding action. */
export const BOND_DECAY_PER_DAY = 3

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value))
}

function isStarving(hunger: number): boolean {
  return hunger <= STARVING_HUNGER
}

/**
 * Apply the nightly settlement to a creature in fixed order:
 * hunger fall, night recovery, sickness roll/worsening, mood settle,
 * bond decay (and the bondedToday flag reset).
 */
export function settleCreature(creature: Creature, rng: Rng): Creature {
  const c = creature.conditions

  // 1. Hunger falls.
  const hunger = clamp(c.hunger - HUNGER_DECAY_PER_DAY)
  const starving = isStarving(hunger)

  // 2. Night recovery — sleep quality modulated by condition.
  const recovery = starving && c.health < 80
    ? NIGHT_RECOVERY.starvingAndSick
    : starving
      ? NIGHT_RECOVERY.starving
      : c.health < 80
        ? NIGHT_RECOVERY.sick
        : NIGHT_RECOVERY.rested
  const energy = clamp(c.energy + recovery)

  // 3. Sickness: roll for onset, or worsen an existing sickness.
  let health = c.health
  const sick = c.health < 80
  if (sick) {
    health = Math.max(HEALTH_FLOOR, health - SICKNESS_WORSENING_PER_DAY)
  } else {
    let chance = SICKNESS_BASE_CHANCE
    if (starving) chance += SICKNESS_STARVING_CHANCE
    if (energy <= EXHAUSTED_ENERGY) chance += SICKNESS_EXHAUSTED_CHANCE
    if (rng.next() < chance) {
      health = SICKNESS_ONSET_HEALTH
    }
  }

  // 4. Mood settles toward what the day's care earned.
  let moodDelta = 0
  if (starving) moodDelta -= MOOD_STARVING_PENALTY
  if (health < 80) moodDelta -= MOOD_MISERY_PENALTY
  if (energy < 20) moodDelta -= MOOD_DRAINED_PENALTY
  if (moodDelta === 0 && hunger >= 40 && energy >= 40 && health >= 80) {
    moodDelta += MOOD_WELL_CARED_BONUS
  }
  const mood = clamp(c.mood + moodDelta)

  // 5. Bond decays without a bonding action; the daily flag resets.
  const bond = clamp(c.bond + (creature.bondedToday ? 0 : -BOND_DECAY_PER_DAY))

  const conditions: CreatureConditions = { hunger, energy, health, mood, bond }
  return { ...creature, conditions, bondedToday: false }
}
