/**
 * Loadout state: the move slice unlocked by trained days, the default
 * loadout, and pure set/clear helpers over GameState.
 */

import { BASIC_MOVE, getMove } from "./battle/moves"
import type { Creature, LifeStage } from "./creature"
import { getSpecies, type SpeciesDef } from "./species"
import type { GameState } from "./state"

/** Trained days at which kit tier 3 (the Heavy-class move) unlocks. */
export const MOVE_TIER3_DAYS = 3

/** Trained days at which kit tier 4 (the Bomb-class move) unlocks. */
export const MOVE_TIER4_DAYS = 6

/** The kit ids known from birth (tiers 1-2). */
const BIRTH_TIERS = 2

function tierCount(creature: Pick<Creature, "trainingDays" | "stage">): number {
  if (creature.trainingDays >= MOVE_TIER4_DAYS) return 4
  // Evolution itself is training: a juvenile knows its tier-3 move from
  // the morning it matures, regardless of trained days.
  if (creature.stage !== "baby" || creature.trainingDays >= MOVE_TIER3_DAYS) {
    return 3
  }
  return BIRTH_TIERS
}

/**
 * The prefix of the species kit unlocked by the creature's stage and
 * trained days. Order follows catalog (tier) order; no randomness is
 * involved.
 */
export function unlockedKit(
  creature: Pick<Creature, "trainingDays" | "stage">,
  species: SpeciesDef,
): readonly string[] {
  return species.kit.slice(0, tierCount(creature))
}

/** A fresh creature's loadout is the whole unlocked slice, in kit order. */
export function defaultLoadout(
  creature: Pick<Creature, "trainingDays" | "stage">,
  species: SpeciesDef,
): readonly string[] {
  return unlockedKit(creature, species)
}

/** Longest legal loadout — the early game grows into the full four slots. */
const MAX_LOADOUT = 4

/**
 * Equips 2-4 unique moves from the creature's unlocked kit (the basic strike
 * is innate and never equipped). Pure: on failure nothing changes; on success
 * returns a new state with `creature.loadout` stored.
 */
export function setLoadout(
  state: GameState,
  moveIds: readonly string[],
): GameState {
  if (moveIds.length < 2 || moveIds.length > MAX_LOADOUT) {
    throw new Error("A loadout needs two to four moves")
  }
  const creature = state.creature
  if (!creature) throw new Error("Assign a partner before preparing a kit")

  const species = getSpecies(creature.speciesId)
  if (!species) {
    throw new Error(`Unknown species: ${creature.speciesId}`)
  }

  const seen = new Set<string>()
  for (const id of moveIds) {
    if (!getMove(id)) {
      throw new Error(`Unknown move: ${id}`)
    }
    if (id === BASIC_MOVE.id) {
      throw new Error("The basic strike is innate and cannot be equipped")
    }
    if (seen.has(id)) {
      throw new Error("This loadout repeats a move")
    }
    const required = requiredDays(id, species, creature.stage)
    if (required === null) {
      throw new Error(`Not in this partner's kit: ${id}`)
    }
    if (required > creature.trainingDays) {
      const remaining = required - creature.trainingDays
      throw new Error(`Not unlocked yet: ${id}. Train ${remaining} more days.`)
    }
    seen.add(id)
  }

  const loadout = Object.freeze([...moveIds])
  return {
    ...state,
    creature: { ...creature, loadout },
  }
}

/**
 * Trained days a kit index needs for the given stage; tiers 1-2 are known
 * from birth, and evolution teaches tier 3 outright (a juvenile needs no
 * trained days for it). Tier 4 always costs the full six days.
 */
export function requiredTierDays(kitIndex: number, stage: LifeStage): number {
  if (kitIndex < BIRTH_TIERS) return 0
  if (kitIndex === BIRTH_TIERS) return stage === "baby" ? MOVE_TIER3_DAYS : 0
  return MOVE_TIER4_DAYS
}

/** Trained days required before a kit id is equippable; null if not in kit. */
function requiredDays(
  moveId: string,
  species: SpeciesDef,
  stage: LifeStage,
): number | null {
  const index = [...species.kit].indexOf(moveId)
  if (index < 0) return null
  return requiredTierDays(index, stage)
}

/** Clears the chosen kit back to the default slicing (null loadout). Pure. */
export function clearLoadout(state: GameState): GameState {
  const creature = state.creature
  if (!creature) throw new Error("Assign a partner before preparing a kit")
  return {
    ...state,
    creature: { ...creature, loadout: null },
  }
}
