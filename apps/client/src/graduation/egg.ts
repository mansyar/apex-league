/**
 * The egg screen (graduation_modules split): the starter-kit grid with an
 * inherited-floor line per species and the active perk badges. Moved verbatim
 * out of graduation.ts — same elements, same copy, same update.
 */

import {
  type Creature,
  effectiveStats,
  type GameState,
  inheritedFloor,
  lineagePrestige,
  STARTER_SPECIES,
} from "@apex/sim"
import { crest, tab } from "../ui/kit"
import { floorSummary, lineageSummary, perkLabels } from "./copy"

/** The egg screen's DOM and the rows its update fills in. */
export interface EggView {
  root: HTMLDivElement
  summary: HTMLElement
  perkRow: HTMLElement
  floors: Map<string, HTMLElement>
  /** The first pickable card: where focus lands when the screen opens. */
  firstCard: HTMLButtonElement | null
}

/** Build the egg screen; `onPick` fires with the chosen species id. */
export function buildEgg(onPick: (speciesId: string) => void): EggView {
  const root = document.createElement("div")
  root.className = "starter-overlay graduation-overlay"
  root.style.display = "none"
  const head = document.createElement("div")
  head.className = "starter-head"
  head.append(tab("Legacy", "accent"))
  const heading = document.createElement("span")
  heading.className = "starter-heading"
  heading.textContent = "Choose the next creature"
  const summary = document.createElement("span")
  summary.className = "lineage-meta"
  head.append(heading, summary)
  const perkRow = document.createElement("div")
  perkRow.className = "graduation-perks"
  const grid = document.createElement("div")
  grid.className = "starter-grid"
  const floors = new Map<string, HTMLElement>()
  const view: EggView = { root, summary, perkRow, floors, firstCard: null }
  for (const species of STARTER_SPECIES) {
    const card = document.createElement("button")
    card.type = "button"
    card.className = "starter-card kit-plate"
    if (!species.available) {
      card.disabled = true
      card.classList.add("locked")
    }
    card.append(crest(species.element))
    const name = document.createElement("span")
    name.className = "starter-name"
    name.textContent = species.displayName
    const floorLine = document.createElement("span")
    floorLine.className = "graduation-floor"
    card.append(name, floorLine)
    if (species.available) {
      card.addEventListener("click", () => onPick(species.id))
      view.firstCard ??= card
    }
    grid.append(card)
    floors.set(species.id, floorLine)
  }
  root.append(head, perkRow, grid)
  return view
}

/** Mirror live state into the egg screen: floors, bloodline line, perks. */
export function renderEgg(
  view: EggView,
  state: GameState,
  creature: Creature,
): void {
  const prestige = lineagePrestige(state)
  for (const species of STARTER_SPECIES) {
    const line = view.floors.get(species.id)
    if (!line) continue
    // effectiveStats is the sim's own sum — never re-added here, so the
    // previewed floor can never drift from the floor `graduate` applies.
    const floor = inheritedFloor(effectiveStats(creature), species, prestige)
    line.textContent = `Inherited floor — ${floorSummary(floor)}`
  }
  view.summary.textContent = lineageSummary(state)
  const perks = perkLabels(state)
  view.perkRow.replaceChildren(
    ...perks.map((label) => {
      const badge = document.createElement("span")
      badge.className = "kit-tab is-outline graduation-perk"
      badge.textContent = label
      return badge
    }),
  )
}
