import type { CupSession } from "../../cup/session"
import type { GameState } from "../../state"
import { validateStateShape } from "./common"

/**
 * v19 → v20 (affinity_drift_20261021 FR-2): the creature and every Hall
 * record gain the secondary type affinity. Pre-v20 creatures never drifted
 * (the roll did not exist yet), so the migration stamps `null` — no
 * inference, no backfill. Every other field, including the live cup
 * session, forwards untouched.
 */
export function migrateFromV19(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const { day, phase, actionPoints, state: s } = validateStateShape(raw, 19)
  const creature = s.creature as GameState["creature"]
  const lineage = s.lineage as GameState["lineage"]
  const migrated: GameState = {
    day,
    phase,
    actionPoints,
    creature: creature ? { ...creature, affinity: null } : null,
    settings: s.settings as GameState["settings"],
    cupsWon: s.cupsWon as GameState["cupsWon"],
    lastCupDay: s.lastCupDay as GameState["lastCupDay"],
    ladder: s.ladder as GameState["ladder"],
    lineage: {
      ...lineage,
      hallOfFame: lineage.hallOfFame.map((record) => ({
        ...record,
        affinity: null,
      })),
    },
    bossDefeats: s.bossDefeats as GameState["bossDefeats"],
    legendTitles: s.legendTitles as GameState["legendTitles"],
    evolutionKnowledge: s.evolutionKnowledge as GameState["evolutionKnowledge"],
    stormGiftClaimed: false,
    pendingGift: null,
    stable: [],
  }
  return {
    version: 20,
    state: migrated,
    savedAt: raw.savedAt ?? 0,
    session: (raw.session as CupSession | null) ?? null,
  }
}
