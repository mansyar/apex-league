/**
 * The Storm Gift (electric species line, FR-5/FR-6): the league's one-time
 * Silver tier-reward egg — the pure gift hatch, the grant checks, and the
 * nursery preview.
 *
 * Split out of the former monolithic breeding.ts (sim-voxel-size-guard,
 * phase 2) — pure relocation, no behavior change.
 */

import {
  type Creature,
  type CreatureStats,
  createCreatureFrom,
  type Element,
} from "../creature"
import type { Rng } from "../rng"
import { getSpecies, STORM_GIFT_SPECIES_ID } from "../species"
import type { GameState } from "../state"

/**
 * The Silver tier-reward species: the league's one-time "Storm Gift" (FR-5).
 * Re-exported from the catalog so the grant seam and the hatch seam cannot
 * name two different species.
 */
export { STORM_GIFT_SPECIES_ID } from "../species"

/**
 * The pure gift egg (electric species line FR-6): the league's Silver
 * tier-reward hatches into a fixed-Electric creature with a guaranteed
 * `affinity: null`. This path deliberately does NOT route through
 * `createBredCreature` — a gift is not bred, so no affinity-drift roll is
 * made and no drift RNG draw is consumed (NFR-3): the drift stream's
 * position for every subsequent operation is unchanged. Same seed → same
 * individual, so the nursery preview and the hatch agree by construction.
 * The locked species is reached through the unchecked creation seam
 * (`createCreatureFrom`) — the public starter gate stays as locked as ever.
 */
export function createGiftEgg(seed: number | Rng): Creature {
  const species = getSpecies(STORM_GIFT_SPECIES_ID)
  if (!species) {
    throw new Error(`Unknown species: ${STORM_GIFT_SPECIES_ID}`)
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
 * Whether the granted gift egg has already been hatched anywhere in the
 * lineage: the active creature carries the marker, a retired gift career
 * sits in the Hall of Fame, or a gift pet waits in the stable. Derived from
 * the persisted lineage marker (save v21) — never stored separately.
 */
function giftEggHatched(state: GameState): boolean {
  return (
    (state.creature?.giftEgg ?? false) ||
    state.stable.some((pet) => pet.giftEgg) ||
    state.lineage.hallOfFame.some((record) => record.giftEgg)
  )
}

/**
 * Hatch the granted gift egg (the nursery's hatch seam for the Storm Gift).
 * The hound joins the **stable** (save v24): the gift is a pet the player
 * owns, not a replacement for the pet they already have, so the ranch keeps
 * its partner and its career untouched — and the outgoing partner is NOT
 * archived, because it never left the ranch.
 *
 * The day, budget, ladder and lineage generation carry over untouched: the
 * gift is a grant, not a graduation. Pure; the egg's own stored seed lands
 * the exact individual the nursery previewed.
 */
export function hatchGiftEgg(state: GameState): HatchGiftResult {
  if (!state.stormGiftClaimed) return { ok: false, reason: "not-granted" }
  const pending = state.pendingGift
  if (!pending) return { ok: false, reason: "already-hatched" }
  if (giftEggHatched(state)) return { ok: false, reason: "already-hatched" }
  return {
    ok: true,
    state: {
      ...state,
      // The ranch pet stays exactly as it was — the gift waits in the stable.
      stable: [...state.stable, createGiftEgg(pending.seed)],
      pendingGift: null,
    },
  }
}

/**
 * Whether a granted egg is waiting in the nursery for the player to hatch
 * it (save v22). The claim flag alone cannot answer this: it stays true
 * after the hatch.
 */
export function stormGiftPending(state: GameState): boolean {
  return state.pendingGift !== null
}

/** What the nursery shows before the player commits to the hatch. */
export interface StormGiftPreview {
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
 * The Storm Gift as the player will see it: the granted species and the
 * rolled stats of the very individual the hatch produces. Built from the
 * pending egg's own seed, so the preview cannot drift from the hatch
 * (FR-6). Null when no gift is waiting.
 */
export function stormGiftPreview(state: GameState): StormGiftPreview | null {
  const pending = state.pendingGift
  if (!pending) return null
  const species = getSpecies(pending.speciesId)
  if (!species) return null
  const egg = createGiftEgg(pending.seed)
  return {
    speciesId: pending.speciesId,
    displayName: species.displayName,
    element: species.element,
    flavor: species.flavor,
    stats: egg.stats,
    seed: pending.seed,
  }
}
