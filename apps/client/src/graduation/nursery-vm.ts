/**
 * The Nursery's pure view-models (dynasty_breeding_20261018). No DOM and no
 * store writes: the caller owns the state and re-renders. The sim decides the
 * actual floor, traits, and mutation; these helpers only present them and
 * enforce the two-parent selection rules.
 */

import {
  createBredCreature,
  effectiveTraits,
  getSpecies,
  inheritedFloorFromPair,
  isLineageTrait,
  type LineageTrait,
  lineagePerks,
  type RetiredRecord,
  type StatKey,
  speciesOptions,
  TRAIT_ORDER,
  TRAITS,
} from "@apex/sim"

export interface NurseryParentView {
  record: RetiredRecord
  selected: boolean
  speciesName: string
  traitLabels: string[]
}

export interface NurserySpeciesOption {
  id: string
  name: string
  element: RetiredRecord["element"]
}

export interface NurseryState {
  /** Every pool record, in display order (Hall, then the retiring champion). */
  parents: NurseryParentView[]
  /** Chosen parents in click order (at most two). */
  selected: RetiredRecord[]
  speciesId: string | null
  speciesOptions: NurserySpeciesOption[]
  /** A third click was refused; the UI can flash the two-parent rule. */
  rejectedThird: boolean
}

const STAT_KEYS: StatKey[] = ["hp", "atk", "def", "spd"]
const STAT_LABELS: Record<StatKey, string> = {
  hp: "HP",
  atk: "ATK",
  def: "DEF",
  spd: "SPD",
}

export interface TraitCopy {
  label: string
  description: string
}

export interface PreviewParent {
  name: string
  value: number
}

export interface PreviewStatRow {
  key: StatKey
  label: string
  /** Guaranteed floor from both parents (before the hatch roll). */
  floor: number
  /** Exact value the same seed will hatch. */
  value: number
  /** The parent contributing the most to this stat. */
  bestParent: PreviewParent
}

export interface PreviewTrait extends TraitCopy {
  id: LineageTrait
}

export interface HatchPreview {
  speciesId: string
  speciesName: string
  parentNames: [string, string]
  rows: PreviewStatRow[]
  traits: PreviewTrait[]
  /** The rolled secondary affinity (save v20), or null when no drift. */
  affinity: RetiredRecord["affinity"]
  mutationNote: string
  prestige: number
}

/** The two parents' species, deduped, in click order. */
function pairOptions(
  selected: readonly RetiredRecord[],
): NurserySpeciesOption[] {
  if (selected.length !== 2) return []
  return speciesOptions(selected).flatMap((id) => {
    const species = getSpecies(id)
    return species
      ? [{ id, name: species.displayName, element: species.element }]
      : []
  })
}

/** Keep a chosen species while the pair is open, or while it is still offered. */
function keepSpecies(
  speciesId: string | null,
  options: readonly NurserySpeciesOption[],
): string | null {
  if (speciesId === null) return null
  if (options.length === 0) return speciesId
  return options.some((option) => option.id === speciesId) ? speciesId : null
}

function buildState(
  pool: readonly RetiredRecord[],
  selected: readonly RetiredRecord[],
  speciesId: string | null,
  rejectedThird: boolean,
): NurseryState {
  const options = pairOptions(selected)
  return {
    parents: pool.map((record) => {
      const species = getSpecies(record.speciesId)
      const traits =
        record.traits.length > 0 ? record.traits : effectiveTraits(record)
      return {
        record,
        selected: selected.some(
          (parent) => parent.generation === record.generation,
        ),
        speciesName: species?.displayName ?? record.speciesId,
        traitLabels: traits.map((id) => traitCopy(id).label),
      }
    }),
    selected: [...selected],
    speciesId: keepSpecies(speciesId, options),
    speciesOptions: options,
    rejectedThird,
  }
}

/**
 * Start with the retiring champion (the last pool record) selected. A first
 * graduation has only that record, so the hatch stays disabled — the founder
 * path remains the free starter choice.
 */
export function createNurseryState(
  pool: readonly RetiredRecord[],
): NurseryState {
  const retiree = pool.length > 0 ? pool[pool.length - 1] : undefined
  return buildState(pool, retiree ? [retiree] : [], null, false)
}

/** Add or remove a parent. A third selection is refused, never evicted. */
export function toggleParent(
  state: NurseryState,
  generation: number,
): NurseryState {
  const pool = state.parents.map((parent) => parent.record)
  const record =
    state.selected.find((parent) => parent.generation === generation) ??
    pool.find((parent) => parent.generation === generation)
  if (!record) return state

  const selected = state.selected.some(
    (parent) => parent.generation === generation,
  )
  if (selected) {
    return buildState(
      pool,
      state.selected.filter((parent) => parent.generation !== generation),
      state.speciesId,
      false,
    )
  }
  if (state.selected.length >= 2) {
    return { ...state, rejectedThird: true }
  }
  return buildState(pool, [...state.selected, record], state.speciesId, false)
}

/** Pick one of the pair's species. Anything else is ignored. */
export function chooseSpecies(
  state: NurseryState,
  speciesId: string,
): NurseryState {
  if (!state.speciesOptions.some((option) => option.id === speciesId)) {
    return state
  }
  return { ...state, speciesId, rejectedThird: false }
}

/** The hatch button is live only with two parents and a valid species. */
export function hatchEnabled(state: NurseryState): boolean {
  return (
    state.selected.length === 2 &&
    state.speciesId !== null &&
    state.speciesOptions.some((option) => option.id === state.speciesId)
  )
}

/**
 * Preview the exact hatch for a seed: the floor is the guaranteed minimum,
 * the value is what `createBredCreature` returns for the same seed, and each
 * row names the stronger parent. Pure — safe to call on every render.
 */
export function hatchPreview(
  parents: readonly RetiredRecord[],
  speciesId: string,
  seed: number,
  prestige: number,
): HatchPreview | null {
  if (parents.length !== 2) return null
  const sire = parents[0]
  const dam = parents[1]
  if (!sire || !dam) return null
  const species = getSpecies(speciesId)
  if (!species) return null

  const traits = TRAIT_ORDER.filter((id) =>
    [sire, dam].some((parent) => effectiveTraits(parent).includes(id)),
  )
  const floor = inheritedFloorFromPair(
    sire.stats,
    dam.stats,
    species,
    prestige,
    traits,
  )
  const child = createBredCreature(speciesId, seed, [sire, dam], prestige)

  return {
    speciesId,
    speciesName: species.displayName,
    parentNames: [sire.name, dam.name],
    rows: STAT_KEYS.map((key) => {
      const sireValue = sire.stats[key]
      const damValue = dam.stats[key]
      return {
        key,
        label: STAT_LABELS[key],
        floor: floor[key],
        value: child.stats[key],
        bestParent:
          sireValue >= damValue
            ? { name: sire.name, value: sireValue }
            : { name: dam.name, value: damValue },
      }
    }),
    traits: traits.map((id) => ({ id, ...traitCopy(id) })),
    affinity: child.affinity,
    // The mutation band is the sim's own: Champion Stable (prestige 9)
    // widens the top of it, so the preview says what this prestige rolls.
    mutationNote: lineagePerks(prestige).championStable
      ? "One seeded mutation adds +1–3 to one stat at hatch."
      : "One seeded mutation adds +1–2 to one stat at hatch.",
    prestige,
  }
}

/** "Founder", "Child of Gen 0", or "Child of Gen 0 × Gen 1". */
export function parentageLabel(parents: readonly number[]): string {
  if (parents.length === 0) return "Founder"
  if (parents.length === 1) return `Child of Gen ${parents[0]}`
  const sorted = [...parents].sort((a, b) => a - b)
  const first = sorted[0] ?? 0
  const second = sorted[1] ?? first
  return `Child of Gen ${first} × Gen ${second}`
}

/** Trait display copy with a defensive fallback for hand-edited saves. */
export function traitCopy(id: string): TraitCopy {
  if (!isLineageTrait(id)) {
    return { label: "Unknown trait", description: "" }
  }
  const trait = TRAITS[id]
  return { label: trait.label, description: trait.description }
}
