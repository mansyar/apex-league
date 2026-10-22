/**
 * The stable (save v24, stable & partner reserve FR-1/FR-3): the storage for
 * the pets the player owns that are **not** in the ranch. Exactly one pet is
 * active at a time — `state.creature` — and every other owned pet waits in
 * `state.stable`, frozen, with its career paused (FR-4).
 *
 * The swap seam is free, instant and lossless: every field of a pet travels
 * with it in both directions, no action point is spent and no RNG is consumed
 * (NFR-3). Pure data and pure functions only — no DOM, no rendering, no I/O.
 *
 * Two seams, both pure:
 *
 * - `sendToStable` moves the ranch pet into the stable and leaves the ranch
 *   empty. It only means something once a pet is brought forward, so the
 *   client composes the two seams into the swap: the stashed pet lands at
 *   the end of the list (its slot id is `stablePetId(stable.length)`), and
 *   bringing it forward leaves exactly one pet in the ranch. The last pet
 *   the player owns cannot be sent away — the ranch always keeps somebody.
 * - `bringToRanch` hands the ranch to a stashed pet and files the pet that
 *   was in the ranch into the stable.
 * - `renameStablePet` names a waiting pet where it waits, so a stashed pet
 *   never has to be swapped into the ranch to be renamed.
 */

import { NAME_MAX_LENGTH } from "./creature"
import { getSpecies } from "./species"
import type { GameState } from "./state"

/**
 * Why a swap was refused. `"cup-phase"` is the day-phase lock the rest of
 * the game uses: a live cup or spar owns the ranch until it finishes.
 * `"no-creature"` means the ranch holds no pet to move. `"only-pet"` means
 * the ranch pet is the only pet the player owns — sending it away would
 * leave nobody in the ranch. `"unknown-pet"` means the named pet is not in
 * the stable.
 */
export type StableReason =
  | "cup-phase"
  | "no-creature"
  | "only-pet"
  | "unknown-pet"

/** The outcome of a swap attempt: the next state, or the refusal. */
export type StableResult =
  | { ok: true; state: GameState }
  | { ok: false; reason: StableReason }

/**
 * The outcome of a rename asked for on a waiting pet. The refusals are the
 * stable's own: the day-phase lock and a pet that is no longer waiting.
 */
export type RenameStableResult =
  | { ok: true; state: GameState }
  | { ok: false; reason: "cup-phase" | "unknown-pet" }

/**
 * The id of a stashed pet: its slot in the stable list, as a stable string.
 * A pet carries no id of its own (the persisted shape is a plain
 * `Creature[]`), so the slot is the identity the stable modal hands back to
 * the sim when the player picks a pet to bring to the ranch.
 */
export function stablePetId(index: number): string {
  return `stable:${index}`
}

/** The slot a stable pet id names, or null when the id names no slot. */
export function stablePetSlot(creatureId: string): number | null {
  const match = /^stable:(\d+)$/.exec(creatureId)
  if (!match) return null
  const slot = Number(match[1])
  return Number.isSafeInteger(slot) ? slot : null
}

/**
 * Send the ranch pet to the stable.
 *
 * The pet moves across whole: every field travels with it and nothing is
 * reset, recalculated or dropped. The ranch is left empty — the ranch keeps
 * its shape (day, action points, ladder, lineage), it just holds no pet
 * until one is brought forward.
 *
 * Refused while a cup or spar is live (`"cup-phase"`), when the ranch holds
 * no pet (`"no-creature"`), and when the ranch pet is the only pet the
 * player owns (`"only-pet"`): the ranch always keeps somebody, so the last
 * pet cannot be sent away.
 */
export function sendToStable(state: GameState): StableResult {
  if (state.phase === "cup") return { ok: false, reason: "cup-phase" }
  const creature = state.creature
  if (!creature) return { ok: false, reason: "no-creature" }
  if (state.stable.length === 0) return { ok: false, reason: "only-pet" }
  return {
    ok: true,
    state: {
      ...state,
      creature: null,
      stable: [...state.stable, creature],
    },
  }
}

/**
 * Bring a stashed pet to the ranch.
 *
 * The chosen pet becomes the active creature and the pet that was in the
 * ranch is filed into the stable — a swap, in one step. Every field travels
 * with the pet that owns it: name, species, element, affinity, stats,
 * trained, stage, branch, loadout, conditions, the day's flags, the illness
 * cooldown, the training assignment and its result, the gift marker, the
 * parents and the pet's own age. Nothing is reset, recalculated or dropped.
 *
 * A swap is free: no action point is spent, the day does not move and no
 * RNG is drawn, so the seeded streams are untouched.
 *
 * Refused while a cup or spar is live (`"cup-phase"`) and when the named
 * pet is not in the stable (`"unknown-pet"`).
 */
export function bringToRanch(
  state: GameState,
  creatureId: string,
): StableResult {
  if (state.phase === "cup") return { ok: false, reason: "cup-phase" }
  const slot = stablePetSlot(creatureId)
  if (slot === null || slot >= state.stable.length) {
    return { ok: false, reason: "unknown-pet" }
  }
  const chosen = state.stable[slot]
  if (!chosen) return { ok: false, reason: "unknown-pet" }
  const rest = state.stable.filter((_, index) => index !== slot)
  return {
    ok: true,
    state: {
      ...state,
      creature: chosen,
      // The pet that held the ranch waits its turn in the stable.
      stable: state.creature ? [...rest, state.creature] : rest,
    },
  }
}

/**
 * Rename a pet waiting in the stable.
 *
 * The same rules as `renameCreature`: the name is trimmed and clamped to
 * NAME_MAX_LENGTH, and an empty name falls back to the species' display name.
 * Refused while a cup or spar is live (`"cup-phase"`) and when the named pet
 * is not in the stable (`"unknown-pet"`).
 *
 * Pure: only the name moves. The pet keeps its slot, the ranch pet is
 * untouched, and the day, the lineage and the ladder do not move either — a
 * rename is a label, not a career.
 */
export function renameStablePet(
  state: GameState,
  creatureId: string,
  name: string,
): RenameStableResult {
  if (state.phase === "cup") return { ok: false, reason: "cup-phase" }
  const slot = stablePetSlot(creatureId)
  if (slot === null || slot >= state.stable.length) {
    return { ok: false, reason: "unknown-pet" }
  }
  const pet = state.stable[slot]
  if (!pet) return { ok: false, reason: "unknown-pet" }
  const trimmed = name.trim().slice(0, NAME_MAX_LENGTH)
  const nextName =
    trimmed.length > 0
      ? trimmed
      : (getSpecies(pet.speciesId)?.displayName ?? pet.name)
  const stable = [...state.stable]
  stable[slot] = { ...pet, name: nextName }
  return { ok: true, state: { ...state, stable } }
}
