/**
 * The stable surface (stable & partner reserve FR-9): the chip that opens it,
 * the modal that lists the pets waiting there, and the swap that hands one of
 * them the ranch.
 *
 * The decisions live in pure functions here — what a stashed pet reads as
 * (name, species, stage, its own age), what a refused swap says, when the
 * chip shows — so unit tests can pin them. The DOM around them stays thin,
 * exactly as the gift card's does.
 *
 * The swap itself is the sim's (`bringToRanch`): the app commits the result
 * and rebuilds the ranch; this module only asks and reports.
 */

import {
  type Creature,
  type GameState,
  getSpecies,
  type StableReason,
  stablePetId,
} from "@apex/sim"
import { focusTrap } from "./battleUI"
import { paintCrest } from "./hud/plates-creature"
import { chip, crest, tab } from "./ui/kit"
import { stageLabel } from "./ui/labels"

/** One stashed pet, as the stable surfaces read it. */
export interface StablePetRow {
  /** The sim's slot id for this pet ("stable:0"). */
  id: string
  /** The pet's own name ("Rolo"). */
  name: string
  /**
   * The species' display name ("Storm Hound"), or null when the pet's own
   * name already says it. A default name IS the species name, so printing
   * both reads as a stutter; a renamed pet ("Rolo") still needs to say what
   * it is.
   */
  species: string | null
  /** The life-stage label ("Baby"). */
  stage: string
  /** The pet's own age, in days ("12 days"). */
  age: string
  /** The crest's element. */
  element: Creature["element"]
  /** The crest's secondary element, when the line drifted. */
  affinity: Creature["affinity"]
}

/**
 * A pet's age as the surfaces print it: "1 day", "12 days". The pet's own
 * age (save v23) — never the world day, which counts days the pet was not
 * alive for.
 */
export function ageLabel(ageDays: number): string {
  return `${ageDays} day${ageDays === 1 ? "" : "s"}`
}

/** Two labels that read the same, whatever their case. */
function saysSame(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

/** One stashed pet's row: name, species, stage and its own age. */
export function stableRow(pet: Creature, index: number): StablePetRow {
  const species = getSpecies(pet.speciesId)?.displayName ?? pet.speciesId
  return {
    id: stablePetId(index),
    name: pet.name,
    // The species only earns its place when it says something the pet's own
    // name does not.
    species: saysSame(species, pet.name) ? null : species,
    stage: stageLabel(pet.stage),
    age: ageLabel(pet.ageDays),
    element: pet.element,
    affinity: pet.affinity,
  }
}

/**
 * The meta line a waiting pet reads as: the species (only when it adds
 * something), the stage and the pet's own age. Both surfaces print the same
 * line, so the decision lives here and nowhere else.
 */
export function stableMeta(row: StablePetRow): string {
  const parts: string[] = []
  if (row.species) parts.push(row.species)
  parts.push(row.stage, row.age)
  return parts.join(" · ")
}

/** Every stashed pet, in stable order. */
export function stableRows(state: GameState): StablePetRow[] {
  return state.stable.map((pet, index) => stableRow(pet, index))
}

/** The stable's empty state — an open modal, never a blank panel. */
export const STABLE_EMPTY_COPY =
  "No pets in the stable yet — every pet you own but the one in the ranch waits here."

/**
 * The chip shows only while the stable holds a pet, the same rule the gift
 * chip follows.
 */
export function stableChipVisible(state: GameState): boolean {
  return state.stable.length > 0
}

/**
 * The coaching line for a refused swap (FR-10): the day-phase lock reads as
 * coaching, never as a dead button.
 */
export function stableRefusalCopy(reason: StableReason): string {
  if (reason === "cup-phase") {
    return "The swap waits until the cup is done — the ranch stays as it is for now."
  }
  if (reason === "no-creature") {
    return "There is no partner in the ranch to swap with."
  }
  if (reason === "only-pet") {
    return "This is your only pet — there is nobody to wait in the stable."
  }
  return "That pet is no longer waiting — open the stable again."
}

/**
 * The Stable chip: it sits beside Settings and Handbook, and folds away
 * while the stable is empty so the ranch chips stay quiet.
 */
export function buildStableChip(onOpen: () => void): HTMLButtonElement {
  const button = chip({ label: "Stable", variant: "dim", onClick: onOpen })
  button.classList.add("stable-chip")
  // The chip's own `display` rule outranks the `hidden` attribute, so the
  // chip is folded the way the rest of the HUD folds its rows.
  button.style.display = "none"
  button.title = "Stable"
  return button
}

/**
 * Show the chip only while the stable holds a pet (FR-9). The HUD's paint
 * pass calls this on every commit.
 */
export function syncStableChip(
  button: HTMLButtonElement,
  state: GameState,
): void {
  button.style.display = stableChipVisible(state) ? "" : "none"
}

export interface StableModal {
  /** The modal root — append it to the HUD root once. Starts hidden. */
  root: HTMLElement
  /** Render from current state and show the stable. */
  open: (state: GameState) => void
  /** Hide the stable and hand focus back to whoever opened it. */
  close: () => void
}

export interface StableModalOptions {
  /**
   * Hand the ranch to a stashed pet. Returns the refusal reason, or null
   * when the swap went through.
   */
  onBringToRanch: (creatureId: string) => StableReason | null
  /** The swap went through: the shell puts the keyboard back on the plate. */
  onSwapped: () => void
}

/**
 * Build the stable modal: every pet waiting there, with the swap that brings
 * one of them to the ranch.
 */
export function buildStableModal(options: StableModalOptions): StableModal {
  const root = document.createElement("div")
  root.className = "kit-modal stable-modal"
  root.style.display = "none"
  root.setAttribute("role", "dialog")
  root.setAttribute("aria-modal", "true")
  root.setAttribute("aria-label", "Stable")

  const box = document.createElement("div")
  box.className = "kit-plate kit-modal-box stable-box"

  const head = document.createElement("div")
  head.className = "stable-head"
  const title = document.createElement("h2")
  title.className = "kit-modal-title"
  title.textContent = "Stable"
  head.append(title, tab("Waiting pets", "accent"))

  const intro = document.createElement("p")
  intro.className = "stable-intro"
  intro.textContent =
    "Every pet you own but the one in the ranch waits here, frozen until you bring it forward."

  const list = document.createElement("div")
  list.className = "stable-list"

  const empty = document.createElement("p")
  empty.className = "stable-empty"
  empty.textContent = STABLE_EMPTY_COPY

  // The refusal line: a swap the sim turns down is coaching, not silence.
  const note = document.createElement("p")
  note.className = "stable-note"
  note.setAttribute("role", "status")
  note.textContent = ""

  const actions = document.createElement("div")
  actions.className = "kit-modal-actions"
  const close = document.createElement("button")
  close.className = "kit-button"
  close.type = "button"
  close.textContent = "Back to the ranch"
  actions.append(close)

  box.append(head, intro, list, empty, note, actions)
  root.append(box)

  /** Where focus goes when the modal closes (the chip that opened it). */
  let opener: HTMLElement | null = null

  /** One waiting pet: crest, name, species, stage, age, and the swap. */
  const petRow = (row: StablePetRow): HTMLElement => {
    const item = document.createElement("div")
    item.className = "stable-pet"

    const crestEl = crest(row.element)
    paintCrest(crestEl, row.element, row.affinity)

    const body = document.createElement("div")
    body.className = "stable-pet-body"
    const name = document.createElement("span")
    name.className = "stable-pet-name"
    name.textContent = row.name
    const meta = document.createElement("span")
    meta.className = "stable-pet-meta"
    // The species only appears when the pet's own name does not already say
    // it — the row never repeats itself.
    if (row.species) {
      const species = document.createElement("span")
      species.className = "stable-pet-species"
      species.textContent = row.species
      meta.append(species)
    }
    const stage = document.createElement("span")
    stage.className = "stable-pet-stage"
    stage.textContent = row.stage
    const age = document.createElement("span")
    age.className = "stable-pet-age"
    age.textContent = row.age
    meta.append(stage, age)
    body.append(name, meta)

    const action = document.createElement("button")
    action.className = "kit-button stable-pet-action"
    action.type = "button"
    action.textContent = "Bring to the ranch"
    // The visible label stays short; the accessible name says which pet.
    action.setAttribute("aria-label", `Bring ${row.name} to the ranch`)
    action.addEventListener("click", () => bring(row.id))

    item.append(crestEl, body, action)
    return item
  }

  /** Repaint the list from the state: the stable's contents can change. */
  const paint = (state: GameState): void => {
    const rows = stableRows(state)
    list.replaceChildren(...rows.map((row) => petRow(row)))
    empty.hidden = rows.length > 0
    note.textContent = ""
  }

  const closeNow = (): void => {
    root.style.display = "none"
    if (opener?.isConnected) opener.focus()
    opener = null
  }

  /** The swap: the app runs it, the sim decides, the modal reports. */
  const bring = (creatureId: string): void => {
    const refusal = options.onBringToRanch(creatureId)
    if (refusal) {
      note.textContent = stableRefusalCopy(refusal)
      return
    }
    root.style.display = "none"
    opener = null
    options.onSwapped()
  }

  const trap = focusTrap(box)
  root.addEventListener("keydown", (event) => {
    trap(event)
    if (event.key === "Escape") closeNow()
  })
  root.addEventListener("click", (event) => {
    if (event.target === root) closeNow()
  })
  close.addEventListener("click", closeNow)

  return {
    root,
    open: (state) => {
      opener =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null
      paint(state)
      root.style.display = ""
      const first = list.querySelector<HTMLButtonElement>(".stable-pet-action")
      if (first) first.focus()
      else close.focus()
    },
    close: closeNow,
  }
}
