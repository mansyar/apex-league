import { tab } from "../ui/kit"

/** The lineage-plate elements the daily update writes into. */
export interface LineagePlateRefs {
  root: HTMLButtonElement
  familyEl: HTMLElement
  metaEl: HTMLElement
}

/**
 * Top-left lineage plate (legacy track): the family name with its
 * generation numeral and the bloodline's counters. Doubles as the Hall of
 * Fame opener — one surface, one story.
 */
export function buildLineagePlate(): LineagePlateRefs {
  const root = document.createElement("button")
  root.type = "button"
  root.className = "kit-plate hud-lineage"
  root.setAttribute("aria-label", "Lineage and Hall of Fame")
  const tagEl = tab("Lineage", "outline")
  const familyEl = document.createElement("span")
  familyEl.className = "lineage-family"
  const metaEl = document.createElement("span")
  metaEl.className = "lineage-meta"
  root.append(tagEl, familyEl, metaEl)
  return { root, familyEl, metaEl }
}
