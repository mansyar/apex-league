import type { CupSession } from "../../cup/session"
import { type GameState, initialEvolutionKnowledge } from "../../state"
import { validateStateShape } from "./common"

/**
 * v11 → v12 (element chart & battle length track): every stored HP is
 * doubled to the new scale — the live creature, every cup-session slot
 * (rivals and the player snapshot alike), the final rival, and every
 * Hall of Fame record. Trained bonuses, atk/def/spd, the ladder, and the
 * boss ledger are scale-free and forwarded untouched. Because the v11
 * effective HP was base + 1×trained and the v12 effective HP is
 * 2×base + 2×trained, doubling the stored magnitude is exact for any
 * trained bonus within the unchanged cap.
 */
export function migrateFromV11(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const { day, phase, actionPoints, state: s } = validateStateShape(raw, 11)
  const doubleHp = <T extends { hp: number }>(stats: T): T => ({
    ...stats,
    hp: stats.hp * 2,
  })
  const creature = s.creature as GameState["creature"]
  const session = raw.session as CupSession | null
  const migratedSession = session
    ? {
        ...session,
        bracket: {
          ...session.bracket,
          slots: session.bracket.slots.map((slot) => ({
            ...slot,
            stats: doubleHp(slot.stats),
          })),
          finalRival: {
            ...session.bracket.finalRival,
            stats: doubleHp(session.bracket.finalRival.stats),
          },
        },
      }
    : null
  const lineage = s.lineage as GameState["lineage"]
  const migrated: GameState = {
    day,
    phase,
    actionPoints,
    creature: creature
      ? {
          ...creature,
          stats: doubleHp(creature.stats),
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
        stats: doubleHp(record.stats),
      })),
    },
    bossDefeats: s.bossDefeats as GameState["bossDefeats"],
    legendTitles: 0,
    evolutionKnowledge: initialEvolutionKnowledge(),
    stormGiftClaimed: false,
    pendingGift: null,
    stable: [],
  }
  return {
    version: 12,
    state: migrated,
    savedAt: raw.savedAt ?? 0,
    session: migratedSession,
  }
}
