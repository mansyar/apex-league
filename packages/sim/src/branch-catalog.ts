/**
 * Branch catalog data (`branching_evolution_20261020`): every species grows
 * into one of two champion forms, and the form is earned from how the
 * creature was trained — never picked from a menu. The catalog tables live
 * in the `./branch-catalog` submodules —
 *
 * - `./branch-catalog/types` — the shared `BranchDef` shape
 * - `./branch-catalog/starters` — the three starter lines
 * - `./branch-catalog/rewards` — the ladder-reward lines
 * - `./branch-catalog/wave2` — the Wave-2 lines
 * - `./branch-catalog/discoveries` — the breeding-discovery lines (roster_wave_3)
 * - `./branch-catalog/catalog` — the joined roster
 *
 * This module re-exports the same public surface the monolith exported, so
 * every consumer import (`./branch-catalog`, `../branch-catalog`) stays
 * untouched. `branches.ts` owns the lookups and the training-derived lean
 * on top of the joined table.
 *
 * Pure data only — no DOM, no rendering, no I/O.
 */

export { BRANCHES } from "./branch-catalog/catalog"
export { DISCOVERY_BRANCHES } from "./branch-catalog/discoveries"
export { REWARD_BRANCHES } from "./branch-catalog/rewards"
export { STARTER_BRANCHES } from "./branch-catalog/starters"
export type { BranchDef } from "./branch-catalog/types"
export { WAVE2_BRANCHES } from "./branch-catalog/wave2"
