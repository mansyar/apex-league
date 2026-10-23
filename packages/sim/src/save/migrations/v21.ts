import type { CupSession } from "../../cup/session"
import { leagueRewardSeed } from "../../cupRewards"
import { STORM_GIFT_SPECIES_ID } from "../../species"
import type { GameState } from "../../state"
import { rewardRecordOf, validateStateShape } from "./common"

/**
 * v21 → v22 (electric species line review round 1, F1): the granted Storm
 * Gift becomes a pending egg rather than a bare claim flag, so the egg
 * survives a reload and the nursery can preview the exact hatch. A v21
 * save that already claimed the gift but never hatched one — the v21 grant
 * only stamped the flag, it never delivered an egg — receives the egg it
 * was promised here. A save whose gift career is already in the lineage
 * (the `giftEgg` marker on the creature or a Hall record) has nothing
 * pending, and a save that never claimed waits for its next non-forfeit
 * finalize, exactly as the retroactive rule promises. The claim lands in
 * the per-tier reward record (save v25): the Silver tier's claim slot and
 * the head of the pending-reward queue.
 */
export function migrateFromV21(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const { day, phase, actionPoints, state: s } = validateStateShape(raw, 21)
  const creature = s.creature as GameState["creature"]
  const lineage = s.lineage as GameState["lineage"]
  const ladder = s.ladder as GameState["ladder"]
  const { claimedTiers } = rewardRecordOf(s)
  const hatched =
    creature?.giftEgg === true ||
    lineage.hallOfFame.some((record) => record.giftEgg === true)
  const migrated: GameState = {
    day,
    phase,
    actionPoints,
    creature,
    settings: s.settings as GameState["settings"],
    cupsWon: s.cupsWon as GameState["cupsWon"],
    lastCupDay: s.lastCupDay as GameState["lastCupDay"],
    ladder,
    lineage,
    bossDefeats: s.bossDefeats as GameState["bossDefeats"],
    legendTitles: s.legendTitles as GameState["legendTitles"],
    evolutionKnowledge: s.evolutionKnowledge as GameState["evolutionKnowledge"],
    claimedTiers,
    pendingRewards:
      claimedTiers.includes("silver") && !hatched
        ? [
            {
              speciesId: STORM_GIFT_SPECIES_ID,
              seed: leagueRewardSeed(day, ladder.points),
            },
          ]
        : [],
    stable: [],
  }
  return {
    version: 22,
    state: migrated,
    savedAt: raw.savedAt ?? 0,
    session: (raw.session as CupSession | null) ?? null,
  }
}
