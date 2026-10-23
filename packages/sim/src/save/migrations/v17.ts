import type { StatKey } from "../../creature"
import type { CupSession } from "../../cup/session"
import type { GameState } from "../../state"
import { programFor } from "../../training"
import { persistedCreature, validateStateShape } from "./common"

/**
 * v17 → v18 (training_programs_form_20261020): the single-stat focus grew
 * into a training program. The old `trainingFocus` key maps through
 * programFor and is dropped (a stat with no program maps to null — the
 * creature simply trains nothing until the player picks again); everything
 * else — trained bonuses, trained days, the last result, settings, ladder,
 * bloodline, boss ledger, and the live cup session — is forwarded untouched.
 */
export function migrateFromV17(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const { day, phase, actionPoints, state: s } = validateStateShape(raw, 17)
  const legacy = persistedCreature(s, 17)
  let creature: GameState["creature"] = null
  if (legacy) {
    const { trainingFocus, ...rest } = legacy
    creature = {
      ...rest,
      trainingProgram: programFor(trainingFocus as StatKey),
    } as unknown as GameState["creature"]
  }
  const migrated: GameState = {
    day,
    phase,
    actionPoints,
    creature,
    settings: s.settings as GameState["settings"],
    cupsWon: s.cupsWon as GameState["cupsWon"],
    lastCupDay: s.lastCupDay as GameState["lastCupDay"],
    ladder: s.ladder as GameState["ladder"],
    lineage: s.lineage as GameState["lineage"],
    bossDefeats: s.bossDefeats as GameState["bossDefeats"],
    legendTitles: s.legendTitles as GameState["legendTitles"],
    evolutionKnowledge: s.evolutionKnowledge as GameState["evolutionKnowledge"],
    stormGiftClaimed: false,
    pendingGift: null,
    stable: [],
  }
  return {
    version: 18,
    state: migrated,
    savedAt: raw.savedAt ?? 0,
    session: (raw.session as CupSession | null) ?? null,
  }
}
