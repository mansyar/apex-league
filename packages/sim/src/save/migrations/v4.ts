import { initialLadder } from "../../ladder"
import { initialLineage } from "../../legacy"
import { type GameState, initialEvolutionKnowledge } from "../../state"
import { validateStateShape } from "./common"

/**
 * v4 → v5: merged migration (arena playback + cup day both bumped 4→5).
 * Saves from before the arena wake with full ornamental motion
 * (reducedMotion defaults false; the preference lives in state.settings)
 * and from before the cup system with no cup bookkeeping (never won a
 * cup, never entered one).
 */
export function migrateFromV4(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const { day, phase, actionPoints, state: s } = validateStateShape(raw, 4)
  const settings =
    s.settings !== undefined && s.settings !== null
      ? (s.settings as GameState["settings"])
      : { reducedMotion: false, seenHints: [] }
  const creature =
    s.creature !== null && s.creature !== undefined
      ? (s.creature as GameState["creature"])
      : null
  const migrated: GameState = {
    day,
    phase,
    actionPoints,
    creature,
    settings: {
      ...settings,
      arenaCamera: "cinematic",
      muted: false,
      musicVolume: 1,
      sfxVolume: 1,
    },
    cupsWon: 0,
    lastCupDay: null,
    // The ladder starts fresh for every migrated save (bronze ladder,
    // no-backfill decision): cups already won are history.
    ladder: initialLadder(),
    lineage: initialLineage(),
    bossDefeats: [],
    legendTitles: 0,
    evolutionKnowledge: initialEvolutionKnowledge(),
    claimedTiers: [],
    pendingRewards: [],
    stable: [],
  }
  return { version: 5, state: migrated, savedAt: raw.savedAt ?? 0 }
}
