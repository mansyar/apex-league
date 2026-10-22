import type { CupSession } from "../../cup/session"
import type { GameState } from "../../state"
import { validateStateShape } from "./common"

/**
 * v16 → v17 (evolution_discovery_20261020): the state gains the per-gate
 * evolution discovery record. A v16 payload says nothing about what the
 * player has seen (the panel did not exist), so the record is inferred from
 * the active creature's stage: a juvenile has already cleared the juvenile
 * gate, a champion has cleared both, and a save with no creature has
 * cleared neither. Any pre-existing field on the payload is ignored — a
 * hand-edited save cannot smuggle thresholds into a hidden panel. Settings,
 * ladder, bloodline, boss ledger, and the live session are forwarded
 * untouched.
 */
export function migrateFromV16(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const { day, phase, actionPoints, state: s } = validateStateShape(raw, 16)
  const creature = s.creature as GameState["creature"]
  const championKnown = creature?.stage === "champion"
  const juvenileKnown = championKnown || creature?.stage === "juvenile"
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
    evolutionKnowledge: {
      juvenile: juvenileKnown,
      champion: championKnown,
    },
    stormGiftClaimed: false,
    pendingGift: null,
    stable: [],
  }
  return {
    version: 17,
    state: migrated,
    savedAt: raw.savedAt ?? 0,
    session: (raw.session as CupSession | null) ?? null,
  }
}
