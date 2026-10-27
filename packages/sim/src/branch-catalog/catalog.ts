/**
 * The joined branch roster: starters, ladder rewards, the Wave-2 lines,
 * then the breeding-discovery lines. `branches.ts` owns the lookups and the
 * training-derived lean on top of this table.
 *
 * Pure data only — no DOM, no rendering, no I/O.
 */

import { DISCOVERY_BRANCHES } from "./discoveries"
import { REWARD_BRANCHES } from "./rewards"
import { STARTER_BRANCHES } from "./starters"
import type { BranchDef } from "./types"
import { WAVE2_BRANCHES } from "./wave2"

/**
 * The thirty real forms: two per species, one offense and one
 * defense. Their boosts preserve the legacy effective-stat budget (11
 * juvenile, 22 champion, HP counted double), so neither branch is a stat
 * upgrade over the other. A form's signature may be a kit row of its own
 * species' element vocabulary that another species carries in its kit
 * (user decision 2026-10-25): the signature is still form-exclusive in
 * the boss sense — no boss wields the signature of a species it is not.
 */
export const BRANCHES: readonly BranchDef[] = Object.freeze([
  ...STARTER_BRANCHES,
  ...REWARD_BRANCHES,
  ...WAVE2_BRANCHES,
  ...DISCOVERY_BRANCHES,
])
