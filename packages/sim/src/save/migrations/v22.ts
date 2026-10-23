import type { CupSession } from "../../cup/session"
import type { GameState } from "../../state"
import { rewardRecordOf, validateStateShape } from "./common"

/**
 * v22 → v23 (stable & partner reserve, Phase 1): the active creature
 * carries its own age (save v23). A v22 payload has no age field, and the
 * world day WAS the effective age — the growth gates read `state.day` — so
 * the migration stamps the world day on the active creature: the pet's
 * gates then behave exactly as they did before the step, and a v22 save
 * matures on precisely the night it matures on today. The Hall of Fame
 * records no age (an age is the living pet's own), so every record
 * forwards untouched, as does the live cup session.
 */
export function migrateFromV22(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const { day, phase, actionPoints, state: s } = validateStateShape(raw, 22)
  const creature = s.creature as GameState["creature"]
  const migrated: GameState = {
    day,
    phase,
    actionPoints,
    creature: creature ? { ...creature, ageDays: day } : null,
    settings: s.settings as GameState["settings"],
    cupsWon: s.cupsWon as GameState["cupsWon"],
    lastCupDay: s.lastCupDay as GameState["lastCupDay"],
    ladder: s.ladder as GameState["ladder"],
    lineage: s.lineage as GameState["lineage"],
    bossDefeats: s.bossDefeats as GameState["bossDefeats"],
    legendTitles: s.legendTitles as GameState["legendTitles"],
    evolutionKnowledge: s.evolutionKnowledge as GameState["evolutionKnowledge"],
    ...rewardRecordOf(s),
    stable: [],
  }
  return {
    version: 23,
    state: migrated,
    savedAt: raw.savedAt ?? 0,
    session: (raw.session as CupSession | null) ?? null,
  }
}
