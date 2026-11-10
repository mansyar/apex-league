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
 * rolls 18-19 rather than a flat 19 (R3: the ladder's finisher is 19 now, not
 * the pre-R2 22).
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
 * How much of an authored miss chance survives. Phase 1 of the variance track
 * removed the old divisor entirely: the number on the card is the
 * probability. Every authored value below 100 rolls its own number and an
 * authored 100 is a guaranteed connect that draws nothing, so a kit of
 * guaranteed rows consumes no accuracy RNG. Integer arithmetic only: one
 * integer draw against the authored bound.
 */
/** True when a swing aimed at `accuracy` connects. A hundred draws nothing. */
export function rollHits(accuracy: number, rng: Rng): boolean {
  if (accuracy >= 100) return true
  return rng.int(100) < accuracy
}
