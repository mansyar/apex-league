/**
 * Which move a fighter commits to, given the gap it is standing at.
 *
 * Continuous Arena Battle FR-11. Extracted from ./controller when the dodge
 * burst pushed that module past the 12 KB cap; the chooser is a pure read of
 * the kit, the authored reach, and the pool, so it moves without ceremony.
 */

import { getFrameData } from "../frames"
import { BASIC_MOVE, getMove } from "../moves"
import { attackCost, canAfford } from "./stamina"
import type { FighterState } from "./types"

/**
 * The move to commit: the innate strike when the foe is inside its reach,
 * otherwise the heaviest affordable special that reaches, ties broken on move
 * id. Null when nothing reaches, and the fighter should keep closing.
 *
 * Reach is edge to edge, the same test the swept strike resolves with (FR-18):
 * `reachMm` plus both bodies' radii against the centre gap. Measuring the bare
 * reach against the centre gap made the innate strike (420 mm of reach against
 * two bodies 440 mm across) unreachable until the bodies overlapped, so a
 * fighter standing at contact range always picked a shot instead — the
 * "one side lands nothing" Phase 10 baseline.
 *
 * Contact is the one place a shot is a bad press: it arrives inside the
 * defender's reaction window, so it is the blow most likely to be dodged, and
 * the strike costs no stamina and no cooldown. Preferring it up close is what
 * turns a standoff of mutually dodged projectiles into a fight.
 */
export function chooseMove(
  me: FighterState,
  foe: FighterState,
  kit: readonly string[],
  gapSq: number,
): string | null {
  if (inReach(me, foe, BASIC_MOVE.id, gapSq)) return BASIC_MOVE.id
  let bestId: string | null = null
  let bestPower = -1
  for (const moveId of kit) {
    const move = getMove(moveId)
    const row = getFrameData(moveId)
    if (!move || !row) continue
    if (!inReach(me, foe, moveId, gapSq)) continue
    if (!canAfford(me, attackCost(moveId))) continue
    const better = move.power > bestPower
    const tie = move.power === bestPower && bestId !== null && moveId < bestId
    if (!better && !tie) continue
    bestId = moveId
    bestPower = move.power
  }
  return bestId
}

/** Whether a move's authored reach covers the centre gap, edge to edge. */
function inReach(
  me: FighterState,
  foe: FighterState,
  moveId: string,
  gapSq: number,
): boolean {
  const row = getFrameData(moveId)
  if (!row) return false
  const reach = row.reachMm + me.radiusMm + foe.radiusMm
  return reach * reach >= gapSq
}
