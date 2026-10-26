/**
 * Cup rewards (spec FR5): winning pays — the approved full bundle is a
 * next-day AP budget bump (+1, 3 → 4), bond +10, mood +15, and a permanent
 * `cupsWon` counter for the banner case. Early exit pays a +2 mood
 * consolation ("the crowd respects the effort") so a loss is warm, never
 * punitive — death-free stakes. No currency, no stat gains.
 *
 * Pure: returns a new GameState plus the reward bookkeeping; the input is
 * never mutated. The caller (the machine or the client) owns where the
 * next-day AP budget and the cupsWon counter are persisted.
 */

import { type LadderTier, tierAtLeast } from "./ladder"
import { clampCondition } from "./settlement"
import { REWARD_SPECIES } from "./species"
import type { GameState } from "./state"

/** The approved win bundle (2026-10-11 decision). */
export const CUP_REWARDS = Object.freeze({
  bond: 10,
  mood: 15,
  consolations: Object.freeze({ mood: 2 }),
})

/** Extra AP budget the day after a cup win. The bonus itself is defined in
 * ticker.ts (CUP_WIN_AP_BONUS) so the grant sits next to the budget math. */

/** The resolved cup outcome. The machine (machine.ts) collapses the cup
 * result's numeric placement into this — the reward layer never sees raw
 * placements. */
export type CupOutcome = "won" | "lost"

/**
 * Apply the cup outcome's rewards to the state. Pure: the input state is
 * untouched; the returned state carries the new mood/bond, the drummed-up
 * `cupsWon` counter, and `lastCupDay` bookkeeping (the machine stamps the
 * current day on a win so the next `advanceDay` starts with the bonus AP).
 * Throws when the state has no creature (rewards need somewhere to land).
 */
export function applyCupRewards(
  state: GameState,
  outcome: CupOutcome,
  cupDay: number,
): GameState {
  const creature = state.creature
  if (!creature) throw new Error("Cup rewards need a creature to reward")
  if (outcome !== "won" && outcome !== "lost") {
    throw new Error(`Unknown cup outcome: ${String(outcome)}`)
  }
  const won = outcome === "won"
  // The lifetime counter lives on GameState (save v5) and accumulates here.
  const prevWins = state.cupsWon
  const conditions = creature.conditions
  const nextConditions = won
    ? {
        ...conditions,
        bond: clampCondition(conditions.bond + CUP_REWARDS.bond),
        mood: clampCondition(conditions.mood + CUP_REWARDS.mood),
      }
    : {
        ...conditions,
        mood: clampCondition(conditions.mood + CUP_REWARDS.consolations.mood),
      }
  return {
    ...state,
    creature: { ...creature, conditions: nextConditions },
    cupsWon: won ? prevWins + 1 : prevWins,
    // The Legend plateau keeps score (gold_legend_ladder_20261017): every
    // cup won AT the legend tier is a collected title. The machine orders
    // placement before rewards, so the gate-cup champion that flips into
    // Legend is crowned here too — the gate cup is the first title.
    legendTitles:
      won && state.ladder.tier === "legend"
        ? state.legendTitles + 1
        : state.legendTitles,
    // Stamp the cup day only on a win — the ticker reads "today was a won
    // cup" from lastCupDay === day to grant tomorrow's bonus AP (stacked
    // with the tier's extra, TIER_AP_BONUS).
    lastCupDay: won ? cupDay : state.lastCupDay,
  }
}

/**
 * The league reward grant (earth/wind species line FR-5, generalizing the
 * one-time Silver "Storm Gift"): on a non-forfeit cup finalize, every
 * released reward tier the post-placement ladder has reached and this save
 * has not yet claimed is paid here — the claim is stamped in
 * `claimedTiers` and the tier's pure gift egg joins the `pendingRewards`
 * queue (oldest, lowest tier first). Tiers grant independently and in
 * ascending tier order, so a save that finalizes its first non-forfeit cup
 * already standing at Legend collects Silver, Gold and Legend at once.
 * Never below the lowest reward tier, never on a forfeit (a forfeited cup
 * earns nothing — the bronze ladder rule), never twice for the same tier.
 * Retroactive by construction: an existing save past a tier claims at its
 * next non-forfeit finalize (the tier check, not an exact arrival), and a
 * Promotion Cup champion crowned into a reward tier claims at that same
 * finalize because placement runs before this seam (machine.ts ordering).
 *
 * The grant is a pending egg (save v22), not a flag: the egg waits in the
 * nursery with its roll seed, so the player hatches it when they choose and
 * the preview matches the hatch. The seed is derived from the claim moment
 * rather than an RNG draw, so the grant consumes no stream (NFR-3).
 *
 * Pure: returns a new state, the input never mutated. The egg itself is
 * created by the hatch seam (breeding.ts `hatchGiftEgg`) so the claim stamp
 * never touches an RNG stream.
 */
export function grantLeagueRewards(
  state: GameState,
  forfeited: boolean,
): GameState {
  if (forfeited) return state
  // REWARD_SPECIES is ordered by ascending tier (Silver, Gold, Legend), so
  // appending in catalog order keeps the queue oldest-first. Two species now
  // share each reward tier, so the claim stamp is per tier — pushed once,
  // on the tier's first species — while every species of the tier queues
  // its own egg.
  const claimed: LadderTier[] = []
  const eggs: GameState["pendingRewards"] = []
  for (const species of REWARD_SPECIES) {
    const rewardTier = species.rewardFromTier
    if (rewardTier === undefined) continue
    if (!tierAtLeast(state.ladder.tier, rewardTier)) continue
    if (state.claimedTiers.includes(rewardTier)) continue
    if (!claimed.includes(rewardTier)) claimed.push(rewardTier)
    eggs.push({
      speciesId: species.id,
      seed: leagueRewardSeed(state.day, state.ladder.points),
    })
  }
  if (eggs.length === 0) return state
  return {
    ...state,
    claimedTiers: [...state.claimedTiers, ...claimed],
    pendingRewards: [...state.pendingRewards, ...eggs],
  }
}

/**
 * The grant's roll seed: derived from the claim moment (the day and the
 * ladder points the claim landed on) so the egg is reproducible without
 * drawing from any RNG stream. Two different saves therefore never share a
 * gift egg by accident.
 */
export function leagueRewardSeed(day: number, points: number): number {
  return (day * 7919 + points * 31 + 17) % 2 ** 31
}

/**
 * Does this save already hold (or have queued) the given reward species?
 * A delivered gift pet is always findable in exactly one of the four places
 * a creature can live: unhatched in the nursery queue, on the ranch, in
 * the stable, or retired into the Hall of Fame. Any one of them proves the
 * species was delivered, so the catch-up never grants it twice.
 */
function giftSpeciesDelivered(state: GameState, speciesId: string): boolean {
  return (
    state.pendingRewards.some((egg) => egg.speciesId === speciesId) ||
    state.creature?.speciesId === speciesId ||
    state.stable.some((pet) => pet.speciesId === speciesId) ||
    state.lineage.hallOfFame.some((record) => record.speciesId === speciesId)
  )
}

/**
 * The retroactive catch-up (species-roster-expansion FR-4): a save that
 * claimed a reward tier BEFORE a tier's newer species shipped must still
 * receive that species — on the next boot, as a queued pendingReward, with
 * no new claim stamp (the tier is already claimed). For every released
 * reward species whose tier this save has claimed and whose species is
 * nowhere in the save (not queued, not on the ranch, not stashed, not in
 * the Hall of Fame), an egg joins the `pendingRewards` queue.
 *
 * Idempotent by construction: once queued, the egg satisfies the
 * delivered check, so re-running the reconciliation — every boot — never
 * duplicates a grant, and neither does hatching (the hatched pet lives on
 * in stable or Hall of Fame). The merged queue is re-ordered by the
 * catalog's tier order (oldest tier first, older line of a tier first), so
 * a catch-up egg slots in ahead of any same-or-later-tier egg that was
 * granted earlier — the queue invariant the hatch seam relies on.
 *
 * Pure: returns a new state, the input never mutated; the egg seed is
 * derived from the save's own day and ladder points, never an RNG draw
 * (NFR-3). Called from the boot seam (`save/storage.ts loadBoot`), so
 * every loaded save reconciles before play; fresh saves (nothing claimed)
 * pass through untouched.
 */
export function reconcileLeagueRewards(state: GameState): GameState {
  const catchUp: GameState["pendingRewards"] = []
  for (const species of REWARD_SPECIES) {
    const rewardTier = species.rewardFromTier
    if (rewardTier === undefined) continue
    if (!state.claimedTiers.includes(rewardTier)) continue
    if (giftSpeciesDelivered(state, species.id)) continue
    catchUp.push({
      speciesId: species.id,
      seed: leagueRewardSeed(state.day, state.ladder.points),
    })
  }
  if (catchUp.length === 0) return state
  // Catalog index == tier order (and the older line of a tier leads), so
  // sorting the merged queue by it restores the oldest-first invariant. An
  // id the catalog does not know (a retired line, or a save written by a
  // newer build) has no place in that order, so it sorts last rather than
  // ahead of every real reward.
  const catalogIndex = new Map(REWARD_SPECIES.map((s, i) => [s.id, i] as const))
  const rank = (speciesId: string): number =>
    catalogIndex.get(speciesId) ?? Number.MAX_SAFE_INTEGER
  const pendingRewards = [...state.pendingRewards, ...catchUp].sort(
    (a, b) => rank(a.speciesId) - rank(b.speciesId),
  )
  return { ...state, pendingRewards }
}
