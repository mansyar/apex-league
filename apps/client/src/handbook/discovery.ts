/**
 * Breeding-discovery recipes (roster_wave_3 FR-8): the handbook's open
 * recipe listing — every discovery line with the parent-element pair that
 * hatches it. Each row derives from the sim's own recipe lookup, so the
 * page teaches exactly what the nursery hatches; never a second copy.
 */

import {
  DISCOVERY_SPECIES,
  discoverySpeciesForElements,
  type Element,
} from "@apex/sim"
import { ELEMENT_LABELS, ruleRow, subhead, tip } from "./common"

/** The elements the recipe lookup accepts, in handbook order. */
const ELEMENTS = Object.keys(ELEMENT_LABELS) as Element[]

/**
 * The parent-element pair that hatches `speciesId`, probed through the
 * production lookup so the recipe can only drift if the lookup itself
 * changes. Null when the line has no recipe — a data bug the pins catch.
 */
export function recipeFor(speciesId: string): [Element, Element] | null {
  for (const first of ELEMENTS) {
    for (const second of ELEMENTS) {
      if (second < first) continue
      const found = discoverySpeciesForElements(first, second)
      if (found !== null && found === speciesId) return [first, second]
    }
  }
  return null
}

/** The recipe sentence for one discovery line. */
export function recipeLine(speciesId: string): string | null {
  const recipe = recipeFor(speciesId)
  if (recipe === null) return null
  return `Breed ${ELEMENT_LABELS[recipe[0]]} with ${ELEMENT_LABELS[recipe[1]]}.`
}

/** The discovery section: one recipe row per discovery line. */
export function buildDiscovery(panel: HTMLElement): void {
  panel.append(subhead("Breeding discoveries"))
  panel.append(
    tip(
      "Some partners only arrive through breeding. Retire two parents of the right elements and the egg hatches a new line.",
    ),
  )
  for (const species of DISCOVERY_SPECIES) {
    const line = recipeLine(species.id)
    if (line !== null) panel.append(ruleRow(species.displayName, line))
  }
}
