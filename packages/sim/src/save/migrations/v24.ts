import type { CupSession } from "../../cup/session"
import type { GameState } from "../../state"
import { rewardRecordOf, validateStateShape } from "./common"

/**
 * v24 → v25 (earth/wind species line, FR-8): the one-time Silver claim
 * flag generalizes into a per-tier league reward record. The old
 * `stormGiftClaimed: true` was precisely the Silver tier's claim, so it
 * maps onto the `claimedTiers` record as `["silver"]`; the old pending
 * Storm Gift egg becomes the head of the `pendingRewards` queue — a
 * pending Silver reward the nursery hatches exactly as before. Everything
 * else (the stable, the session, every career field) forwards untouched,
 * so the mapping is lossless and linear.
 */
export function migrateFromV24(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const { day, phase, actionPoints, state: s } = validateStateShape(raw, 24)
  const migrated: GameState = {
    day,
    phase,
    actionPoints,
    creature: s.creature as GameState["creature"],
    settings: s.settings as GameState["settings"],
    cupsWon: s.cupsWon as GameState["cupsWon"],
    lastCupDay: s.lastCupDay as GameState["lastCupDay"],
    ladder: s.ladder as GameState["ladder"],
    lineage: s.lineage as GameState["lineage"],
    bossDefeats: s.bossDefeats as GameState["bossDefeats"],
    legendTitles: s.legendTitles as GameState["legendTitles"],
    evolutionKnowledge: s.evolutionKnowledge as GameState["evolutionKnowledge"],
    ...rewardRecordOf(s),
    stable: s.stable as GameState["stable"],
  }
  return {
    version: 25,
    state: migrated,
    savedAt: raw.savedAt ?? 0,
    session: (raw.session as CupSession | null) ?? null,
  }
}
