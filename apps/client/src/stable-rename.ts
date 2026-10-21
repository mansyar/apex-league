/**
 * The stable's rename editor (stable & partner reserve, the spec's edge
 * case: "renaming a stashed pet — allowed from the stable modal; the name
 * travels with the pet").
 *
 * The editor sits where the pet's name is, so a waiting pet never has to be
 * swapped into the ranch to be renamed. The pencil is a real, labelled
 * button with a 44px target; the editor is a labelled field with Save and
 * Cancel, and Escape cancels the edit and hands the keyboard back to the
 * pencil. The sim decides the name — an empty field falls back to the
 * species' name and a long one is clamped.
 *
 * Its own module: the stable modal already sits near the client module cap
 * (12 KB), and the editor is a seam of its own.
 */

import {
  type GameState,
  NAME_MAX_LENGTH,
  type RenameStableResult,
  type StableReason,
} from "@apex/sim"
import { icons } from "./ui/icons"

export interface StableRenameOptions {
  /** The pet's name as it reads now ("Rolo"). */
  name: string
  /** The slot id the sim knows the pet by ("stable:0"). */
  creatureId: string
  /** Rename through the sim; the result carries the new state or the refusal. */
  onRename: (creatureId: string, name: string) => RenameStableResult
  /** The sim turned the rename down: say why, in the game's voice. */
  onRefusal: (copy: string) => void
  /** The rename went through: the modal repaints from the new state. */
  onRenamed: (state: GameState) => void
}

export interface StableRename {
  /** The name line: the pet's name and the pencil that renames it. */
  row: HTMLElement
  /** The pencil that opens the editor. */
  trigger: HTMLButtonElement
}

/**
 * The coaching line for a refused rename: the same voice as a refused swap,
 * and the same two reasons — the day-phase lock and a pet that is no longer
 * waiting.
 */
export function stableRenameRefusalCopy(reason: StableReason): string {
  if (reason === "cup-phase") {
    return "Renaming waits until the cup is done — the pet keeps its name for now."
  }
  return "That pet is no longer waiting — open the stable again."
}

/** A small labelled button: Save, Cancel. */
function editorButton(
  label: string,
  ariaLabel: string,
  className: string,
): HTMLButtonElement {
  const button = document.createElement("button")
  button.className = className
  button.type = "button"
  button.textContent = label
  button.setAttribute("aria-label", ariaLabel)
  return button
}

/**
 * Build the name line of a waiting pet: the pet's name, the pencil that
 * renames it, and the editor that opens when the pencil is pressed.
 */
export function buildStableRename(options: StableRenameOptions): StableRename {
  const name = document.createElement("span")
  name.className = "stable-pet-name"
  name.textContent = options.name

  const trigger = document.createElement("button")
  trigger.className = "rename-button stable-pet-rename"
  trigger.type = "button"
  trigger.title = `Rename ${options.name}`
  // The visible label stays short; the accessible name says which pet.
  trigger.setAttribute("aria-label", `Rename ${options.name}`)
  trigger.innerHTML = icons.pencil
  // A 44px target at every width — the floor the guidelines ask for.
  trigger.style.width = "44px"
  trigger.style.height = "44px"

  const row = document.createElement("span")
  row.className = "stable-pet-name-row"
  row.append(name, trigger)

  const open = (): void => {
    const input = document.createElement("input")
    input.className = "stable-pet-input"
    input.type = "text"
    input.maxLength = NAME_MAX_LENGTH
    input.value = options.name
    input.setAttribute("aria-label", `New name for ${options.name}`)
    const save = editorButton(
      "Save",
      `Save the new name for ${options.name}`,
      "kit-button stable-pet-save",
    )
    const cancel = editorButton(
      "Cancel",
      `Cancel renaming ${options.name}`,
      "kit-button stable-pet-cancel",
    )
    const back = (): void => {
      row.replaceChildren(name, trigger)
      trigger.focus()
    }
    const commit = (): void => {
      const result = options.onRename(options.creatureId, input.value)
      if (!result.ok) {
        options.onRefusal(stableRenameRefusalCopy(result.reason))
        input.focus()
        return
      }
      options.onRenamed(result.state)
    }
    save.addEventListener("click", commit)
    cancel.addEventListener("click", back)
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault()
        commit()
        return
      }
      if (event.key === "Escape") {
        // The editor's Escape cancels the edit; the modal's own Escape closes
        // the whole panel, so the event stops here.
        event.preventDefault()
        event.stopPropagation()
        back()
      }
    })
    row.replaceChildren(input, save, cancel)
    input.focus()
  }

  trigger.addEventListener("click", open)
  return { row, trigger }
}
