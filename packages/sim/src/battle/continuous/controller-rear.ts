/**
 * Circle's rear-arc commit (FR-11): when the foe's facing has been dragged off
 * this body, the next strike is worth taking before anything else. Kept out of
 * the controller's decision body so that body stays under the module cap.
 */

import { planarGapSq, rearArc } from "./controller-aim"
import { chooseMove } from "./controller-moves"
import type { FighterState } from "./types"

/**
 * The move to commit to while the foe's back is turned, or null when the arc
 * is not open or nothing in the kit reaches from here.
 */
export function rearCommit(
  me: FighterState,
  foe: FighterState,
  kit: readonly string[],
): string | null {
  const move = chooseMove(me, foe, kit, planarGapSq(me.pos, foe.pos))
  return move !== null && rearArc(me, foe) ? move : null
}
