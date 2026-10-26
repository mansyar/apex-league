/**
 * Shared species-registry types. The catalog tables live in the sibling
 * modules (`starters`, `rewards`, `discovery`) and are joined by
 * `./catalog`; this module holds only the shapes they all share.
 *
 * Pure data and pure functions only — no DOM, no rendering, no I/O.
 */

import type { Element, StatBounds } from "../creature"
import type { LadderTier } from "../ladder"

/** Battle temperament: how the creature closes range and opens. */
export type Temperament = "rush" | "slow" | "obedient"

/**
 * One playable species: the registry row the roster counts. `available`
 * marks a starter-pickable line; every other line enters play through its
 * own seam (ladder rewards, breeding discovery) and `rewardFromTier` names
 * the tier that pays it, when one does.
 */
export interface SpeciesDef {
  readonly id: string
  readonly archetypeId: string
  readonly displayName: string
  readonly element: Element
  /** Handbook copy for the line, in product voice. */
  readonly flavor: string
  readonly available: boolean
  readonly rewardFromTier?: LadderTier
  /** The fixed six-move kit, in catalog (tier) order. */
  readonly kit: readonly [string, string, string, string, string, string]
  readonly temperament: Temperament
  readonly statBounds: Record<"hp" | "atk" | "def" | "spd", StatBounds>
}
