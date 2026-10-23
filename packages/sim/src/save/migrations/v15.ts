import type { CupSession } from "../../cup/session"
import { type GameState, initialEvolutionKnowledge } from "../../state"
import { validateStateShape } from "./common"

/**
 * v15 → v16 (release_polish_20261018): settings gain the music and SFX bus
 * levels. Older saves never chose a mix, so both start at full volume and
 * the mute toggle keeps its authority over them. The live cup session is
 * forwarded untouched.
 */
export function migrateFromV15(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const { day, phase, actionPoints, state: s } = validateStateShape(raw, 15)
  const migrated: GameState = {
    day,
    phase,
    actionPoints,
    creature: s.creature as GameState["creature"],
    settings: {
      ...(s.settings as GameState["settings"]),
      musicVolume: 1,
      sfxVolume: 1,
    },
    cupsWon: s.cupsWon as GameState["cupsWon"],
    lastCupDay: s.lastCupDay as GameState["lastCupDay"],
    ladder: s.ladder as GameState["ladder"],
    lineage: s.lineage as GameState["lineage"],
    bossDefeats: s.bossDefeats as GameState["bossDefeats"],
    legendTitles: s.legendTitles as GameState["legendTitles"],
    evolutionKnowledge: initialEvolutionKnowledge(),
    claimedTiers: [],
    pendingRewards: [],
    stable: [],
  }
  return {
    version: 16,
    state: migrated,
    savedAt: raw.savedAt ?? 0,
    session: (raw.session as CupSession | null) ?? null,
  }
}
