/**
 * The Nursery (dynasty_breeding_20261018): pair two archived champions, pick
 * one parent's species, inspect the exact seeded hatch, and send the egg on.
 * Presentation only — `graduateWithPair` in the sim performs the succession.
 *
 * The preview seed is chosen here and handed to the sim unchanged, so the
 * stats the player sees are the stats that hatch. Re-pairing rolls a new seed.
 */

import { breedingPool, type GameState, type RetiredRecord } from "@apex/sim"
import { focusTrap } from "../battleUI"
import { chip, crest, cta, tab } from "../ui/kit"
import {
  chooseSpecies,
  createNurseryState,
  hatchEnabled,
  hatchPreview,
  type NurseryState,
  toggleParent,
} from "./nursery-vm"

export interface NurseryHandlers {
  /** Hatch the egg; the seed is the one the preview was rendered with. */
  onHatch: (generations: number[], speciesId: string, seed: number) => void
}

export interface NurserySurface {
  /** The overlay root — append it once; it starts hidden. */
  root: HTMLElement
  /** Rebuild the pair pool from state and show the surface. */
  show: (state: GameState) => void
  /** Hide the surface and restore focus to its opener. */
  close: () => void
}

const span = (className: string, text: string): HTMLSpanElement => {
  const node = document.createElement("span")
  node.className = className
  node.textContent = text
  return node
}

/** The hatch seed, rolled once per pair/species change (as today). */
const nextSeed = (): number => Date.now() % 2 ** 31

/** "Ember Drake · Gen 2 · 3 cups" */
function parentMeta(record: RetiredRecord): string {
  const cups = `${record.cupsWon} cup${record.cupsWon === 1 ? "" : "s"}`
  return `Gen ${record.generation} · ${cups}`
}

/** "HP 88 · ATK 12 · DEF 10 · SPD 9" — the record's archived stats. */
function parentStats(record: RetiredRecord): string {
  return `HP ${record.stats.hp} · ATK ${record.stats.atk} · DEF ${record.stats.def} · SPD ${record.stats.spd}`
}

/**
 * Build the Nursery overlay. The caller appends `root`, calls `show(state)`
 * after the send-off settles, and `close()` when the hatch (or a dismissal)
 * ends the flow.
 */
export function createNursery(handlers: NurseryHandlers): NurserySurface {
  const root = document.createElement("div")
  root.className = "starter-overlay graduation-overlay nursery-overlay"
  root.style.display = "none"
  root.setAttribute("role", "dialog")
  root.setAttribute("aria-modal", "true")
  root.setAttribute("aria-label", "Nursery")

  const head = document.createElement("div")
  head.className = "starter-head"
  const heading = span("starter-heading", "Pair the line")
  const summary = span("lineage-meta", "")
  head.append(tab("Nursery", "accent"), heading, summary)

  const parentGrid = document.createElement("div")
  parentGrid.className = "nursery-parents"

  const status = document.createElement("p")
  status.className = "nursery-status"
  status.setAttribute("role", "status")

  const speciesRow = document.createElement("div")
  speciesRow.className = "nursery-species"

  const previewPanel = document.createElement("div")
  previewPanel.className = "nursery-preview"

  const actions = document.createElement("div")
  actions.className = "nursery-actions"
  const keep = chip({
    label: "Keep the champion",
    variant: "dim",
    onClick: () => dismiss(),
  })
  const hatchButton = cta("Hatch the egg")
  actions.append(keep, hatchButton)

  root.append(head, parentGrid, status, speciesRow, previewPanel, actions)

  let current: GameState | null = null
  let vm: NurseryState = createNurseryState([])
  let seed = nextSeed()
  let opener: HTMLElement | null = null

  const restoreFocus = (): void => {
    if (opener?.isConnected) opener.focus()
    opener = null
  }

  /** Hide without restoring focus; the flow calls this after a commit. */
  const close = (): void => {
    root.style.display = "none"
  }

  const dismiss = (): void => {
    close()
    restoreFocus()
  }

  const focusCard = (
    kind: "parent" | "species" | "hatch",
    value = "",
  ): void => {
    if (kind === "hatch") {
      hatchButton.focus()
      return
    }
    const selector =
      kind === "parent"
        ? `.nursery-parent[data-generation="${value}"]`
        : `.nursery-species-option[data-species="${value}"]`
    root.querySelector<HTMLButtonElement>(selector)?.focus()
  }

  function render(focus?: {
    kind: "parent" | "species" | "hatch"
    value?: string
  }): void {
    if (!current) return
    const prestige = current.lineage.generation + 1 + current.cupsWon
    summary.textContent = `Generation ${current.lineage.generation} · ${current.cupsWon} cup${current.cupsWon === 1 ? "" : "s"}`

    // -- Parents -------------------------------------------------------------
    parentGrid.replaceChildren(
      ...vm.parents.map((parent, index) => {
        const { record } = parent
        const card = document.createElement("button")
        card.type = "button"
        card.className = "nursery-parent kit-plate"
        card.dataset.generation = String(record.generation)
        card.setAttribute("aria-pressed", String(parent.selected))
        if (parent.selected) card.classList.add("is-selected")
        const nameRow = document.createElement("span")
        nameRow.className = "nursery-parent-head"
        nameRow.append(span("nursery-parent-name", record.name))
        // The retiree is the last pool record (breedingPool appends it).
        if (index === vm.parents.length - 1) {
          nameRow.append(tab("Retiring", "stage"))
        }
        const traits = document.createElement("span")
        traits.className = "nursery-traits"
        for (const label of parent.traitLabels) {
          traits.append(span("kit-tab is-outline nursery-trait", label))
        }
        card.append(
          crest(record.element),
          nameRow,
          span(
            "nursery-parent-meta",
            `${parent.speciesName} · ${parentMeta(record)}`,
          ),
          span("nursery-parent-stats", parentStats(record)),
          traits,
        )
        card.addEventListener("click", () => {
          vm = toggleParent(vm, record.generation)
          seed = nextSeed()
          render({ kind: "parent", value: String(record.generation) })
        })
        return card
      }),
    )

    // -- Pair status ---------------------------------------------------------
    status.classList.remove("is-warn")
    if (vm.rejectedThird) {
      status.classList.add("is-warn")
      status.textContent = "A pair takes two — deselect one first."
    } else if (vm.selected.length === 0) {
      status.textContent = "Pick two parents from the Hall."
    } else if (vm.selected.length === 1) {
      status.textContent = "One parent chosen — pick the second."
    } else if (!vm.speciesId) {
      status.textContent = "Choose the egg's species."
    } else {
      status.textContent = "Pair ready — the preview is the exact hatch."
    }

    // -- Species -------------------------------------------------------------
    if (vm.speciesOptions.length === 0) {
      speciesRow.replaceChildren(
        span(
          "nursery-hint",
          "Species choices appear once two parents are paired.",
        ),
      )
    } else {
      speciesRow.replaceChildren(
        ...vm.speciesOptions.map((option) => {
          const button = document.createElement("button")
          button.type = "button"
          button.className = "kit-tab is-outline nursery-species-option"
          button.dataset.species = option.id
          button.setAttribute(
            "aria-pressed",
            String(vm.speciesId === option.id),
          )
          if (vm.speciesId === option.id) button.classList.add("is-selected")
          button.textContent = option.name
          button.addEventListener("click", () => {
            vm = chooseSpecies(vm, option.id)
            seed = nextSeed()
            render({ kind: "species", value: option.id })
          })
          return button
        }),
      )
    }

    // -- Preview -------------------------------------------------------------
    const preview =
      vm.selected.length === 2 && vm.speciesId
        ? hatchPreview(vm.selected, vm.speciesId, seed, prestige)
        : null
    if (!preview) {
      previewPanel.replaceChildren(
        span(
          "nursery-preview-empty",
          "The egg's guaranteed floor and seeded hatch appear here.",
        ),
      )
    } else {
      const title = document.createElement("div")
      title.className = "nursery-preview-head"
      title.append(
        span(
          "nursery-preview-title",
          `${preview.parentNames[0]} × ${preview.parentNames[1]}`,
        ),
        span(
          "lineage-meta",
          `${preview.speciesName} · Prestige ${preview.prestige}`,
        ),
      )

      const rows = document.createElement("div")
      rows.className = "nursery-stat-list"
      for (const row of preview.rows) {
        const line = document.createElement("div")
        line.className = "nursery-stat"
        line.append(
          span("nursery-stat-label", row.label),
          span("nursery-stat-floor", `floor ${row.floor}`),
          span("nursery-stat-value", `hatch ${row.value}`),
          span(
            "nursery-stat-best",
            `best ${row.bestParent.name} ${row.bestParent.value}`,
          ),
        )
        rows.append(line)
      }

      const traits = document.createElement("div")
      traits.className = "nursery-preview-traits"
      if (preview.traits.length === 0) {
        traits.append(span("nursery-hint", "No lineage trait carried."))
      } else {
        for (const trait of preview.traits) {
          const badge = span("kit-tab is-outline nursery-trait", trait.label)
          badge.title = trait.description
          traits.append(badge)
        }
      }

      const note = document.createElement("p")
      note.className = "nursery-note"
      note.textContent = preview.mutationNote

      previewPanel.replaceChildren(title, rows, traits, note)
    }

    // -- Hatch ---------------------------------------------------------------
    const ready = hatchEnabled(vm)
    hatchButton.disabled = !ready
    hatchButton.classList.toggle("is-disabled", !ready)
    hatchButton.onclick = () => {
      if (!hatchEnabled(vm) || !vm.speciesId) return
      handlers.onHatch(
        vm.selected.map((parent) => parent.generation),
        vm.speciesId,
        seed,
      )
    }

    if (focus) focusCard(focus.kind, focus.value)
  }

  const trap = focusTrap(root)
  root.addEventListener("keydown", (event) => {
    trap(event)
    if (event.key === "Escape") {
      event.stopPropagation()
      dismiss()
    }
  })
  root.addEventListener("click", (event) => {
    if (event.target === root) dismiss()
  })

  return {
    root,
    show(state) {
      current = state
      opener =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null
      vm = createNurseryState(breedingPool(state))
      seed = nextSeed()
      render()
      root.scrollTop = 0
      root.style.display = ""
      const first = parentGrid.querySelector<HTMLButtonElement>("button")
      ;(first ?? keep).focus()
    },
    close,
  }
}
