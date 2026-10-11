import { type SpeciesDef, STARTER_SPECIES } from "@apex/sim"

export interface StarterHandlers {
  onChoose: (speciesId: string) => void
}

export interface StarterChoice {
  remove(): void
}

function starterCard(species: SpeciesDef, onChoose: (id: string) => void) {
  const card = document.createElement("button")
  card.type = "button"
  card.className = `starter-card el-border-${species.element}`
  if (!species.available) {
    card.disabled = true
    card.classList.add("locked")
  }
  const name = document.createElement("span")
  name.className = "starter-name"
  name.textContent = species.displayName
  const badge = document.createElement("span")
  badge.className = `element-badge el-${species.element}`
  badge.textContent = species.element
  const flavor = document.createElement("span")
  flavor.className = "starter-flavor"
  flavor.textContent = species.flavor
  card.append(badge, name, flavor)
  if (species.available) {
    card.addEventListener("click", () => onChoose(species.id))
  } else {
    const ribbon = document.createElement("span")
    ribbon.className = "starter-ribbon"
    ribbon.textContent = "Coming soon"
    card.append(ribbon)
  }
  return card
}

/**
 * First-run starter choice: three cards over the ranch, one per element
 * line — all three species available (water included; the ribbon branch
 * above only fires for future unlisted species).
 */
export function createStarterChoice(
  root: HTMLElement,
  handlers: StarterHandlers,
): StarterChoice {
  const overlay = document.createElement("div")
  overlay.className = "starter-overlay"

  const heading = document.createElement("div")
  heading.className = "starter-heading"
  heading.textContent = "Choose your first partner"

  const grid = document.createElement("div")
  grid.className = "starter-grid"
  for (const species of STARTER_SPECIES) {
    grid.append(starterCard(species, handlers.onChoose))
  }

  overlay.append(heading, grid)
  root.appendChild(overlay)
  return {
    remove() {
      overlay.remove()
    },
  }
}
