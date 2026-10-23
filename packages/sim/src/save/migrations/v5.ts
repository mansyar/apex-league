import { initialLadder } from "../../ladder"
import { initialLineage } from "../../legacy"
import { type GameState, initialEvolutionKnowledge } from "../../state"
import { persistedCreature, validateStateShape } from "./common"

/**
 * v5 → v6: saves from before evolution have no sickness-cooldown
 * bookkeeping on the creature. Stamp it clean (0): a migrated creature
 * wakes exactly as it slept — maturity stays whatever it was, and the
 * next settlement's evolution gate decides the stage (so a long-lived
 * v5 baby matures on its next well-cared night).
 */
export function migrateFromV5(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const { day, phase, actionPoints, state: s } = validateStateShape(raw, 5)
  const legacy = persistedCreature(s, 5)
  const creature = legacy
    ? ({ ...legacy, sickCooldown: 0 } as unknown as GameState["creature"])
    : null
  const migrated: GameState = {
    day,
    phase,
    actionPoints,
    creature,
    settings: s.settings as GameState["settings"],
    cupsWon: s.cupsWon as GameState["cupsWon"],
    lastCupDay: s.lastCupDay as GameState["lastCupDay"],
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
  return { version: 6, state: migrated, savedAt: raw.savedAt ?? 0 }
}
