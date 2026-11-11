/**
 * Answers to a fighter's own blind spot (Minimum Reach FR-10, AC-9).
 *
 * Phase 2 measured what happens without them: with a dead zone authored the
 * chooser finds nothing legal from the doctrine hold point (~1,088 mm), the
 * fighter stands, and the sample read 79.1% idle with 0.3% contact. The two
 * answers here are the ranged kit's and the melee kit's, in that order:
 *
 * - give ground *while firing*, so the launch opens by the same travel the
 *   closing would have eaten and the shot lands outside the inner edge;
 * - otherwise step away until the gap reaches the nearest ready move's landing
 *   edge, and re-decide on the next cadence.
 *
 * Both need room behind the fighter: backing into the fence is not a step away,
 * so a cornered fighter keeps its existing circle.
 */

import { awayFrom, retreatRoom } from "./controller-aim"
import { backingShot, landingEdgeMm } from "./controller-moves"
import { PUNISH_RESERVE_STAMINA } from "./controller-punish"
import type { ArenaBounds, FighterState, MoveIntent } from "./types"

/** Body radii of room a giving-ground order needs behind the fighter. */
export const BLIND_ROOM_RADII = 2

/** What a fighter with no legal blow can do about its own blind spot. */
export interface BlindSpotOrder {
  /** The shot to commit while giving ground, or null when the kit has none. */
  readonly commit: string | null
  /** The movement order that gives ground. */
  readonly away: MoveIntent
}

function roomToGive(
  me: FighterState,
  foe: FighterState,
  bounds: ArenaBounds,
): MoveIntent | null {
  const away = awayFrom(me, foe)
  const room = retreatRoom(me, away, bounds)
  return room >= me.radiusMm * BLIND_ROOM_RADII ? away : null
}

/**
 * A shot whose launch opens outside the inner edge, fired while giving ground,
 * or null when the kit has no such shot or there is no room to give.
 */
export function backingOrder(
  me: FighterState,
  foe: FighterState,
  kit: readonly string[],
  gapSq: number,
  bounds: ArenaBounds,
): BlindSpotOrder | null {
  const away = roomToGive(me, foe, bounds)
  if (!away) return null
  const commit = backingShot(me, foe, kit, gapSq, PUNISH_RESERVE_STAMINA)
  return commit === null ? null : { commit, away }
}

/**
 * The giving-ground order when a ready move would land from further out and the
 * gap is still inside that edge, or null when the fighter is already on it.
 */
export function stepBackOrder(
  me: FighterState,
  foe: FighterState,
  kit: readonly string[],
  gapSq: number,
  bounds: ArenaBounds,
): MoveIntent | null {
  const edge = landingEdgeMm(me, foe, kit, gapSq, PUNISH_RESERVE_STAMINA)
  if (edge === null || gapSq >= edge * edge) return null
  return roomToGive(me, foe, bounds)
}
