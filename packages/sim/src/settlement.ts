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
import {
  evaluateEvolution,
  evolveCreature,
  SICK_COOLDOWN_NIGHTS,
} from "./evolution"
import type { Rng } from "./rng"
import {
  getTrainingProgram,
  TRAINING_ENERGY_COST,
  type TrainingProgram,
} from "./training"

/** Hunger lost every night (the creature wakes hungrier). */
export const HUNGER_DECAY_PER_DAY = 15

/**
 * Nightly energy recovery by sleep quality (starving / sick compound).
 * Tuning 2026-10-18 (ranch_rituals_20261018): a healthy night no longer
 * restores energy for free — the Rest care action (+40) is the only way a
 * well creature recovers, so the daily AP choice has bite. The relief tiers
 * below are unchanged: neglect must be escapable, never a hard stall.
 */
export const NIGHT_RECOVERY = Object.freeze({
  rested: 0,
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

/** Bond gained overnight from a paying ring-craft night. */
export const RING_BOND_BONUS = 2

/** Mood gained overnight from a paying ring-craft night. */
export const RING_MOOD_BONUS = 5

/** Clamp a condition value into the 0-100 scale. */
export function clampCondition(value: number): number {
  return Math.max(0, Math.min(100, value))
}

function isStarving(hunger: number): boolean {
  return hunger <= STARVING_HUNGER
}

/** What tonight's program would pay, and what it would cost. */
export interface TrainingPlan {
  /** `null` when no program is assigned. */
  result: TrainingResult | null
  /** Stat gains, already clamped against the training cap. */
  gains: Partial<Record<StatKey, number>>
  /** Energy the night costs — 0 on a night that does not pay. */
  energyCost: number
}

/**
 * The single source of truth for a program night: settlement applies this
 * plan and the HUD previews it, so the two can never disagree. Reads the
 * pre-recovery state at lights-out (energy before sleep, hunger after the
 * night's fall) and is pure. Precedence: sick, hungry, exhausted, gained.
 */
export function trainingPlan(creature: Creature): TrainingPlan {
  const program: TrainingProgram | null = creature.trainingProgram
  if (program === null) return { result: null, gains: {}, energyCost: 0 }

  const def = getTrainingProgram(program)
  const conditions = creature.conditions
  const idle: TrainingPlan = { result: null, gains: {}, energyCost: 0 }
  if (conditions.health < SICK_HEALTH) return { ...idle, result: "sick" }
  if (isStarving(clampCondition(conditions.hunger - HUNGER_DECAY_PER_DAY))) {
    return { ...idle, result: "hungry" }
  }
  if (conditions.energy < EXHAUSTED_ENERGY) {
    return { ...idle, result: "exhausted" }
  }

  const gains: Partial<Record<StatKey, number>> = {}
  if (creature.trained[def.primary] < TRAINING_CAP) gains[def.primary] = 1
  const trickleNight =
    creature.trainingDays > 0 && creature.trainingDays % 3 === 0
  if (trickleNight && creature.trained[def.trickle] < TRAINING_CAP) {
    gains[def.trickle] = 1
  }
  return { result: "gained", gains, energyCost: TRAINING_ENERGY_COST }
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
 *
 * `cupsWon` feeds only the champion prestige rule ("a champion needs at
 * least one cup win"); the juvenile gate ignores it.
 */
export function settleCreature(
  creature: Creature,
  rng: Rng,
  day: number,
  cupsWon = 0,
): Creature {
  const c = creature.conditions

  // 1. Hunger falls.
  const hunger = clampCondition(c.hunger - HUNGER_DECAY_PER_DAY)
  const starving = isStarving(hunger)

  // 1b. Training payout — the day's program pays only on a night that pays:
  //     assigned, not sick at lights-out, not waking starving, and not
  //     exhausted at lights-out. Sits before the sickness roll so the roll can
  //     neither grant nor claw back a gain, and the step draws no rng of its
  //     own. The program is always consumed; a new one must be assigned
  //     tomorrow.
  const plan = trainingPlan(creature)
  let trained = creature.trained
  for (const [stat, amount] of Object.entries(plan.gains) as Array<
    [StatKey, number]
  >) {
    trained = {
      ...trained,
      [stat]: Math.min(TRAINING_CAP, trained[stat] + amount),
    }
  }
  const trainingResult = plan.result
  const payingRing =
    plan.result === "gained" && creature.trainingProgram === "ring"

  // 2. Night recovery — sleep quality modulated by condition. A paying night
  //    has already spent its energy, and its sleep is always the rested tier.
  const recovery =
    starving && c.health < SICK_HEALTH
      ? NIGHT_RECOVERY.starvingAndSick
      : starving
        ? NIGHT_RECOVERY.starving
        : c.health < SICK_HEALTH
          ? NIGHT_RECOVERY.sick
          : NIGHT_RECOVERY.rested
  const energy = clampCondition(
    clampCondition(c.energy - plan.energyCost) + recovery,
  )

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
  const mood = clampCondition(
    clampCondition(c.mood + moodDelta) + (payingRing ? RING_MOOD_BONUS : 0),
  )

  // 5. Bond decays without a bonding action; the daily flag resets.
  const bond = clampCondition(
    c.bond +
      (creature.bondedToday ? 0 : -BOND_DECAY_PER_DAY) +
      (payingRing ? RING_BOND_BONUS : 0),
  )

  const conditions: CreatureConditions = { hunger, energy, health, mood, bond }
  const settled: Creature = {
    ...creature,
    conditions,
    sickCooldown,
    bondedToday: false,
    fedToday: false,
    trained,
    trainingProgram: null,
    trainingResult,
  }

  // 6. The evolution gate reads the settled creature: the night's care
  //    outcome (mood, health) is what the gate judged, so a creature that
  //    slept sick or woke miserable waits, never evolves mid-misery. The
  //    cup tally as of tonight feeds the champion prestige rule.
  const verdict = evaluateEvolution(settled, day, cupsWon)
  return verdict.evolved ? evolveCreature(settled) : settled
}

/** What tonight would do to the assigned program: the projected result and
 * the exact stat deltas settlement would pay. Pure — the same plan drives
 * both, so the preview can never drift from the payout. */
export interface TrainingPreview {
  /** `null` when no program is assigned. */
  result: TrainingResult | null
  gains: Partial<Record<StatKey, number>>
}

/**
 * What tonight would do to the assigned program if conditions held until
 * lights-out, as the projected result plus the exact stat gains. Mutates
 * nothing.
 */
export function previewTraining(creature: Creature): TrainingPreview {
  const plan = trainingPlan(creature)
  if (plan.result === null) return { result: null, gains: {} }
  return { result: plan.result, gains: plan.gains }
}
