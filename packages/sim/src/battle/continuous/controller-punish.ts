/**
 * Punish execution (FR-14): leave a swing that a walk can clear, and commit
 * into the recovery or the poise break that follows.
 *
 * The doctrine still owns the band and the cycle; this module only decides how
 * a chosen intent is timed, and how much stamina is held back for the window.
 * Reach is edge to edge, the same test the strike resolves with.
 */

import { getFrameData } from "../frames"
import { getMove } from "../moves"
import { integerSqrt } from "./contact"
import { awayFrom } from "./controller-aim"
import { type PatternMemory, preferRangedPunish } from "./controller-memory"
import { chooseMove } from "./controller-moves"
import type { DecisionInput } from "./controller-state"
import { topSpeed } from "./movement"
import { isBroken } from "./poise"
import { MIN_ATTACK_STAMINA_COST } from "./stamina"
import { recoveryMsFor } from "./strike"
import type { Dir2, FighterState } from "./types"

/**
 * Stamina held back for a punish window, in points: one minimum-price blow, so
 * a fighter never spends the pool to the point where the window opens empty.
 */
export const PUNISH_RESERVE_STAMINA = MIN_ATTACK_STAMINA_COST

/** Clearance a step-out leaves beyond the swing's edge, in mm (tunable). */
export const WHIFF_CLEAR_MM = 40

/** A foe in recovery, or broken on its poise, is open to a timed commitment. */
export function punishWindow(foe: FighterState): boolean {
  return isBroken(foe) || foe.attack?.phase === "recovery"
}

/**
 * The move to commit into an open window, or null when the foe is not open or
 * nothing reaches. A foe that opened at range is answered with a shot, so the
 * punish does not close into a spacing the doctrine did not choose.
 */
export function punishMove(
  input: DecisionInput,
  gapSq: number,
  memory: PatternMemory,
): string | null {
  const { state, side, kit } = input
  const me = state.fighters[side]
  const foe = state.fighters[side === 0 ? 1 : 0]
  if (!punishWindow(foe)) return null
  const ranged = preferRangedPunish(memory, state.elapsedMs)
  return chooseMove(me, foe, kit, gapSq, 0, !ranged, windowMs(foe))
}

/**
 * How long the opening stays open, in ms: the rest of the poise break, or the
 * rest of the recovery, whichever is running. Zero means no limit — a caller
 * with no window should not filter for one.
 */
export function windowMs(foe: FighterState): number {
  const attack = foe.attack
  if (attack?.phase === "recovery") {
    const row = getFrameData(attack.moveId)
    if (row) {
      return Math.max(0, recoveryMsFor(row, foe.spd) - attack.elapsedMs)
    }
  }
  return isBroken(foe) ? foe.poiseBreakMs : 0
}

/**
 * The direction that leaves a winding swing, or null when standing still is
 * already the whiff or the walk cannot clear it in time. The walk is priced at
 * half the fighter's top speed to cover the acceleration ramp, so a step-out
 * ordered here always clears the edge it claims.
 *
 * The foe is still closing while it winds up, so the gap when the swing is
 * live is smaller than the gap now: the closing term is what separates a swing
 * that will miss from one already on its way in. The window runs to the end of
 * the active phase, because a blow still lands on any step the swing is live.
 * Reading only the current gap stepped out of swings that were never going to
 * land and stood in the ones that were.
 */
export function whiffStep(
  me: FighterState,
  foe: FighterState,
  gapSq: number,
): Dir2 | null {
  const attack = foe.attack
  if (attack?.phase !== "startup") return null
  const move = getMove(attack.moveId)
  const row = getFrameData(attack.moveId)
  if (!move?.melee || !row) return null
  const leftMs = row.startupMs + row.activeMs - attack.elapsedMs
  if (leftMs <= 0) return null
  const gap = integerSqrt(gapSq)
  const edge = row.reachMm + me.radiusMm + foe.radiusMm
  const closing = closingMm(foe, me, gap, leftMs)
  const need = edge + WHIFF_CLEAR_MM - Math.max(0, gap - closing)
  if (need <= 0) return null
  const walkMm = Math.trunc((topSpeed(me.spd) * leftMs) / (2 * 1000))
  if (walkMm < need) return null
  return awayFrom(me, foe)
}

/** How far the foe still closes on `me` before the swing stops being live. */
function closingMm(
  foe: FighterState,
  me: FighterState,
  gap: number,
  leftMs: number,
): number {
  if (gap <= 0) return 0
  const dot =
    foe.vel.x * (me.pos.x - foe.pos.x) + foe.vel.z * (me.pos.z - foe.pos.z)
  if (dot <= 0) return 0
  return Math.trunc((dot * leftMs) / (1000 * gap))
}
