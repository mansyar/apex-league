/**
 * A bounded read on the opponent (FR-14): which way it last burst, and the
 * first move it committed. The record is three fields, overwritten in place —
 * never a growing log — and it expires so a read from the opening cannot
 * steer the whole fight.
 *
 * It lives on `ControllerState`, so it is rebuilt by the same decision loop
 * that rebuilds the controller: same fight, same read, same replay hash. It is
 * a read on how a decision is executed, never on what the doctrine wants.
 */

import { getMove } from "../moves"
import { shotDirection } from "./contact"
import { topSpeed } from "./movement"
import type { FighterState } from "./types"

/** How long a read stays live, in fight time (tunable). */
export const MEMORY_MS = 2000

/** The whole memory: a fixed-size record, not a log. */
export interface PatternMemory {
  /** The side the foe last burst toward, 1 or -1; 0 when it has not. */
  readonly dodgeSign: -1 | 0 | 1
  /** The first move the foe committed while the read was live. */
  readonly openingMove: string | null
  /** Fight time the record expires, in ms. */
  readonly untilMs: number
}

/** Nothing remembered. */
export const EMPTY_MEMORY: PatternMemory = Object.freeze({
  dodgeSign: 0,
  openingMove: null,
  untilMs: 0,
})

/**
 * Which side of the line the foe is bursting toward, or null when it is not
 * bursting. A dodge or a slip moves faster than the foe's own walk, so a
 * velocity above `topSpeed` is a burst with no extra bookkeeping.
 */
function burstSign(me: FighterState, foe: FighterState): -1 | 1 | null {
  const walk = topSpeed(foe.spd)
  const speedSq = foe.vel.x * foe.vel.x + foe.vel.z * foe.vel.z
  if (speedSq <= walk * walk) return null
  const dir = shotDirection(me.pos, foe.pos)
  const cross = dir.x * foe.vel.z - dir.z * foe.vel.x
  if (cross === 0) return null
  return cross > 0 ? 1 : -1
}

/**
 * Fold one decision's observation into the record. The expiry is refreshed
 * only when something new is seen, so a read stops steering two seconds after
 * the fight last showed it anything.
 */
export function observe(
  previous: PatternMemory,
  me: FighterState,
  foe: FighterState,
  nowMs: number,
): PatternMemory {
  const live = nowMs < previous.untilMs ? previous : EMPTY_MEMORY
  const sign = burstSign(me, foe)
  const opening = live.openingMove ?? foe.attack?.moveId ?? null
  if (sign === null && opening === live.openingMove) return live
  return {
    dodgeSign: sign ?? live.dodgeSign,
    openingMove: opening,
    untilMs: nowMs + MEMORY_MS,
  }
}

/**
 * The side to circle toward: against the foe's recent burst, so the fighter
 * cuts the escape the foe already chose rather than following it. Falls back
 * to the side's fixed sign once the read expires. A rear-seeker ignores the
 * read — its plan fixes the side, and cutting would circle away from the arc
 * it is hunting. The doctrine still owns how often it circles.
 */
export function strafeSide(
  memory: PatternMemory,
  nowMs: number,
  fallback: 1 | -1,
  seeksRear = false,
): 1 | -1 {
  if (seeksRear || nowMs >= memory.untilMs || memory.dodgeSign === 0) {
    return fallback
  }
  return memory.dodgeSign === 1 ? -1 : 1
}

/**
 * Whether the foe opened at range, so a punish should answer with a shot
 * rather than closing for the innate strike. False once the read expires.
 */
export function preferRangedPunish(
  memory: PatternMemory,
  nowMs: number,
): boolean {
  if (nowMs >= memory.untilMs || memory.openingMove === null) return false
  return getMove(memory.openingMove)?.melee === false
}
