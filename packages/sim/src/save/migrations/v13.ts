import type { CupSession } from "../../cup/session"
import { type GameState, initialEvolutionKnowledge } from "../../state"
import { validateStateShape } from "./common"

/**
 * v13 → v14 (gold_legend_ladder_20261017): the state gains the
 * legendTitles tally, stamped 0 — no v13 career could sit on the Legend
 * plateau (the tier did not exist yet), so pre-plateau careers have no
 * titles. The ladder itself is forwarded untouched: Gold and Legend are
 * validated at load time, not rewritten here.
 */
export function migrateFromV13(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const { day, phase, actionPoints, state: s } = validateStateShape(raw, 13)
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
    legendTitles: 0,
    evolutionKnowledge: initialEvolutionKnowledge(),
    claimedTiers: [],
    pendingRewards: [],
    stable: [],
  }
  return {
    version: 14,
    state: migrated,
    savedAt: raw.savedAt ?? 0,
    session: (raw.session as CupSession | null) ?? null,
  }
}
