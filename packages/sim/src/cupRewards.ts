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
  // appending in catalog order keeps the queue oldest-first.
  const claimed: LadderTier[] = []
  const eggs: GameState["pendingRewards"] = []
  for (const species of REWARD_SPECIES) {
    const rewardTier = species.rewardFromTier
    if (rewardTier === undefined) continue
    if (!tierAtLeast(state.ladder.tier, rewardTier)) continue
    if (state.claimedTiers.includes(rewardTier)) continue
    claimed.push(rewardTier)
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
