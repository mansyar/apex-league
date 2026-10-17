/**
 * Creature detail modal: the full 4-way stat breakdown per stat (rolled
 * base, trained bonus, evolution boost, inherited floor) plus the partner's
 * context rows (stage, generation, cups won, bond, mood). Opened by tapping
 * the ranch creature plate; renders fresh from state on every open.
 *
 * Pure DOM from the shared broadcast kit — no interaction wiring beyond the
 * modal's own Escape/backdrop/close semantics.
 */
import { type GameState, type StatKey, statBreakdown } from "@apex/sim"
import { focusTrap } from "./battleUI"
import { crest, tab } from "./ui/kit"
import { romanNumeral, stageLabel } from "./ui/labels"

const STAT_LABELS: Array<{ key: StatKey; label: string }> = [
  { key: "hp", label: "HP" },
  { key: "atk", label: "ATK" },
  { key: "def", label: "DEF" },
  { key: "spd", label: "SPD" },
]

/** A generation as a Roman numeral — "Gen I", "Gen II" (0 → "Gen 0"). */
function generationLabel(generation: number): string {
  return generation < 1 ? "Gen 0" : `Gen ${romanNumeral(generation)}`
}

/** One stat row: label + total, then the four breakdown chips beneath. */
function statRow(
  key: StatKey,
  label: string,
  breakdown: ReturnType<typeof statBreakdown>,
): HTMLElement {
  const row = document.createElement("div")
  row.className = "detail-stat"
  const head = document.createElement("div")
  head.className = "detail-stat-head"
  const name = document.createElement("span")
  name.className = "detail-stat-label"
  name.textContent = label
  const total = document.createElement("span")
  total.className = "detail-stat-total"
  total.textContent = String(breakdown[key].total)
  head.append(name, total)
  const chips = document.createElement("div")
  chips.className = "detail-stat-chips"
  const parts: Array<[string, number | null]> = [
    ["rolled", breakdown[key].baseRolled],
    ["trained", breakdown[key].trainedBonus],
    ["evolved", breakdown[key].stageBoost],
    ["floor", breakdown[key].inheritedFloor],
  ]
  for (const [word, value] of parts) {
    const chipEl = document.createElement("span")
    chipEl.className = "detail-stat-chip"
    const shown =
      value === null
        ? "—"
        : value > 0 && word !== "rolled"
          ? `+${value}`
          : String(value)
    chipEl.textContent = `${word} ${shown}`
    chips.append(chipEl)
  }
  row.append(head, chips)
  return row
}

/** One context row: a dim label and its value. */
function contextRow(label: string, value: string): HTMLElement {
  const row = document.createElement("div")
  row.className = "detail-context-row"
  const name = document.createElement("span")
  name.className = "detail-context-label"
  name.textContent = label
  const val = document.createElement("span")
  val.className = "detail-context-value"
  val.textContent = value
  row.append(name, val)
  return row
}

export interface CreatureDetail {
  /** The modal root — append it to the HUD root once. Starts hidden. */
  root: HTMLElement
  /** Render from current state and show the modal. */
  open: (state: GameState) => void
}

/**
 * Build the creature detail modal. Callers append `root` to the HUD and
 * call `open(state)` when the creature plate is tapped.
 */
export function buildCreatureDetail(): CreatureDetail {
  const root = document.createElement("div")
  root.className = "kit-modal"
  root.style.display = "none"
  root.setAttribute("role", "dialog")
  root.setAttribute("aria-modal", "true")
  root.setAttribute("aria-label", "Partner details")

  const box = document.createElement("div")
  box.className = "kit-plate kit-modal-box creature-detail-box"

  // Head: crest + name + stage tab — mirrors the plate's head row.
  const head = document.createElement("div")
  head.className = "creature-detail-head"
  const crestEl = crest("fire")
  const name = document.createElement("span")
  name.className = "creature-detail-name"
  const stageTab = tab("Baby", "stage")
  head.append(crestEl, name, stageTab)

  // The four stat rows, rebuilt on every open.
  const statList = document.createElement("div")
  statList.className = "detail-stat-list"

  // Context rows: stage, generation, cups won, bond, mood.
  const context = document.createElement("div")
  context.className = "detail-context"

  const actions = document.createElement("div")
  actions.className = "kit-modal-actions"
  const close = document.createElement("button")
  close.className = "kit-button"
  close.type = "button"
  close.textContent = "Back to the ranch"
  actions.append(close)

  box.append(head, statList, context, actions)
  root.append(box)

  /** Where focus goes when the modal closes (the tapped plate head). */
  let opener: HTMLElement | null = null
  const closeNow = (): void => {
    root.style.display = "none"
    if (opener?.isConnected) opener.focus()
    opener = null
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
      const creature = state.creature
      if (!creature) return
      opener =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null
      crestEl.replaceWith(crest(creature.element))
      name.textContent = creature.name
      stageTab.textContent = stageLabel(creature.stage)

      const breakdown = statBreakdown(creature, state.lineage)
      statList.replaceChildren(
        ...STAT_LABELS.map(({ key, label }) => statRow(key, label, breakdown)),
      )

      context.replaceChildren(
        contextRow("Stage", stageLabel(creature.stage)),
        contextRow("Generation", generationLabel(state.lineage.generation)),
        contextRow("Cups won", String(state.cupsWon)),
        contextRow("Bond", `${creature.conditions.bond}/100`),
        contextRow("Mood", `${creature.conditions.mood}/100`),
      )
      root.style.display = ""
      close.focus()
    },
  }
}
