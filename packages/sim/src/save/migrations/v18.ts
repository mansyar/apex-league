import { LEGACY_BRANCH } from "../../branches"
import type { CupSession } from "../../cup/session"
import type { GameState } from "../../state"
import { validateStateShape } from "./common"

/**
 * v18 → v19 (branching_evolution_champion_forms_20261020): the creature and
 * every Hall record gain the earned branch. Pre-v19 saves never chose a
 * form, so the migration pins the old line: a baby has not reached the
 * juvenile gate (null — it earns its branch on the next evolution), while a
 * juvenile or champion keeps the legacy boosts and signature-less kit
 * ("legacy"). Every other field — stats, training, loadout, conditions,
 * lineage counters, and the live cup session — is forwarded untouched.
 */
export function migrateFromV18(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const { day, phase, actionPoints, state: s } = validateStateShape(raw, 18)
  const creature = s.creature as GameState["creature"]
  const lineage = s.lineage as GameState["lineage"]
  const migrated: GameState = {
    day,
    phase,
    actionPoints,
    creature: creature
      ? {
          ...creature,
          branch: creature.stage === "baby" ? null : LEGACY_BRANCH.id,
        }
      : null,
    settings: s.settings as GameState["settings"],
    cupsWon: s.cupsWon as GameState["cupsWon"],
    lastCupDay: s.lastCupDay as GameState["lastCupDay"],
    ladder: s.ladder as GameState["ladder"],
    lineage: {
      ...lineage,
      hallOfFame: lineage.hallOfFame.map((record) => ({
        ...record,
        branch: LEGACY_BRANCH.id,
      })),
    },
    bossDefeats: s.bossDefeats as GameState["bossDefeats"],
    legendTitles: s.legendTitles as GameState["legendTitles"],
    evolutionKnowledge: s.evolutionKnowledge as GameState["evolutionKnowledge"],
    claimedTiers: [],
    pendingRewards: [],
    stable: [],
  }
  return {
    version: 19,
    state: migrated,
    savedAt: raw.savedAt ?? 0,
    session: (raw.session as CupSession | null) ?? null,
  }
}
