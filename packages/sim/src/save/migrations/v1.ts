import { createCreature } from "../../creature"
import { initialLadder } from "../../ladder"
import { initialLineage } from "../../legacy"
import { type GameState, initialEvolutionKnowledge } from "../../state"
import { STARTER_GRANT_SEED, validateStateShape } from "./common"

/**
 * v1 → v2: saves from before the care loop have no creature. Grant the
 * default Fire drake starter so the creature is always owned going forward.
 */
export function migrateFromV1(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const { day, phase, actionPoints } = validateStateShape(raw, 1)
  const migrated: GameState = {
    day,
    phase,
    actionPoints,
    creature: createCreature("fire_drake", STARTER_GRANT_SEED),
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
  return { version: 2, state: migrated, savedAt: raw.savedAt ?? 0 }
}
