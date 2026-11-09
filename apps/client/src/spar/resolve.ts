/**
 * The spar's verdict (continuous-arena-battle FR-13, FR-15): every bout —
 * the seeded exhibition and the ghost bout alike — resolves through the
 * continuous engine. The result carries the dense trace, so a spar renders
 * exactly like a cup fight instead of falling back to the frozen gauge
 * clock's step playback.
 */

import { type BattleResult, resolveContinuous } from "@apex/sim"
import type { SparSetup } from "./types"

/** Resolve one spar: the continuous engine, dense trace included. */
export function resolveSpar(setup: SparSetup, seed: number): BattleResult {
  return resolveContinuous(setup.ownedSide, setup.rivalSide, seed)
}
