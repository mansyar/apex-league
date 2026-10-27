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
  type RenameStableResult,
  type StableReason,
  stablePetId,
} from "@apex/sim"
import { paintCrest } from "./hud/plates-creature"
import { buildStableRename } from "./stable-rename"
import { chip, crest, tab } from "./ui/kit"
import { stageLabel } from "./ui/labels"
import { closeModal, openModal } from "./ui/modal"

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
 * The chip is always there (FR-9): the stable is a place the player can look
 * even when it is empty, and the modal carries the empty state. A chip that
 * folds away would make that empty state unreachable.
 */
export function stableChipVisible(_state: GameState): boolean {
  return true
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
 * The Stable chip: it sits beside Settings and Handbook and is always there —
 * the stable is worth a look even when it is empty (FR-9).
 */
export function buildStableChip(onOpen: () => void): HTMLButtonElement {
  const button = chip({ label: "Stable", variant: "dim", onClick: onOpen })
  button.classList.add("stable-chip")
  button.title = "Stable"
  return button
}

/**
 * Keep the chip in step with the state (FR-9). The chip never folds, so this
 * is where the empty stable is carried: the modal, not the chip, says it.
 */
export function syncStableChip(
  button: HTMLButtonElement,
  state: GameState,
): void {
  button.classList.toggle("is-hidden", !stableChipVisible(state))
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
  /**
   * Rename a pet waiting in the stable (the spec's edge case: the name
   * travels with the pet). The sim decides the name and the app commits it;
   * the modal repaints from the state that comes back.
   */
  onRename: (creatureId: string, name: string) => RenameStableResult
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
  root.classList.add("is-hidden")
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

  /** The swap button of the first row of the last paint. */
  let firstAction: HTMLButtonElement | null = null

  /** One waiting pet: crest, name, species, stage, age, the rename, the swap. */
  const petRow = (
    row: StablePetRow,
  ): { item: HTMLElement; action: HTMLButtonElement } => {
    const item = document.createElement("div")
    item.className = "stable-pet"

    const crestEl = crest(row.element)
    paintCrest(crestEl, row.element, row.affinity)

    const body = document.createElement("div")
    body.className = "stable-pet-body"
    // The name and the pencil that renames it share one line.
    const rename = buildStableRename({
      name: row.name,
      creatureId: row.id,
      onRename: options.onRename,
      onRefusal: (copy) => {
        note.textContent = copy
      },
      onRenamed: (state) => {
        paint(state)
        firstAction?.focus()
      },
    })
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
    body.append(rename.row, meta)

    const action = document.createElement("button")
    action.className = "kit-button stable-pet-action"
    action.type = "button"
    action.textContent = "Bring to the ranch"
    // The visible label stays short; the accessible name says which pet.
    action.setAttribute("aria-label", `Bring ${row.name} to the ranch`)
    action.addEventListener("click", () => bring(row.id))

    item.append(crestEl, body, action)
    return { item, action }
  }

  /** Repaint the list from the state: the stable's contents can change. */
  const paint = (state: GameState): void => {
    const rows = stableRows(state)
    const built = rows.map((row) => petRow(row))
    firstAction = built[0]?.action ?? null
    list.replaceChildren(...built.map((row) => row.item))
    empty.hidden = rows.length > 0
    note.textContent = ""
  }

  // Open/close, focus trap, scrim-click, Escape, and return-focus are the
  // shared modal helper's (ui/modal).
  const closeNow = (): void => {
    closeModal(root)
  }

  /** The swap: the app runs it, the sim decides, the modal reports. */
  const bring = (creatureId: string): void => {
    const refusal = options.onBringToRanch(creatureId)
    if (refusal) {
      note.textContent = stableRefusalCopy(refusal)
      return
    }
    // A commit, not a dismissal: the handoff target takes focus itself.
    closeModal(root, { returnFocus: false })
    options.onSwapped()
  }

  close.addEventListener("click", closeNow)

  return {
    root,
    open: (state) => {
      paint(state)
      openModal(root, {
        box,
        initialFocus: firstAction ?? close,
      })
    },
    close: closeNow,
  }
}
