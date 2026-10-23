/**
 * Graduation: the gate that decides whether the active champion may be sent
 * off, and the two successions it can produce (a fresh egg, or a handover to
 * a pet already waiting in the stable).
 *
 * Split out of the former monolithic `legacy.ts` (sim-voxel-size-guard,
 * phase 2).
 */

import { headStartAp } from "../ap"
import { stablePetSlot } from "../stable"
import { ACTION_POINTS_PER_DAY, type GameState } from "../state"
import { createInheritedCreature } from "./inheritance"
import { lineagePerks, retireeRecord } from "./lineage"

/**
 * The pet's own age at which a champion may graduate: a full career of two
 * months of its own life. No upper limit — once eligible, the send-off is
 * the player's to choose.
 */
export const GRADUATION_DAY = 60

/**
 * Coach copy may tease a full career from this age on (the send-off itself
 * stays player-triggered — discovered, not demanded).
 */
export const GRADUATION_HINT_DAY = 55

/**
 * Why the graduation gate answered the way it did, checked in precedence
 * order: `no-creature > cup-phase > not-champion > too-young > eligible`.
 */
export type GraduationReason =
  | "eligible"
  | "no-creature"
  | "cup-phase"
  | "not-champion"
  | "too-young"

/** The graduation gate's verdict for the current state. */
export interface GraduationVerdict {
  eligible: boolean
  reason: GraduationReason
}

/**
 * May the player graduate the active creature right now? Eligible only when
 * the state is in the day phase, a creature is owned, it has reached its
 * **champion** form, and the creature's own age is at least
 * `GRADUATION_DAY`. The gate delays but never blocks — past the floor it
 * stays eligible forever.
 *
 * The floor is the pet's own age (save v23), not the world day: a full
 * career is two months of *its* life. A day-1 starter's timing is
 * unchanged; a late-hatched pet must live 60 of its own days first.
 *
 * Pure: reads the state, returns a verdict; the caller decides what to do.
 */
export function canGraduate(state: GameState): GraduationVerdict {
  if (!state.creature) return { eligible: false, reason: "no-creature" }
  if (state.phase === "cup") return { eligible: false, reason: "cup-phase" }
  if (state.creature.stage !== "champion")
    return { eligible: false, reason: "not-champion" }
  if (state.creature.ageDays < GRADUATION_DAY)
    return { eligible: false, reason: "too-young" }
  return { eligible: true, reason: "eligible" }
}

/** The outcome of a graduation attempt. */
export type GraduateResult =
  | { ok: true; state: GameState }
  | { ok: false; reason: GraduationReason }

/**
 * Graduate the active champion into the next generation (R4). Pure: the input
 * state is never mutated. On success the retiree is archived to the Hall of
 * Fame, the chosen species hatches as the successor (with the parent's
 * inheritance), the generation advances, and the day's action points reset.
 * The in-game day, cups, ladder, and settings carry over untouched — a dynasty
 * inherits its standing.
 *
 * The successor's perks read the family's prestige **at the moment the egg is
 * laid** (the incremented generation + lifetime cups), so a family that has
 * reached a milestone passes its boon to the next creature.
 *
 * Rejects (with no change) whenever `canGraduate` is not eligible.
 */
export function graduate(
  state: GameState,
  speciesId: string,
  seed: number,
): GraduateResult {
  const verdict = canGraduate(state)
  if (!verdict.eligible) return { ok: false, reason: verdict.reason }

  const record = retireeRecord(state)
  if (!record) return { ok: false, reason: "no-creature" }
  const generation = state.lineage.generation + 1
  // Prestige as of the new generation (spec R4): the egg belongs to it.
  const prestige = generation + state.cupsWon
  const successor = createInheritedCreature(
    speciesId,
    seed,
    record.stats,
    prestige,
    {
      traits: record.traits,
      parents: [state.lineage.generation],
    },
  )
  return {
    ok: true,
    state: {
      ...state,
      // The successor's first day of life: the champion-stable head-start
      // already applies on the hatch day itself (FR-5).
      actionPoints:
        ACTION_POINTS_PER_DAY +
        headStartAp(
          state.day,
          state.day,
          lineagePerks(prestige).championStable,
        ),
      creature: successor,
      lineage: {
        generation,
        hallOfFame: [...state.lineage.hallOfFame, record],
      },
    },
  }
}

/** The outcome of a graduation that hands the ranch to a stashed pet. */
export type GraduateFromStableResult =
  | { ok: true; state: GameState }
  | { ok: false; reason: GraduationReason | "unknown-pet" }

/**
 * Graduate the active champion and hand the ranch to a pet waiting in the
 * stable (FR-8). The retired pet is archived exactly as {@link graduate}
 * archives it, the generation advances, and the day's action points reset —
 * but the successor is a pet the player already owns, not a fresh egg: it
 * takes the ranch with every field it left the stable with, and it is NOT
 * added to the Hall of Fame a second time (it was never in it).
 *
 * The gate is the gate {@link graduate} uses — the retiree must be a champion
 * that lived its own 60 days — so a swap can never sidestep a career.
 *
 * Pure: the input state is never mutated.
 */
export function graduateFromStable(
  state: GameState,
  creatureId: string,
): GraduateFromStableResult {
  const verdict = canGraduate(state)
  if (!verdict.eligible) return { ok: false, reason: verdict.reason }
  const record = retireeRecord(state)
  if (!record) return { ok: false, reason: "no-creature" }
  const index = stablePetSlot(creatureId)
  if (index === null) return { ok: false, reason: "unknown-pet" }
  const successor = state.stable[index]
  if (!successor) return { ok: false, reason: "unknown-pet" }
  const generation = state.lineage.generation + 1
  const prestige = generation + state.cupsWon
  return {
    ok: true,
    state: {
      ...state,
      // The successor's first day in the ranch: the champion-stable head-start
      // already applies on the handover day itself (FR-5).
      actionPoints:
        ACTION_POINTS_PER_DAY +
        headStartAp(
          state.day,
          state.day,
          lineagePerks(prestige).championStable,
        ),
      creature: successor,
      // The stable keeps every other waiting pet; the successor leaves it.
      stable: state.stable.filter((_, slot) => slot !== index),
      lineage: {
        generation,
        hallOfFame: [...state.lineage.hallOfFame, record],
      },
    },
  }
}
