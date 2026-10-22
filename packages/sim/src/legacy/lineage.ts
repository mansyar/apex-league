/**
 * The bloodline: the Hall of Fame, the prestige rating it earns, and the
 * milestone perks that rating unlocks.
 *
 * Split out of the former monolithic `legacy.ts` (sim-voxel-size-guard,
 * phase 2): the lineage's own state and prestige model are one concern,
 * graduation and inheritance are their own.
 */

import { LEGACY_BRANCH } from "../branches"
import {
  type CreatureStats,
  type Element,
  effectiveStats,
  type LineageTrait,
} from "../creature"
import type { GameState } from "../state"
import { effectiveTraits } from "../traits"

/** One archived career, appended to the Hall of Fame on graduation. */
export interface RetiredRecord {
  /** The creature's name at retirement (proper noun). */
  name: string
  speciesId: string
  archetypeId: string
  /** Element id at retirement. */
  element: Element
  /**
   * Secondary type affinity at retirement (save v20), or null when the
   * career never drifted. Breeding reads only `element`: secondaries never
   * chain, so a record's own affinity is never a drift source.
   */
  affinity: Element | null
  /** Effective stats (base + trained) at the moment of retirement. */
  stats: CreatureStats
  /** Trained bonus at retirement, kept for the record's display. */
  trained: CreatureStats
  /** Lifetime cup championships at the moment of retirement. */
  cupsWon: number
  /** The retiree's generation: 0 = founder, 1 = first successor, ... */
  generation: number
  /** The in-game day the creature graduated. */
  retiredOnDay: number
  /**
   * Lineage traits at retirement (save v15). Empty on a pre-v15 record;
   * `effectiveTraits()` derives one on read so old Hall entries still
   * contribute to breeding.
   */
  traits: LineageTrait[]
  /** Hall of Fame generations of this record's parents (save v15). */
  parents: number[]
  /**
   * The form this career earned (save v19). A pre-v19 or pinned old line is
   * `"legacy"`; its signature move is derived from this id on read.
   */
  branch: string
  /**
   * True when this career hatched from the league's Silver tier-reward gift
   * egg (save v21, electric species line FR-8). Archived with the record so
   * the gift's one-hatch rule survives retirement — see breeding.ts.
   */
  giftEgg: boolean
}

/** The bloodline across generations (save v10). */
export interface LineageState {
  /** Completed graduations: 0 while the founder is the active creature. */
  generation: number
  /** Archived careers, oldest first. */
  hallOfFame: RetiredRecord[]
}

/**
 * The retiring champion as it would be archived right now, or null when the
 * save has no creature. This is the exact shape `graduate()` writes — and the
 * same shape `graduateWithPair()` appends — so the Nursery can show the
 * retiree before graduation without a parallel record model.
 */
export function retireeRecord(state: GameState): RetiredRecord | null {
  const creature = state.creature
  if (!creature) return null
  const stats = effectiveStats(creature)
  return {
    name: creature.name,
    speciesId: creature.speciesId,
    archetypeId: creature.archetypeId,
    element: creature.element,
    affinity: creature.affinity,
    stats,
    trained: { ...creature.trained },
    cupsWon: state.cupsWon,
    generation: state.lineage.generation,
    retiredOnDay: state.day,
    traits: effectiveTraits({
      traits: creature.traits,
      trained: creature.trained,
      stats,
    }),
    parents: [...(creature.parents ?? [])],
    branch: creature.branch ?? LEGACY_BRANCH.id,
    giftEgg: creature.giftEgg ?? false,
  }
}

/** Prestige milestone at which a lineage is founded (Hall of Fame recorded). */
export const PRESTIGE_FOUNDED = 1

/** Prestige milestone that warms the next egg's starting bond. */
export const PRESTIGE_WARM_BLOODLINE = 3

/** Prestige milestone that adds +1 to every inherited stat floor. */
export const PRESTIGE_ESTABLISHED_LINE = 5

/**
 * Prestige milestone (affinity_drift prestige perks, spec FR-4) whose
 * **Refined Blood** raises the dual-parent floor's stronger-parent share:
 * a bred egg's floor is 55% of the stronger parent instead of 50%.
 */
export const PRESTIGE_REFINED_BLOOD = 7

/**
 * Prestige milestone (affinity_drift prestige perks, spec FR-5) whose
 * **Champion Stable** grants the hatchling +1 max AP for its first five
 * in-game days and widens the breeding mutation band to +1..+3.
 */
export const PRESTIGE_CHAMPION_STABLE = 9

/** The bloodline's milestone perks, resolved from its prestige rating. */
export interface LineagePerks {
  /** The lineage is founded: the Hall of Fame is recorded and shown. */
  founded: boolean
  /** The next egg starts with a raised bond. */
  warmBloodline: boolean
  /** The inherited stat floor gains +1 per stat. */
  establishedLine: boolean
  /**
   * Refined Blood (prestige 7): the dual-parent floor's stronger-parent
   * share rises to 0.55 for eggs bred at this prestige or higher.
   */
  refinedBlood: boolean
  /**
   * Champion Stable (prestige 9): the hatchling gets +1 max AP for its
   * first five in-game days, and the breeding mutation band widens to
   * +1..+3.
   */
  championStable: boolean
}

/**
 * A fresh bloodline: generation 0 (the founder is the active creature) and an
 * empty Hall of Fame. Stamped for every new run and every migrated save (no
 * backfill — cups already won are history, like the v8 ladder).
 */
export function initialLineage(): LineageState {
  return { generation: 0, hallOfFame: [] }
}

/**
 * The bloodline's prestige rating: completed generations plus lifetime cup
 * championships. Derived (never stored) so it can never drift from the two
 * facts it counts — a pure function of the save.
 */
export function lineagePrestige(state: GameState): number {
  return state.lineage.generation + state.cupsWon
}

/**
 * The in-game day the active creature hatched, derived from the lineage:
 * a successor hatches on the day its predecessor graduated, so the last
 * Hall of Fame record's `retiredOnDay` is the current creature's hatch day,
 * and a founder (empty Hall) was chosen on day 1. Derived — never stored —
 * so the Champion Stable head-start window can auto-expire with no extra
 * save state.
 */
export function hatchDayOf(lineage: LineageState): number {
  const last = lineage.hallOfFame[lineage.hallOfFame.length - 1]
  return last ? last.retiredOnDay : 1
}

/**
 * Resolve the milestone perks a prestige rating unlocks. Cumulative: a high
 * rating keeps every lower milestone's perk.
 */
export function lineagePerks(prestige: number): LineagePerks {
  return {
    founded: prestige >= PRESTIGE_FOUNDED,
    warmBloodline: prestige >= PRESTIGE_WARM_BLOODLINE,
    establishedLine: prestige >= PRESTIGE_ESTABLISHED_LINE,
    refinedBlood: prestige >= PRESTIGE_REFINED_BLOOD,
    championStable: prestige >= PRESTIGE_CHAMPION_STABLE,
  }
}
