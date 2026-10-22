import type { CupSession } from "../../cup/session"
import { type GameState, initialEvolutionKnowledge } from "../../state"
import { validateStateShape } from "./common"

/**
 * v12 → v13 (audio_foundation_20261017): settings gain the persisted
 * audio mute toggle, stamped false — sound is on for every migrated
 * save until the player silences it in the settings modal. Everything
 * else predates this step and is forwarded untouched.
 */
export function migrateFromV12(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const { day, phase, actionPoints, state: s } = validateStateShape(raw, 12)
  const migrated: GameState = {
    day,
    phase,
    actionPoints,
    creature: s.creature as GameState["creature"],
    settings: {
      ...(s.settings as GameState["settings"]),
      muted: false,
    },
    cupsWon: s.cupsWon as GameState["cupsWon"],
    lastCupDay: s.lastCupDay as GameState["lastCupDay"],
    ladder: s.ladder as GameState["ladder"],
    lineage: s.lineage as GameState["lineage"],
    bossDefeats: s.bossDefeats as GameState["bossDefeats"],
    legendTitles: 0,
    evolutionKnowledge: initialEvolutionKnowledge(),
    stormGiftClaimed: false,
    pendingGift: null,
    stable: [],
  }
  return {
    version: 13,
    state: migrated,
    savedAt: raw.savedAt ?? 0,
    session: (raw.session as CupSession | null) ?? null,
  }
}
