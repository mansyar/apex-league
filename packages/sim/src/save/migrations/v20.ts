import type { CupSession } from "../../cup/session"
import type { GameState } from "../../state"
import { validateStateShape } from "./common"

/**
 * v20 → v21 (electric species line FR-8): the save gains the Silver
 * tier-reward bookkeeping. The claim flag stamps `false` — no pre-v21
 * save has received the gift (the grant did not exist yet); the
 * retroactive rule delivers it on the next non-forfeit finalize. The
 * gift-egg lineage marker stamps `false` on the creature and every Hall
 * record — no hatched career predates the gift. Every other field,
 * including the live cup session, forwards untouched.
 */
export function migrateFromV20(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const { day, phase, actionPoints, state: s } = validateStateShape(raw, 20)
  const creature = s.creature as GameState["creature"]
  const lineage = s.lineage as GameState["lineage"]
  const migrated: GameState = {
    day,
    phase,
    actionPoints,
    creature: creature ? { ...creature, giftEgg: false } : null,
    settings: s.settings as GameState["settings"],
    cupsWon: s.cupsWon as GameState["cupsWon"],
    lastCupDay: s.lastCupDay as GameState["lastCupDay"],
    ladder: s.ladder as GameState["ladder"],
    lineage: {
      ...lineage,
      hallOfFame: lineage.hallOfFame.map((record) => ({
        ...record,
        giftEgg: false,
      })),
    },
    bossDefeats: s.bossDefeats as GameState["bossDefeats"],
    legendTitles: s.legendTitles as GameState["legendTitles"],
    evolutionKnowledge: s.evolutionKnowledge as GameState["evolutionKnowledge"],
    claimedTiers: [],
    pendingRewards: [],
    stable: [],
  }
  return {
    version: 21,
    state: migrated,
    savedAt: raw.savedAt ?? 0,
    session: (raw.session as CupSession | null) ?? null,
  }
}
