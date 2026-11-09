/**
 * The two rolls a fight makes (FR-21). Both draw from the fight's single seeded
 * RNG, in a fixed order, so a replay from the same seed repeats exactly.
 */

import type { Rng } from "../../rng"

/**
 * Downward-only damage spread. The best roll is the authored base hit, which is
 * what keeps the 4-12% band honest after the roll as well as before it.
 *
 * A divisor of 8 cost about 6% of average damage and pushed two Phase 8 targets
 * off by half a percentage point each (cap share 33.8% vs 33.3%, knockout share
 * 66.2% vs 66.7% on 840 fights). Halving the floor to 16 gives back most of that
 * throughput — about 3% average — while the spread stays visible: a heavy still
 * rolls 21-22 rather than a flat 22.
 */
export const SPREAD_DIVISOR = 16

/** A blow between `base - floor(base / SPREAD_DIVISOR)` and `base`. */
export function spreadDamage(base: number, rng: Rng): number {
  if (base <= 1) return base
  const reach = Math.floor(base / SPREAD_DIVISOR)
  if (reach <= 0) return base
  return base - rng.int(reach + 1)
}

/**
 * How much of an authored miss chance survives. The catalog's accuracy numbers
 * (70-100) were written while nothing read them, so the pacing Phase 8 tuned
 * assumed every blow landed; read literally they are a 15-30% damage cut on the
 * rows the controller fires most, and they pushed the 14-matchup cap share from
 * 35.7% to 64.3%. Dividing the authored miss chance by five keeps the ladder's
 * ordering and relative risk while a miss stays a real, drawable event. The
 * authored numbers themselves are a Phase 11 question.
 */
export const MISS_SCALE = 5

/** True when a swing aimed at `accuracy` connects. A hundred draws nothing. */
export function rollHits(accuracy: number, rng: Rng): boolean {
  const aimed = 100 - Math.floor((100 - accuracy) / MISS_SCALE)
  if (aimed >= 100) return true
  return rng.int(100) < aimed
}
