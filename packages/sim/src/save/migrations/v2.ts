import { TRAINED_START } from "../../creature"
import { initialLadder } from "../../ladder"
import { initialLineage } from "../../legacy"
import { type GameState, initialEvolutionKnowledge } from "../../state"
import { persistedCreature, validateStateShape } from "./common"

/**
 * v2 → v3: saves from before training have no training fields on the
 * creature. Grant neutral training state; rolled stats are untouched.
 */
export function migrateFromV2(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const { day, phase, actionPoints, state: s } = validateStateShape(raw, 2)
  const legacy = persistedCreature(s, 2)
  const creature = legacy
    ? ({
        ...legacy,
        trained: { ...TRAINED_START },
        trainingFocus: null,
        trainingResult: null,
      } as unknown as GameState["creature"])
    : null
  const migrated: GameState = {
    day,
    phase,
    actionPoints,
    creature,
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
    legendTitles: 0,
    evolutionKnowledge: initialEvolutionKnowledge(),
    claimedTiers: [],
    pendingRewards: [],
    stable: [],
  }
  return { version: 3, state: migrated, savedAt: raw.savedAt ?? 0 }
}
