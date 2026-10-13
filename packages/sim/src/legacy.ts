/**
 * Legacy & Breeding (legacy_breeding_20261013): the retirement → next-egg
 * loop. A champion that has lived a full career can be **graduated** by the
 * player; its career is archived to a Hall of Fame, its effective stats seed a
 * **stat floor** for the next egg, and the bloodline (generations + lifetime
 * cups) accrues **prestige** that grants milestone perks to later generations.
 *
 * The fantasy is a dynasty, not a single champion — but the game state stays
 * single-creature: graduation *replaces* the active creature, it does not
 * introduce a simultaneous roster (that is Phase 2 breeding).
 *
 * Pure data and pure functions only — no DOM, no rendering, no I/O.
 */

import type { GameState } from "./state"

/** One archived career, appended to the Hall of Fame on graduation. */
export interface RetiredRecord {
  /** The creature's name at retirement (proper noun). */
  name: string
  speciesId: string
  archetypeId: string
  /** Element id at retirement. */
  element: string
  /** Effective stats (base + trained) at the moment of retirement. */
  stats: { hp: number; atk: number; def: number; spd: number }
  /** Trained bonus at retirement, kept for the record's display. */
  trained: { hp: number; atk: number; def: number; spd: number }
  /** Lifetime cup championships at the moment of retirement. */
  cupsWon: number
  /** The retiree's generation: 0 = founder, 1 = first successor, ... */
  generation: number
  /** The in-game day the creature graduated. */
  retiredOnDay: number
}

/** The bloodline across generations (save v10). */
export interface LineageState {
  /** Completed graduations: 0 while the founder is the active creature. */
  generation: number
  /** Archived careers, oldest first. */
  hallOfFame: RetiredRecord[]
}

/** Prestige milestone at which a lineage is founded (Hall of Fame recorded). */
export const PRESTIGE_FOUNDED = 1

/** Prestige milestone that warms the next egg's starting bond. */
export const PRESTIGE_WARM_BLOODLINE = 3

/** Prestige milestone that adds +1 to every inherited stat floor. */
export const PRESTIGE_ESTABLISHED_LINE = 5

/** The bloodline's milestone perks, resolved from its prestige rating. */
export interface LineagePerks {
  /** The lineage is founded: the Hall of Fame is recorded and shown. */
  founded: boolean
  /** The next egg starts with a raised bond. */
  warmBloodline: boolean
  /** The inherited stat floor gains +1 per stat. */
  establishedLine: boolean
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
 * Resolve the milestone perks a prestige rating unlocks. Cumulative: a high
 * rating keeps every lower milestone's perk.
 */
export function lineagePerks(prestige: number): LineagePerks {
  return {
    founded: prestige >= PRESTIGE_FOUNDED,
    warmBloodline: prestige >= PRESTIGE_WARM_BLOODLINE,
    establishedLine: prestige >= PRESTIGE_ESTABLISHED_LINE,
  }
}
