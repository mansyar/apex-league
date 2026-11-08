/**
 * The hit-point pool a fight is fought on (FR-21): stat HP scaled by
 * `HP_SCALE_PERCENT`, floored.
 *
 * This is the single source of truth for a side's opening HP. The resolver
 * takes `initFor`'s hit points from `startingHp`, and the client reads the
 * same function for the HUD's denominator, so a bar can never be measured
 * against a different pool than the one the fight is actually fought on —
 * the drift that left every HP bar pinned at full.
 */

import type { BattleSide } from "../resolver"

/**
 * The hit-point scale every fighter enters with, in percent (tunable, FR-21).
 *
 * The band is a duration, and duration is hit points over the damage the foe's
 * innate strike deals, so this is the pacing dial that does not touch a single
 * frame or the damage formula. Phase 10 measured the unscaled roster at
 * 4.9–23.6 s per fight (14 pairings) and set the scale from that table.
 */
export const HP_SCALE_PERCENT = 390

/** A side's opening pool: its stat HP at the scale above, floored. */
export function startingHp(side: Pick<BattleSide, "stats">): number {
  return Math.floor((side.stats.hp * HP_SCALE_PERCENT) / 100)
}
