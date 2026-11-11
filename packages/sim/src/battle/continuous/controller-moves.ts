/**
 * Which move a fighter commits to, given the gap it is standing at.
 *
 * Continuous Arena Battle FR-11. Extracted from ./controller when the dodge
 * burst pushed that module past the 12 KB cap; the chooser is a pure read of
 * the kit, the authored reach, and the pool, so it moves without ceremony.
 */

import { type FrameData, getFrameData } from "../frames"
import { BASIC_MOVE, getMove } from "../moves"
import { integerSqrt, minReachEdgeMm } from "./contact"
import { isCooldownReady } from "./cooldown"
import { attackCost, canAfford } from "./stamina"
import type { FighterState } from "./types"

/**
 * Poise at or below which the next blow breaks the foe, so the pool is held
 * back for the break (FR-14). The innate strike deals 4 poise, the lightest
 * special 6, so 4 is one blow away.
 */
const RESERVE_POISE = 4

/**
 * Whether the pool is being held back for a break (FR-14): the reserve only
 * binds while the foe is whole and not already open.
 */
function holdsBreak(foe: FighterState, reserve: number): boolean {
  return (
    reserve > 0 &&
    foe.poise <= RESERVE_POISE &&
    foe.poiseBreakMs === 0 &&
    foe.attack?.phase !== "recovery"
  )
}

/** Whether a special is ready to spend: off cooldown, affordable, unreserved. */
function spendable(
  me: FighterState,
  moveId: string,
  holding: boolean,
  reserve: number,
): boolean {
  if (!isCooldownReady(me, moveId)) return false
  const cost = attackCost(moveId)
  if (!canAfford(me, cost)) return false
  return !(holding && me.stamina - cost < reserve)
}

/**
 * Whole millimetres the pair closes over `ms`, floored at zero: the relative
 * velocity projected on the line to the foe, integrated. Read exactly like
 * ./controller-punish's closing term — velocity in thousandths of a mm per ms
 * against a millimetre gap — so a separating pair reads zero and never makes a
 * blow look longer than it is (FR-4).
 */
function closingMm(
  me: FighterState,
  foe: FighterState,
  gap: number,
  ms: number,
): number {
  if (gap <= 0) return 0
  const dot =
    (me.vel.x - foe.vel.x) * (foe.pos.x - me.pos.x) +
    (me.vel.z - foe.vel.z) * (foe.pos.z - me.pos.z)
  if (dot <= 0) return 0
  return Math.trunc((dot * ms) / (1000 * gap))
}

/**
 * The gap the blow will stand at when its active frame opens: today's gap less
 * the travel the pair closes over the move's startup, floored at the two radii
 * because bodies cannot overlap (./contact's `separateBodies` keeps them
 * apart). Judging the current gap instead let a fighter commit while closing
 * and launch into its own blind spot — measured on the phase-4 sample as 31.4%
 * of commits being `range` whiffs at 400 mm of dead zone (FR-4, AC-4).
 */
function landingGapMm(
  me: FighterState,
  foe: FighterState,
  gap: number,
  row: FrameData,
): number {
  const floor = me.radiusMm + foe.radiusMm
  return Math.max(floor, gap - closingMm(me, foe, gap, row.startupMs))
}

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
 * Reach is an interval, the same one the swept strike resolves with (FR-2,
 * FR-18): `minReachMm` to `reachMm`, both plus both bodies' radii, against the
 * centre gap. A special whose inner edge is beyond the foe is refused, so the
 * innate strike answers a clinch instead of a blow that would swing through
 * its own blind spot. Measuring the bare reach against the centre gap made the
 * innate strike (420 mm of reach against two bodies 440 mm across) unreachable
 * until the bodies overlapped, so a fighter standing at contact range always
 * picked a shot instead — the "one side lands nothing" Phase 10 baseline.
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
  const holding = holdsBreak(foe, reserve)
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
  let shorted = false
  for (const moveId of kit) {
    const move = getMove(moveId)
    const row = getFrameData(moveId)
    if (!move || !row) continue
    // A spent special is not a choice until its timer expires (FR-19).
    if (!spendable(me, moveId, holding, reserve)) continue
    if (!inReach(me, foe, moveId, gapSq)) {
      if (shortOfInner(me, foe, moveId, gapSq)) shorted = true
      continue
    }
    if (!fits(move, row)) continue
    const better = move.power > bestPower
    const tie = move.power === bestPower && bestId !== null && moveId < bestId
    if (!better && !tie) continue
    bestId = moveId
    bestPower = move.power
  }
  // A blind spot is the one refusal the innate strike answers (FR-4): a shot
  // that would open inside its own dead zone is replaced by the close blow
  // rather than standing the window out. Gated on a move actually being
  // shorted, so with no dead zone authored the chooser is the old one.
  if (bestId === null && shorted && inReach(me, foe, BASIC_MOVE.id, gapSq)) {
    const basic = getFrameData(BASIC_MOVE.id)
    if (basic && fits(BASIC_MOVE, basic)) return BASIC_MOVE.id
  }
  return bestId
}

/**
 * The nearest gap at which a ready move would land, or null when nothing in
 * the kit is ready to commit: the same cooldown, pool and reserve filters as
 * `chooseMove`, plus the travel each row's own startup adds, because a move
 * that lands only after the pair has closed 300 mm must be committed from
 * 300 mm further out (FR-10, AC-9). Backing off to this edge is what keeps a
 * fighter from standing inside its own blind spot — measured on the phase-2
 * sample as 79.1% idle and 100% cap at a 1,200 mm dead zone.
 */
export function landingEdgeMm(
  me: FighterState,
  foe: FighterState,
  kit: readonly string[],
  gapSq: number,
  reserve = 0,
): number | null {
  const gap = integerSqrt(gapSq)
  const radii = me.radiusMm + foe.radiusMm
  const holding = holdsBreak(foe, reserve)
  let best: number | null = null
  for (const moveId of kit) {
    const row = getFrameData(moveId)
    if (!row) continue
    if (!spendable(me, moveId, holding, reserve)) continue
    const edge =
      minReachEdgeMm(row.minReachMm, radii) +
      closingMm(me, foe, gap, row.startupMs)
    if (best === null || edge < best) best = edge
  }
  return best
}

/**
 * A shot to fire while giving ground, so the launch opens outside the inner
 * edge (FR-10, AC-9). The mirror of `landingGapMm`: a move that lands only
 * after the pair has closed `closingMm` is committed from that much further
 * out, and a fighter that answers by backing off instead of pressing in opens
 * the same distance over the startup, so the launch gap is the current gap
 * plus that travel. Only shots qualify — a melee dash cannot open its own gap —
 * and both edges are checked, because backing off past the outer edge makes the
 * shot fall short. Same filters and the same highest-power choice as
 * `chooseMove`; `null` means there is nothing to fire from here.
 */
export function backingShot(
  me: FighterState,
  foe: FighterState,
  kit: readonly string[],
  gapSq: number,
  reserve = 0,
): string | null {
  const gap = integerSqrt(gapSq)
  const radii = me.radiusMm + foe.radiusMm
  const holding = holdsBreak(foe, reserve)
  let bestId: string | null = null
  let bestPower = -1
  for (const moveId of kit) {
    const move = getMove(moveId)
    const row = getFrameData(moveId)
    if (!move || !row) continue
    // Giving ground cannot open a melee blow's gap: it has no travel.
    if (row.speedMmPerMs <= 0) continue
    if (!spendable(me, moveId, holding, reserve)) continue
    const outer = row.reachMm + radii
    if (gapSq > outer * outer) continue
    const launch = gap + closingMm(me, foe, gap, row.startupMs)
    if (launch < minReachEdgeMm(row.minReachMm, radii) || launch > outer)
      continue
    const better = move.power > bestPower
    const tie = move.power === bestPower && bestId !== null && moveId < bestId
    if (!better && !tie) continue
    bestId = moveId
    bestPower = move.power
  }
  return bestId
}

/**
 * Whether a move's reach interval covers the centre gap, edge to edge: the
 * same test the strike and the shot resolve with (FR-2, FR-4). The outer edge
 * is read at the gap now — a move out of reach is out of reach, and closing
 * into it is the movement's job. The inner edge is read at the gap the blow
 * will be standing at when its active frame opens, because that is the gap the
 * swing or the launch resolves against: committing while closing used to put
 * the blow inside its own blind spot. A row that authors no dead zone reads the
 * inner edge against the gap now, exactly as before the interval existed, so
 * FR-1's "no dead zone" is the old chooser and a sub-contact probe still reads
 * outside the interval.
 */
function inReach(
  me: FighterState,
  foe: FighterState,
  moveId: string,
  gapSq: number,
): boolean {
  const row = getFrameData(moveId)
  if (!row) return false
  const radii = me.radiusMm + foe.radiusMm
  const outer = row.reachMm + radii
  if (gapSq > outer * outer) return false
  const inner = minReachEdgeMm(row.minReachMm, radii)
  if (row.minReachMm <= 0) return gapSq >= inner * inner
  const landing = landingGapMm(me, foe, integerSqrt(gapSq), row)
  return landing * landing >= inner * inner
}

/**
 * Whether a move is refused by its own inner edge alone: inside its outer
 * reach, but with a landing gap inside the blind spot. That is the one refusal
 * the innate strike answers (FR-4) — a shot that would open inside its own dead
 * zone is replaced by the close blow rather than standing the window out.
 */
function shortOfInner(
  me: FighterState,
  foe: FighterState,
  moveId: string,
  gapSq: number,
): boolean {
  const row = getFrameData(moveId)
  if (!row) return false
  const radii = me.radiusMm + foe.radiusMm
  const inner = minReachEdgeMm(row.minReachMm, radii)
  if (inner <= radii) return false
  const outer = row.reachMm + radii
  if (gapSq > outer * outer) return false
  const landing = landingGapMm(me, foe, integerSqrt(gapSq), row)
  return landing * landing < inner * inner
}
