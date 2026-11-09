/**
 * Which move a fighter commits to, given the gap it is standing at.
 *
 * Continuous Arena Battle FR-11. Extracted from ./controller when the dodge
 * burst pushed that module past the 12 KB cap; the chooser is a pure read of
 * the kit, the authored reach, and the pool, so it moves without ceremony.
 */

import { type FrameData, getFrameData } from "../frames"
import { BASIC_MOVE, getMove } from "../moves"
import { integerSqrt } from "./contact"
import { attackCost, canAfford } from "./stamina"
import type { FighterState } from "./types"

/**
 * Poise at or below which the next blow breaks the foe, so the pool is held
 * back for the break (FR-14). The innate strike deals 4 poise, the lightest
 * special 6, so 4 is one blow away.
 */
const RESERVE_POISE = 4

/**
 * The move to commit: the innate strike when the foe is inside its reach,
 * otherwise the heaviest affordable special that reaches, ties broken on move
 * id. Null when nothing reaches, and the fighter should keep closing.
 *
 * `reserve` is stamina the caller will not spend while a break is one blow
 * away: a special that would leave less than that in the pool is skipped, so
 * the break window does not open on an empty fighter (FR-14). The reserve only
 * binds while the foe is still whole and not already open — a fighter does not
 * hoard stamina for a window that is already in front of it.
 * The innate strike is always allowed — it is the cheapest commitment and the
 * punish itself.
 * `basicFirst` lets a punish answer a ranged opener with a shot instead of
 * closing for the strike. `windowMs` is how long the opening stays open: a
 * move whose startup plus travel would land after it is skipped, so a punish
 * is timed for the recovery rather than picked for raw power (FR-14).
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
  reserve = 0,
  basicFirst = true,
  windowMs = 0,
): string | null {
  const gap = integerSqrt(gapSq)
  const holding =
    reserve > 0 &&
    foe.poise <= RESERVE_POISE &&
    foe.poiseBreakMs === 0 &&
    foe.attack?.phase !== "recovery"
  const fits = (move: { melee: boolean }, row: FrameData): boolean => {
    if (windowMs <= 0) return true
    const travel = move.melee
      ? 0
      : Math.trunc(gap / Math.max(1, row.speedMmPerMs))
    return row.startupMs + travel <= windowMs
  }
  if (basicFirst && inReach(me, foe, BASIC_MOVE.id, gapSq)) {
    const basic = getFrameData(BASIC_MOVE.id)
    if (basic && fits(BASIC_MOVE, basic)) return BASIC_MOVE.id
  }
  let bestId: string | null = null
  let bestPower = -1
  for (const moveId of kit) {
    const move = getMove(moveId)
    const row = getFrameData(moveId)
    if (!move || !row) continue
    if (!inReach(me, foe, moveId, gapSq)) continue
    if (!fits(move, row)) continue
    const cost = attackCost(moveId)
    if (!canAfford(me, cost)) continue
    if (holding && me.stamina - cost < reserve) continue
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
