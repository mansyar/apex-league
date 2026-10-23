/**
 * The league rewards (earth/wind species line FR-5/FR-6): the per-tier
 * gift hatches, the nursery's claim flow over the pending-reward queue,
 * and the preview.
 *
 * Split out of the former monolithic breeding.ts (sim-voxel-size-guard,
 * phase 2); generalized from the one-species Storm Gift to every reward
 * tier (earth/wind species line, phase 2).
 */

import {
  type Creature,
  type CreatureStats,
  createCreatureFrom,
  type Element,
} from "../creature"
import type { Rng } from "../rng"
import { getSpecies } from "../species"
import type { GameState } from "../state"

/**
 * The pure gift egg (FR-6): a league tier-reward hatches into a
 * fixed-element creature with a guaranteed `affinity: null`. This path
 * deliberately does NOT route through `createBredCreature` — a gift is not
 * bred, so no affinity-drift roll is made and no drift RNG draw is
 * consumed (NFR-3): the drift stream's position for every subsequent
 * operation is unchanged. Same seed → same individual, so the nursery
 * preview and the hatch agree by construction. The locked species is
 * reached through the unchecked creation seam (`createCreatureFrom`) —
 * the public starter gate stays as locked as ever.
 */
export function createGiftEgg(speciesId: string, seed: number | Rng): Creature {
  const species = getSpecies(speciesId)
  if (!species) {
    throw new Error(`Unknown species: ${speciesId}`)
  }
  const base = createCreatureFrom(species, seed)
  // The gift is pure: the affinity is stamped null directly — no roll.
  return { ...base, affinity: null, giftEgg: true }
}

export type HatchGiftReason = "not-granted" | "already-hatched"

export type HatchGiftResult =
  | { ok: true; state: GameState }
  | { ok: false; reason: HatchGiftReason }

/**
 * Hatch the oldest pending reward egg (the nursery's claim flow, FR-9):
 * the head of the `pendingRewards` queue — the lowest tier the league
 * granted first — leaves the queue and its creature joins the **stable**
 * (save v24): a reward is a pet the player owns, not a replacement for the
 * pet they already have, so the ranch keeps its partner and its career
 * untouched — and the outgoing partner is NOT archived, because it never
 * left the ranch. One claim per flow: the rest of the queue waits.
 *
 * The day, budget, ladder and lineage generation carry over untouched: a
 * reward is a grant, not a graduation. Pure; the egg's own stored seed
 * lands the exact individual the nursery previewed.
 */
export function hatchGiftEgg(state: GameState): HatchGiftResult {
  if (state.claimedTiers.length === 0 && state.pendingRewards.length === 0) {
    return { ok: false, reason: "not-granted" }
  }
  const pending = state.pendingRewards[0]
  if (!pending) return { ok: false, reason: "already-hatched" }
  return {
    ok: true,
    state: {
      ...state,
      // The ranch pet stays exactly as it was — the reward waits in the
      // stable until the player brings it forward.
      stable: [...state.stable, createGiftEgg(pending.speciesId, pending.seed)],
      pendingRewards: state.pendingRewards.slice(1),
    },
  }
}

/**
 * Whether a granted reward egg is waiting in the nursery for the player to
 * hatch it (save v25, generalizing v22's single pending gift).
 */
export function leagueRewardPending(state: GameState): boolean {
  return state.pendingRewards.length > 0
}

/** What the nursery shows before the player commits to the hatch. */
export interface LeagueRewardPreview {
  speciesId: string
  displayName: string
  element: Element
  flavor: string
  /** The rolled stats of the exact individual the hatch will produce. */
  stats: CreatureStats
  /** The seed the hatch uses — the preview and the hatch share it. */
  seed: number
}

/**
 * The oldest pending reward as the player will see it: the granted species
 * and the rolled stats of the very individual the hatch produces. Built
 * from the pending egg's own seed, so the preview cannot drift from the
 * hatch (FR-6). Null when no reward is waiting.
 */
export function leagueRewardPreview(
  state: GameState,
): LeagueRewardPreview | null {
  const pending = state.pendingRewards[0]
  if (!pending) return null
  const species = getSpecies(pending.speciesId)
  if (!species) return null
  const egg = createGiftEgg(pending.speciesId, pending.seed)
  return {
    speciesId: pending.speciesId,
    displayName: species.displayName,
    element: species.element,
    flavor: species.flavor,
    stats: egg.stats,
    seed: pending.seed,
  }
}
