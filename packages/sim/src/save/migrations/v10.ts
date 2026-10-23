import type { CupSession } from "../../cup/session"
import { type GameState, initialEvolutionKnowledge } from "../../state"
import { validateStateShape } from "./common"

/**
 * v10 → v11 (silver ladder & rival bosses track): the ladder gains its
 * tier — every existing save is stamped "bronze" (no save predates the
 * Promotion Cup, so nobody can already be Silver) — and the state gains
 * the boss defeat ledger, empty for migrated saves: no boss existed
 * before this track, so there is nothing to backfill. Unlike the v7/v8
 * ladder stamp this PRESERVES the migrated ladder's points and sub-tier —
 * banked progress is the player's real standing at the promotion gate.
 */
export function migrateFromV10(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const { day, phase, actionPoints, state: s } = validateStateShape(raw, 10)
  const persistedLadder = s.ladder as Record<string, unknown>
  const migrated: GameState = {
    day,
    phase,
    actionPoints,
    creature: s.creature as GameState["creature"],
    settings: s.settings as GameState["settings"],
    cupsWon: s.cupsWon as GameState["cupsWon"],
    lastCupDay: s.lastCupDay as GameState["lastCupDay"],
    ladder: {
      ...persistedLadder,
      tier: "bronze",
    } as GameState["ladder"],
    lineage: s.lineage as GameState["lineage"],
    bossDefeats: [],
    legendTitles: 0,
    evolutionKnowledge: initialEvolutionKnowledge(),
    stormGiftClaimed: false,
    pendingGift: null,
    stable: [],
  }
  return {
    version: 11,
    state: migrated,
    savedAt: raw.savedAt ?? 0,
    session: (raw.session as CupSession | null) ?? null,
  }
}
