/**
 * The hit-point pool a fight is fought on: the HP stat, read as-is.
 *
 * Phase 5 folded the old 210% arena scale into the stored stat (FR-2), so the
 * number the sheet shows is the pool the fight resolves with and there is no
 * multiplier left between them. The helper stays because the resolver and the
 * client both read it for the HUD denominator, and that shared read is what
 * keeps a bar from being measured against a different pool than the fight.
 */

import type { BattleSide } from "../resolver"

/** A side's opening pool: its HP stat, which already carries the old scale. */
export function startingHp(side: Pick<BattleSide, "stats">): number {
  return side.stats.hp
}
