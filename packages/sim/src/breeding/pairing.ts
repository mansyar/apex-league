/**
 * Pairing and the dual-parent egg (dynasty_breeding_20261018): the pool of
 * retired Hall of Fame records, pair validation, and the hatched successor.
 * A pair contributes 50% of the stronger parent + 10% of the weaker per
 * stat, then trait bonuses and the established-line perk, clamped to the
 * species bounds. One seeded mutation (+1..+2 to one stat) is baked into the
 * hatched stats.
 *
 * Split out of the former monolithic breeding.ts (sim-voxel-size-guard,
 * phase 2) — pure relocation, no behavior change. The affinity drift lives
 * in ./drift, the Storm Gift in ./gift.
 */

import { headStartAp } from "../ap"
import {
  type Creature,
  type CreatureStats,
  createCreatureFrom,
  type LineageTrait,
  type StatKey,
} from "../creature"
import { canGraduate, type GraduationReason } from "../legacy/graduation"
import {
  INHERITANCE_FRACTION,
  REFINED_INHERITANCE_FRACTION,
  WARM_BOND_START,
} from "../legacy/inheritance"
import {
  lineagePerks,
  type RetiredRecord,
  retireeRecord,
} from "../legacy/lineage"
import { makeRng } from "../rng"
import { getSpecies, type SpeciesDef } from "../species"
import { ACTION_POINTS_PER_DAY, type GameState } from "../state"
import { dedupeTraits, effectiveTraits, traitBonus } from "../traits"
import { rollAffinityDrift } from "./drift"

/** The weaker parent's weight in the dual-parent floor. */
export const PAIR_SECONDARY_FRACTION = 0.1

const STAT_KEYS = ["hp", "atk", "def", "spd"] as const

/**
 * Every record the player may pair: the archived Hall of Fame, oldest first,
 * followed by the retiring champion (if any). The retiree is last so the UI
 * can mark it and preselect it without disturbing archive order.
 *
 * The stable is not a pairable pool (FR-11): a pet waiting in reserve has no
 * archived career, so it never pairs and never enters the Hall of Fame.
 */
export function breedingPool(state: GameState): RetiredRecord[] {
  const retiree = retireeRecord(state)
  return retiree
    ? [...state.lineage.hallOfFame, retiree]
    : [...state.lineage.hallOfFame]
}

/**
 * Breeding is available when graduation is legal and the pool has at least
 * two records. The first graduation (only the retiree) stays a founder pick.
 */
export function canBreed(state: GameState): boolean {
  return canGraduate(state).eligible && breedingPool(state).length >= 2
}

export type PairReason = "need-two" | "duplicate" | "unknown"

export type PairVerdict =
  | { ok: true; pair: [RetiredRecord, RetiredRecord] }
  | { ok: false; reason: PairReason }

/**
 * Validate a nursery selection. Parent references are Hall-of-Fame
 * generations; a pair must be exactly two distinct generations present in the
 * pool.
 */
export function validatePair(
  pool: readonly RetiredRecord[],
  generations: readonly number[],
): PairVerdict {
  if (generations.length !== 2) return { ok: false, reason: "need-two" }
  const [sireGeneration, damGeneration] = generations
  if (sireGeneration === damGeneration) {
    return { ok: false, reason: "duplicate" }
  }
  const sire = pool.find((record) => record.generation === sireGeneration)
  const dam = pool.find((record) => record.generation === damGeneration)
  if (!sire || !dam) return { ok: false, reason: "unknown" }
  return { ok: true, pair: [sire, dam] }
}

/** The pair for a selection, or null when the selection is invalid. */
export function pairFor(
  pool: readonly RetiredRecord[],
  generations: readonly number[],
): [RetiredRecord, RetiredRecord] | null {
  const verdict = validatePair(pool, generations)
  return verdict.ok ? verdict.pair : null
}

/**
 * The species the egg may be: one option when both parents match, otherwise
 * both parents' species in selection order. The player's choice never changes
 * the parents' contribution to the floor.
 */
export function speciesOptions(pair: readonly RetiredRecord[]): string[] {
  const options: string[] = []
  for (const record of pair) {
    if (!options.includes(record.speciesId)) options.push(record.speciesId)
  }
  return options
}

/**
 * The dual-parent stat floor: 50% of the stronger parent + 10% of the weaker,
 * rounded, plus trait bonuses and the established-line `+1`, clamped to the
 * species' legal bounds. Symmetric in parent order. Pure.
 */
export function inheritedFloorFromPair(
  sire: CreatureStats,
  dam: CreatureStats,
  species: SpeciesDef,
  prestige: number,
  traits: readonly LineageTrait[],
): CreatureStats {
  const perks = lineagePerks(prestige)
  const milestone = perks.establishedLine ? 1 : 0
  // Refined Blood (prestige 7): the stronger parent's share rises from
  // 0.5 to 0.55 for eggs bred at or above the milestone. The weaker
  // parent's share never moves.
  const strongerShare = perks.refinedBlood
    ? REFINED_INHERITANCE_FRACTION
    : INHERITANCE_FRACTION
  const bonus = traitBonus(traits)
  const floorFor = (key: keyof CreatureStats): number => {
    const [lo, hi] = species.statBounds[key]
    const stronger = Math.max(sire[key], dam[key])
    const weaker = Math.min(sire[key], dam[key])
    // Clamp the weighted roll to the species first, then add the flat
    // milestone + trait bonuses, then clamp once more. Without the
    // intermediate clamp, the HP minimum (76+) would swallow every +2 Sturdy
    // and the established-line +1, because half of a realistic champion's HP
    // is below the species floor.
    const rolled = Math.max(
      lo,
      Math.min(
        hi,
        Math.round(strongerShare * stronger + PAIR_SECONDARY_FRACTION * weaker),
      ),
    )
    return Math.max(lo, Math.min(hi, rolled + milestone + bonus[key]))
  }
  return {
    hp: floorFor("hp"),
    atk: floorFor("atk"),
    def: floorFor("def"),
    spd: floorFor("spd"),
  }
}

/**
 * Hatch the dual-parent egg: a normal seeded roll of the chosen species,
 * floored by the pair, then one seeded mutation (+1..+2 to one stat). Traits
 * are the deduplicated union of both parents; parentage is the sorted pair
 * generations. Same seed -> same individual. Throws unless exactly two parents
 * and a known, available species are supplied.
 */
export function createBredCreature(
  speciesId: string,
  seed: number,
  parents: readonly RetiredRecord[],
  prestige: number,
): Creature {
  if (parents.length !== 2) {
    throw new Error("Breeding needs exactly two parents")
  }
  const [sire, dam] = parents
  if (!sire || !dam) throw new Error("Breeding needs exactly two parents")
  const species = getSpecies(speciesId)
  if (!species) throw new Error(`Unknown species: ${speciesId}`)

  const traits = dedupeTraits([
    ...effectiveTraits(sire),
    ...effectiveTraits(dam),
  ])
  const floor = inheritedFloorFromPair(
    sire.stats,
    dam.stats,
    species,
    prestige,
    traits,
  )

  const rng = makeRng(seed)
  // The pair is the acquisition rule: both parents must already be this
  // species, so the offspring is a known species even when the league only
  // ever grants it (a hound pair breeds a hound - FR-1). The starter seam
  // (`createCreature`) stays shut for reward species.
  const base = createCreatureFrom(species, rng)
  const stats: CreatureStats = {
    hp: Math.max(base.stats.hp, floor.hp),
    atk: Math.max(base.stats.atk, floor.atk),
    def: Math.max(base.stats.def, floor.def),
    spd: Math.max(base.stats.spd, floor.spd),
  }

  // One mutation per egg, on the same deterministic stream as the base roll.
  const mutationKey: StatKey = STAT_KEYS[rng.int(STAT_KEYS.length)] ?? "hp"
  const amount =
    1 +
    rng.int(2) +
    // Champion Stable (prestige 9) widens the band to +1..+3 by extending
    // the top of it: one extra draw decides the extension, so every
    // pre-perk roll keeps its original amount and no low roll ever shifts.
    // The extra draw fires only at the milestone, leaving the shorter
    // stream byte-identical below prestige 9.
    (lineagePerks(prestige).championStable && rng.next() >= 0.5 ? 1 : 0)
  const [lo, hi] = species.statBounds[mutationKey]
  stats[mutationKey] = Math.max(lo, Math.min(hi, stats[mutationKey] + amount))

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
    traits,
    affinity: rollAffinityDrift(species, parents, seed),
    parents: parents.map((record) => record.generation).sort((a, b) => a - b),
  }
}

export type GraduatePairReason =
  | GraduationReason
  | "invalid-pair"
  | "invalid-species"

export type GraduatePairResult =
  | { ok: true; state: GameState }
  | { ok: false; reason: GraduatePairReason }

/**
 * Graduate the active champion into a dual-parent egg. The generic graduation
 * gate runs first, then the pair is resolved from the Hall plus the retiring
 * champion (so the retiree itself may be a parent). The egg's species must be
 * one of the pair's species; the stat floor and trait union come from both
 * parents. The retiree is archived exactly as `graduate()` archives it.
 *
 * Pure: the input state is never mutated. The in-game day, cups, ladder, and
 * settings carry over; action points reset like any succession.
 */
export function graduateWithPair(
  state: GameState,
  generations: readonly number[],
  speciesId: string,
  seed: number,
): GraduatePairResult {
  const verdict = canGraduate(state)
  if (!verdict.eligible) return { ok: false, reason: verdict.reason }
  const record = retireeRecord(state)
  if (!record) return { ok: false, reason: "no-creature" }

  const pool = [...state.lineage.hallOfFame, record]
  const pair = pairFor(pool, generations)
  if (!pair) return { ok: false, reason: "invalid-pair" }
  if (!speciesOptions(pair).includes(speciesId)) {
    return { ok: false, reason: "invalid-species" }
  }

  const generation = state.lineage.generation + 1
  const prestige = generation + state.cupsWon
  const successor = createBredCreature(speciesId, seed, pair, prestige)
  return {
    ok: true,
    state: {
      ...state,
      // The successor's first day of life: the champion-stable head-start
      // already applies on the hatch day itself (FR-5).
      actionPoints:
        ACTION_POINTS_PER_DAY +
        headStartAp(
          state.day,
          state.day,
          lineagePerks(prestige).championStable,
        ),
      creature: successor,
      lineage: {
        generation,
        hallOfFame: [...state.lineage.hallOfFame, record],
      },
    },
  }
}
