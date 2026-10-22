/**
 * The egg screen (graduation_modules split): the starter-kit grid with an
 * inherited-floor line per species, the pets waiting in the stable offered as
 * successors (stable & partner reserve FR-8), and the active perk badges.
 * Moved verbatim out of graduation.ts — same elements, same copy, same update.
 */

import {
  type Creature,
  effectiveStats,
  type GameState,
  inheritedFloor,
  lineagePrestige,
  STARTER_SPECIES,
} from "@apex/sim"
import { paintCrest } from "../hud/plates-creature"
import { type StablePetRow, stableMeta, stableRow } from "../stable"
import { crest, tab } from "../ui/kit"
import { floorSummary, lineageSummary, perkLabels } from "./copy"
import type { EggChoice } from "./types"

/** The egg screen's DOM and the rows its update fills in. */
export interface EggView {
  root: HTMLDivElement
  summary: HTMLElement
  perkRow: HTMLElement
  floors: Map<string, HTMLElement>
  /** The group offering the pets waiting in the stable (FR-8). */
  stableGroup: HTMLElement
  /** The grid inside that group. */
  stableGrid: HTMLElement
  /** The heading over the starter grid — shown when the stable offers one. */
  starterHead: HTMLElement
  /** The first starter card: the fallback focus target. */
  starterFirst: HTMLButtonElement | null
  /** The first pickable card: where focus lands when the screen opens. */
  firstCard: HTMLButtonElement | null
}

/**
 * The choice a pet waiting in the stable represents: the player already owns
 * this creature, so the graduation hands the ranch to it instead of hatching
 * a new one (FR-8).
 */
export function stableChoice(creatureId: string): EggChoice {
  return { kind: "stable", creatureId }
}

/**
 * One waiting pet: crest, name, species, stage and its own age, with the
 * label that says where it is coming from.
 */
function stableCard(row: StablePetRow): HTMLButtonElement {
  const card = document.createElement("button")
  card.type = "button"
  card.className = "starter-card kit-plate"
  card.dataset.stableId = row.id
  const crestEl = crest(row.element)
  paintCrest(crestEl, row.element, row.affinity)
  const name = document.createElement("span")
  name.className = "starter-name"
  name.textContent = row.name
  const detail = document.createElement("span")
  detail.className = "starter-flavor"
  // The same line the stable modal reads, decided once in the pure layer.
  detail.textContent = stableMeta(row)
  card.append(crestEl, name, detail, tab("In the stable", "outline"))
  return card
}

/** Build the egg screen; `onPick` fires with the chosen successor. */
export function buildEgg(onPick: (choice: EggChoice) => void): EggView {
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

  // The pets waiting in the stable: their own group, their own label. A
  // stashed pet is not a starter — it is a pet the player already has.
  const stableGroup = document.createElement("div")
  stableGroup.className = "graduation-stable"
  stableGroup.hidden = true
  const stableGrid = document.createElement("div")
  stableGrid.className = "starter-grid"
  // One listener for the whole group: the cards are rebuilt whenever the
  // stable changes, and the card carries the pet's id.
  stableGrid.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null
    const card = target?.closest?.(".starter-card") as HTMLElement | null
    const creatureId = card?.dataset.stableId
    if (!creatureId) return
    onPick(stableChoice(creatureId))
  })
  stableGroup.append(tab("From your stable", "outline"), stableGrid)

  // The heading over the starter grid: it only appears when the stable
  // offers a choice, so the two kinds of successor never read as one row.
  const starterHead = tab("A new hatch", "outline")
  starterHead.hidden = true

  const grid = document.createElement("div")
  grid.className = "starter-grid"
  const floors = new Map<string, HTMLElement>()
  const view: EggView = {
    root,
    summary,
    perkRow,
    floors,
    stableGroup,
    stableGrid,
    starterHead,
    starterFirst: null,
    firstCard: null,
  }
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
      card.addEventListener("click", () =>
        onPick({ kind: "species", speciesId: species.id }),
      )
      view.starterFirst ??= card
    }
    grid.append(card)
    floors.set(species.id, floorLine)
  }
  view.firstCard = view.starterFirst

  root.append(head, perkRow, stableGroup, starterHead, grid)
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

  // The pets waiting in the stable: the graduation can hand the ranch to
  // one of them, so they are offered next to the starter species (FR-8).
  const rows = state.stable.map((pet, index) => stableRow(pet, index))
  view.stableGrid.replaceChildren(...rows.map((row) => stableCard(row)))
  view.stableGroup.hidden = rows.length === 0
  view.starterHead.hidden = rows.length === 0
  // Focus lands on the player's own pet when there is one — it is the
  // successor the graduation is really asking about.
  view.firstCard =
    (view.stableGrid.firstElementChild as HTMLButtonElement | null) ??
    view.starterFirst
}
