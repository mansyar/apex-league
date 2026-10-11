/**
 * Nightly creature settlement — the fixed-order tick applied when a day
 * advances. The creature sleeps through the night; care during the previous
 * day shaped the inputs, and this settlement produces tomorrow's starting
 * hand. Pure: takes a creature and an Rng, returns a new creature.
 */

import {
  type Creature,
  type CreatureConditions,
  type StatKey,
  TRAINING_CAP,
  type TrainingResult,
} from "./creature"
import { evaluateEvolution, SICK_COOLDOWN_NIGHTS } from "./evolution"
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

/** Health below which the creature counts as sick. */
export const SICK_HEALTH = 80

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

/** Clamp a condition value into the 0-100 scale. */
export function clampCondition(value: number): number {
  return Math.max(0, Math.min(100, value))
}

function isStarving(hunger: number): boolean {
  return hunger <= STARVING_HUNGER
}

/**
 * Apply the nightly settlement to a creature in fixed order:
 * hunger fall, training payout, night recovery, sickness roll/worsening,
 * mood settle, bond decay (and the bondedToday flag reset), then the
 * evolution gate over the settled creature.
 *
 * `day` is the in-game day this night *closes* — the evolution gate uses it
 * ("a baby may evolve on the night that ends day 10"). The settlement that
 * runs during advanceDay(D) therefore passes D.
 */
export function settleCreature(
  creature: Creature,
  rng: Rng,
  day: number,
): Creature {
  const c = creature.conditions

  // 1. Hunger falls.
  const hunger = clampCondition(c.hunger - HUNGER_DECAY_PER_DAY)
  const starving = isStarving(hunger)

  // 1b. Training payout — the day's focus pays only if the creature slept
  //     rested: not sick at lights-out and not waking starving. Sits before
  //     the sickness roll so the roll can neither grant nor claw back a
  //     gain, and the step draws no rng of its own. The focus is always
  //     consumed; a new one must be assigned tomorrow.
  let trained = creature.trained
  let trainingResult: TrainingResult | null = null
  const sickAtLightsOut = c.health < SICK_HEALTH
  if (creature.trainingFocus) {
    const stat: StatKey = creature.trainingFocus
    if (!sickAtLightsOut && !starving) {
      trained = {
        ...creature.trained,
        [stat]: Math.min(TRAINING_CAP, creature.trained[stat] + 1),
      }
      trainingResult = "gained"
    } else {
      trainingResult = sickAtLightsOut ? "sick" : "hungry"
    }
  }

  // 2. Night recovery — sleep quality modulated by condition.
  const recovery =
    starving && c.health < SICK_HEALTH
      ? NIGHT_RECOVERY.starvingAndSick
      : starving
        ? NIGHT_RECOVERY.starving
        : c.health < SICK_HEALTH
          ? NIGHT_RECOVERY.sick
          : NIGHT_RECOVERY.rested
  const energy = clampCondition(c.energy + recovery)

  // 3. Sickness: roll for onset, or worsen an existing sickness.
  let health = c.health
  const sick = c.health < SICK_HEALTH
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

  // 3b. Sickness cooldown bookkeeping: any night involving sickness (already
  //     sick at lights-out or a fresh onset above) stamps the full cooldown;
  //     clean nights count it down. Read from the post-settlement health so
  //     an onset night is stamped the same as a chronic one.
  const sickCooldown =
    health < SICK_HEALTH
      ? SICK_COOLDOWN_NIGHTS
      : Math.max(0, creature.sickCooldown - 1)

  // 4. Mood settles toward what the day's care earned.
  let moodDelta = 0
  if (starving) moodDelta -= MOOD_STARVING_PENALTY
  if (health < SICK_HEALTH) moodDelta -= MOOD_MISERY_PENALTY
  if (energy < 20) moodDelta -= MOOD_DRAINED_PENALTY
  if (
    moodDelta === 0 &&
    hunger >= 40 &&
    energy >= 40 &&
    health >= SICK_HEALTH
  ) {
    moodDelta += MOOD_WELL_CARED_BONUS
  }
  const mood = clampCondition(c.mood + moodDelta)

  // 5. Bond decays without a bonding action; the daily flag resets.
  const bond = clampCondition(
    c.bond + (creature.bondedToday ? 0 : -BOND_DECAY_PER_DAY),
  )

  const conditions: CreatureConditions = { hunger, energy, health, mood, bond }
  const settled: Creature = {
    ...creature,
    conditions,
    sickCooldown,
    bondedToday: false,
    fedToday: false,
    trained,
    trainingFocus: null,
    trainingResult,
  }

  // 6. The evolution gate reads the settled creature: the night's care
  //    outcome (mood, health) is what the gate judged, so a creature that
  //    slept sick or woke miserable waits, never evolves mid-misery.
  const verdict = evaluateEvolution(settled, day)
  return verdict.evolved ? { ...settled, stage: "juvenile" } : settled
}

/**
 * What tonight would do to the focused stat if conditions held until
 * lights-out. Uses the same rested predicate as the settlement step and
 * mutates nothing. Returns null when no focus is set.
 */
export function previewTraining(creature: Creature): TrainingResult | null {
  if (!creature.trainingFocus) return null
  if (creature.conditions.health < SICK_HEALTH) return "sick"
  if (
    clampCondition(creature.conditions.hunger - HUNGER_DECAY_PER_DAY) <=
    STARVING_HUNGER
  ) {
    return "hungry"
  }
  return "gained"
}
