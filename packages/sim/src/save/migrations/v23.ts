import type { CupSession } from "../../cup/session"
import type { GameState } from "../../state"
import { rewardRecordOf, validateStateShape } from "./common"

/**
 * v23 → v24 (stable & partner reserve, Phase 2): the state gains the
 * stable — the pets the player owns that are not in the ranch (save v24).
 * A v23 save predates the stable, so it holds exactly one pet: the ranch
 * pet. The step stamps an empty stable and forwards everything else
 * untouched, so the active pet keeps its own age and its career.
 */
export function migrateFromV23(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const { day, phase, actionPoints, state: s } = validateStateShape(raw, 23)
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
    // The stable starts empty: a v23 save owns one pet, and it is the
    // ranch pet.
    stable: [],
  }
  return {
    version: 24,
    state: migrated,
    savedAt: raw.savedAt ?? 0,
    session: (raw.session as CupSession | null) ?? null,
  }
}
