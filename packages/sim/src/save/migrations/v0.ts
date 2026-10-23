import { isCupDay } from "../../calendar"
import { initialLadder } from "../../ladder"
import { initialLineage } from "../../legacy"
import {
  ACTION_POINTS_PER_DAY,
  type GameState,
  initialEvolutionKnowledge,
} from "../../state"

/**
 * v0 (pre-schema): { version: 0, day } — derive the rest of GameState.
 */
export function migrateFromV0(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const day = raw.day
  if (typeof day !== "number" || !Number.isInteger(day) || day < 1) {
    throw new Error("invalid v0 save: missing day")
  }
  const state: GameState = {
    day,
    phase: isCupDay(day) ? "cup" : "day",
    actionPoints: ACTION_POINTS_PER_DAY,
    creature: null,
    settings: {
      reducedMotion: false,
      seenHints: [],
      arenaCamera: "cinematic",
      muted: false,
      // Stamped early so the intermediate GameState literal type-checks;
      // the v15 → v16 step stamps them again for direct v15 saves.
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
    // Legend titles start at zero for every migrated save
    // (gold_legend_ladder_20261017): pre-plateau careers have none.
    legendTitles: 0,
    evolutionKnowledge: initialEvolutionKnowledge(),
    claimedTiers: [],
    pendingRewards: [],
    stable: [],
  }
  return { version: 1, state, savedAt: 0 }
}
