import { initialLadder } from "../../ladder"
import { initialLineage } from "../../legacy"
import { type GameState, initialEvolutionKnowledge } from "../../state"
import { persistedCreature, validateStateShape } from "./common"

/**
 * v3 → v4: saves from before the daily food-pile flag and the move-kit
 * ledger have neither fedToday nor trainingDays/loadout on the creature.
 * Merged migration (ranch dressing + combat prep both bumped 3→4): wake
 * every migrated creature unfed; credit 6 trained days so pre-gate
 * creatures (who knew their full kit) suffer no surprise loss; loadout
 * starts at the default slicing (null). Rolled stats are untouched.
 */
export function migrateFromV3(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const { day, phase, actionPoints, state: s } = validateStateShape(raw, 3)
  const legacy = persistedCreature(s, 3)
  const creature = legacy
    ? ({
        ...legacy,
        fedToday: false,
        trainingDays: 6,
        loadout: null,
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
    stormGiftClaimed: false,
    pendingGift: null,
    stable: [],
  }
  return { version: 4, state: migrated, savedAt: raw.savedAt ?? 0 }
}
