/**
 * Care actions: feed, rest (nap), treat (medicine), play.
 * Pure functions over GameState — AP-gated, with friendly rejection
 * reasons the UI maps to copy. No DOM, no rendering, no I/O.
 */

import { type Creature, type StatKey, TRAINING_CAP } from "./creature"
import { clampCondition, SICK_HEALTH } from "./settlement"
import type { GameState } from "./state"

/** The four daily care actions. */
export type CareAction = "feed" | "rest" | "treat" | "play"

/** Friendly rejection reasons. The UI maps these to coach-voice copy. */
export type CareRejection =
  | "no-creature"
  | "no-ap"
  | "not-sick"
  | "too-sick"
  | "too-tired"

/** Result of attempting a care action. */
export type CareResult =
  | { ok: true; state: GameState }
  | { ok: false; reason: CareRejection }

/** Friendly rejection reasons for assigning a training focus. */
export type TrainingRejection = "no-creature" | "no-ap" | "at-cap"

/** Result of attempting to assign a training focus. */
export type TrainingAttempt =
  | { ok: true; state: GameState }
  | { ok: false; reason: TrainingRejection }

/** AP cost of every care action at MVP (tuned for 2-3 decisions per day). */
export const CARE_AP_COST = 1

/** Hunger restored by one feeding. */
export const FEED_HUNGER_RESTORE = 50

/** Energy gained alongside a feeding. */
export const FEED_ENERGY_GAIN = 10

/** Mood relief when feeding a starving creature. */
export const FEED_RELIEF_MOOD = 5

/** Energy restored by one rest (nap) action. */
export const REST_ENERGY_RESTORE = 40

/** Health restored by one treatment. */
export const TREAT_HEALTH_RESTORE = 40

/** Mood gained per play session. */
export const PLAY_MOOD_GAIN = 10

/** Bond gained per play session. */
export const PLAY_BOND_GAIN = 10

/** Hunger at or below which feeding grants mood relief (starvation lift). */
export const STARVING_RELIEF_HUNGER = 20

/** Energy drained per play session. */
export const PLAY_ENERGY_COST = 20

function clampAll(conditions: Creature["conditions"]): Creature["conditions"] {
  return {
    hunger: clampCondition(conditions.hunger),
    energy: clampCondition(conditions.energy),
    health: clampCondition(conditions.health),
    mood: clampCondition(conditions.mood),
    bond: clampCondition(conditions.bond),
  }
}

/**
 * Attempt a care action on the state's creature. Pure: on success returns a
 * new state with conditions/AP updated; on failure returns a rejection reason
 * and nothing changes.
 */
export function careAction(state: GameState, action: CareAction): CareResult {
  if (!state.creature) return { ok: false, reason: "no-creature" }
  if (state.actionPoints < CARE_AP_COST) return { ok: false, reason: "no-ap" }

  const c = state.creature.conditions
  let conditions = { ...c }
  let bondedToday = state.creature.bondedToday
  let fedToday = state.creature.fedToday

  switch (action) {
    case "feed": {
      conditions = {
        ...conditions,
        hunger: conditions.hunger + FEED_HUNGER_RESTORE,
        energy: conditions.energy + FEED_ENERGY_GAIN,
        // Care quality: relieving starvation is an emotional moment.
        mood:
          conditions.mood +
          (c.hunger <= STARVING_RELIEF_HUNGER ? FEED_RELIEF_MOOD : 0),
      }
      fedToday = true
      break
    }
    case "rest": {
      conditions = {
        ...conditions,
        energy: conditions.energy + REST_ENERGY_RESTORE,
      }
      break
    }
    case "treat": {
      if (c.health >= SICK_HEALTH) return { ok: false, reason: "not-sick" }
      conditions = {
        ...conditions,
        health: conditions.health + TREAT_HEALTH_RESTORE,
      }
      break
    }
    case "play": {
      if (c.health < SICK_HEALTH) return { ok: false, reason: "too-sick" }
      if (c.energy < PLAY_ENERGY_COST) return { ok: false, reason: "too-tired" }
      conditions = {
        ...conditions,
        mood: conditions.mood + PLAY_MOOD_GAIN,
        bond: conditions.bond + PLAY_BOND_GAIN,
        energy: conditions.energy - PLAY_ENERGY_COST,
      }
      bondedToday = true
      break
    }
  }

  const creature = {
    ...state.creature,
    conditions: clampAll(conditions),
    bondedToday,
    fedToday,
  }
  return {
    ok: true,
    state: {
      ...state,
      actionPoints: state.actionPoints - CARE_AP_COST,
      creature,
    },
  }
}

/**
 * Assign tonight's training focus to one stat. The first assignment of the
 * day costs 1 AP; re-pointing the focus later the same day is free. A stat
 * already at the training cap is rejected before any AP is spent. Pure:
 * on failure nothing changes.
 */
export function assignTraining(
  state: GameState,
  stat: StatKey,
): TrainingAttempt {
  if (!state.creature) return { ok: false, reason: "no-creature" }

  const creature = state.creature
  const costsAp = creature.trainingFocus === null
  if (costsAp && state.actionPoints < CARE_AP_COST) {
    return { ok: false, reason: "no-ap" }
  }
  if (creature.trained[stat] >= TRAINING_CAP) {
    return { ok: false, reason: "at-cap" }
  }

  return {
    ok: true,
    state: {
      ...state,
      actionPoints: costsAp
        ? state.actionPoints - CARE_AP_COST
        : state.actionPoints,
      creature: {
        ...creature,
        trainingFocus: stat,
        trainingResult: null,
      },
    },
  }
}
