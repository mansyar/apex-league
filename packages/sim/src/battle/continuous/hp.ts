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
 * 4.9–23.6 s per fight (14 pairings) and set 390 from that table, back when a
 * fighter could attack three times a second.
 *
 * Battle Spacing and Cadence (Phase 4) re-tuned it after FR-4 bound sustained
 * output to one attack per 1.5 s. The seeded sweep over the 14-fight reference
 * sample is in `conductor/tracks/20261109-battle-spacing-cadence/verification/
 * phase-4.md`: 390 left 12 of 14 fights at the cap, 210 is the largest scale at
 * which a majority finish by knockout and at most one fight in three reaches
 * the cap (10 KO / 4 cap).
 */
export const HP_SCALE_PERCENT = 210

/** A side's opening pool: its stat HP at the scale above, floored. */
export function startingHp(side: Pick<BattleSide, "stats">): number {
  return Math.floor((side.stats.hp * HP_SCALE_PERCENT) / 100)
}
