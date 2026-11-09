/**
 * What is coming at this body: the foe's swing still winding up, or a shot on
 * its line with little flight left. Both answers are what the dodge gate reads.
 *
 * Continuous Arena Battle FR-20. A blow is only worth interrupting for when it
 * is both real — its authored reach covers this body, the shot is on its line —
 * and still escapable: a burst takes one decision window, so a shot that
 * arrives sooner cannot be stepped out of, and one still most of the arena away
 * is a waste of stamina. Extracted from ./controller when the dodge burst
 * pushed that module past the 12 KB cap.
 */

import { getFrameData } from "../frames"
import { getMove } from "../moves"
import { bodyOf, reachesBody } from "./contact"
import { planarGapSq } from "./controller-aim"
import { type ProjectileState, perpendicularOffsetMm } from "./projectile"
import type { FighterState, FightState } from "./types"

/**
 * How much flight a shot must have left before a burst is worth ordering, in
 * ms (tunable, FR-20): roughly two decision windows, so the lunge is a reaction
 * to a shot that is nearly home rather than a permanent flinch.
 */
export const DODGE_LEAD_MS = 240

/**
 * The least flight a dodge needs, in ms (tunable, FR-20): a burst clears a body
 * about five of its six steps in, so a shot arriving sooner lands whatever the
 * body does. Ordering a burst at it would burn stamina for nothing.
 */
const DODGE_CLEAR_MS = 100

/**
 * The shot about to arrive on this body's line, or null. A shot is worth
 * answering when it would actually hit — its line passes within this body's
 * width — and when a burst can still clear it: far enough out to have room,
 * close enough to be worth the stamina, and inside this profile's reaction
 * distance (`thresholdMm`). A shot further out than that is still travelling;
 * one arriving sooner than a burst can clear is a hit whatever the body does.
 *
 * The line test is the inverse of the old one: it used to select shots already
 * a body-width clear of the line, which are misses the burst cannot improve on.
 */
export function incomingShot(
  state: FightState,
  side: 0 | 1,
  thresholdMm: number,
  clearanceMm: number,
  leadMs: number,
): ProjectileState | null {
  const me = state.fighters[side]
  const foeKey = state.fighters[side === 0 ? 1 : 0].key
  const thresholdSq = thresholdMm * thresholdMm
  let nearest: ProjectileState | null = null
  let nearestSq = Number.POSITIVE_INFINITY
  for (const shot of state.projectiles) {
    if (shot.ownerKey !== foeKey) continue
    const gapSq = planarGapSq(shot.pos, me.pos)
    if (gapSq > thresholdSq || gapSq >= nearestSq) continue
    if (perpendicularOffsetMm(shot, me.pos) > clearanceMm) continue
    if (!arriving(shot, me, leadMs, thresholdMm)) continue
    nearest = shot
    nearestSq = gapSq
  }
  return nearest
}

/**
 * Whether a shot has flight left in the window a burst can actually use: far
 * enough out that the lunge clears the line before it arrives, close enough
 * that it is worth spending a dodge on, and inside this profile's reaction
 * distance. Without this the fighter under a steady stream of fire lunged at
 * every window and never attacked (Phase 10 measurement: one side launched 30
 * shots to the other's 1).
 */
function arriving(
  shot: ProjectileState,
  me: FighterState,
  leadMs: number,
  thresholdMm: number,
): boolean {
  const dx = me.pos.x - shot.pos.x
  const dz = me.pos.z - shot.pos.z
  const aheadMm = Math.trunc((dx * shot.dir.x + dz * shot.dir.z) / 1000)
  if (aheadMm <= 0) return false
  const speed = shot.speedMmPerMs
  const soon = Math.min(speed * leadMs, thresholdMm)
  return aheadMm >= speed * DODGE_CLEAR_MS && aheadMm <= soon
}

/**
 * The foe's melee swing, or null unless it is still winding up and its
 * authored reach actually covers this body (FR-20): a punch thrown at open
 * floor is not worth a lunge, and a swing already in its active window has had
 * its chance — stepping out of it then is a late dodge, which the swept strike
 * resolves against the live body anyway.
 */
export function incomingSwing(
  state: FightState,
  side: 0 | 1,
): FighterState | null {
  const foe = state.fighters[side === 0 ? 1 : 0]
  const attack = foe.attack
  if (!attack) return null
  if (attack.phase !== "startup") return null
  const move = getMove(attack.moveId)
  const row = getFrameData(attack.moveId)
  if (!move?.melee || !row) return null
  const me = state.fighters[side]
  if (!reachesBody(bodyOf(foe), bodyOf(me), row.reachMm)) return null
  return foe
}
