import { ALL_SPECIES, getMove } from "@apex/sim"
import { MOVE_FX } from "../move-fx/moves"

/**
 * Move Lab catalog (elemental-identity FR-8): the triggerable move list,
 * sourced from the real registries so the lab tests what ships. Every id
 * comes from a species kit in the sim catalog (the union of all kits is
 * the full 48-move catalog); the bespoke flag comes from the client's
 * `MOVE_FX` table, so fallback rows are visible as fallbacks instead of
 * silently passing as bespoke.
 */

/** Fixed element order for the dropdown groups. */
export const LAB_ELEMENT_ORDER = [
  "fire",
  "water",
  "plant",
  "electric",
  "earth",
  "wind",
] as const

export type LabElement = (typeof LAB_ELEMENT_ORDER)[number]

export interface LabMoveEntry {
  readonly id: string
  readonly displayName: string
  readonly element: LabElement
  /** True when the client ships a bespoke row; false renders fallback. */
  readonly bespoke: boolean
}

export interface LabElementGroup {
  readonly element: LabElement
  readonly moves: readonly LabMoveEntry[]
}

/** Every kit move id in the sim catalog, deduplicated, in catalog order. */
export function labMoveIds(): string[] {
  const seen = new Set<string>()
  const ids: string[] = []
  for (const species of ALL_SPECIES) {
    for (const id of species.kit) {
      if (!seen.has(id)) {
        seen.add(id)
        ids.push(id)
      }
    }
  }
  return ids
}

/** The triggerable moves grouped by element for the lab dropdown. */
export function labMoveGroups(): LabElementGroup[] {
  const byElement = new Map<string, LabMoveEntry[]>()
  for (const id of labMoveIds()) {
    const move = getMove(id)
    if (!move || move.element === undefined) continue
    const list = byElement.get(move.element) ?? []
    list.push({
      id,
      displayName: move.displayName,
      element: move.element as LabElement,
      bespoke: MOVE_FX[id] !== undefined,
    })
    byElement.set(move.element, list)
  }
  return LAB_ELEMENT_ORDER.map((element) => ({
    element,
    moves: byElement.get(element) ?? [],
  })).filter((group) => group.moves.length > 0)
}
