/**
 * The final standing of a finished cup: the player's placement and the boss
 * ids they scalped on the way.
 *
 * Split out of the former monolithic cup/session.ts (sim-voxel-size-guard,
 * phase 2) — pure relocation, no behavior change. The live walk lives in
 * ./walk.
 */

import { CUP_ROUNDS } from "../bracket"
import type { CupSession } from "./walk"

/** The player's placement from a finished session: champion 1, else by
 * rounds survived (QF exit 4, SF exit 3, final loss 2). Placement counts
 * rounds played rather than wins so a drawn verdict (double-KO, winner
 * null) that still advanced the player cannot under-place them. */
export function cupPlacement(session: CupSession): 1 | 2 | 3 | 4 {
  if (session.status === "champion") return 1
  const played = session.playerVerdicts.length
  return played >= CUP_ROUNDS ? 2 : played === 2 ? 3 : 4
}

/**
 * Which boss ids the player scalped in this session (silver_ladder_bosses_20261016,
 * FR9). The player scalps a boss by beating the boss' slot in one of their
 * own matches — rival-subtree verdicts (including the boss cutting through
 * the far half) never count. A forfeit verdict (null winner) scalps
 * nothing. Pure; empty when the bracket carries no boss.
 */
export function bossScalps(session: CupSession): string[] {
  const bossSlot = session.bracket.slots.find((slot) => slot.bossId)
  const bossId = bossSlot?.bossId
  if (!bossSlot || !bossId) return []
  const scalped = session.playerVerdicts.some(
    (verdict) =>
      verdict.winner !== null &&
      verdict.winner === verdict.slotA &&
      verdict.slotB === bossSlot.name,
  )
  return scalped ? [bossId] : []
}
