import type { CupSession } from "../../cup/session"
import { initialLineage } from "../../legacy"
import { type GameState, initialEvolutionKnowledge } from "../../state"
import { validateStateShape } from "./common"

/**
 * v8 → v9 (merged migration, battle-animation track): saves from before
 * the camera director have no arena-camera preference. Stamp the
 * cinematic default: the director is the intended presentation, and
 * reduced-motion players are pinned to the broadcast feel at render time
 * regardless of this value. Ladder and cup session predate this step and
 * are forwarded untouched.
 */
export function migrateFromV8(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const { day, phase, actionPoints, state: s } = validateStateShape(raw, 8)
  const migrated: GameState = {
    day,
    phase,
    actionPoints,
    creature: s.creature as GameState["creature"],
    settings: {
      ...(s.settings as GameState["settings"]),
      arenaCamera: "cinematic",
      muted: false,
    },
    cupsWon: s.cupsWon as GameState["cupsWon"],
    lastCupDay: s.lastCupDay as GameState["lastCupDay"],
    ladder: s.ladder as GameState["ladder"],
    lineage: initialLineage(),
    bossDefeats: [],
    legendTitles: 0,
    evolutionKnowledge: initialEvolutionKnowledge(),
    claimedTiers: [],
    pendingRewards: [],
    stable: [],
  }
  return {
    version: 9,
    state: migrated,
    savedAt: raw.savedAt ?? 0,
    session: (raw.session as CupSession | null) ?? null,
  }
}
