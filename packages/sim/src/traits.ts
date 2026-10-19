/**
 * Lineage traits (`dynasty_breeding_20261018`): small, inheritable modifiers
 * that shape a successor's egg floor. A parent's trait is derived from how it
 * was raised — the highest **trained** stat, falling back to its highest
 * effective stat — and both parents' traits pass to the egg, deduplicated.
 *
 * Traits are display + egg-floor data only: they have no battle effect and are
 * not part of the combat stats. Pure data and pure functions only.
 */

import type { CreatureStats, LineageTrait } from "./creature"

/** One trait's display copy and floor bonus. */
export interface TraitDef {
  id: LineageTrait
  label: string
  description: string
  /** Added to the inherited floor per stat (before the species clamp). */
  bonus: CreatureStats
}

/** Canonical order: used for badges, validation, and inherited-trait output. */
export const TRAIT_ORDER: readonly LineageTrait[] = [
  "sturdy",
  "fierce",
  "guarded",
  "quick",
]

export const TRAITS: Record<LineageTrait, TraitDef> = {
  sturdy: {
    id: "sturdy",
    label: "Sturdy",
    description: "+2 HP to the inherited floor.",
    bonus: { hp: 2, atk: 0, def: 0, spd: 0 },
  },
  fierce: {
    id: "fierce",
    label: "Fierce",
    description: "+1 ATK to the inherited floor.",
    bonus: { hp: 0, atk: 1, def: 0, spd: 0 },
  },
  guarded: {
    id: "guarded",
    label: "Guarded",
    description: "+1 DEF to the inherited floor.",
    bonus: { hp: 0, atk: 0, def: 1, spd: 0 },
  },
  quick: {
    id: "quick",
    label: "Quick",
    description: "+1 SPD to the inherited floor.",
    bonus: { hp: 0, atk: 0, def: 0, spd: 1 },
  },
}

const STAT_ORDER = ["hp", "atk", "def", "spd"] as const

const TRAIT_BY_STAT: Record<(typeof STAT_ORDER)[number], LineageTrait> = {
  hp: "sturdy",
  atk: "fierce",
  def: "guarded",
  spd: "quick",
}

/** The inputs a trait is derived from: trained bonus and effective stats. */
export interface TraitSource {
  /** Stored traits when the creature/record already has them (v15+). */
  traits?: readonly LineageTrait[]
  /** Trained bonus per stat. */
  trained: CreatureStats
  /** Effective/combat stats (for archived records, the record's `stats`). */
  stats: CreatureStats
}

/**
 * Derive a parent's trait: highest trained stat wins; ties break in
 * HP > ATK > DEF > SPD order. With no training at all, the highest effective
 * stat decides (same tie-break), so every creature has a trait from day one.
 */
export function deriveTrait(source: {
  trained: CreatureStats
  effective: CreatureStats
}): LineageTrait {
  const trainedMax = Math.max(...STAT_ORDER.map((key) => source.trained[key]))
  if (trainedMax > 0) {
    const key =
      STAT_ORDER.find((stat) => source.trained[stat] === trainedMax) ?? "hp"
    return TRAIT_BY_STAT[key]
  }
  const effectiveMax = Math.max(
    ...STAT_ORDER.map((key) => source.effective[key]),
  )
  const key =
    STAT_ORDER.find((stat) => source.effective[stat] === effectiveMax) ?? "hp"
  return TRAIT_BY_STAT[key]
}

/** Deduplicate and canonicalize a trait list. */
export function dedupeTraits(traits: readonly LineageTrait[]): LineageTrait[] {
  const seen = new Set(traits)
  return TRAIT_ORDER.filter((id) => seen.has(id))
}

/**
 * The traits a creature/record actually contributes: stored traits when
 * present, otherwise a derived trait for pre-v15 records with an empty array.
 */
export function effectiveTraits(source: TraitSource): LineageTrait[] {
  if (source.traits && source.traits.length > 0) {
    return dedupeTraits(source.traits)
  }
  return [deriveTrait({ trained: source.trained, effective: source.stats })]
}

/** Sum the floor bonuses of a trait list (duplicates count once). */
export function traitBonus(traits: readonly LineageTrait[]): CreatureStats {
  const bonus: CreatureStats = { hp: 0, atk: 0, def: 0, spd: 0 }
  for (const id of dedupeTraits(traits)) {
    const def = TRAITS[id].bonus
    bonus.hp += def.hp
    bonus.atk += def.atk
    bonus.def += def.def
    bonus.spd += def.spd
  }
  return bonus
}

/** Runtime guard for save validation and untrusted data. */
export function isLineageTrait(value: unknown): value is LineageTrait {
  return typeof value === "string" && TRAIT_ORDER.some((id) => id === value)
}
