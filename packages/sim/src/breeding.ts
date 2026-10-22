/**
 * Dynasty breeding (`dynasty_breeding_20261018`): the pool of retired Hall of
 * Fame records, pair validation, and the dual-parent egg. A pair contributes
 * 50% of the stronger parent + 10% of the weaker per stat, then trait bonuses
 * and the established-line perk, clamped to the species bounds. One seeded
 * mutation (+1..+2 to one stat) is baked into the hatched stats. A bred egg
 * may also drift toward a differing parent's element: one seeded 15% roll
 * (affinity_drift_20261021) decides the egg's `affinity`.
 *
 * Phase 1 exposes the pure building blocks; Phase 2 adds the succession
 * wrapper and save v15. Pure data and pure functions only — no DOM, no I/O.
 */

import { headStartAp } from "./ap"
import {
  type Creature,
  type CreatureStats,
  createCreatureFrom,
  type Element,
  type LineageTrait,
  type StatKey,
} from "./creature"
import {
  canGraduate,
  type GraduationReason,
  INHERITANCE_FRACTION,
  lineagePerks,
  REFINED_INHERITANCE_FRACTION,
  type RetiredRecord,
  retireeRecord,
  WARM_BOND_START,
} from "./legacy"
import { makeRng, type Rng } from "./rng"
import { getSpecies, type SpeciesDef, STORM_GIFT_SPECIES_ID } from "./species"
import { ACTION_POINTS_PER_DAY, type GameState } from "./state"
import { dedupeTraits, effectiveTraits, traitBonus } from "./traits"

export {
  deriveTrait,
  effectiveTraits,
  isLineageTrait,
  TRAIT_ORDER,
  TRAITS,
  type TraitDef,
  traitBonus,
} from "./traits"
export { retireeRecord }

/** The weaker parent's weight in the dual-parent floor. */
export const PAIR_SECONDARY_FRACTION = 0.1

/**
 * The chance a bred egg drifts toward a differing parent's element
 * (affinity_drift_20261021 FR-1): a seeded roll made once, at breeding
 * time, so the nursery preview and the hatch agree.
 */
export const AFFINITY_DRIFT_CHANCE = 0.15

/** A fixed salt keeps the drift roll decorrelated from the egg's stat stream. */
const AFFINITY_DRIFT_SALT = 0x85ebca6b

/**
 * The drift source: the parent whose element differs from the egg's species
 * element, or null when both parents share it. Only primary elements are
 * drift sources — a parent's own affinity never chains.
 */
export function driftSource(
  speciesElement: Element,
  parents: readonly RetiredRecord[],
): Element | null {
  const [sire, dam] = parents
  if (sire && sire.element !== speciesElement) return sire.element
  if (dam && dam.element !== speciesElement) return dam.element
  return null
}

/**
 * The seeded affinity drift roll. Like the rival kit, it draws from its own
 * stream derived from the seed under a distinct constant, so the egg's base
 * roll and mutation stay byte-identical whether or not a drift is possible.
 * Returns the differing parent's element on a hit, null otherwise (and
 * always null — with no draw consumed — when both parents share the
 * species element).
 */
export function rollAffinityDrift(
  species: SpeciesDef,
  parents: readonly RetiredRecord[],
  seed: number | Rng,
): Element | null {
  const source = driftSource(species.element, parents)
  if (!source) return null
  const rng =
    typeof seed === "number"
      ? makeRng((seed ^ AFFINITY_DRIFT_SALT) >>> 0)
      : seed
  // A draw at or above the threshold (1 - chance) drifts; below it the egg
  // stays pure. Boundary pinned by test.
  return rng.next() >= 1 - AFFINITY_DRIFT_CHANCE ? source : null
}

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

/**
 * The Silver tier-reward species: the league's one-time "Storm Gift" (FR-5).
 * Re-exported from the catalog so the grant seam and the hatch seam cannot
 * name two different species.
 */
export { STORM_GIFT_SPECIES_ID } from "./species"

/**
 * The pure gift egg (electric species line FR-6): the league's Silver
 * tier-reward hatches into a fixed-Electric creature with a guaranteed
 * `affinity: null`. This path deliberately does NOT route through
 * `createBredCreature` — a gift is not bred, so no affinity-drift roll is
 * made and no drift RNG draw is consumed (NFR-3): the drift stream's
 * position for every subsequent operation is unchanged. Same seed → same
 * individual, so the nursery preview and the hatch agree by construction.
 * The locked species is reached through the unchecked creation seam
 * (`createCreatureFrom`) — the public starter gate stays as locked as ever.
 */
export function createGiftEgg(seed: number | Rng): Creature {
  const species = getSpecies(STORM_GIFT_SPECIES_ID)
  if (!species) {
    throw new Error(`Unknown species: ${STORM_GIFT_SPECIES_ID}`)
  }
  const base = createCreatureFrom(species, seed)
  // The gift is pure: the affinity is stamped null directly — no roll.
  return { ...base, affinity: null, giftEgg: true }
}

export type HatchGiftReason = "not-granted" | "already-hatched"

export type HatchGiftResult =
  | { ok: true; state: GameState }
  | { ok: false; reason: HatchGiftReason }

/**
 * Whether the granted gift egg has already been hatched anywhere in the
 * lineage: the active creature carries the marker, a retired gift career
 * sits in the Hall of Fame, or a gift pet waits in the stable. Derived from
 * the persisted lineage marker (save v21) — never stored separately.
 */
function giftEggHatched(state: GameState): boolean {
  return (
    (state.creature?.giftEgg ?? false) ||
    state.stable.some((pet) => pet.giftEgg) ||
    state.lineage.hallOfFame.some((record) => record.giftEgg)
  )
}

/**
 * Hatch the granted gift egg (the nursery's hatch seam for the Storm Gift).
 * The hound joins the **stable** (save v24): the gift is a pet the player
 * owns, not a replacement for the pet they already have, so the ranch keeps
 * its partner and its career untouched — and the outgoing partner is NOT
 * archived, because it never left the ranch.
 *
 * The day, budget, ladder and lineage generation carry over untouched: the
 * gift is a grant, not a graduation. Pure; the egg's own stored seed lands
 * the exact individual the nursery previewed.
 */
export function hatchGiftEgg(state: GameState): HatchGiftResult {
  if (!state.stormGiftClaimed) return { ok: false, reason: "not-granted" }
  const pending = state.pendingGift
  if (!pending) return { ok: false, reason: "already-hatched" }
  if (giftEggHatched(state)) return { ok: false, reason: "already-hatched" }
  return {
    ok: true,
    state: {
      ...state,
      // The ranch pet stays exactly as it was — the gift waits in the stable.
      stable: [...state.stable, createGiftEgg(pending.seed)],
      pendingGift: null,
    },
  }
}

/**
 * Whether a granted egg is waiting in the nursery for the player to hatch
 * it (save v22). The claim flag alone cannot answer this: it stays true
 * after the hatch.
 */
export function stormGiftPending(state: GameState): boolean {
  return state.pendingGift !== null
}

/** What the nursery shows before the player commits to the hatch. */
export interface StormGiftPreview {
  speciesId: string
  displayName: string
  element: Element
  flavor: string
  /** The rolled stats of the exact individual the hatch will produce. */
  stats: CreatureStats
  /** The seed the hatch uses — the preview and the hatch share it. */
  seed: number
}

/**
 * The Storm Gift as the player will see it: the granted species and the
 * rolled stats of the very individual the hatch produces. Built from the
 * pending egg's own seed, so the preview cannot drift from the hatch
 * (FR-6). Null when no gift is waiting.
 */
export function stormGiftPreview(state: GameState): StormGiftPreview | null {
  const pending = state.pendingGift
  if (!pending) return null
  const species = getSpecies(pending.speciesId)
  if (!species) return null
  const egg = createGiftEgg(pending.seed)
  return {
    speciesId: pending.speciesId,
    displayName: species.displayName,
    element: species.element,
    flavor: species.flavor,
    stats: egg.stats,
    seed: pending.seed,
  }
}
