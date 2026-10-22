import type { CupSession } from "../../cup/session"
import { initialLadder } from "../../ladder"
import { initialLineage } from "../../legacy"
import { type GameState, initialEvolutionKnowledge } from "../../state"
import { validateStateShape } from "./common"

/**
 * v7 → v8 (bronze ladder track): saves gain the ladder slice. The
 * no-backfill decision stamps a fresh ladder (0 points, Bronze III) for
 * every migrated save — cups already won are history, the ladder starts
 * with the tier it will climb.
 */
export function migrateFromV7(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const { day, phase, actionPoints, state: s } = validateStateShape(raw, 7)
  const migrated: GameState = {
    day,
    phase,
    actionPoints,
    creature: s.creature as GameState["creature"],
    settings: s.settings as GameState["settings"],
    cupsWon: s.cupsWon as GameState["cupsWon"],
    lastCupDay: s.lastCupDay as GameState["lastCupDay"],
    // Always fresh: a hand-edited or future ladder value in a v7 payload
    // cannot smuggle points past the migration gate.
    ladder: initialLadder(),
    lineage: initialLineage(),
    bossDefeats: [],
    legendTitles: 0,
    evolutionKnowledge: initialEvolutionKnowledge(),
    stormGiftClaimed: false,
    pendingGift: null,
    stable: [],
  }
  return {
    version: 8,
    state: migrated,
    savedAt: raw.savedAt ?? 0,
    // The live cup session predates this step (save v7) and is forwarded
    // untouched — the ladder migration only adds a fresh ladder slice.
    session: (raw.session as CupSession | null) ?? null,
  }
}
