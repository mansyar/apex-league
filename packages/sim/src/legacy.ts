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

import { LEGACY_BRANCH } from "./branches"
import {
  type Creature,
  type CreatureStats,
  createCreature,
  effectiveStats,
  type LineageTrait,
} from "./creature"
import { getSpecies, type SpeciesDef } from "./species"
import { ACTION_POINTS_PER_DAY, type GameState } from "./state"
import { dedupeTraits, effectiveTraits, traitBonus } from "./traits"

/** One archived career, appended to the Hall of Fame on graduation. */
export interface RetiredRecord {
  /** The creature's name at retirement (proper noun). */
  name: string
  speciesId: string
  archetypeId: string
  /** Element id at retirement. */
  element: string
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
  }
}

/**
 * The night of this day (inclusive) is the earliest a champion may graduate.
 * A full career: two months of care. No upper limit — once eligible, the
 * send-off is the player's to choose.
 */
export const GRADUATION_DAY = 60

/**
 * Coach copy may tease a full career from this day on (the send-off itself
 * stays player-triggered — discovered, not demanded).
 */
export const GRADUATION_HINT_DAY = 55

/** Prestige milestone at which a lineage is founded (Hall of Fame recorded). */
export const PRESTIGE_FOUNDED = 1

/** Prestige milestone that warms the next egg's starting bond. */
export const PRESTIGE_WARM_BLOODLINE = 3

/** Prestige milestone that adds +1 to every inherited stat floor. */
export const PRESTIGE_ESTABLISHED_LINE = 5

/**
 * Fraction of a parent's effective stats inherited as the next egg's stat
 * floor. Half: lineage is tangible without trivializing the roll — a strong
 * career lifts the floor, but the individual still rolls its own luck.
 */
export const INHERITANCE_FRACTION = 0.5

/** The bond a successor starts with under the warm-bloodline perk. */
export const WARM_BOND_START = 20

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

/**
 * Why the graduation gate answered the way it did, checked in precedence
 * order: `no-creature > cup-phase > not-champion > too-young > eligible`.
 */
export type GraduationReason =
  | "eligible"
  | "no-creature"
  | "cup-phase"
  | "not-champion"
  | "too-young"

/** The graduation gate's verdict for the current state. */
export interface GraduationVerdict {
  eligible: boolean
  reason: GraduationReason
}

/**
 * May the player graduate the active creature right now? Eligible only when
 * the state is in the day phase, a creature is owned, it has reached its
 * **champion** form, and the in-game day is at least `GRADUATION_DAY`. The
 * gate delays but never blocks — past the floor it stays eligible forever.
 *
 * Pure: reads the state, returns a verdict; the caller decides what to do.
 */
export function canGraduate(state: GameState): GraduationVerdict {
  if (!state.creature) return { eligible: false, reason: "no-creature" }
  if (state.phase === "cup") return { eligible: false, reason: "cup-phase" }
  if (state.creature.stage !== "champion")
    return { eligible: false, reason: "not-champion" }
  if (state.day < GRADUATION_DAY)
    return { eligible: false, reason: "too-young" }
  return { eligible: true, reason: "eligible" }
}

/**
 * The per-stat floor a successor's rolled stats may never fall below: a
 * fraction of the parent's effective stats, plus one under the
 * established-line perk, then clamped into the species' legal bounds. Pure.
 */
export function inheritedFloor(
  parentEffective: CreatureStats,
  species: SpeciesDef,
  prestige: number,
  traits: readonly LineageTrait[] = [],
): CreatureStats {
  const bonus = lineagePerks(prestige).establishedLine ? 1 : 0
  const inherited = traitBonus(traits)
  const floorFor = (key: keyof CreatureStats): number => {
    const [lo, hi] = species.statBounds[key]
    // Clamp the weighted roll first, then add the milestone + trait bonuses.
    // The HP minimum would otherwise swallow a +2 Sturdy on every realistic
    // champion (half of ~100 HP is below the 76+ species floor).
    const rolled = Math.max(
      lo,
      Math.min(hi, Math.round(INHERITANCE_FRACTION * parentEffective[key])),
    )
    return Math.max(lo, Math.min(hi, rolled + bonus + inherited[key]))
  }
  return {
    hp: floorFor("hp"),
    atk: floorFor("atk"),
    def: floorFor("def"),
    spd: floorFor("spd"),
  }
}

/**
 * Create the next egg: a normal seeded roll of the chosen species, with each
 * stat floored by the parent's inheritance (R3). Same seed → same individual,
 * so succession stays replayable. The bond starts raised under the
 * warm-bloodline perk; every other condition uses the standard start.
 *
 * Throws on an unknown species (the caller must pick an available one).
 */
export interface InheritanceSource {
  /** The parent record's effective traits (hereditary). */
  traits: readonly LineageTrait[]
  /** The parent generations this successor descends from. */
  parents: readonly number[]
}

export function createInheritedCreature(
  speciesId: string,
  seed: number,
  parentEffective: CreatureStats,
  prestige: number,
  source?: InheritanceSource,
): Creature {
  const species = getSpecies(speciesId)
  if (!species) throw new Error(`Unknown species: ${speciesId}`)
  const floor = inheritedFloor(
    parentEffective,
    species,
    prestige,
    source?.traits,
  )
  const base = createCreature(speciesId, seed)
  const stats: CreatureStats = {
    hp: Math.max(base.stats.hp, floor.hp),
    atk: Math.max(base.stats.atk, floor.atk),
    def: Math.max(base.stats.def, floor.def),
    spd: Math.max(base.stats.spd, floor.spd),
  }
  const conditions = lineagePerks(prestige).warmBloodline
    ? {
        ...base.conditions,
        bond: Math.max(base.conditions.bond, WARM_BOND_START),
      }
    : base.conditions
  return {
    ...base,
    stats,
    conditions,
    traits: source ? dedupeTraits(source.traits) : [],
    parents: source ? [...source.parents] : [],
  }
}

/** The outcome of a graduation attempt. */
export type GraduateResult =
  | { ok: true; state: GameState }
  | { ok: false; reason: GraduationReason }

/**
 * Graduate the active champion into the next generation (R4). Pure: the input
 * state is never mutated. On success the retiree is archived to the Hall of
 * Fame, the chosen species hatches as the successor (with the parent's
 * inheritance), the generation advances, and the day's action points reset.
 * The in-game day, cups, ladder, and settings carry over untouched — a dynasty
 * inherits its standing.
 *
 * The successor's perks read the family's prestige **at the moment the egg is
 * laid** (the incremented generation + lifetime cups), so a family that has
 * reached a milestone passes its boon to the next creature.
 *
 * Rejects (with no change) whenever `canGraduate` is not eligible.
 */
export function graduate(
  state: GameState,
  speciesId: string,
  seed: number,
): GraduateResult {
  const verdict = canGraduate(state)
  if (!verdict.eligible) return { ok: false, reason: verdict.reason }

  const record = retireeRecord(state)
  if (!record) return { ok: false, reason: "no-creature" }
  const generation = state.lineage.generation + 1
  // Prestige as of the new generation (spec R4): the egg belongs to it.
  const prestige = generation + state.cupsWon
  const successor = createInheritedCreature(
    speciesId,
    seed,
    record.stats,
    prestige,
    {
      traits: record.traits,
      parents: [state.lineage.generation],
    },
  )
  return {
    ok: true,
    state: {
      ...state,
      actionPoints: ACTION_POINTS_PER_DAY,
      creature: successor,
      lineage: {
        generation,
        hallOfFame: [...state.lineage.hallOfFame, record],
      },
    },
  }
}
