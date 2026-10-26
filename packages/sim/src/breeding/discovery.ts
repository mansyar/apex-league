/**
 * Breeding discovery (`roster_wave_3` FR-4): fixed parent-element recipes
 * evaluated as a pure breed-time lookup. Two retired parents whose primary
 * elements match a recipe reveal the discovery line; every other pairing —
 * same-element pairs and unlisted cross-element pairs alike — inherits
 * exactly as before. The lookup reads the parents' elements only, rolls no
 * random stream, and persists nothing: discovery re-derives every time.
 *
 * The egg's species choices live here too: the parents' species in selection
 * order, then the discovered line when a recipe fires and it is not already
 * listed (a discovered parent breeding true needs no duplicate chip).
 *
 * Pure data and pure functions only — no DOM, no rendering, no I/O.
 */

import type { Element } from "../creature"
import type { RetiredRecord } from "../legacy/lineage"

/** One discovery recipe: the unordered parent-element pair it fires on. */
interface DiscoveryRecipe {
  readonly parents: readonly [Element, Element]
  readonly speciesId: string
}

/**
 * The three fixed recipes. The table is the whole seam — adding a line is
 * adding a row, never touching the breeding flow.
 */
const RECIPES: readonly DiscoveryRecipe[] = Object.freeze([
  { parents: ["electric", "wind"], speciesId: "voltfox" },
  { parents: ["wind", "water"], speciesId: "galeheron" },
  { parents: ["earth", "fire"], speciesId: "shalemole" },
])

/** The order-independent recipe key: the sorted element pair. */
function recipeKey(a: Element, b: Element): string {
  return [a, b].sort().join("+")
}

const RECIPE_INDEX = new Map(
  RECIPES.map((recipe) => [
    recipeKey(recipe.parents[0], recipe.parents[1]),
    recipe.speciesId,
  ]),
)

/**
 * The species a parent-element pair discovers, or null when no recipe fires.
 * Order-independent: electric+wind and wind+electric read the same. Same
 * elements never match — no recipe lists a pair with itself.
 */
export function discoverySpeciesForElements(
  a: Element,
  b: Element,
): string | null {
  return RECIPE_INDEX.get(recipeKey(a, b)) ?? null
}

/**
 * The species a retired pair discovers from their primary elements, or null
 * when the pair is not exactly two records or no recipe fires. Reads the
 * recorded elements only — never the creatures, never a random stream.
 */
export function discoverySpeciesForParents(
  parents: readonly RetiredRecord[],
): string | null {
  const [sire, dam] = parents
  if (parents.length !== 2 || !sire || !dam) return null
  return discoverySpeciesForElements(sire.element, dam.element)
}

/**
 * The egg's species choices: both parents' species in selection order, then
 * the discovered line when a recipe fires and it is not already listed. An
 * unlisted or same-element pair reads exactly the parents, as before.
 */
export function speciesOptions(pair: readonly RetiredRecord[]): string[] {
  const options: string[] = []
  for (const record of pair) {
    if (!options.includes(record.speciesId)) options.push(record.speciesId)
  }
  const discovered = discoverySpeciesForParents(pair)
  if (discovered !== null && !options.includes(discovered)) {
    options.push(discovered)
  }
  return options
}
