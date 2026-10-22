import type { CupSession } from "../../cup/session"
import { type GameState, initialEvolutionKnowledge } from "../../state"
import { validateStateShape } from "./common"

/**
 * v14 → v15 (dynasty_breeding_20261018): the active creature and every
 * Hall record gain the lineage fields `traits` and `parents`. Pre-v15
 * careers never recorded a pair, so both start empty — traits are derived
 * from trained/effective stats on read (`effectiveTraits`), and parentage
 * begins with the first v15 succession. The live cup session is forwarded
 * untouched: rivals are not lineage carriers.
 */
export function migrateFromV14(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const { day, phase, actionPoints, state: s } = validateStateShape(raw, 14)
  const creature = s.creature as GameState["creature"]
  const lineage = s.lineage as GameState["lineage"]
  const migrated: GameState = {
    day,
    phase,
    actionPoints,
    creature: creature ? { ...creature, traits: [], parents: [] } : null,
    settings: s.settings as GameState["settings"],
    cupsWon: s.cupsWon as GameState["cupsWon"],
    lastCupDay: s.lastCupDay as GameState["lastCupDay"],
    ladder: s.ladder as GameState["ladder"],
    lineage: {
      ...lineage,
      hallOfFame: lineage.hallOfFame.map((record) => ({
        ...record,
        traits: [],
        parents: [],
      })),
    },
    bossDefeats: s.bossDefeats as GameState["bossDefeats"],
    legendTitles: s.legendTitles as GameState["legendTitles"],
    evolutionKnowledge: initialEvolutionKnowledge(),
    stormGiftClaimed: false,
    pendingGift: null,
    stable: [],
  }
  return {
    version: 15,
    state: migrated,
    savedAt: raw.savedAt ?? 0,
    session: (raw.session as CupSession | null) ?? null,
  }
}
