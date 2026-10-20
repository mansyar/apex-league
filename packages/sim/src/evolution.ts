/**
 * Evolution gate — the pure decision of whether a creature matures to its
 * next life stage (baby → juvenile, juvenile → champion) during a nightly
 * settlement. Pure data and pure functions only — no DOM, no rendering,
 * no I/O.
 *
 * The design frame (spec R1): evolution is earned by age AND held-up care.
 * Age is the hard floor; a recent sickness or a low mood delays the night
 * it happens, but neglect can never block it forever. The champion gate
 * adds prestige: a strong bond and at least one cup win — the title is
 * earned in the arena, not just at the ranch.
 */

import {
  type BranchDef,
  branchLean,
  getBranch,
  LEGACY_BRANCH,
  LEGACY_CHAMPION_BOOST,
  LEGACY_JUVENILE_BOOST,
} from "./branches"
import type { Creature, CreatureStats } from "./creature"
import { getSpecies } from "./species"

/**
 * The maturation boost applied to the rolled base the night a baby becomes
 * a juvenile. Applied directly to `stats` (trained bonuses are separate and
 * stay capped on their own), so `effectiveStats` shows base + boost +
 * trained.
 *
 * This is the synthetic legacy branch's boost: branched creatures apply their
 * own `juvenileBoost` instead. The literal lives in `branches.ts` so the old
 * numbers have one source and the two modules cannot import each other.
 */
export const EVOLUTION_STAT_BOOST: CreatureStats = LEGACY_JUVENILE_BOOST

/**
 * The cumulative stat offset for champion-stage presentation, applied to the
 * rolled base the night a juvenile becomes a champion ({hp:6, atk:4, def:4,
 * spd:2} = two juvenile steps). Pinned here so the renderer's visual stat
 * seed for a champion can never drift from the contract.
 *
 * The legacy branch's cumulative boost; a real branch applies its own.
 */
export const CHAMPION_STAT_BOOST: CreatureStats = LEGACY_CHAMPION_BOOST

function addBoost(stats: CreatureStats, boost: CreatureStats): CreatureStats {
  return {
    hp: stats.hp + boost.hp,
    atk: stats.atk + boost.atk,
    def: stats.def + boost.def,
    spd: stats.spd + boost.spd,
  }
}

/** The branch a stored id names; null and unknown ids fall back to legacy. */
function storedBranch(creature: Creature): BranchDef {
  const id = creature.branch ?? null
  return id === null ? LEGACY_BRANCH : (getBranch(id) ?? LEGACY_BRANCH)
}

/**
 * The branch earned at the juvenile gate, derived once from the training
 * record (and the rolled base when the record is even). A species with no
 * catalog entry evolves legacy, per the catalog's own test forbidding that
 * for shipped starters.
 */
function deriveBranch(creature: Creature): BranchDef {
  const species = getSpecies(creature.speciesId)
  if (!species) return LEGACY_BRANCH
  return branchLean(creature, species).branch
}

/**
 * Maturation itself: flip to the next stage, earn (or keep) the branch, and
 * apply that branch's stage boost to the rolled base. Pure: returns a new
 * creature; everything else (trained, conditions, loadout) is carried over
 * untouched.
 *
 * The juvenile gate derives and stores the branch when it is still null. The
 * champion gate keeps a stored branch and never re-derives it; a null branch
 * there is a pre-v19 fixture and falls back to the legacy tables.
 */
export function evolveCreature(creature: Creature): Creature {
  const current = creature.branch ?? null
  if (creature.stage === "baby") {
    const earned =
      current === null ? deriveBranch(creature) : storedBranch(creature)
    return {
      ...creature,
      stage: "juvenile",
      branch: earned.id,
      stats: addBoost(creature.stats, earned.juvenileBoost),
    }
  }
  const kept = storedBranch(creature)
  return {
    ...creature,
    stage: "champion",
    branch: kept.id,
    stats: addBoost(creature.stats, kept.championBoost),
  }
}

/**
 * The night of this day (inclusive) is the earliest a baby may evolve.
 * Ten full baby days: day 1 is the hatch day, and the gate closes on the
 * night that ends day 10.
 */
export const EVOLUTION_DAY = 10

/**
 * Baby-to-juvenile coach copy may tease growth from this day on (the
 * threshold itself stays undisclosed — part of the raising mystery).
 */
export const EVOLUTION_HINT_DAY = 5

/**
 * The night of this day (inclusive) is the earliest a juvenile may evolve
 * into its champion form. A quarter-century of days: the champion title is
 * earned across a full month of care, not handed out early.
 */
export const CHAMPION_EVOLUTION_DAY = 25

/**
 * Juvenile-to-champion coach copy may tease the climb from this day on (the
 * thresholds themselves stay undisclosed — part of the raising mystery).
 */
export const CHAMPION_HINT_DAY = 20

/** Mood at or above which the care gate passes. */
export const EVOLUTION_MOOD = 40

/** Bond at or above which the champion prestige gate passes. */
export const CHAMPION_BOND = 60

/** Cup wins required before the champion title can be earned. */
export const CHAMPION_CUPS = 1

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
  | "not_juvenile"
  | "too_young"
  | "recently_sick"
  | "low_mood"
  | "low_bond"
  | "no_cup_win"

/** The gate verdict for one settlement night. */
export interface EvolutionVerdict {
  evolved: boolean
  reason: EvolutionReason
}

/**
 * Should this creature evolve during the settlement that closes `day`?
 * Stage-aware: a baby is judged for the juvenile gate, a juvenile for the
 * champion gate. `cupsWon` feeds only the champion prestige rule.
 *
 * Pure: reads the (post-settlement) creature and returns a verdict; the
 * caller decides what to do with it.
 *
 * Reason precedence for the juvenile gate: not_baby > too_young >
 * recently_sick > low_mood > ready. For the champion gate: not_juvenile >
 * too_young > recently_sick > low_mood > low_bond > no_cup_win > ready.
 */
export function evaluateEvolution(
  creature: Creature,
  day: number,
  cupsWon = 0,
): EvolutionVerdict {
  if (creature.stage === "baby") {
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
  if (creature.stage === "juvenile") {
    if (day < CHAMPION_EVOLUTION_DAY) {
      return { evolved: false, reason: "too_young" }
    }
    if (creature.sickCooldown > 0) {
      return { evolved: false, reason: "recently_sick" }
    }
    if (creature.conditions.mood < EVOLUTION_MOOD) {
      return { evolved: false, reason: "low_mood" }
    }
    if (creature.conditions.bond < CHAMPION_BOND) {
      return { evolved: false, reason: "low_bond" }
    }
    if (cupsWon < CHAMPION_CUPS) {
      return { evolved: false, reason: "no_cup_win" }
    }
    return { evolved: true, reason: "ready" }
  }
  return { evolved: false, reason: "not_juvenile" }
}
