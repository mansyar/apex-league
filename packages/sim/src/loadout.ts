/**
 * Loadout state: the move slice unlocked by trained days, the default
 * loadout, and pure set/clear helpers over GameState.
 */

import { BASIC_MOVE, getMove } from "./battle/moves"
import { getBranch } from "./branches"
import type { Creature, LifeStage } from "./creature"
import { getSpecies, type SpeciesDef } from "./species"
import type { GameState } from "./state"

/** Trained days at which kit tier 3 (the Heavy-class move) unlocks. */
export const MOVE_TIER3_DAYS = 3

/** Trained days at which kit tier 4 (the Bomb-class move) unlocks. */
export const MOVE_TIER4_DAYS = 6

/** The kit ids known from birth (tiers 1-2). */
const BIRTH_TIERS = 2

/** Known moves at the full six-move pool. */
const FULL_POOL = 6

function knownCount(
  creature: Pick<Creature, "trainingDays" | "stage">,
): number {
  if (creature.trainingDays >= MOVE_TIER4_DAYS) return FULL_POOL
  // Evolution itself is training: a juvenile knows its tier-3 move from
  // the morning it matures, regardless of trained days.
  if (creature.stage !== "baby" || creature.trainingDays >= MOVE_TIER3_DAYS) {
    return 3
  }
  return BIRTH_TIERS
}

/**
 * The branch signature this creature may know, or null. Only a real branch
 * that owns the species counts, and only once the juvenile gate has opened
 * it — babies, legacy, and unchosen creatures learn no signature.
 */
function signatureMoveOf(
  creature: Pick<Creature, "stage" | "branch">,
  species: SpeciesDef,
): string | null {
  if (creature.stage === "baby") return null
  const id = creature.branch ?? null
  if (id === null) return null
  const branch = getBranch(id)
  if (!branch || branch.speciesId !== species.id) return null
  return branch.signatureMove
}

/**
 * The prefix of the species kit the creature knows, by stage and trained
 * days, plus the branch signature once a real branch owns this species.
 * Order follows catalog (tier) order; no randomness is involved.
 */
export function knownMoves(
  creature: Pick<Creature, "trainingDays" | "stage" | "branch">,
  species: SpeciesDef,
): readonly string[] {
  const known = species.kit.slice(0, knownCount(creature))
  const signature = signatureMoveOf(creature, species)
  return signature === null ? known : [...known, signature]
}

/** @deprecated Name predating the wider pool; use {@link knownMoves}. */
export function unlockedKit(
  creature: Pick<Creature, "trainingDays" | "stage" | "branch">,
  species: SpeciesDef,
): readonly string[] {
  return knownMoves(creature, species)
}

/**
 * A fresh creature's loadout is the first four of the moves it knows: the
 * wider pool adds choice, not a bigger default kit, so a save with a null
 * loadout fights exactly the battle it fought before the pool widened.
 *
 * The branch signature is earned, never defaulted: a branched juvenile
 * starts on its three leading kit moves and only gets the signature when the
 * player equips it.
 */
export function defaultLoadout(
  creature: Pick<Creature, "trainingDays" | "stage" | "branch">,
  species: SpeciesDef,
): readonly string[] {
  const signature = signatureMoveOf(creature, species)
  return knownMoves(creature, species)
    .filter((id) => id !== signature)
    .slice(0, MAX_LOADOUT)
}

/** Longest legal loadout — the early game grows into the full four slots. */
export const MAX_LOADOUT = 4

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
    const required = requiredDays(id, species, creature)
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

/**
 * Trained days required before a move id is equippable, or null when the
 * creature may never equip it.
 *
 * The branch signature is free from the juvenile gate (the evolution itself
 * is the unlock) but only for the creature's own branch; the sibling
 * signature is not in this species' kit and is rejected here. Kit ids keep
 * their tier rules.
 */
function requiredDays(
  moveId: string,
  species: SpeciesDef,
  creature: Pick<Creature, "stage" | "branch">,
): number | null {
  if (signatureMoveOf(creature, species) === moveId) return 0
  const index = [...species.kit].indexOf(moveId)
  if (index < 0) return null
  return requiredTierDays(index, creature.stage)
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
