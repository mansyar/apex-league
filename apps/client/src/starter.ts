import { type SpeciesDef, STARTER_SPECIES } from "@apex/sim"
import { crest, tab } from "./ui/kit"

export interface StarterHandlers {
  onChoose: (speciesId: string) => void
}

export interface StarterChoice {
  remove(): void
}

function starterCard(species: SpeciesDef, onChoose: (id: string) => void) {
  const card = document.createElement("button")
  card.type = "button"
  card.className = "starter-card kit-plate"
  if (!species.available) {
    card.disabled = true
    card.classList.add("locked")
  }
  const badge = crest(species.element)
  const name = document.createElement("span")
  name.className = "starter-name"
  name.textContent = species.displayName
  const flavor = document.createElement("span")
  flavor.className = "starter-flavor"
  flavor.textContent = species.flavor
  card.append(badge, name, flavor)
  if (species.available) {
    card.addEventListener("click", () => onChoose(species.id))
  }
  return card
}

/**
 * First-run starter choice: the draft-day dome. Three kit cards over a
 * broadcast backdrop, one per element line — all three species available
 * (water included; the ribbon branch above only fires for future unlisted
 * species).
 */
export function createStarterChoice(
  root: HTMLElement,
  handlers: StarterHandlers,
): StarterChoice {
  const overlay = document.createElement("div")
  overlay.className = "starter-overlay"

  const head = document.createElement("div")
  head.className = "starter-head"
  head.append(tab("Draft day"))
  const heading = document.createElement("span")
  heading.className = "starter-heading"
  heading.textContent = "Choose your first partner"
  head.append(heading)

  const grid = document.createElement("div")
  grid.className = "starter-grid"
  for (const species of STARTER_SPECIES) {
    grid.append(starterCard(species, handlers.onChoose))
  }

  overlay.append(head, grid)
  root.appendChild(overlay)
  return {
    remove() {
      overlay.remove()
    },
  }
}
