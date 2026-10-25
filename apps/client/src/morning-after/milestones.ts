/**
 * The persistence-first milestone detector (FR-4): amplifiers mint only on
 * persisted firsts crossed by the finalize — first-ever title, first
 * Legend title, first boss scalp, a newly claimed reward tier. Anything
 * persistently invisible (placements, streaks, day counts, clock edges)
 * is not a milestone: the pre-finalize and post-finalize `GameState`
 * snapshot pair is the only facts the detector gets, and no new persistence
 * is added anywhere (FR-4 rationale, NFR-1 — the save stays at v25).
 *
 * Pure: reads two snapshots, returns data, never touches a store or a node.
 */

import type { GameState, LadderTier } from "@apex/sim"

/** The tiers the league pays rewards for (save v25's claim ledger carries
 * only these three; bronze has no league reward). */
export type RewardTier = Exclude<LadderTier, "bronze">

/** One persisted-first amplifier of the morning-after ritual. Multiple
 * firsts can cross on one finalize (e.g. a first title and the first scalp
 * in the same cup); the detector returns every one of them and the copy
 * layer picks the debrief line by its priority order. */
export type Amplifier =
  | { kind: "first_title" }
  | { kind: "first_legend_title" }
  | { kind: "first_scalp"; bossId: string }
  | { kind: "new_tier"; tier: RewardTier }

/**
 * The persisted-first milestones the finalize crossed, between the
 * pre-finalize and post-finalize snapshots — keyed only to the save v25
 * signals (no new persistence, NFR-1): `cupsWon` 0→n (first title),
 * `legendTitles` 0→n (first Legend title), `bossDefeats` crossing from
 * empty (first scalp), a `claimedTiers` gain per newly claimed tier.
 * Placements, streaks, and day counts are persistently invisible, so they
 * are never milestones.
 *
 * The list is ordered by the amplifier priority (first_title first, a new
 * tier claim last — title > legend title > scalp > new tier, ascending
 * tier within the claims as the reward catalog pays them) so a consumer
 * can take the head for a single debrief line; every entry stays data —
 * no copy lives here, copy.ts is the one ritual copy table (FR-10).
 */
export function milestoneAmplifiers(
  preState: GameState,
  postState: GameState,
): Amplifier[] {
  const amps: Amplifier[] = []
  // First-ever title: cupsWon went 0 → n (n ≥ 1).
  if (preState.cupsWon === 0 && postState.cupsWon > 0) {
    amps.push({ kind: "first_title" })
  }
  // First Legend title: the capstone's honor counter went 0 → n.
  if (preState.legendTitles === 0 && postState.legendTitles > 0) {
    amps.push({ kind: "first_legend_title" })
  }
  // First boss scalp: the defeat ledger crossed from empty — its first
  // entry is the wall that fell (defeat order is the ledger order).
  const firstScalp: string | undefined = postState.bossDefeats[0]
  if (
    preState.bossDefeats.length === 0 &&
    postState.bossDefeats.length > 0 &&
    firstScalp
  ) {
    amps.push({ kind: "first_scalp", bossId: firstScalp })
  }
  // A tier claimed this finalize is the persisted first of that tier's
  // reward claim; the ledger gains ascend as the catalog pays them.
  for (const tier of ["silver", "gold", "legend"] as const) {
    if (
      !preState.claimedTiers.includes(tier) &&
      postState.claimedTiers.includes(tier)
    ) {
      amps.push({ kind: "new_tier", tier })
    }
  }
  return amps
}
